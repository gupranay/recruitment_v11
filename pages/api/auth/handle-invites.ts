import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";
import type { PostgrestError } from "@supabase/supabase-js";
import { sendOrganizationMemberEmail } from "@/lib/email/email-service";
import { HOSTNAME } from "@/lib/constant/inedx";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
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

  // This prevents attackers from claiming invites for other users
  const email = user.email;
  const userId = user.id;

  if (!email) {
    return res.status(400).json({ error: "User email not found" });
  }

  // Fetch full_name if not available in user_metadata
  let recipientFullName: string | null = user.user_metadata?.full_name || null;
  if (!recipientFullName) {
    const fullNameResult = await supabase
      .from("users")
      .select("full_name")
      .eq("id", userId)
      .single();
    
    const { data: fullNameData, error: fullNameError } = fullNameResult as {
      data: { full_name: string | null } | null;
      error: any;
    };
    
    if (fullNameError) {
      console.error("Error fetching full_name from users table:", fullNameError);
    }
    
    if (fullNameData) {
      recipientFullName = fullNameData.full_name;
    }
  }

  try {
    // Get all pending invites for this authenticated user's email
    // Filter expired invites at the database level (expires_at is null OR expires_at >= now)
    // Also fetch organization and inviter details for email notifications
    const now = new Date().toISOString();
    const invitesResult = await supabase
      .from("organization_invites")
      .select(`
        *,
        organizations (
          id,
          name
        ),
        invited_by_user:users!organization_invites_invited_by_fkey (
          id,
          email,
          full_name
        )
      `)
      .eq("email", email)
      .or(`expires_at.is.null,expires_at.gte.${now}`);

    type InviteWithDetails = Database["public"]["Tables"]["organization_invites"]["Row"] & {
      organizations: { id: string; name: string } | null;
      invited_by_user: { id: string; email: string; full_name: string | null } | null;
    };

    const { data: invites, error: invitesError } = invitesResult as {
      data: InviteWithDetails[] | null;
      error: any;
    };

    if (invitesError) throw invitesError;

    if (!invites || invites.length === 0) {
      return res.status(200).json({ message: "No pending invites" });
    }

    let processedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process each invite
    for (const invite of invites) {
      try {
        // Verify organization exists
        const orgCheck = await supabase
          .from("organizations")
          .select("id")
          .eq("id", invite.organization_id)
          .single();

        if (orgCheck.error || !orgCheck.data) {
          // Organization doesn't exist, delete the orphaned invite
          const deleteResult = await supabase
            .from("organization_invites")
            .delete()
            .eq("id", invite.id);
          const { error: deleteError } = deleteResult as { error: any };

          if (deleteError) {
            console.error(`Failed to delete orphaned invite ${invite.id}:`, deleteError);
            // Continue processing other invites even if delete fails
          }
          skippedCount++;
          continue;
        }

        // Check if user is already a member of this organization
        const existingMemberCheck = await supabase
          .from("organization_users")
          .select("id")
          .eq("organization_id", invite.organization_id)
          .eq("user_id", userId)
          .single();

        const { data: existingMember } = existingMemberCheck as {
          data: { id: string } | null;
          error: any;
        };

        if (existingMember) {
          // User is already a member, just delete the invite
          const deleteResult = await supabase
            .from("organization_invites")
            .delete()
            .eq("id", invite.id);
          const { error: deleteError } = deleteResult as { error: any };

          if (deleteError) {
            console.error(`Failed to delete invite ${invite.id} (user already member):`, deleteError);
            // Continue processing other invites even if delete fails
          }
          skippedCount++;
          continue;
        }

        // Add user to organization
        const insertData: Database["public"]["Tables"]["organization_users"]["Insert"] =
          {
            organization_id: invite.organization_id,
            user_id: userId,
            role: invite.role,
          };
        // Type assertion needed due to TypeScript inference limitation with createServerClient from @supabase/ssr
        // insertData is properly typed, and we properly type the error below
        type InsertResult = { data: null; error: PostgrestError | null };
        const tableBuilder = supabase.from("organization_users") as unknown as {
          insert: (values: Database["public"]["Tables"]["organization_users"]["Insert"]) => Promise<InsertResult>;
        };
        const memberResult = await tableBuilder.insert(insertData);
        const { error: memberError } = memberResult;

        if (memberError) {
          // Check if it's a duplicate key error (race condition)
          if (
            memberError.code === "23505" ||
            memberError.message?.includes("duplicate")
          ) {
            // User was added by another process, just delete the invite
            await supabase
              .from("organization_invites")
              .delete()
              .eq("id", invite.id);
            skippedCount++;
            continue;
          }
          throw memberError;
        }

        // Delete the processed invite
        const deleteResult = await supabase
          .from("organization_invites")
          .delete()
          .eq("id", invite.id);
        const { error: deleteError } = deleteResult as { error: any };

        if (deleteError) {
          console.error(`Failed to delete invite ${invite.id}:`, deleteError);
          // Continue processing other invites even if delete fails
        }

        // Send email notification (non-blocking)
        // Note: Email sending is done asynchronously and errors are logged but don't block the response
        if (invite.organizations && invite.invited_by_user) {
          // Use authenticated user's email and fetched full_name
          const dashboardUrl = `${HOSTNAME.replace(/\/$/, "")}/dash`;
          sendOrganizationMemberEmail({
            recipientEmail: email,
            recipientName: recipientFullName,
            organizationName: invite.organizations.name,
            inviterName: invite.invited_by_user.full_name,
            inviterEmail: invite.invited_by_user.email,
            role: invite.role,
            hasAccount: true, // User is authenticated, so they have an account
            dashboardUrl: dashboardUrl,
          }).catch((emailError) => {
            console.error(`Failed to send member addition email for invite ${invite.id}:`, emailError);
          });
        }

        processedCount++;
      } catch (inviteError: any) {
        console.error(`Error processing invite ${invite.id}:`, inviteError);
        errors.push(`Invite ${invite.id}: ${inviteError.message}`);
        // Continue processing other invites
      }
    }

    const responseMessage =
      processedCount > 0
        ? `Successfully processed ${processedCount} invite${processedCount > 1 ? "s" : ""}`
        : "No invites were processed";

    // Check errors first - return 207 Multi-Status if any errors exist
    if (errors.length > 0) {
      return res.status(207).json({
        message: responseMessage,
        processed: processedCount,
        skipped: skippedCount > 0 ? skippedCount : undefined,
        errors,
      });
    }

    // If no errors but there are skips, return 200 with skip info
    if (skippedCount > 0) {
      return res.status(200).json({
        message: `${responseMessage} (${skippedCount} skipped - already members or invalid)`,
        processed: processedCount,
        skipped: skippedCount,
      });
    }

    // Pure success - no errors, no skips
    return res.status(200).json({
      message: responseMessage,
      processed: processedCount,
    });
  } catch (error: any) {
    console.error("Error processing invites:", error);
    return res.status(500).json({ error: error.message });
  }
}
