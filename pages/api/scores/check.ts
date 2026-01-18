import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Database } from "@/lib/types/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract applicant_id and recruitment_round_id from the request
  const { applicant_id, recruitment_round_id } = req.body;

  if (!applicant_id || !recruitment_round_id) {
    return res.status(400).json({
      error: "Missing required fields: applicant_id, recruitment_round_id",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // 1) Look up the applicant_rounds row for (applicant_id, recruitment_round_id)
    const bridgingResult = await supabase
      .from("applicant_rounds")
      .select("id, weighted_score")
      .eq("applicant_id", applicant_id)
      .eq("recruitment_round_id", recruitment_round_id)
      .single();
    
    const { data: bridging, error: bridgingErr } = bridgingResult as {
      data: { id: string; weighted_score: number | null } | null;
      error: any;
    };

    if (bridgingErr) {
      console.error("Error fetching applicant_round:", bridgingErr);
      return res.status(500).json({ error: bridgingErr.message });
    }
    if (!bridging) {
      return res.status(404).json({
        error: "No applicant_round record found for this applicant and round",
      });
    }

    // 2) Check if weighted_score is null
    const hasScore = bridging.weighted_score !== null;

    // 3) Return a simple message based on weighted_score
    if (hasScore) {
      return res.status(200).json({
        hasScore: true,
        message: "There is a score for this applicant."
      });
    } else {
      return res.status(200).json({
        hasScore: false,
        message: "No weighted score found for this applicant in this round."
      });
    }

  } catch (err) {
    console.error("Unexpected error in checking weighted score:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
