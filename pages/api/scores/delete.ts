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

  const { submission_id } = req.body;

  if (!submission_id) {
    return res.status(400).json({
      error: "Missing required field: submission_id",
    });
  }

  try {
    // First verify that the authenticated user owns this submission
    const submissionResult = await supabase
      .from("scores")
      .select("user_id")
      .eq("submission_id", submission_id)
      .limit(1)
      .single();
    
    const { data: submission, error: fetchError } = submissionResult as {
      data: { user_id: string | null } | null;
      error: any;
    };

    if (fetchError) {
      console.error("Error fetching submission:", fetchError.message);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!submission) {
      return res
        .status(404)
        .json({ error: "Submission not found" });
    }

    if (submission.user_id !== user.id) {
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
