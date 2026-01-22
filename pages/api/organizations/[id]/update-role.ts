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
  const { target_user_id, new_role } = req.body;

  // Log request for debugging
  console.log("Update role request:", {
    organizationId,
    user_id: user.id,
    target_user_id,
    new_role,
  });

  if (!organizationId || !target_user_id || !new_role) {
    console.error("Missing required fields:", {
      organizationId: !!organizationId,
      target_user_id: !!target_user_id,
      new_role: !!new_role,
    });
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["Owner", "Admin", "Member"].includes(new_role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    // Verify the authenticated user has permission (Owner or Admin)
    // First check if user is the organization owner
    const orgResult = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organizationId.toString())
      .single();
    
    const { data: organization, error: orgError } = orgResult as {
      data: { owner_id: string } | null;
      error: any;
    };

    if (orgError || !organization) {
      return res.status(500).json({ error: "Error checking organization ownership" });
    }

    let isOwner = false;
    let isAdmin = false;

    // Check if authenticated user is the actual owner
    if (organization?.owner_id === user.id) {
      isOwner = true;
    } else {
      // Check user's role in organization_users
      const membershipResult = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organizationId.toString())
        .eq("user_id", user.id)
        .single();
      
      const { data: currentUserMembership, error: membershipError } = membershipResult as {
        data: { role: string } | null;
        error: any;
      };

      if (membershipError) {
        console.error("Error checking current user membership:", membershipError);
        return res.status(403).json({ 
          error: "Unauthorized", 
          details: membershipError.message 
        });
      }

      if (!currentUserMembership) {
        return res.status(403).json({ error: "Unauthorized - not a member" });
      }

      if (currentUserMembership.role === "Owner") {
        isOwner = true;
      } else if (currentUserMembership.role === "Admin") {
        isAdmin = true;
      }
    }

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ error: "Only owners and admins can update member roles" });
    }

    // Get the target user's current role
    const targetResult = await supabase
      .from("organization_users")
      .select("role")
      .eq("organization_id", organizationId.toString())
      .eq("user_id", target_user_id)
      .single();
    
    const { data: targetMembership, error: targetError } = targetResult as {
      data: { role: string } | null;
      error: any;
    };

    if (targetError) {
      console.error("Error fetching target membership:", targetError);
      return res.status(404).json({ 
        error: "Member not found", 
        details: targetError.message 
      });
    }

    if (!targetMembership) {
      return res.status(404).json({ error: "Member not found" });
    }

    const oldRole = targetMembership.role;

    // If the role is already the same, return early
    if (oldRole === new_role) {
      return res.status(200).json({
        message: "Role is already set to this value",
        role: new_role,
      });
    }

    // Permission checks for Admins
    if (isAdmin && !isOwner) {
      // Admins cannot promote to Owner
      if (new_role === "Owner") {
        return res.status(403).json({ 
          error: "Only owners can promote users to Owner" 
        });
      }

      // Admins cannot demote other Admins
      if (oldRole === "Admin" && new_role !== "Admin") {
        return res.status(403).json({ 
          error: "Admins cannot demote other admins. Only owners can change admin roles." 
        });
      }

      // Admins cannot change the actual owner's role
      if (organization?.owner_id === target_user_id) {
        return res.status(403).json({ 
          error: "Cannot change the owner's role" 
        });
      }

      // Admins can promote Members to Admin
      // This is allowed, so we continue
    }

    // If changing to Owner, we need to transfer ownership (Owner only)
    if (new_role === "Owner") {
      if (!isOwner) {
        return res.status(403).json({ 
          error: "Only owners can promote users to Owner" 
        });
      }
      // Get the organization to check current owner
      const orgResult2 = await supabase
        .from("organizations")
        .select("owner_id")
        .eq("id", organizationId.toString())
        .single();
      
      const { data: organization, error: orgError } = orgResult2 as {
        data: { owner_id: string } | null;
        error: any;
      };

      if (orgError) {
        console.error("Error fetching organization for ownership transfer:", orgError);
        return res.status(500).json({ 
          error: "Error fetching organization", 
          details: orgError.message 
        });
      }

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Prevent transferring to yourself if you're already the owner
      if (organization.owner_id === target_user_id) {
        return res.status(400).json({ error: "User is already the owner" });
      }

      // Perform ownership transfer atomically
      // IMPORTANT: Order matters due to unique constraint "one_owner_per_org"
      // We must remove the old owner's role BEFORE adding the new owner's role
      
      // 1. First, update old owner's role to Admin (removes Owner constraint)
      const updateOldOwnerData: Database["public"]["Tables"]["organization_users"]["Update"] = {
        role: "Admin",
      };
      const updateOldOwnerQuery = (supabase
        .from("organization_users") as any)
        .update(updateOldOwnerData)
        .eq("organization_id", organizationId.toString())
        .eq("user_id", organization.owner_id);
      const { error: updateOldOwnerError } = await updateOldOwnerQuery as { error: any };

      if (updateOldOwnerError) {
        console.error("Error updating old owner role:", updateOldOwnerError);
        return res.status(500).json({ 
          error: "Failed to update old owner role", 
          details: updateOldOwnerError.message 
        });
      }

      // 2. Now update new owner's role to Owner (no constraint violation)
      const updateNewOwnerData: Database["public"]["Tables"]["organization_users"]["Update"] = {
        role: "Owner",
      };
      const updateNewOwnerQuery = (supabase
        .from("organization_users") as any)
        .update(updateNewOwnerData)
        .eq("organization_id", organizationId.toString())
        .eq("user_id", target_user_id);
      const { error: updateNewOwnerError } = await updateNewOwnerQuery as { error: any };

      if (updateNewOwnerError) {
        console.error("Error updating new owner role:", updateNewOwnerError);
        // Rollback: restore old owner's role
        const rollbackData: Database["public"]["Tables"]["organization_users"]["Update"] = {
          role: "Owner",
        };
        await ((supabase
          .from("organization_users") as any)
          .update(rollbackData)
          .eq("organization_id", organizationId.toString())
          .eq("user_id", organization.owner_id) as any);
        return res.status(500).json({ 
          error: "Failed to update new owner role", 
          details: updateNewOwnerError.message 
        });
      }

      // 3. Finally, update organization owner_id
      const updateOrgData: Database["public"]["Tables"]["organizations"]["Update"] = {
        owner_id: target_user_id,
      };
      const updateOrgQuery = (supabase
        .from("organizations") as any)
        .update(updateOrgData)
        .eq("id", organizationId.toString());
      const { error: updateOrgError } = await updateOrgQuery as { error: any };

      if (updateOrgError) {
        console.error("Error updating organization owner_id:", updateOrgError);
        // Rollback: restore both roles
        const rollbackOldOwnerData: Database["public"]["Tables"]["organization_users"]["Update"] = {
          role: "Owner",
        };
        await ((supabase
          .from("organization_users") as any)
          .update(rollbackOldOwnerData)
          .eq("organization_id", organizationId.toString())
          .eq("user_id", organization.owner_id) as any);
        
        const rollbackTargetData: Database["public"]["Tables"]["organization_users"]["Update"] = {
          role: oldRole as any,
        };
        await ((supabase
          .from("organization_users") as any)
          .update(rollbackTargetData)
          .eq("organization_id", organizationId.toString())
          .eq("user_id", target_user_id) as any);
        return res
          .status(500)
          .json({ 
            error: "Failed to update organization owner", 
            details: updateOrgError.message 
          });
      }

      return res.status(200).json({
        message: "Ownership transferred successfully",
        role: "Owner",
      });
    } else {
      // For non-Owner role changes, just update the role
      // Prevent changing the current owner's role (already checked above for Admins)
      if (isOwner && organization?.owner_id === target_user_id) {
        return res
          .status(400)
          .json({ error: "Cannot change the owner's role" });
      }

      const updateData: Database["public"]["Tables"]["organization_users"]["Update"] = {
        role: new_role as any,
      };
      const updateQuery = (supabase
        .from("organization_users") as any)
        .update(updateData)
        .eq("organization_id", organizationId.toString())
        .eq("user_id", target_user_id);
      const { error: updateError } = await updateQuery as { error: any };

      if (updateError) {
        console.error("Error updating role:", updateError);
        return res.status(500).json({ 
          error: "Failed to update role", 
          details: updateError.message 
        });
      }

      return res.status(200).json({
        message: "Role updated successfully",
        role: new_role,
      });
    }
  } catch (error: any) {
    console.error("Error updating role:", error);
    console.error("Error stack:", error.stack);
    console.error("Request body:", req.body);
    console.error("Organization ID:", organizationId);
    return res.status(500).json({ 
      error: error.message || "Internal server error",
      details: error.stack 
    });
  }
}
