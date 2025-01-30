import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    applicant_round_id,
    user_id,
    scores // array of { metric_id, score_value, weight }
  } = req.body;

  // Basic validation
  if (!applicant_round_id || !Array.isArray(scores) || scores.length === 0) {
    return res.status(400).json({
      error: "Missing or invalid fields: applicant_round_id and a non-empty scores array.",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // 1) Build the insert data for scores
    const insertData = scores.map((item: any) => ({
      applicant_round_id,
      metric_id: item.metric_id,
      score_value: item.score_value,
      user_id: user_id || null
    }));

    // 2) Insert (or upsert) into 'scores'
    //    If you have a unique constraint on (metric_id, applicant_round_id),
    //    do .upsert(insertData, { onConflict: "metric_id,applicant_round_id" })
    const { data: insertedScores, error: insertError } = await supabase
      .from("scores")
      .insert(insertData)
      .select(); // or .upsert(...) if updating existing scores

    if (insertError) {
      console.error("Error inserting scores:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // 3) Compute the new weighted average from the request data
    //    Weighted average = sum(score_value * weight) / sum(weight)
    let numerator = 0;
    let denominator = 0;
    scores.forEach((item: any) => {
      numerator += (item.score_value ?? 0) * (item.weight ?? 0);
      denominator += (item.weight ?? 0);
    });

    let weightedAverage = null;
    if (denominator > 0) {
      weightedAverage = numerator / denominator;
    }

    // 4) Update applicant_rounds.weighted_score
    const { error: updateErr } = await supabase
      .from("applicant_rounds")
      .update({ weighted_score: weightedAverage ?? undefined })
      .eq("id", applicant_round_id);

    if (updateErr) {
      console.error("Error updating weighted_score:", updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    // 5) Return success
    return res.status(200).json({
      message: "Scores created/updated and weighted average recalculated",
      scores: insertedScores,
      weighted_score: weightedAverage
    });

  } catch (err) {
    console.error("Unexpected error in creating/updating scores:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
