// api/comments/create.ts
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";

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

  const { applicant_round_id, comment_text, source = "R" } = req.body;

  if (!applicant_round_id || !comment_text) {
    return res.status(400).json({
      error: "Missing required fields: applicant_round_id, comment_text",
    });
  }

  try {
    // Insert the comment
    const { data, error } = await supabase
      .from("comments")
      .insert([
        {
          applicant_round_id,
          user_id: user.id,
          comment_text,
          source,
        },
      ])
      .select()
      .single();

    if (error) {
      console.log(error);
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
