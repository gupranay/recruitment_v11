// api/comments/create.ts
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
    comment_text,
    user_id,
    source = "R", // Default to regular for this endpoint
  } = req.body;

  if (!applicant_round_id || !comment_text || !user_id) {
    return res.status(400).json({
      error:
        "Missing required fields: applicant_round_id, comment_text, user_id",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // Insert the comment
    const { data, error } = await supabase
      .from("comments")
      .insert([
        {
          applicant_round_id,
          user_id,
          comment_text,
          source,
        },
      ])
      .select()
      .single();

    if (error) {
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
