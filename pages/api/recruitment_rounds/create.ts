import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, recruitment_cycle_id } = req.body;
  console.log(req.body);

  if (!name || !recruitment_cycle_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("recruitment_rounds")
    .insert([
        { name: name, recruitment_cycle_id: recruitment_cycle_id },
      ])
    .select();

  if (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
}
