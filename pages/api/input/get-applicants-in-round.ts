// /pages/api/get-applicants-in-round.ts
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { recruitment_round_id } = req.body;
  if (!recruitment_round_id) {
    return res.status(400).json({ error: "Missing required field: recruitment_round_id" });
  }

  const supabase = supabaseBrowser();

  // For example, "applicant_rounds" bridging table ties applicant -> round
  const { data, error } = await supabase
    .from("applicant_rounds")
    .select(`
      applicant_id,
      applicants (
        id,
        name,
        headshot_url
      )
    `)
    .eq("recruitment_round_id", recruitment_round_id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Flatten the data so it's an array of applicant objects
  const applicants = data.map((row) => row.applicants);

  return res.status(200).json(applicants);
}
