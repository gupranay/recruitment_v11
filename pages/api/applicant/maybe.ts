import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  const { applicant_id, applicant_round_id } = req.body;

  if (!applicant_id || !applicant_round_id) {
    return res
      .status(400)
      .json({
        error: "Missing required fields: applicant_id, applicant_round_id",
      });
  }

  // Update the applicant's status to maybe
  const updateData: Database["public"]["Tables"]["applicant_rounds"]["Update"] = {
    status: "maybe",
  };
  const updateQuery = (supabase
    .from("applicant_rounds") as any)
    .update(updateData)
    .eq("id", applicant_round_id)
    .eq("applicant_id", applicant_id)
    .select()
    .single();
  const updateResult = await updateQuery as any;
  const { data, error } = updateResult as {
    data: Database["public"]["Tables"]["applicant_rounds"]["Row"] | null;
    error: any;
  };

  if (error) {
    console.error("Error setting applicant as maybe:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    message: "Applicant set as maybe successfully",
    applicantRound: data,
  });
}
