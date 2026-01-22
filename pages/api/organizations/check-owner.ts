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

  const { organization_id } = req.body;

  if (!organization_id) {
    return res
      .status(400)
      .json({ error: "Missing required field: organization_id" });
  }

  try {
    // First check if authenticated user is the owner of the organization
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
      return res
        .status(500)
        .json({ error: "Error checking organization ownership" });
    }

    // If authenticated user is the owner, return true immediately
    if (organization?.owner_id === user.id) {
      return res.status(200).json({ isOwner: true });
    }

    // If not the owner, check their role in organization_users
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
      

    if (roleError) {
      return res.status(500).json({ error: "Error checking user role" });
    }
    
    
    const isOwner = userRole?.role === "Owner";

    return res.status(200).json({ isOwner });
  } catch (err) {
    console.error("Error checking organization owner status:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
