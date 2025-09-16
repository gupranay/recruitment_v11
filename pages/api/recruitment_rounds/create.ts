import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, recruitment_cycle_id, metrics } = req.body;

  // Basic validation
  if (!name || !recruitment_cycle_id) {
    return res
      .status(400)
      .json({ error: "Missing required fields: name, recruitment_cycle_id" });
  }

  // metrics might be an array of { name, weight }, or could be empty
  // If it's not an array, coerce it to an empty array
  const metricList = Array.isArray(metrics) ? metrics : [];

  const supabase = supabaseBrowser();

  // Determine next sort_order within the cycle (max + 1)
  const { data: maxSortData, error: maxSortError } = await supabase
    .from("recruitment_rounds")
    .select("sort_order")
    .eq("recruitment_cycle_id", recruitment_cycle_id)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (maxSortError) {
    return res.status(400).json({ error: maxSortError.message });
  }

  const nextSortOrder = (maxSortData?.sort_order ?? -1) + 1;

  // 1) Insert a new row in recruitment_rounds with computed sort_order
  const { data: roundData, error: roundError } = await supabase
    .from("recruitment_rounds")
    .insert({
      name,
      recruitment_cycle_id,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (roundError || !roundData) {
    return res.status(400).json({
      error: roundError?.message || "Failed to create recruitment round",
    });
  }

  const newRoundId = roundData.id;

  // 2) Insert metrics for this round (if any)
  //    We'll map them to { recruitment_round_id, name, weight }
  let insertedMetrics = [];
  if (metricList.length > 0) {
    // Build an array of rows to insert into metrics
    const metricsToInsert = metricList.map((m) => ({
      recruitment_round_id: newRoundId,
      name: m.name,
      weight: m.weight ?? 0, // default weight = 0 if not provided
    }));

    const { data: metricsData, error: metricsError } = await supabase
      .from("metrics")
      .insert(metricsToInsert)
      .select();

    if (metricsError) {
      console.error("Error inserting metrics:", metricsError.message);
      // Optionally, you could handle partial failures or attempt a cleanup
      return res.status(500).json({ error: metricsError.message });
    }
    insertedMetrics = metricsData;
  }

  // 3) Auto-backfill: for applicants already accepted in the immediately previous round,
  //    create an in_progress applicant_round in this new round if not present.
  //    Previous round is the one with sort_order = nextSortOrder - 1
  const previousSortOrder = nextSortOrder - 1;
  if (previousSortOrder >= 0) {
    const { data: prevRound, error: prevRoundError } = await supabase
      .from("recruitment_rounds")
      .select("id")
      .eq("recruitment_cycle_id", recruitment_cycle_id)
      .eq("sort_order", previousSortOrder)
      .single();

    if (!prevRoundError && prevRound?.id) {
      // Get applicants accepted in previous round
      const { data: acceptedInPrev, error: acceptedError } = await supabase
        .from("applicant_rounds")
        .select("applicant_id")
        .eq("recruitment_round_id", prevRound.id)
        .eq("status", "accepted");

      if (!acceptedError && acceptedInPrev && acceptedInPrev.length > 0) {
        const applicantIds = acceptedInPrev.map((r) => r.applicant_id);

        // Find which of these already have a record in the new round
        const { data: existingNewRoundRows, error: existError } = await supabase
          .from("applicant_rounds")
          .select("applicant_id")
          .eq("recruitment_round_id", newRoundId)
          .in("applicant_id", applicantIds);

        if (!existError) {
          const existingIds = new Set(
            (existingNewRoundRows ?? []).map((r) => r.applicant_id)
          );
          const toInsert = applicantIds
            .filter((id) => !existingIds.has(id))
            .map((id) => ({
              applicant_id: id,
              recruitment_round_id: newRoundId,
              status: "in_progress",
            }));

          if (toInsert.length > 0) {
            // Bulk insert
            await supabase.from("applicant_rounds").insert(toInsert);
          }
        }
      }
    }
  }

  return res.status(201).json({ data: roundData });
}
