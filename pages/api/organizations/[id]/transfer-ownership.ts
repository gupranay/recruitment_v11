import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = supabaseBrowser();
  const organizationId = Array.isArray(req.query.id)
    ? req.query.id[0]
    : req.query.id;
  const { user_id, new_owner_id } = req.body;

  if (!organizationId || !user_id || !new_owner_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Prevent transferring to yourself
  if (user_id === new_owner_id) {
    return res
      .status(400)
      .json({ error: "Cannot transfer ownership to yourself" });
  }

  try {
    // First, verify the current user is the owner of the organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organizationId)
      .single();

    if (orgError) {
      return res.status(500).json({ error: "Error fetching organization" });
    }

    if (!organization || organization.owner_id !== user_id) {
      return res
        .status(403)
        .json({ error: "Only the current owner can transfer ownership" });
    }

    // Verify the new owner is an active member of the organization
    const { data: newOwnerMembership, error: membershipError } = await supabase
      .from("organization_users")
      .select("id, role")
      .eq("organization_id", organizationId)
      .eq("user_id", new_owner_id)
      .single();

    if (membershipError || !newOwnerMembership) {
      return res
        .status(400)
        .json({ error: "New owner must be an active member of the organization" });
    }

    // Perform the transfer atomically
    // 1. Update the organization's owner_id
    const { error: updateOrgError } = await supabase
      .from("organizations")
      .update({ owner_id: new_owner_id })
      .eq("id", organizationId);

    if (updateOrgError) {
      return res.status(500).json({ error: "Failed to update organization owner" });
    }

    // 2. Update the new owner's role to "Owner"
    const { error: updateNewOwnerError } = await supabase
      .from("organization_users")
      .update({ role: "Owner" })
      .eq("organization_id", organizationId)
      .eq("user_id", new_owner_id);

    if (updateNewOwnerError) {
      // Rollback: revert the organization owner_id
      await supabase
        .from("organizations")
        .update({ owner_id: user_id })
        .eq("id", organizationId);
      return res.status(500).json({ error: "Failed to update new owner role" });
    }

    // 3. Update the old owner's role to "Admin" to maintain their access
    const { error: updateOldOwnerError } = await supabase
      .from("organization_users")
      .update({ role: "Admin" })
      .eq("organization_id", organizationId)
      .eq("user_id", user_id);

    if (updateOldOwnerError) {
      // Rollback: revert both changes
      await supabase
        .from("organizations")
        .update({ owner_id: user_id })
        .eq("id", organizationId);
      await supabase
        .from("organization_users")
        .update({ role: "Owner" })
        .eq("organization_id", organizationId)
        .eq("user_id", user_id);
      await supabase
        .from("organization_users")
        .update({ role: newOwnerMembership.role })
        .eq("organization_id", organizationId)
        .eq("user_id", new_owner_id);
      return res.status(500).json({ error: "Failed to update old owner role" });
    }

    // Fetch the updated organization to return
    const { data: updatedOrg, error: fetchError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: "Failed to fetch updated organization" });
    }

    return res.status(200).json({
      message: "Ownership transferred successfully",
      organization: updatedOrg,
    });
  } catch (error: any) {
    console.error("Error transferring ownership:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
