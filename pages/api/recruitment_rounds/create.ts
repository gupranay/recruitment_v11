import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = supabaseApi(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
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

  // Determine next sort_order within the cycle (max + 1)
  const maxSortResult = await supabase
    .from("recruitment_rounds")
    .select("sort_order")
    .eq("recruitment_cycle_id", recruitment_cycle_id)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  
  const { data: maxSortData, error: maxSortError } = maxSortResult as {
    data: { sort_order: number | null } | null;
    error: any;
  };

  if (maxSortError) {
    return res.status(400).json({ error: maxSortError.message });
  }

  const nextSortOrder = (maxSortData?.sort_order ?? -1) + 1;

  // 1) Insert a new row in recruitment_rounds with computed sort_order
  const insertData: Database["public"]["Tables"]["recruitment_rounds"]["Insert"] = {
    name,
    recruitment_cycle_id,
    sort_order: nextSortOrder,
  };
  const roundResult = await (supabase
    .from("recruitment_rounds") as any)
    .insert(insertData as any)
    .select()
    .single();
  
  const { data: roundData, error: roundError } = roundResult as {
    data: Database["public"]["Tables"]["recruitment_rounds"]["Row"] | null;
    error: any;
  };

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

    const metricsInsertData: Database["public"]["Tables"]["metrics"]["Insert"][] = metricsToInsert.map(m => ({
      recruitment_round_id: m.recruitment_round_id,
      name: m.name,
      weight: m.weight,
    }));
    
    const metricsResult = await (supabase
      .from("metrics") as any)
      .insert(metricsInsertData as any)
      .select();
    
    const { data: metricsData, error: metricsError } = metricsResult as {
      data: Database["public"]["Tables"]["metrics"]["Row"][] | null;
      error: any;
    };

    if (metricsError || !metricsData) {
      console.error("Error inserting metrics:", metricsError?.message || "No data returned");
      // Optionally, you could handle partial failures or attempt a cleanup
      return res.status(500).json({ error: metricsError?.message || "Failed to insert metrics" });
    }
    insertedMetrics = metricsData;
  }

  // 3) Auto-backfill: for applicants already accepted in the immediately previous round,
  //    create an in_progress applicant_round in this new round if not present.
  //    Previous round is the one with sort_order = nextSortOrder - 1
  const previousSortOrder = nextSortOrder - 1;
  if (previousSortOrder >= 0) {
    const prevRoundResult = await supabase
      .from("recruitment_rounds")
      .select("id")
      .eq("recruitment_cycle_id", recruitment_cycle_id)
      .eq("sort_order", previousSortOrder)
      .single();
    
    const { data: prevRound, error: prevRoundError } = prevRoundResult as {
      data: { id: string } | null;
      error: any;
    };

    if (!prevRoundError && prevRound?.id) {
      // Get applicants accepted in previous round
      const acceptedResult = await supabase
        .from("applicant_rounds")
        .select("applicant_id")
        .eq("recruitment_round_id", prevRound.id)
        .eq("status", "accepted");
      
      const { data: acceptedInPrev, error: acceptedError } = acceptedResult as {
        data: Array<{ applicant_id: string }> | null;
        error: any;
      };

      if (!acceptedError && acceptedInPrev && acceptedInPrev.length > 0) {
        const applicantIds = acceptedInPrev.map((r) => r.applicant_id);

        // Find which of these already have a record in the new round
        const existResult = await supabase
          .from("applicant_rounds")
          .select("applicant_id")
          .eq("recruitment_round_id", newRoundId)
          .in("applicant_id", applicantIds);
        
        const { data: existingNewRoundRows, error: existError } = existResult as {
          data: Array<{ applicant_id: string }> | null;
          error: any;
        };

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
            const bulkInsertData: Database["public"]["Tables"]["applicant_rounds"]["Insert"][] = toInsert.map(t => ({
              applicant_id: t.applicant_id,
              recruitment_round_id: t.recruitment_round_id,
              status: t.status,
            }));
            await ((supabase
              .from("applicant_rounds") as any)
              .insert(bulkInsertData as any) as any);
          }
        }
      }
    }
  }

  return res.status(201).json({ data: roundData });
}
