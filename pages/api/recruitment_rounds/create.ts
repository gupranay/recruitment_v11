import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, recruitment_cycle_id, metrics } = req.body;

  // Basic validation
  if (!name || !recruitment_cycle_id) {
    return res.status(400).json({ error: "Missing required fields: name, recruitment_cycle_id" });
  }

  // metrics might be an array of { name, weight }, or could be empty
  // If it's not an array, coerce it to an empty array
  const metricList = Array.isArray(metrics) ? metrics : [];

  const supabase = supabaseBrowser();

  // 1) Insert a new row in recruitment_rounds
  //    We'll store the (name, recruitment_cycle_id).
  const { data: roundData, error: roundError } = await supabase
    .from("recruitment_rounds")
    .insert({
      name,
      recruitment_cycle_id
    })
    .select()
    .single();

  if (roundError || !roundData) {
    return res.status(400).json({
      error: roundError?.message || "Failed to create recruitment round"
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
      weight: m.weight ?? 0  // default weight = 0 if not provided
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

  return res.status(201).json({data: roundData});
}