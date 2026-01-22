import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  const { recruitment_cycle_id } = req.body;

  if (!recruitment_cycle_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const { data, error } = await supabase
    .from("recruitment_rounds")
    .select("*")
    .eq("recruitment_cycle_id", recruitment_cycle_id)
    .order("sort_order", { ascending: true, nullsFirst: false });

  // console.log(data);
    if (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  }

  res.status(200).json(data);
}
