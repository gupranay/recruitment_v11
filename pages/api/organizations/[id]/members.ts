import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
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
  invited_by: {
    email: string;
    full_name: string | null;
  } | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = supabaseBrowser();
  const organizationId = Array.isArray(req.query.id)
    ? req.query.id[0]
    : req.query.id;

  if (!organizationId) {
    return res.status(400).json({ error: "Organization ID is required" });
  }

  if (req.method === "GET") {
    try {
      // Get all members of the organization with their user details
      const { data: members, error: membersError } = await supabase
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

      if (membersError) throw membersError;

      // Get all pending invites
      const { data: invites, error: invitesError } = await supabase
        .from("organization_invites")
        .select(
          `
          id,
          email,
          role,
          created_at,
          invited_by (
            email,
            full_name
          )
        `
        )
        .eq("organization_id", organizationId);

      if (invitesError) throw invitesError;

      // Transform the data to match our Member type
      const activeMembers = (members as OrganizationUserWithDetails[]).map(
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
      const pendingMembers = (invites as InviteWithDetails[]).map((invite) => ({
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
    const { email, role, user_id } = req.body;

    try {
      // First check if the user making the request has appropriate permissions
      const { data: membership, error: membershipError } = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user_id)
        .single();

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

      // Check if there's already a pending invite
      const { data: existingInvite, error: inviteError } = await supabase
        .from("organization_invites")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("email", email)
        .single();

      if (existingInvite) {
        return res
          .status(400)
          .json({ error: "An invitation has already been sent to this email" });
      }

      // Check if the user already exists
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      // If user exists, add them directly
      if (existingUser) {
        // Check if they're already a member
        const { data: existingMember } = await supabase
          .from("organization_users")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("user_id", existingUser.id)
          .single();

        if (existingMember) {
          return res
            .status(400)
            .json({ error: "User is already a member of this organization" });
        }

        // Add them as a member
        const { error: addError } = await supabase
          .from("organization_users")
          .insert({
            organization_id: organizationId,
            user_id: existingUser.id,
            role: role,
          });

        if (addError) throw addError;

        return res.status(200).json({
          message: "Member added successfully",
          status: "added",
        });
      }

      // If user doesn't exist, create an invitation
      const { error: createInviteError } = await supabase
        .from("organization_invites")
        .insert({
          organization_id: organizationId,
          email,
          role,
          invited_by: user_id,
        });

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

    try {
      // First check if the user making the request is an owner
      const { data: membership, error: membershipError } = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organizationId)
        .single();

      if (membershipError || !membership || membership.role !== "Owner") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Remove the member
      const { error } = await supabase
        .from("organization_users")
        .delete()
        .eq("organization_id", organizationId)
        .eq("user_id", userId);

      if (error) throw error;

      return res.status(200).json({ message: "Member removed successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
