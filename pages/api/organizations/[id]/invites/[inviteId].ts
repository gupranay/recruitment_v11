import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
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

  const { id: organizationId, inviteId } = req.query;

  if (!organizationId || !inviteId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Check if authenticated user has permission (Owner or Admin)
    const membershipResult = await supabase
      .from("organization_users")
      .select("role")
      .eq("organization_id", organizationId.toString())
      .eq("user_id", user.id)
      .single();
    
    const { data: membership, error: membershipError } = membershipResult as {
      data: { role: string } | null;
      error: any;
    };

    if (membershipError || !membership) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (membership.role !== "Owner" && membership.role !== "Admin") {
      return res
        .status(403)
        .json({ error: "Only owners and admins can delete invites" });
    }

    // Verify the invite exists and belongs to this organization
    const inviteCheck = await supabase
      .from("organization_invites")
      .select("id")
      .eq("id", inviteId.toString())
      .eq("organization_id", organizationId.toString())
      .single();

    if (inviteCheck.error || !inviteCheck.data) {
      return res.status(404).json({ error: "Invite not found" });
    }

    // Delete the invite
    const deleteResult = await supabase
      .from("organization_invites")
      .delete()
      .eq("id", inviteId.toString())
      .eq("organization_id", organizationId.toString());
    const { error: deleteError } = deleteResult as { error: any };

    if (deleteError) throw deleteError;

    return res.status(200).json({ message: "Invite deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting invite:", error);
    return res.status(500).json({ error: error.message });
  }
}
