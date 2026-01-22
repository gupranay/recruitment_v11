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

  const { cycle_id, organization_id } = req.body;

  if (!cycle_id || !organization_id) {
    return res.status(400).json({
      error: "Missing required fields: cycle_id, organization_id",
    });
  }

  try {
    // Verify the authenticated user is Owner only (not Admin)
    // First check if user is the organization owner
    const orgResult = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organization_id)
      .single();
    
    const { data: organization, error: orgError } = orgResult as {
      data: { owner_id: string } | null;
      error: any;
    };

    if (orgError) {
      return res.status(500).json({ error: "Error checking organization ownership" });
    }

    let isOwner = false;

    // Check if authenticated user is the actual owner
    if (organization?.owner_id === user.id) {
      isOwner = true;
    } else {
      // Check if authenticated user is Owner in organization_users
      const roleResult = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organization_id)
        .eq("user_id", user.id)
        .single();
      
      const { data: userRole, error: roleError } = roleResult as {
        data: { role: string } | null;
        error: any;
      };

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
    const cycleResult = await supabase
      .from("recruitment_cycles")
      .select("id, organization_id, archived, name")
      .eq("id", cycle_id)
      .single();
    
    const { data: cycle, error: cycleError } = cycleResult as {
      data: { id: string; organization_id: string; archived: boolean; name: string } | null;
      error: any;
    };

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
    const roundsResult = await supabase
      .from("recruitment_rounds")
      .select("id")
      .eq("recruitment_cycle_id", cycle_id)
      .limit(1);
    
    const { data: recruitmentRounds, error: roundsError } = roundsResult as {
      data: Array<{ id: string }> | null;
      error: any;
    };

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
    const applicantsResult = await supabase
      .from("applicants")
      .select("id")
      .eq("recruitment_cycle_id", cycle_id)
      .limit(1);
    
    const { data: applicants, error: applicantsError } = applicantsResult as {
      data: Array<{ id: string }> | null;
      error: any;
    };

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
    const deleteQuery = (supabase
      .from("recruitment_cycles") as any)
      .delete()
      .eq("id", cycle_id);
    const { error: deleteError } = await deleteQuery as { error: any };

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
