import { supabaseBrowser } from "@/lib/supabase/browser";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, user } = req.body;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = supabaseBrowser();

  try {
    // First check if organization name already exists
    const { data: existingOrg, error: checkError } = await supabase
      .from("organizations")
      .select("id")
      .eq("name", name)
      .single();

    if (existingOrg) {
      return res
        .status(400)
        .json({ error: "Organization name already exists" });
    }

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" error
      throw checkError;
    }

    // Create the organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (orgError) {
      throw orgError;
    }

    // Create org_user entry for the owner
    const { error: orgUserError } = await supabase
      .from("organization_users")
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: "Owner",
      });

    if (orgUserError) {
      // If org_user creation fails, delete the organization
      await supabase.from("organizations").delete().eq("id", organization.id);

      throw orgUserError;
    }

    res.status(201).json(organization);
  } catch (error: any) {
    console.error("Error creating organization:", error);
    res.status(400).json({ error: error.message });
  }
}
