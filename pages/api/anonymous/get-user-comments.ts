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

  const { applicant_id, recruitment_round_id, user_id } = req.body;

  // Basic validation
  if (!applicant_id || !recruitment_round_id || !user_id) {
    return res.status(400).json({
      error:
        "Missing required fields: applicant_id, recruitment_round_id, user_id",
    });
  }

  const supabase = supabaseApi(req, res);

  try {
    // 1) Look up the bridging row in `applicant_rounds`
    const bridgingResult = await supabase
      .from("applicant_rounds")
      .select("id")
      .eq("applicant_id", applicant_id)
      .eq("recruitment_round_id", recruitment_round_id)
      .single();
    
    const { data: bridgingRow, error: bridgingErr } = bridgingResult as {
      data: { id: string } | null;
      error: any;
    };

    if (bridgingErr) {
      console.error("Error fetching applicant_rounds:", bridgingErr);
      return res.status(500).json({ error: bridgingErr.message });
    }
    if (!bridgingRow) {
      return res.status(404).json({
        error: "No matching applicant_round found for that applicant + round",
      });
    }

    // 2) Fetch comments from that bridging row where user_id = the requesting user
    const applicantRoundId = bridgingRow.id;
    const commentsResult = await supabase
      .from("comments")
      .select("id, comment_text, created_at, updated_at") // Specify only the fields you want
      .eq("applicant_round_id", applicantRoundId)
      .eq("user_id", user_id);
    
    const { data: comments, error: commentsErr } = commentsResult as {
      data: Array<{
        id: string;
        comment_text: string;
        created_at: string;
        updated_at: string;
      }> | null;
      error: any;
    };

    if (commentsErr) {
      console.error("Error fetching comments:", commentsErr);
      return res.status(500).json({ error: commentsErr.message });
    }
    // 3) Return those comments
    return res.status(200).json({
      comments,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
