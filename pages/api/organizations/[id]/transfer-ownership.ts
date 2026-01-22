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

  const organizationId = Array.isArray(req.query.id)
    ? req.query.id[0]
    : req.query.id;
  const { new_owner_id } = req.body;

  if (!organizationId || !new_owner_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Prevent transferring to yourself
  if (user.id === new_owner_id) {
    return res
      .status(400)
      .json({ error: "Cannot transfer ownership to yourself" });
  }

  try {
    // First, verify the authenticated user is the owner of the organization
    const orgResult = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organizationId)
      .single();
    
    const { data: organization, error: orgError } = orgResult as {
      data: { owner_id: string } | null;
      error: any;
    };

    if (orgError) {
      return res.status(500).json({ error: "Error fetching organization" });
    }

    if (!organization || organization.owner_id !== user.id) {
      return res
        .status(403)
        .json({ error: "Only the current owner can transfer ownership" });
    }

    // Verify the new owner is an active member of the organization
    const membershipResult = await supabase
      .from("organization_users")
      .select("id, role")
      .eq("organization_id", organizationId)
      .eq("user_id", new_owner_id)
      .single();
    
    const { data: newOwnerMembership, error: membershipError } = membershipResult as {
      data: { id: string; role: string } | null;
      error: any;
    };

    if (membershipError || !newOwnerMembership) {
      return res
        .status(400)
        .json({ error: "New owner must be an active member of the organization" });
    }

    // Perform the transfer atomically
    // 1. Update the organization's owner_id
    const updateOrgData: Database["public"]["Tables"]["organizations"]["Update"] = {
      owner_id: new_owner_id,
    };
    const updateOrgQuery = (supabase
      .from("organizations") as any)
      .update(updateOrgData)
      .eq("id", organizationId);
    const { error: updateOrgError } = await updateOrgQuery as { error: any };

    if (updateOrgError) {
      return res.status(500).json({ error: "Failed to update organization owner" });
    }

    // 2. Update the new owner's role to "Owner"
    const updateNewOwnerData: Database["public"]["Tables"]["organization_users"]["Update"] = {
      role: "Owner",
    };
    const updateNewOwnerQuery = (supabase
      .from("organization_users") as any)
      .update(updateNewOwnerData)
      .eq("organization_id", organizationId)
      .eq("user_id", new_owner_id);
    const { error: updateNewOwnerError } = await updateNewOwnerQuery as { error: any };

    if (updateNewOwnerError) {
      // Rollback: revert the organization owner_id
      const rollbackData: Database["public"]["Tables"]["organizations"]["Update"] = {
        owner_id: user.id,
      };
      await ((supabase
        .from("organizations") as any)
        .update(rollbackData)
        .eq("id", organizationId) as any);
      return res.status(500).json({ error: "Failed to update new owner role" });
    }

    // 3. Update the old owner's role to "Admin" to maintain their access
    const updateOldOwnerData: Database["public"]["Tables"]["organization_users"]["Update"] = {
      role: "Admin",
    };
    const updateOldOwnerQuery = (supabase
      .from("organization_users") as any)
      .update(updateOldOwnerData)
      .eq("organization_id", organizationId)
      .eq("user_id", user.id);
    const { error: updateOldOwnerError } = await updateOldOwnerQuery as { error: any };

    if (updateOldOwnerError) {
      // Rollback: revert both changes
      const rollbackOrgData: Database["public"]["Tables"]["organizations"]["Update"] = {
        owner_id: user.id,
      };
      await ((supabase
        .from("organizations") as any)
        .update(rollbackOrgData)
        .eq("id", organizationId) as any);
      
      const rollbackOldOwnerData: Database["public"]["Tables"]["organization_users"]["Update"] = {
        role: "Owner",
      };
      await ((supabase
        .from("organization_users") as any)
        .update(rollbackOldOwnerData)
        .eq("organization_id", organizationId)
        .eq("user_id", user.id) as any);
      
      const rollbackNewOwnerData: Database["public"]["Tables"]["organization_users"]["Update"] = {
        role: newOwnerMembership.role as any,
      };
      await ((supabase
        .from("organization_users") as any)
        .update(rollbackNewOwnerData)
        .eq("organization_id", organizationId)
        .eq("user_id", new_owner_id) as any);
      return res.status(500).json({ error: "Failed to update old owner role" });
    }

    // Fetch the updated organization to return
    const fetchResult = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();
    
    const { data: updatedOrg, error: fetchError } = fetchResult as {
      data: Database["public"]["Tables"]["organizations"]["Row"] | null;
      error: any;
    };

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
