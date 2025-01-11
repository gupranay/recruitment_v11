import { supabaseBrowser } from "@/lib/supabase/browser";
import { supabaseServer } from "@/lib/supabase/server";
import { createClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // console.log("here");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
  const { name,user } = req.body;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const supabase = supabaseBrowser();
  
  
  const { data, error } = await supabase
    .from("organizations")
    .insert({ name, owner_id: user.id})
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // console.log("created org: ",data);

  res.status(201).json(data);
}
