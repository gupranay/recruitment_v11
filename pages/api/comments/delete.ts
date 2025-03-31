import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { comment_id, user_id } = req.body;

  if (!comment_id) {
    return res
      .status(400)
      .json({ error: "Missing required field: comment_id" });
  }

  const supabase = supabaseBrowser();

  try {
    // First check if the comment exists and if the user has permission to delete it
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", comment_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if the user has permission to delete the comment
    if (comment.user_id !== user_id) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment" });
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", comment_id);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
