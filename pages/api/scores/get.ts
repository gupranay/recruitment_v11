import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Database } from "@/types/supabase";

interface Score {
  id: string;
  score_value: number;
  metric_id: string;
  metrics: {
    name: string;
    weight: number;
  };
  user_id: string;
  created_at: string;
  submission_id?: string;
}

interface Submission {
  submission_id: string;
  created_at: string;
  user_id: string;
  user_name: string | null;
  scores: {
    score_id: string;
    score_value: number;
    metric_id: string;
    metric_name: string;
    metric_weight: number;
  }[];
  weighted_average: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { applicant_round_id } = req.body;
  const userId = req.headers["x-user-id"] as string;

  if (!applicant_round_id) {
    return res.status(400).json({ error: "Applicant round ID is required" });
  }

  console.log("Received request with applicant_round_id:", applicant_round_id);
  console.log("User ID:", userId);

  const supabase = supabaseBrowser();

  try {
    const { data: scores, error } = await supabase
      .from("scores")
      .select(
        `
        id,
        score_value,
        metric_id,
        metrics (
          name,
          weight
        ),
        user_id,
        created_at,
        submission_id
      `
      )
      .eq("applicant_round_id", applicant_round_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // console.log("Raw scores from database:", scores);

    if (!scores || scores.length === 0) {
      console.log(
        "No scores found for applicant_round_id:",
        applicant_round_id
      );
      return res.status(200).json([]);
    }

    // Group scores by submission_id if it exists, otherwise by created_at
    const submissions = scores.reduce(
      (acc: Record<string, Submission>, score: any) => {
        // Use submission_id if it exists, otherwise use created_at as a fallback
        const submissionId = score.submission_id || score.created_at;

        if (!acc[submissionId]) {
          acc[submissionId] = {
            submission_id: submissionId,
            created_at: score.created_at,
            user_id: score.user_id,
            user_name: score.user_id === userId ? "You" : null,
            scores: [],
            weighted_average: 0,
          };
        }

        acc[submissionId].scores.push({
          score_id: score.id,
          score_value: score.score_value,
          metric_id: score.metric_id,
          metric_name: score.metrics.name,
          metric_weight: score.metrics.weight,
        });

        return acc;
      },
      {}
    );

    // console.log("Grouped submissions:", submissions);

    // Calculate weighted average for each submission
    Object.values(submissions).forEach((submission) => {
      const totalWeight = submission.scores.reduce(
        (sum, score) => sum + (score.metric_weight || 0),
        0
      );
      const weightedSum = submission.scores.reduce(
        (sum, score) =>
          sum + (score.score_value * (score.metric_weight || 0)) / totalWeight,
        0
      );
      submission.weighted_average = weightedSum;
    });

    const finalResponse = Object.values(submissions);
    // console.log("Final API response:", finalResponse);
    return res.status(200).json(finalResponse);
  } catch (error) {
    console.error("Error fetching scores:", error);
    return res.status(500).json({ error: "Failed to fetch scores" });
  }
}
