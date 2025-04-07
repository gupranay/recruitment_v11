import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { submission_id, user_id } = req.body;

  if (!submission_id || !user_id) {
    return res.status(400).json({
      error: "Missing required fields: submission_id and user_id",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // First verify that the user owns this submission
    const { data: submission, error: fetchError } = await supabase
      .from("scores")
      .select("user_id")
      .eq("submission_id", submission_id)
      .limit(1)
      .single();

    if (fetchError) {
      console.error("Error fetching submission:", fetchError.message);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!submission || submission.user_id !== user_id) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this submission" });
    }

    // Delete all scores with this submission_id
    const { error: deleteError } = await supabase
      .from("scores")
      .delete()
      .eq("submission_id", submission_id);

    if (deleteError) {
      console.error("Error deleting scores:", deleteError.message);
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Unexpected error deleting scores:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
