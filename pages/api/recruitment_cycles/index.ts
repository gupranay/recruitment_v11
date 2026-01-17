import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { organization_id, user_id } = req.body;

  if (!organization_id || !user_id) {
    return res.status(400).json({ error: "Missing required fields: organization_id, user_id" });
  }

  const supabase = supabaseBrowser();

  try {
    // Check if user is Owner or Admin
    // First check if user is the organization owner
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organization_id)
      .single();

    if (orgError) {
      return res.status(500).json({ error: "Error checking organization ownership" });
    }

    let isOwnerOrAdmin = false;

    // Check if user is the owner
    if (organization?.owner_id === user_id) {
      isOwnerOrAdmin = true;
    } else {
      // Check if user is Owner or Admin in organization_users
      const { data: userRole, error: roleError } = await supabase
        .from("organization_users")
        .select("role")
        .eq("organization_id", organization_id)
        .eq("user_id", user_id)
        .single();

      if (roleError && roleError.code !== "PGRST116") {
        // PGRST116 is "no rows returned", which is fine
        return res.status(500).json({ error: "Error checking user role" });
      }

      if (userRole && (userRole.role === "Owner" || userRole.role === "Admin")) {
        isOwnerOrAdmin = true;
      }
    }

    // Build query
    let query = supabase
      .from("recruitment_cycles")
      .select("*")
      .eq("organization_id", organization_id);

    // If user is Member, filter out archived cycles
    if (!isOwnerOrAdmin) {
      query = query.eq("archived", false);
    }

    // Order by created_at descending (newest first)
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error("Error fetching recruitment cycles:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
