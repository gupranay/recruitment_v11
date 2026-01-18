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

    // Check if user is the actual owner
    if (organization?.owner_id === user_id) {
      isOwner = true;
    } else {
      // Check if user is Owner in organization_users
      const roleResult = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organization_id)
        .eq("user_id", user_id)
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
        error: "Only owners can archive/unarchive recruitment cycles" 
      });
    }

    // Verify the cycle belongs to the organization
    const cycleResult = await supabase
      .from("recruitment_cycles")
      .select("id, organization_id")
      .eq("id", cycle_id)
      .single();
    
    const { data: cycle, error: cycleError } = cycleResult as {
      data: { id: string; organization_id: string } | null;
      error: any;
    };

    if (cycleError || !cycle) {
      return res.status(404).json({ error: "Recruitment cycle not found" });
    }

    if (cycle.organization_id !== organization_id) {
      return res.status(403).json({ 
        error: "Recruitment cycle does not belong to this organization" 
      });
    }

    // Update the archived status
    const updateData: Database["public"]["Tables"]["recruitment_cycles"]["Update"] = {
      archived,
    };
    const updateQuery = (supabase
      .from("recruitment_cycles") as any)
      .update(updateData)
      .eq("id", cycle_id)
      .select()
      .single();
    const updateResult = await updateQuery as any;
    const { data: updatedCycle, error: updateError } = updateResult as {
      data: Database["public"]["Tables"]["recruitment_cycles"]["Row"] | null;
      error: any;
    };

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.status(200).json(updatedCycle);
  } catch (err) {
    console.error("Error archiving/unarchiving recruitment cycle:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
