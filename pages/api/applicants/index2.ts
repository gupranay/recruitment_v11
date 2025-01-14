import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  

  const recruitment_round_id  = req.body;

  // console.log("recruitment_round_id: ", recruitment_round_id.recruitment_round_id);

  if (!recruitment_round_id) {
    return res.status(400).json({ error: "Missing required field: recruitment_round_id" });
  }
  const supabase = supabaseBrowser();

  /*
    We'll query the bridging table: applicant_rounds
    and use nested select to pull data from applicants:
  */
  const { data, error } = await supabase
    .from("applicant_rounds")
    .select(`
      id,
      applicant_id,
      status,
      applicants (
        id,
        name,
        headshot_url, 
        email
      )
    `)
    .eq("recruitment_round_id", recruitment_round_id.recruitment_round_id);

  if (error) {
    console.error("Error fetching applicants:", error.message);
    return res.status(400).json({ error: error.message });
  }

  const result = data.map((item) => ({
    applicant_round_id: item.id,
    applicant_id: item.applicant_id,
    name: item.applicants?.name,
    headshot_url: item.applicants?.headshot_url,
    email: item.applicants?.email,
    status: item.status,
  }));

  // console.log("recruitment round api: ", result);

  return res.status(200).json(result);
}
