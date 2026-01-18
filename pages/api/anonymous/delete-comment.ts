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

  const { comment_id, user_id } = req.body;

  if (!comment_id || !user_id) {
    return res
      .status(400)
      .json({ error: "Missing required fields: comment_id, user_id" });
  }

  const supabase = supabaseApi(req, res);

  try {
    // Fetch the comment to check ownership
    const result = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", comment_id)
      .single();
    
    const { data: comment, error: fetchError } = result as {
      data: { user_id: string } | null;
      error: any;
    };

    if (fetchError || !comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

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
