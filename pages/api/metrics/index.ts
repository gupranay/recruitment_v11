import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { recruitment_round_id } = req.body;
  if (!recruitment_round_id) {
    return res.status(400).json({ error: "Missing recruitment_round_id" });
  }

  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from("metrics")
    .select("*")
    .eq("recruitment_round_id", recruitment_round_id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  console.log(data);

  return res.status(200).json(data);
}
