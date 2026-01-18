import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Database } from "@/lib/types/supabase";

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
    const invitesResult = await supabase
      .from("organization_invites")
      .select("*")
      .eq("email", email);
    
    const { data: invites, error: invitesError } = invitesResult as {
      data: Database["public"]["Tables"]["organization_invites"]["Row"][] | null;
      error: any;
    };

    if (invitesError) throw invitesError;

    if (!invites || invites.length === 0) {
      return res.status(200).json({ message: "No pending invites" });
    }

    // Process each invite
    for (const invite of invites) {
      // Add user to organization
      const insertData: Database["public"]["Tables"]["organization_users"]["Insert"] = {
        organization_id: invite.organization_id,
        user_id: userId,
        role: invite.role,
      };
      const memberResult = await (supabase
        .from("organization_users") as any)
        .insert(insertData as any);
      const { error: memberError } = memberResult as { error: any };

      if (memberError) throw memberError;

      // Delete the processed invite
      const deleteQuery = (supabase
        .from("organization_invites") as any)
        .delete()
        .eq("id", invite.id);
      const { error: deleteError } = await deleteQuery as { error: any };

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
