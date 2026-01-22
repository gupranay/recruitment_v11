import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  const {
    applicant_round_id,
    scores, // array of { metric_id, score_value, weight }
  } = req.body;

  // Basic validation
  if (!applicant_round_id || !Array.isArray(scores) || scores.length === 0) {
    return res.status(400).json({
      error:
        "Missing or invalid fields: applicant_round_id and a non-empty scores array.",
    });
  }

  try {
    // Generate a new submission_id for this set of scores
    const submission_id = crypto.randomUUID();

    // 1) Build the insert data for scores - SECURITY: Use authenticated user.id
    const insertData = scores.map((item: any) => ({
      applicant_round_id,
      metric_id: item.metric_id,
      score_value: item.score_value,
      user_id: user.id,
      submission_id,
    }));

    // 2) Insert the new scores
    const scoresInsertData: Database["public"]["Tables"]["scores"]["Insert"][] = insertData.map(item => ({
      applicant_round_id: item.applicant_round_id,
      metric_id: item.metric_id,
      score_value: item.score_value,
      user_id: item.user_id,
      submission_id: item.submission_id,
    }));
    
    const scoresResult = await (supabase
      .from("scores") as any)
      .insert(scoresInsertData as any)
      .select();
    
    const { data: insertedScores, error: insertError } = scoresResult as {
      data: Database["public"]["Tables"]["scores"]["Row"][] | null;
      error: any;
    };

    if (insertError || !insertedScores) {
      console.error("Error inserting scores:", insertError?.message || "No data returned");
      return res.status(500).json({ error: insertError?.message || "Failed to insert scores" });
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
    type ScoreWithMetric = {
      submission_id: string;
      score_value: number;
      metric: {
        weight: number;
      } | null;
    };
    
    const allScoresResult = await supabase
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
    
    const { data: allScores, error: fetchError } = allScoresResult as {
      data: ScoreWithMetric[] | null;
      error: any;
    };

    if (fetchError || !allScores) {
      console.error("Error fetching all scores:", fetchError?.message || "No data returned");
      return res.status(500).json({ error: fetchError?.message || "Failed to fetch scores" });
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
    const updateData: Database["public"]["Tables"]["applicant_rounds"]["Update"] = {
      weighted_score: overallWeightedAverage ?? null,
    };
    const updateQuery = (supabase
      .from("applicant_rounds") as any)
      .update(updateData)
      .eq("id", applicant_round_id);
    const { error: updateErr } = await updateQuery as { error: any };

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
