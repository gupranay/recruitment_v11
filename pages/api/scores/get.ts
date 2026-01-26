import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
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
  avatar_url: string | null;
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

  const supabase = supabaseApi(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { applicant_round_id, user_id: filterUserId } = req.body;

  if (!applicant_round_id) {
    return res.status(400).json({ error: "Applicant round ID is required" });
  }

  // console.log("Received request with applicant_round_id:", applicant_round_id);
  // console.log("User ID:", userId);

  try {
    const scoresResult = await supabase
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
        submission_id,
        users!scores_user_id_fkey (
          full_name,
          avatar_url
        )
      `
      )
      .eq("applicant_round_id", applicant_round_id)
      .order("created_at", { ascending: false });

    const { data: scores, error } = scoresResult as {
      data: Array<{
        id: string;
        score_value: number | null;
        metric_id: string;
        metrics: { name: string; weight: number } | null;
        user_id: string | null;
        created_at: string;
        submission_id: string | null;
        users: { full_name: string | null; avatar_url: string | null } | null;
      }> | null;
      error: any;
    };

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    // console.log("Raw scores from database:", scores);

    let filteredScores = scores || [];
    if (filterUserId) {
      filteredScores = filteredScores.filter((score) => score.user_id === filterUserId);
    }

    if (!filteredScores || filteredScores.length === 0) {
      // console.log(
      //   "No scores found for applicant_round_id:",
      //   applicant_round_id
      // );
      return res.status(200).json([]);
    }

    // Group scores by submission_id if it exists, otherwise by created_at
    const submissions = filteredScores.reduce(
      (acc: Record<string, Submission>, score: any) => {
        // Use submission_id if it exists, otherwise use created_at as a fallback
        const submissionId = score.submission_id || score.created_at;

        if (!acc[submissionId]) {
          acc[submissionId] = {
            submission_id: submissionId,
            created_at: score.created_at,
            user_id: score.user_id,
            user_name:
              score.user_id === user.id
                ? "You"
                : score.users?.full_name || "Unknown User",
            avatar_url: score.users?.avatar_url || null,
            scores: [],
            weighted_average: 0,
          };
        }

        // Only add score if metrics exists
        if (score.metrics) {
          acc[submissionId].scores.push({
            score_id: score.id,
            score_value: score.score_value,
            metric_id: score.metric_id,
            metric_name: score.metrics.name,
            metric_weight: score.metrics.weight,
          });
        }

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
      // Prevent division by zero
      if (totalWeight > 0) {
        const weightedSum = submission.scores.reduce(
          (sum, score) =>
            sum + (score.score_value * (score.metric_weight || 0)) / totalWeight,
          0
        );
        submission.weighted_average = weightedSum;
      } else {
        // If no weights, set average to 0
        submission.weighted_average = 0;
      }
    });

    const finalResponse = Object.values(submissions);
    // console.log("Final API response:", finalResponse);
    return res.status(200).json(finalResponse);
  } catch (error) {
    console.error("Error fetching scores:", error);
    return res.status(500).json({ error: "Failed to fetch scores" });
  }
}
