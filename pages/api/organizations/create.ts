import { supabaseBrowser } from "@/lib/supabase/browser";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // console.log("here");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, user } = req.body;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const supabase = supabaseBrowser();

  // Start a Supabase transaction
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .insert({ name, owner_id: user.id })
    .select()
    .single();

  if (orgError) {
    return res.status(400).json({ error: orgError.message });
  }

  // Create org_user entry for the owner
  const { error: orgUserError } = await supabase
    .from("organization_users")
    .insert({
      organization_id: organization.id,
      user_id: user.id,
      role: "Owner", // Role must be 'Owner', 'Admin', or 'Member'
    });

  if (orgUserError) {
    // If org_user creation fails, we should ideally rollback the organization creation
    // But since we don't have transaction support, we'll just return the error
    return res.status(400).json({ error: orgUserError.message });
  }

  // console.log("created org: ",data);

  res.status(201).json(organization);
}
