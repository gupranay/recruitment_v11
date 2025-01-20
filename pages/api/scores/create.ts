import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    applicant_id,
    recruitment_round_id,
    user_id,   // optional if you track who creates the score
    scores     // array of { metric_id, score_value }
  } = req.body;

  // Basic validation
  if (!applicant_id || !recruitment_round_id || !Array.isArray(scores) || scores.length === 0) {
    return res.status(400).json({
      error: "Missing or invalid fields: applicant_id, recruitment_round_id, and a non-empty scores array",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // 1) Find the applicant_rounds record
    const { data: applicantRound, error: bridgingError } = await supabase
      .from("applicant_rounds")
      .select("id")
      .eq("applicant_id", applicant_id)
      .eq("recruitment_round_id", recruitment_round_id)
      .single();

    if (bridgingError) {
      console.error("Error fetching applicant_rounds row:", bridgingError);
      return res.status(500).json({ error: bridgingError.message });
    }
    if (!applicantRound) {
      return res.status(404).json({
        error: "No matching applicant_round found for the given applicant + round",
      });
    }

    const applicantRoundId = applicantRound.id;

    // 2) Build the insert data for scores
    const insertData = scores.map((item) => ({
      applicant_round_id: applicantRoundId,
      metric_id: item.metric_id,
      score_value: item.score_value,
      user_id: user_id || null, // optional
    }));

    // 3) Insert into 'scores'
    //    If you want to upsert (update existing rows), consider using onConflict(...) + unique constraints
    const { data: insertedScores, error: insertError } = await supabase
      .from("scores")
      .insert(insertData)
      .select();

    if (insertError) {
      console.error("Error inserting scores:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // 4) Return the newly inserted rows
    return res.status(200).json({
      message: "Scores created successfully",
      scores: insertedScores,
    });
  } catch (err) {
    console.error("Unexpected error in creating scores:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
