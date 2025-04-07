import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    applicant_round_id,
    user_id,
    scores, // array of { metric_id, score_value, weight }
  } = req.body;

  // Basic validation
  if (!applicant_round_id || !Array.isArray(scores) || scores.length === 0) {
    return res.status(400).json({
      error:
        "Missing or invalid fields: applicant_round_id and a non-empty scores array.",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // Generate a new submission_id for this set of scores
    const submission_id = crypto.randomUUID();

    // 1) Build the insert data for scores
    const insertData = scores.map((item: any) => ({
      applicant_round_id,
      metric_id: item.metric_id,
      score_value: item.score_value,
      user_id: user_id || null,
      submission_id,
    }));

    // 2) Insert the new scores
    const { data: insertedScores, error: insertError } = await supabase
      .from("scores")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("Error inserting scores:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // 3) Calculate the weighted average for this submission
    let numerator = 0;
    let denominator = 0;
    scores.forEach((item: any) => {
      numerator += (item.score_value ?? 0) * (item.weight ?? 0);
      denominator += item.weight ?? 0;
    });

    const submissionWeightedAverage =
      denominator > 0 ? numerator / denominator : null;

    // 4) Get all submissions for this applicant_round_id
    const { data: allScores, error: fetchError } = await supabase
      .from("scores")
      .select(
        `
        submission_id,
        score_value,
        metric:metrics!scores_metric_id_fkey (
          weight
        )
      `
      )
      .eq("applicant_round_id", applicant_round_id);

    if (fetchError) {
      console.error("Error fetching all scores:", fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    // 5) Calculate the overall weighted average across all submissions
    let totalNumerator = 0;
    let totalDenominator = 0;

    // Group scores by submission
    const submissions = allScores.reduce((acc: any, score: any) => {
      if (!acc[score.submission_id]) {
        acc[score.submission_id] = [];
      }
      acc[score.submission_id].push(score);
      return acc;
    }, {});

    // Calculate average for each submission and then average those
    Object.values(submissions).forEach((submissionScores: any) => {
      let subNumerator = 0;
      let subDenominator = 0;

      submissionScores.forEach((score: any) => {
        subNumerator += (score.score_value ?? 0) * (score.metric.weight ?? 0);
        subDenominator += score.metric.weight ?? 0;
      });

      if (subDenominator > 0) {
        totalNumerator += subNumerator / subDenominator;
        totalDenominator += 1;
      }
    });

    const overallWeightedAverage =
      totalDenominator > 0 ? totalNumerator / totalDenominator : null;

    // 6) Update applicant_rounds with the new overall weighted average
    const { error: updateErr } = await supabase
      .from("applicant_rounds")
      .update({ weighted_score: overallWeightedAverage ?? undefined })
      .eq("id", applicant_round_id);

    if (updateErr) {
      console.error("Error updating weighted_score:", updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    // 7) Return success with both submission and overall averages
    return res.status(200).json({
      message: "Scores created and weighted averages updated",
      scores: insertedScores,
      submission_weighted_average: submissionWeightedAverage,
      overall_weighted_average: overallWeightedAverage,
      submission_id,
    });
  } catch (err) {
    console.error("Unexpected error in creating/updating scores:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
