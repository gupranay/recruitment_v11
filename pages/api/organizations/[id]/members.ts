import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

type OrganizationUserWithDetails = {
  id: string;
  role: Database["public"]["Enums"]["role_type"];
  users: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
};

type InviteWithDetails = {
  id: string;
  email: string;
  role: Database["public"]["Enums"]["role_type"];
  created_at: string;
  expires_at: string | null;
  invited_by: {
    email: string;
    full_name: string | null;
  } | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  if (!organizationId) {
    return res.status(400).json({ error: "Organization ID is required" });
  }

  if (req.method === "GET") {
    try {
      // Get all members of the organization with their user details
      const membersResult = await supabase
        .from("organization_users")
        .select(
          `
          id,
          role,
          users (
            id,
            email,
            full_name,
            avatar_url
          )
        `
        )
        .eq("organization_id", organizationId);
      
      const { data: members, error: membersError } = membersResult as {
        data: OrganizationUserWithDetails[] | null;
        error: any;
      };

      if (membersError) throw membersError;

      // Get all pending invites (we'll filter expired ones after fetching)
      const invitesResult = await supabase
        .from("organization_invites")
        .select(
          `
          id,
          email,
          role,
          created_at,
          expires_at,
          invited_by (
            email,
            full_name
          )
        `
        )
        .eq("organization_id", organizationId);
      
      const { data: allInvites, error: invitesError } = invitesResult as {
        data: InviteWithDetails[] | null;
        error: any;
      };

      if (invitesError) throw invitesError;

      // Filter out expired invites
      const now = new Date().toISOString();
      const invites = (allInvites || []).filter(
        (invite) => !invite.expires_at || invite.expires_at >= now
      );

      // Transform the data to match our Member type
      const activeMembers = (members || []).map(
        (member) => ({
          id: member.users.id,
          email: member.users.email,
          name: member.users.full_name,
          avatar: member.users.avatar_url,
          role: member.role,
          status: "active" as const,
        })
      );

      // Add pending invites to the members list
      const pendingMembers = (invites || []).map((invite) => ({
        id: invite.id,
        email: invite.email,
        name: null,
        avatar: null,
        role: invite.role,
        status: "pending" as const,
        invited_at: invite.created_at,
        invited_by: invite.invited_by?.email,
      }));

      return res.status(200).json([...activeMembers, ...pendingMembers]);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    const { email, role } = req.body;

    try {
      // First check if the authenticated user has appropriate permissions
      const membershipResult = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();
      
      const { data: membership, error: membershipError } = membershipResult as {
        data: { role: string } | null;
        error: any;
      };

      if (membershipError || !membership) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Check permissions based on role
      if (role === "Admin" && membership.role !== "Owner") {
        return res.status(403).json({ error: "Only owners can add admins" });
      }

      if (membership.role !== "Owner" && membership.role !== "Admin") {
        return res
          .status(403)
          .json({ error: "Only owners and admins can add members" });
      }

      // Check if there's already a pending (non-expired) invite
      const now = new Date().toISOString();
      const inviteResult = await supabase
        .from("organization_invites")
        .select("id, expires_at")
        .eq("organization_id", organizationId)
        .eq("email", email)
        .or(`expires_at.is.null,expires_at.gt.${now}`);
      
      const { data: existingInvites, error: inviteError } = inviteResult as {
        data: { id: string; expires_at: string | null }[] | null;
        error: any;
      };

      // If there's a non-expired invite, return error
      if (existingInvites && existingInvites.length > 0) {
        return res
          .status(400)
          .json({ error: "An active invitation has already been sent to this email" });
      }

      // Clean up any expired invites for this email/organization
      await supabase
        .from("organization_invites")
        .delete()
        .eq("organization_id", organizationId)
        .eq("email", email)
        .lt("expires_at", now);

      // Check if the user already exists
      const userResult = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();
      
      const { data: existingUser, error: userError } = userResult as {
        data: { id: string } | null;
        error: any;
      };

      // If user exists, add them directly
      if (existingUser) {
        // Check if they're already a member
        const existingMemberResult = await supabase
          .from("organization_users")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("user_id", existingUser.id)
          .single();
        
        const { data: existingMember } = existingMemberResult as {
          data: { id: string } | null;
          error: any;
        };

        if (existingMember) {
          return res
            .status(400)
            .json({ error: "User is already a member of this organization" });
        }

        // Add them as a member
        const insertData: Database["public"]["Tables"]["organization_users"]["Insert"] = {
          organization_id: organizationId,
          user_id: existingUser.id,
          role: role,
        };
        const addQuery = (supabase
          .from("organization_users") as any)
          .insert(insertData as any);
        const { error: addError } = await addQuery as { error: any };

        if (addError) throw addError;

        return res.status(200).json({
          message: "Member added successfully",
          status: "added",
        });
      }

      // If user doesn't exist, create an invitation
      const inviteInsertData: Database["public"]["Tables"]["organization_invites"]["Insert"] = {
        organization_id: organizationId,
        email,
        role,
        invited_by: user.id,
      };
      const createInviteQuery = (supabase
        .from("organization_invites") as any)
        .insert(inviteInsertData as any);
      const { error: createInviteError } = await createInviteQuery as { error: any };

      if (createInviteError) throw createInviteError;

      // Here you would typically send an email invitation
      // For now, we'll just return success
      return res.status(200).json({
        message: "Invitation sent successfully",
        status: "invited",
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "DELETE") {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      // First check if the user making the request is an owner or admin
      const membershipResult2 = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();
      
      const { data: membership, error: membershipError } = membershipResult2 as {
        data: { role: string } | null;
        error: any;
      };

      if (membershipError || !membership) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Only owners can remove members, but admins can remove other members (not owners/admins)
      if (membership.role !== "Owner" && membership.role !== "Admin") {
        return res.status(403).json({ error: "Only owners and admins can remove members" });
      }

      // Check the role of the member being removed
      const targetMemberResult = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .single();

      const { data: targetMember, error: targetMemberError } = targetMemberResult as {
        data: { role: string } | null;
        error: any;
      };

      if (targetMemberError || !targetMember) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Admins can only remove Members, not other Admins or Owners
      if (membership.role === "Admin" && targetMember.role !== "Member") {
        return res.status(403).json({ error: "Admins can only remove members, not other admins or owners" });
      }

      // Owners cannot remove themselves
      if (membership.role === "Owner" && userId === user.id) {
        return res.status(400).json({ error: "Owners cannot remove themselves. Transfer ownership first." });
      }

      // Remove the member
      const deleteQuery = (supabase
        .from("organization_users") as any)
        .delete()
        .eq("organization_id", organizationId)
        .eq("user_id", userId);
      const { error } = await deleteQuery as { error: any };

      if (error) throw error;

      return res.status(200).json({ message: "Member removed successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
