import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cycle_id, user_id, organization_id } = req.body;

  if (!cycle_id || !user_id || !organization_id) {
    return res.status(400).json({
      error: "Missing required fields: cycle_id, user_id, organization_id",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // Verify the user is Owner only (not Admin)
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
        error: "Only owners can delete recruitment cycles",
      });
    }

    // Verify the cycle exists and belongs to the organization
    const { data: cycle, error: cycleError } = await supabase
      .from("recruitment_cycles")
      .select("id, organization_id, archived, name")
      .eq("id", cycle_id)
      .single();

    if (cycleError || !cycle) {
      return res.status(404).json({
        error: cycleError?.message || "Recruitment cycle not found",
      });
    }

    if (cycle.organization_id !== organization_id) {
      return res.status(403).json({
        error: "Recruitment cycle does not belong to this organization",
      });
    }

    // Verify the cycle is archived (only archived cycles can be deleted)
    if (!cycle.archived) {
      return res.status(400).json({
        error: "Only archived cycles can be deleted. Please archive the cycle first.",
      });
    }

    // Check for dependent data - recruitment_rounds
    const { data: recruitmentRounds, error: roundsError } = await supabase
      .from("recruitment_rounds")
      .select("id")
      .eq("recruitment_cycle_id", cycle_id)
      .limit(1);

    if (roundsError) {
      return res.status(500).json({
        error: `Error checking recruitment rounds: ${roundsError.message}`,
      });
    }

    if (recruitmentRounds && recruitmentRounds.length > 0) {
      return res.status(400).json({
        error: "Cannot delete cycle: This cycle contains recruitment rounds. Please delete all rounds before deleting the cycle.",
      });
    }

    // Check for dependent data - applicants
    const { data: applicants, error: applicantsError } = await supabase
      .from("applicants")
      .select("id")
      .eq("recruitment_cycle_id", cycle_id)
      .limit(1);

    if (applicantsError) {
      return res.status(500).json({
        error: `Error checking applicants: ${applicantsError.message}`,
      });
    }

    if (applicants && applicants.length > 0) {
      return res.status(400).json({
        error: "Cannot delete cycle: This cycle contains applicants. Please remove all applicants before deleting the cycle.",
      });
    }

    // All checks passed - safe to delete
    const { error: deleteError } = await supabase
      .from("recruitment_cycles")
      .delete()
      .eq("id", cycle_id);

    if (deleteError) {
      return res.status(500).json({
        error: `Failed to delete cycle: ${deleteError.message}`,
      });
    }

    return res.status(200).json({
      message: "Recruitment cycle deleted successfully",
      deleted_cycle_id: cycle_id,
    });
  } catch (error) {
    console.error("Unexpected error deleting recruitment cycle:", error);
    return res.status(500).json({
      error: "An unexpected error occurred while deleting the cycle",
    });
  }
}
