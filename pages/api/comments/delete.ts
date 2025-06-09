import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { comment_id, organization_id } = req.body;

  if (!comment_id || !organization_id) {
    return res
      .status(400)
      .json({
        error: "Missing required fields: comment_id, organization_id",
      });
  }

  const supabase = supabaseApi(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // First check if the comment exists and get its details
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select(
        `
        user_id,
        applicant_rounds!comments_applicant_round_id_fkey (
          recruitment_rounds!applicant_rounds_recruitment_round_id_fkey (
            recruitment_cycles!recruitment_rounds_recruitment_cycle_id_fkey (
              organization_id
            )
          )
        )
      `
      )
      .eq("id", comment_id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if the user has permission to delete the comment
    // Either they are the comment owner or they are an organization owner
    const isCommentOwner = comment.user_id === user.id;

    // Check if user is an organization owner
    const { data: userRole, error: roleError } = await supabase
      .from("organization_users")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();

    if (roleError) {
      return res.status(500).json({ error: "Error checking user role" });
    }

    const isOrgOwner = userRole?.role === "Owner";

    if (!isCommentOwner && !isOrgOwner) {
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
