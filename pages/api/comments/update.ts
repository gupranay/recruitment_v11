import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { comment_id, user_id, comment_text } = req.body;

  if (!comment_id || !user_id || !comment_text) {
    return res.status(400).json({
      error: "Missing required fields: comment_id, user_id, comment_text",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // First check if the comment exists and if the user has permission to edit it
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", comment_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if the user has permission to edit the comment
    if (comment.user_id !== user_id) {
      return res
        .status(403)
        .json({ error: "Not authorized to edit this comment" });
    }

    // Update the comment
    const { data, error: updateError } = await supabase
      .from("comments")
      .update({
        comment_text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", comment_id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      message: "Comment updated successfully",
      comment: data,
    });
  } catch (err) {
    console.error("Error updating comment:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
