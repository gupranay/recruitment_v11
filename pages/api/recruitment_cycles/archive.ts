import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cycle_id, user_id, organization_id, archived } = req.body;

  if (!cycle_id || !user_id || !organization_id || typeof archived !== "boolean") {
    return res.status(400).json({ 
      error: "Missing required fields: cycle_id, user_id, organization_id, archived (boolean)" 
    });
  }

  const supabase = supabaseBrowser();

  try {
    // Verify the user is Owner only
    // First check if user is the organization owner
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organization_id)
      .single();

    if (orgError) {
      return res.status(500).json({ error: "Error checking organization ownership" });
    }

    let isOwner = false;

    // Check if user is the actual owner
    if (organization?.owner_id === user_id) {
      isOwner = true;
    } else {
      // Check if user is Owner in organization_users
      const { data: userRole, error: roleError } = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organization_id)
        .eq("user_id", user_id)
        .single();

      if (roleError && roleError.code !== "PGRST116") {
        return res.status(500).json({ error: "Error checking user role" });
      }

      if (userRole && userRole.role === "Owner") {
        isOwner = true;
      }
    }

    if (!isOwner) {
      return res.status(403).json({ 
        error: "Only owners can archive/unarchive recruitment cycles" 
      });
    }

    // Verify the cycle belongs to the organization
    const { data: cycle, error: cycleError } = await supabase
      .from("recruitment_cycles")
      .select("id, organization_id")
      .eq("id", cycle_id)
      .single();

    if (cycleError) {
      return res.status(404).json({ error: "Recruitment cycle not found" });
    }

    if (cycle.organization_id !== organization_id) {
      return res.status(403).json({ 
        error: "Recruitment cycle does not belong to this organization" 
      });
    }

    // Update the archived status
    const { data: updatedCycle, error: updateError } = await supabase
      .from("recruitment_cycles")
      .update({ archived })
      .eq("id", cycle_id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.status(200).json(updatedCycle);
  } catch (err) {
    console.error("Error archiving/unarchiving recruitment cycle:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
