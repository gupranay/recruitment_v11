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

  const { comment_id, organization_id } = req.body;

  if (!comment_id || !organization_id) {
    return res.status(400).json({
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
    type CommentWithRelations = {
      user_id: string;
      applicant_rounds: {
        recruitment_rounds: {
          recruitment_cycles: {
            organization_id: string;
          };
        };
      };
    };
    
    const commentResult = await supabase
      .from("comments")
      .select(
        `
        user_id,
        applicant_rounds!comments_applicant_round_id_fkey (
          recruitment_rounds!applicant_rounds_recruitment_round_id_fkey (
            recruitment_cycles!fk_recruitment_cycle (
              organization_id
            )
          )
        )
      `
      )
      .eq("id", comment_id)
      .single();
    
    const { data: comment, error: fetchError } = commentResult as {
      data: CommentWithRelations | null;
      error: any;
    };

    if (fetchError || !comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if the user has permission to delete the comment
    // Either they are the comment owner or they are an organization owner
    const isCommentOwner = comment.user_id === user.id;

    // Check if user is an organization owner
    const userRoleResult = await supabase
      .from("organization_users")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .single();
    
    const { data: userRole, error: roleError } = userRoleResult as {
      data: { role: string } | null;
      error: any;
    };

    if (roleError) {
      return res.status(500).json({ error: "Error checking user role" });
    }

    const isOrgOwnerOrAdmin =
      userRole?.role === "Owner" || userRole?.role === "Admin";

    if (!isCommentOwner && !isOrgOwnerOrAdmin) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this comment" });
    }

    // Delete the comment
    const deleteQuery = (supabase
      .from("comments") as any)
      .delete()
      .eq("id", comment_id);
    const { error: deleteError } = await deleteQuery as { error: any };

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
