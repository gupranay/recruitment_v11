import { supabaseApi } from "@/lib/supabase/api";
import { NextApiRequest, NextApiResponse } from "next";
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

  const { name } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Organization name is required" });
  }

  try {
    // First check if organization name already exists
    const checkResult = await supabase
      .from("organizations")
      .select("id")
      .eq("name", name.trim())
      .single();
    
    const { data: existingOrg, error: checkError } = checkResult as {
      data: { id: string } | null;
      error: any;
    };

    if (existingOrg) {
      return res
        .status(400)
        .json({ error: "Organization name already exists" });
    }

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" error
      throw checkError;
    }

    // Create the organization - SECURITY: Use authenticated user.id, not from request
    const insertData: Database["public"]["Tables"]["organizations"]["Insert"] = {
      name: name.trim(),
      owner_id: user.id,
    };
    const orgResult = await (supabase
      .from("organizations") as any)
      .insert(insertData as any)
      .select()
      .single();
    
    const { data: organization, error: orgError } = orgResult as {
      data: Database["public"]["Tables"]["organizations"]["Row"] | null;
      error: any;
    };

    if (orgError || !organization) {
      throw orgError || new Error("Failed to create organization");
    }

    // Create org_user entry for the owner - SECURITY: Use authenticated user.id
    const orgUserInsertData: Database["public"]["Tables"]["organization_users"]["Insert"] = {
      organization_id: organization.id,
      user_id: user.id,
      role: "Owner",
    };
    const orgUserResult = await (supabase
      .from("organization_users") as any)
      .insert(orgUserInsertData as any);
    const { error: orgUserError } = orgUserResult as { error: any };

    if (orgUserError || !organization) {
      // If org_user creation fails, delete the organization
      if (organization) {
        const deleteQuery = (supabase
          .from("organizations") as any)
          .delete()
          .eq("id", organization.id);
        await deleteQuery;
      }

      throw orgUserError || new Error("Failed to create organization");
    }

    res.status(201).json(organization);
  } catch (error: any) {
    console.error("Error creating organization:", error);
    res.status(400).json({ error: error.message });
  }
}
