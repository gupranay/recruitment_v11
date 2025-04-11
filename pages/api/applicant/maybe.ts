import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { applicant_id, applicant_round_id } = req.body;

  if (!applicant_id || !applicant_round_id) {
    return res
      .status(400)
      .json({
        error: "Missing required fields: applicant_id, applicant_round_id",
      });
  }

  const supabase = supabaseBrowser();

  // Update the applicant's status to maybe
  const { data, error } = await supabase
    .from("applicant_rounds")
    .update({ status: "maybe" })
    .eq("id", applicant_round_id)
    .eq("applicant_id", applicant_id)
    .select()
    .single();

  if (error) {
    console.error("Error setting applicant as maybe:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    message: "Applicant set as maybe successfully",
    applicantRound: data,
  });
}
