import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { score_id, score_value, user_id } = req.body;

  if (!score_id || score_value === undefined || !user_id) {
    return res.status(400).json({
      error: "Missing required fields: score_id, score_value, and user_id",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // First verify that the user owns this score
    const { data: score, error: fetchError } = await supabase
      .from("scores")
      .select("user_id, submission_id, metric_id")
      .eq("id", score_id)
      .single();

    if (fetchError) {
      console.error("Error fetching score:", fetchError.message);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!score || score.user_id !== user_id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this score" });
    }

    // Update the score
    const { error: updateError } = await supabase
      .from("scores")
      .update({ score_value })
      .eq("id", score_id);

    if (updateError) {
      console.error("Error updating score:", updateError.message);
      return res.status(500).json({ error: updateError.message });
    }

    // Recalculate the weighted average for the submission
    const { data: submissionScores, error: submissionError } = await supabase
      .from("scores")
      .select(
        `
        score_value,
        metric:metrics!scores_metric_id_fkey (
          weight
        )
      `
      )
      .eq("submission_id", score.submission_id);

    if (submissionError) {
      console.error(
        "Error fetching submission scores:",
        submissionError.message
      );
      return res.status(500).json({ error: submissionError.message });
    }

    let numerator = 0;
    let denominator = 0;
    submissionScores.forEach((row: any) => {
      numerator += row.score_value * (row.metric?.weight || 0);
      denominator += row.metric?.weight || 0;
    });

    const weighted_average = denominator > 0 ? numerator / denominator : 0;

    return res.status(200).json({
      success: true,
      weighted_average,
    });
  } catch (err) {
    console.error("Unexpected error updating score:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
