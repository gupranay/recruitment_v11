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

  const { recruitment_round_id } = req.body;

  if (!recruitment_round_id) {
    return res.status(400).json({
      error: "Missing required field: recruitment_round_id",
    });
  }

  try {
    // Get all applicant_rounds for this recruitment round
    const applicantRoundsResult = await supabase
      .from("applicant_rounds")
      .select("id")
      .eq("recruitment_round_id", recruitment_round_id);
    
    const { data: applicantRounds, error: applicantRoundsError } = applicantRoundsResult as {
      data: Array<{ id: string }> | null;
      error: any;
    };

    if (applicantRoundsError) {
      console.error("Error fetching applicant_rounds:", applicantRoundsError);
      return res.status(500).json({ error: applicantRoundsError.message });
    }

    if (!applicantRounds || applicantRounds.length === 0) {
      return res.status(200).json({
        hasScores: false,
        count: 0,
      });
    }

    const applicantRoundIds = applicantRounds.map((ar) => ar.id);

    // Check if any scores exist for these applicant_rounds
    const scoresResult = await supabase
      .from("scores")
      .select("id")
      .in("applicant_round_id", applicantRoundIds)
      .limit(1);
    
    const { data: scores, error: scoresError } = scoresResult as {
      data: Array<{ id: string }> | null;
      error: any;
    };

    if (scoresError) {
      console.error("Error checking scores:", scoresError);
      return res.status(500).json({ error: scoresError.message });
    }

    const hasScores = scores && scores.length > 0;

    // If we have scores, get the full count
    let count = 0;
    if (hasScores) {
      const countResult = await supabase
        .from("scores")
        .select("*", { count: "exact", head: true })
        .in("applicant_round_id", applicantRoundIds);
      
      const { count: scoreCount, error: countError } = countResult as {
        count: number | null;
        error: any;
      };

      if (!countError && scoreCount !== null) {
        count = scoreCount;
      }
    }

    return res.status(200).json({
      hasScores,
      count,
    });
  } catch (err) {
    console.error("Unexpected error checking scores for round:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
