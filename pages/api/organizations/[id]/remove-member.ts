import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = supabaseBrowser();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id: organizationId } = req.query;
  const { deleteId, user_id } = req.body;

  if (!organizationId || !deleteId || !user_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // First check if the user making the request is an owner or admin
    const { data: membership, error: membershipError } = await supabase
      .from("organization_users")
      .select("role")
      .eq("organization_id", organizationId.toString())
      .eq("user_id", user_id)
      .single();

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
    const { data: targetMembership, error: targetError } = await supabase
      .from("organization_users")
      .select("role")
      .eq("organization_id", organizationId.toString())
      .eq("user_id", deleteId)
      .single();

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
    const { error: deleteError } = await supabase
      .from("organization_users")
      .delete()
      .eq("organization_id", organizationId.toString())
      .eq("user_id", deleteId);

    if (deleteError) {
      throw deleteError;
    }

    return res.status(200).json({ message: "Member removed successfully" });
  } catch (error: any) {
    console.error("Error removing member:", error);
    return res.status(500).json({ error: error.message });
  }
}
