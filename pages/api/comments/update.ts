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

  const { comment_id, comment_text } = req.body;

  if (!comment_id || !comment_text) {
    return res.status(400).json({
      error: "Missing required fields: comment_id, comment_text",
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
    // First check if the comment exists and if the user has permission to edit it
    const commentResult = await supabase
      .from("comments")
      .select("user_id, applicant_round_id")
      .eq("id", comment_id)
      .single();
    
    const { data: comment, error: fetchError } = commentResult as {
      data: { user_id: string; applicant_round_id: string } | null;
      error: any;
    };

    if (fetchError || !comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if the user has permission to edit the comment
    // Fetch the organization_id for the comment
    let isOrgOwnerOrAdmin = false;
    if (comment.user_id !== user.id) {
      // Need to check if user is admin/owner for the org
      if (comment.applicant_round_id) {
        type RoundData = {
          recruitment_rounds: {
            recruitment_cycles: {
              organization_id: string;
            };
          } | null;
        };
        
        const roundResult = await supabase
          .from("applicant_rounds")
          .select("recruitment_rounds(recruitment_cycles(organization_id))")
          .eq("id", comment.applicant_round_id)
          .single();
        
        const { data: roundData, error: roundError } = roundResult as {
          data: RoundData | null;
          error: any;
        };
        if (!roundError && roundData) {
          const organization_id =
            roundData.recruitment_rounds?.recruitment_cycles?.organization_id;
          if (organization_id) {
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
            if (
              !roleError &&
              userRole &&
              (userRole.role === "Owner" || userRole.role === "Admin")
            ) {
              isOrgOwnerOrAdmin = true;
            }
          }
        }
      }
    }
    if (comment.user_id !== user.id && !isOrgOwnerOrAdmin) {
      return res
        .status(403)
        .json({ error: "Not authorized to edit this comment" });
    }

    // Update the comment
    const updateData: Database["public"]["Tables"]["comments"]["Update"] = {
      comment_text,
      updated_at: new Date().toISOString(),
    };
    const updateQuery = (supabase
      .from("comments") as any)
      .update(updateData)
      .eq("id", comment_id)
      .select()
      .single();
    const updateResult = await updateQuery as any;
    const { data, error: updateError } = updateResult as {
      data: Database["public"]["Tables"]["comments"]["Row"] | null;
      error: any;
    };

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
