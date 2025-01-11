import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { applicant_id, applicant_round_id, reason } = req.body;
  console.log("reject applicant_id: ", applicant_id);
  console.log("reject applicant_round_id: ", applicant_round_id);

  // Validate inputs
  if (!applicant_id || !applicant_round_id) {
    return res
      .status(400)
      .json({ error: "Missing required fields: applicant_id, applicant_round_id" });
  }

  const supabase = supabaseBrowser();

  // 1) Update the bridging record to 'rejected'
  const { data, error } = await supabase
    .from("applicant_rounds")
    .update({
      status: "rejected",
      // rejection_reason: reason || null,  // Example if you want to store a reason
      updated_at: new Date().toISOString(), // if you track timestamps manually
    })
    .eq("applicant_id", applicant_id)
    .eq("id", applicant_round_id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Return success, optionally returning the updated row
  return res.status(200).json({
    message: "Applicant rejected successfully",
    applicantRound: data,
  });
}
