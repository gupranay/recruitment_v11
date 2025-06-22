import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { supabaseApi } from "@/lib/supabase/api";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    applicant_id,
    comment_text,
    user_id,
    recruitment_round_id,
    source = "A", // Default to anonymous for this endpoint
  } = req.body;

  if (!applicant_id || !comment_text || !user_id || !recruitment_round_id) {
    return res.status(400).json({
      error:
        "Missing required fields: applicant_id, comment_text, user_id, recruitment_round_id",
    });
  }

  const supabase = supabaseApi(req, res);

  try {
    // First get the applicant_round_id
    const { data: applicantRound, error: applicantRoundError } = await supabase
      .from("applicant_rounds")
      .select("id")
      .eq("applicant_id", applicant_id)
      .eq("recruitment_round_id", recruitment_round_id)
      .single();

    if (applicantRoundError) {
      return res.status(404).json({ error: "Applicant round not found" });
    }
    console.log("user_id", user_id);

    // Insert the comment
    const { data, error } = await supabase
      .from("comments")
      .insert([
        {
          applicant_round_id: applicantRound.id,
          user_id,
          comment_text,
          source,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating comment:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      message: "Comment created successfully",
      comment: data,
    });
  } catch (err) {
    console.error("Error creating comment:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
