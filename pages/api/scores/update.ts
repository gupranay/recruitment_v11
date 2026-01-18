import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

interface Score {
  id: string;
  score_value: number;
  user_id: string;
  submission_id?: string;
  metric_id: string;
  metrics: {
    name: string;
    weight: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { score_id, score_value, user_id } = req.body;

  if (!score_id || score_value === undefined || !user_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const supabase = supabaseBrowser();

  try {
    // First, get the score to check ownership and get the submission_id
    const scoreResult = await supabase
      .from("scores")
      .select(
        `
        id,
        score_value,
        user_id,
        created_at,
        metric_id,
        metrics (
          name,
          weight
        )
      `
      )
      .eq("id", score_id)
      .single();

    const { data: score, error: fetchError } = scoreResult as {
      data: {
        id: string;
        score_value: number | null;
        user_id: string | null;
        created_at: string;
        metric_id: string;
        metrics: { name: string; weight: number } | null;
      } | null;
      error: any;
    };

    if (fetchError) {
      console.error("Error fetching score:", fetchError);
      return res.status(500).json({ error: "Failed to fetch score" });
    }

    if (!score) {
      return res.status(404).json({ error: "Score not found" });
    }

    if (score.user_id !== user_id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this score" });
    }

    // Update the score
    const updateResult = await (supabase
      .from("scores") as any)
      .update({ score_value })
      .eq("id", score_id);
    const { error: updateError } = updateResult as { error: any };

    if (updateError) {
      console.error("Error updating score:", updateError);
      return res.status(500).json({ error: "Failed to update score" });
    }

    // Get all scores for this submission to calculate the new weighted average
    const submissionScoresResult = await supabase
      .from("scores")
      .select(
        `
        score_value,
        created_at,
        metrics (
          weight
        )
      `
      )
      .eq("user_id", user_id)
      .eq("created_at", score.created_at);

    const { data: submissionScores, error: scoresError } = submissionScoresResult as {
      data: Array<{
        score_value: number | null;
        created_at: string;
        metrics: { weight: number } | null;
      }> | null;
      error: any;
    };

    if (scoresError) {
      console.error("Error fetching submission scores:", scoresError);
      return res
        .status(500)
        .json({ error: "Failed to fetch submission scores" });
    }

    if (!submissionScores || submissionScores.length === 0) {
      return res.status(200).json({ weighted_average: score_value ?? 0 });
    }

    // Calculate new weighted average
    const totalWeight = submissionScores.reduce(
      (sum, s) => sum + (s.metrics?.weight ?? 0),
      0
    );

    const weightedSum = submissionScores.reduce(
      (sum, s) => sum + (s.score_value ?? 0) * (s.metrics?.weight ?? 0),
      0
    );

    const weighted_average = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return res.status(200).json({ weighted_average });
  } catch (error) {
    console.error("Error updating score:", error);
    return res.status(500).json({ error: "Failed to update score" });
  }
}
