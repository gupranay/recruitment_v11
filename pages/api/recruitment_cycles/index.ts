import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { organization_id } = req.body;

  console.log(req.body);

  if (!organization_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("recruitment_cycles")
    .select("*")
    .eq("organization_id", organization_id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(200).json(data);
}
