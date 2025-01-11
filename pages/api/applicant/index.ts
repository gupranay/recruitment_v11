import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  console.log(req.body)
  const { applicant_id } = req.body;
  console.log("applicant_id: ", applicant_id);

  if (!applicant_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const supabase = supabaseBrowser();
  const { data, error } = await supabase
    .from("applicants")
    .select("*")
    .eq("id", applicant_id);
  
  
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }

    //   console.log(data[0])

  res.status(200).json(data[0]);
}