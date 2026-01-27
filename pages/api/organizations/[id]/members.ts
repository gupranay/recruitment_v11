import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";
import { sendOrganizationMemberEmail } from "@/lib/email/email-service";
import { HOSTNAME } from "@/lib/constant/inedx";

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
  res: NextApiResponse,
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
        `,
        )
        .eq("organization_id", organizationId);

      const { data: members, error: membersError } = membersResult as {
        data: OrganizationUserWithDetails[] | null;
        error: any;
      };

      if (membersError) throw membersError;

      // Get all pending invites (non-expired only)
      const now = new Date().toISOString();
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
        `,
        )
        .eq("organization_id", organizationId)
        .or(`expires_at.is.null,expires_at.gt.${now}`);

      const { data: invites, error: invitesError } = invitesResult as {
        data: InviteWithDetails[] | null;
        error: any;
      };

      if (invitesError) throw invitesError;

      // Transform the data to match our Member type
      const activeMembers = (members || []).map((member) => ({
        id: member.users.id,
        email: member.users.email,
        name: member.users.full_name,
        avatar: member.users.avatar_url,
        role: member.role,
        status: "active" as const,
      }));

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

    // Validate email presence and type
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Normalize email once at the start
    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format using normalized email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Validate role
    if (!role || !["Owner", "Admin", "Member"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

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
        .eq("email", normalizedEmail)
        .or(`expires_at.is.null,expires_at.gt.${now}`);

      const { data: existingInvites, error: inviteError } = inviteResult as {
        data: { id: string; expires_at: string | null }[] | null;
        error: any;
      };

      // If there's a non-expired invite, return error
      if (existingInvites && existingInvites.length > 0) {
        return res
          .status(400)
          .json({
            error: "An active invitation has already been sent to this email",
          });
      }

      // Clean up any expired invites for this email/organization
      const { error } = await supabase
        .from("organization_invites")
        .delete()
        .eq("organization_id", organizationId)
        .eq("email", normalizedEmail)
        .lt("expires_at", now);

      if (error) {
        console.warn("Failed to cleanup expired invites:", error);
      }

      // Check if the user already exists
      const userResult = await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
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
        const insertData: Database["public"]["Tables"]["organization_users"]["Insert"] =
          {
            organization_id: organizationId,
            user_id: existingUser.id,
            role: role,
          };
        const addQuery = (supabase.from("organization_users") as any).insert(
          insertData as any,
        );
        const { error: addError } = (await addQuery) as { error: any };

        if (addError) throw addError;

        // Send email notification (non-blocking)
        // Note: Email sending is done asynchronously and errors are logged but don't block the response
        sendEmailNotificationForMember({
          supabase,
          organizationId,
          inviterId: user.id,
          recipientId: existingUser.id,
          role,
          hasAccount: true,
        }).catch((emailError) => {
          console.error("Failed to send member addition email:", emailError);
        });

        return res.status(200).json({
          message: "Member added successfully",
          status: "added",
        });
      }

      // If user doesn't exist, create an invitation
      const inviteInsertData: Database["public"]["Tables"]["organization_invites"]["Insert"] =
        {
          organization_id: organizationId,
          email: normalizedEmail,
          role,
          invited_by: user.id,
        };
      const createInviteQuery = (
        supabase.from("organization_invites") as any
      ).insert(inviteInsertData as any);
      const { error: createInviteError } = (await createInviteQuery) as {
        error: any;
      };

      if (createInviteError) throw createInviteError;

      // Send email notification for invite (non-blocking)
      // Note: Email sending is done asynchronously and errors are logged but don't block the response
      sendEmailNotificationForInvite({
        supabase,
        organizationId,
        inviterId: user.id,
        recipientEmail: normalizedEmail,
        role,
        hasAccount: false,
      }).catch((emailError) => {
        console.error("Failed to send invite email:", emailError);
      });

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

      const { data: membership, error: membershipError } =
        membershipResult2 as {
          data: { role: string } | null;
          error: any;
        };

      if (membershipError || !membership) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Only owners can remove members, but admins can remove other members (not owners/admins)
      if (membership.role !== "Owner" && membership.role !== "Admin") {
        return res
          .status(403)
          .json({ error: "Only owners and admins can remove members" });
      }

      // Check the role of the member being removed
      const targetMemberResult = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .single();

      const { data: targetMember, error: targetMemberError } =
        targetMemberResult as {
          data: { role: string } | null;
          error: any;
        };

      if (targetMemberError) {
        return res
          .status(500)
          .json({
            error: targetMemberError.message || "Error fetching target member",
          });
      }

      if (!targetMember) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Explicit self-removal check - users cannot remove themselves
      if (userId === user.id) {
        return res
          .status(400)
          .json({
            error:
              "Users cannot remove themselves. Transfer ownership or leave organization appropriately.",
          });
      }

      // Admins can only remove Members, not other Admins or Owners
      if (membership.role === "Admin" && targetMember.role !== "Member") {
        return res
          .status(403)
          .json({
            error: "Admins can only remove members, not other admins or owners",
          });
      }

      // Remove the member
      const deleteQuery = (supabase.from("organization_users") as any)
        .delete()
        .eq("organization_id", organizationId)
        .eq("user_id", userId);
      const { error } = (await deleteQuery) as { error: any };

      if (error) throw error;

      return res.status(200).json({ message: "Member removed successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

/**
 * Helper function to send email notification when a member is added
 * This prevents code duplication and centralizes email sending logic
 */
async function sendEmailNotificationForMember({
  supabase,
  organizationId,
  inviterId,
  recipientId,
  role,
  hasAccount,
}: {
  supabase: any;
  organizationId: string;
  inviterId: string;
  recipientId: string;
  role: string;
  hasAccount: boolean;
}): Promise<void> {
  // Fetch all required data in parallel for efficiency
  const [orgResult, inviterResult, recipientResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single(),
    supabase
      .from("users")
      .select("email, full_name")
      .eq("id", inviterId)
      .single(),
    supabase
      .from("users")
      .select("email, full_name")
      .eq("id", recipientId)
      .single(),
  ]);

  const organization = orgResult.data as { name: string } | null;
  const inviter = inviterResult.data as {
    email: string;
    full_name: string | null;
  } | null;
  const recipient = recipientResult.data as {
    email: string;
    full_name: string | null;
  } | null;

  if (!organization || !inviter || !recipient) {
    console.warn("Missing data for email notification:", {
      organization: !!organization,
      inviter: !!inviter,
      recipient: !!recipient,
    });
    return;
  }

  const dashboardUrl = `${HOSTNAME.replace(/\/$/, "")}/dash`;
  await sendOrganizationMemberEmail({
    recipientEmail: recipient.email,
    recipientName: recipient.full_name,
    organizationName: organization.name,
    inviterName: inviter.full_name,
    inviterEmail: inviter.email,
    role,
    hasAccount,
    dashboardUrl,
  });
}

/**
 * Helper function to send email notification when an invite is created
 * This prevents code duplication and centralizes email sending logic
 */
async function sendEmailNotificationForInvite({
  supabase,
  organizationId,
  inviterId,
  recipientEmail,
  role,
  hasAccount,
}: {
  supabase: any;
  organizationId: string;
  inviterId: string;
  recipientEmail: string;
  role: string;
  hasAccount: boolean;
}): Promise<void> {
  // Fetch required data in parallel for efficiency
  const [orgResult, inviterResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single(),
    supabase
      .from("users")
      .select("email, full_name")
      .eq("id", inviterId)
      .single(),
  ]);

  const organization = orgResult.data as { name: string } | null;
  const inviter = inviterResult.data as {
    email: string;
    full_name: string | null;
  } | null;

  if (!organization || !inviter) {
    console.warn("Missing data for email notification:", {
      organization: !!organization,
      inviter: !!inviter,
    });
    return;
  }

  const dashboardUrl = `${HOSTNAME.replace(/\/$/, "")}/dash`;
  await sendOrganizationMemberEmail({
    recipientEmail,
    recipientName: null, // User doesn't exist, so no name
    organizationName: organization.name,
    inviterName: inviter.full_name,
    inviterEmail: inviter.email,
    role,
    hasAccount,
    dashboardUrl,
  });
}
