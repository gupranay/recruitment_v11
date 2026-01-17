import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { recruitment_round_id, metrics } = req.body;

  if (!recruitment_round_id) {
    return res.status(400).json({
      error: "Missing required field: recruitment_round_id",
    });
  }

  // metrics might be an array of { name, weight }, or could be empty
  const metricList = Array.isArray(metrics) ? metrics : [];

  // Validate that weights sum to 1 (with small tolerance)
  if (metricList.length > 0) {
    const totalWeight = metricList.reduce(
      (sum, metric) => sum + (metric.weight || 0),
      0
    );
    if (Math.abs(totalWeight - 1) > 0.001) {
      return res.status(400).json({
        error: `Total weight must be 1. Current total: ${totalWeight.toFixed(3)}`,
      });
    }
  }

  const supabase = supabaseBrowser();

  try {
    // Safety check: Verify that no scores exist for this round
    // Get all applicant_rounds for this recruitment round
    const { data: applicantRounds, error: applicantRoundsError } =
      await supabase
        .from("applicant_rounds")
        .select("id")
        .eq("recruitment_round_id", recruitment_round_id);

    if (applicantRoundsError) {
      console.error("Error fetching applicant_rounds:", applicantRoundsError);
      return res.status(500).json({ error: applicantRoundsError.message });
    }

    if (applicantRounds && applicantRounds.length > 0) {
      const applicantRoundIds = applicantRounds.map((ar) => ar.id);

      // Check if any scores exist
      const { data: scores, error: scoresError } = await supabase
        .from("scores")
        .select("id")
        .in("applicant_round_id", applicantRoundIds)
        .limit(1);

      if (scoresError) {
        console.error("Error checking scores:", scoresError);
        return res.status(500).json({ error: scoresError.message });
      }

      if (scores && scores.length > 0) {
        return res.status(400).json({
          error:
            "Cannot update metrics: This round has existing scores. Please delete all scores first.",
        });
      }
    }

    // Verify the round exists
    const { data: roundData, error: roundError } = await supabase
      .from("recruitment_rounds")
      .select("id")
      .eq("id", recruitment_round_id)
      .single();

    if (roundError || !roundData) {
      return res.status(404).json({
        error: roundError?.message || "Recruitment round not found",
      });
    }

    // Delete existing metrics for this round
    const { error: deleteError } = await supabase
      .from("metrics")
      .delete()
      .eq("recruitment_round_id", recruitment_round_id);

    if (deleteError) {
      console.error("Error deleting existing metrics:", deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    // Insert new metrics (if any)
    let insertedMetrics: any[] = [];
    if (metricList.length > 0) {
      const metricsToInsert = metricList.map((m) => ({
        recruitment_round_id,
        name: m.name,
        weight: m.weight ?? 0,
      }));

      const { data: metricsData, error: metricsError } = await supabase
        .from("metrics")
        .insert(metricsToInsert)
        .select();

      if (metricsError) {
        console.error("Error inserting metrics:", metricsError);
        return res.status(500).json({ error: metricsError.message });
      }
      insertedMetrics = metricsData;
    }

    return res.status(200).json({
      success: true,
      metrics: insertedMetrics,
    });
  } catch (err) {
    console.error("Unexpected error updating metrics:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
