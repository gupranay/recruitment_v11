import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, userId } = req.body;
  if (!email || !userId) {
    return res.status(400).json({ error: "Email and userId are required" });
  }

  const supabase = supabaseBrowser();

  try {
    // Get all pending invites for this email
    const { data: invites, error: invitesError } = await supabase
      .from("organization_invites")
      .select("*")
      .eq("email", email);

    if (invitesError) throw invitesError;

    if (!invites || invites.length === 0) {
      return res.status(200).json({ message: "No pending invites" });
    }

    // Process each invite
    for (const invite of invites) {
      // Add user to organization
      const { error: memberError } = await supabase
        .from("organization_users")
        .insert({
          organization_id: invite.organization_id,
          user_id: userId,
          role: invite.role,
        });

      if (memberError) throw memberError;

      // Delete the processed invite
      const { error: deleteError } = await supabase
        .from("organization_invites")
        .delete()
        .eq("id", invite.id);

      if (deleteError) throw deleteError;
    }

    return res.status(200).json({
      message: `Successfully processed ${invites.length} invites`,
    });
  } catch (error: any) {
    console.error("Error processing invites:", error);
    return res.status(500).json({ error: error.message });
  }
}
