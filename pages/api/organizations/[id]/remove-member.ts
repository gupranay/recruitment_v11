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

  const supabase = supabaseApi(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id: organizationId } = req.query;
  const { deleteId } = req.body;

  if (!organizationId || Array.isArray(organizationId) || !deleteId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // First check if the authenticated user is an owner or admin
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

    if (
      membershipError ||
      !membership ||
      (membership.role !== "Owner" && membership.role !== "Admin")
    ) {
      return res
        .status(403)
        .json({ error: "Only owners and admins can remove members" });
    }

    // Check if the target user is not an owner or admin
    const targetResult = await supabase
      .from("organization_users")
      .select("role")
      .eq("organization_id", organizationId.toString())
      .eq("user_id", deleteId)
      .single();
    
    const { data: targetMembership, error: targetError } = targetResult as {
      data: { role: string } | null;
      error: any;
    };

    if (targetError || !targetMembership) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Admins can only remove members, not other admins or owners
    if (
      membership.role === "Admin" &&
      (targetMembership.role === "Owner" || targetMembership.role === "Admin")
    ) {
      return res
        .status(403)
        .json({ error: "Admins can only remove regular members" });
    }

    // Owners can't be removed
    if (targetMembership.role === "Owner") {
      return res.status(403).json({ error: "Cannot remove an owner" });
    }

    // Remove the member
    const deleteQuery = (supabase
      .from("organization_users") as any)
      .delete()
      .eq("organization_id", organizationId.toString())
      .eq("user_id", deleteId);
    const { error: deleteError } = await deleteQuery as { error: any };

    if (deleteError) {
      throw deleteError;
    }

    return res.status(200).json({ message: "Member removed successfully" });
  } catch (error: any) {
    console.error("Error removing member:", error);
    return res.status(500).json({ error: error.message });
  }
}
