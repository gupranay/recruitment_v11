import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Database } from "@/lib/types/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { applicant_id, applicant_round_id } = req.body;

  // Basic validation
  if (!applicant_id || !applicant_round_id) {
    return res.status(400).json({
      error: "Missing required fields: applicant_id and applicant_round_id",
    });
  }

  const supabase = supabaseBrowser();

  // Update the bridging record to "accepted"
  const updateData: Database["public"]["Tables"]["applicant_rounds"]["Update"] = {
    status: "accepted",
  };
  const updateQuery = (supabase
    .from("applicant_rounds") as any)
    .update(updateData)
    .eq("applicant_id", applicant_id)
    .eq("id", applicant_round_id)
    .select()
    .single();
  const updateResult = await updateQuery as any;
  const { data, error } = updateResult as {
    data: Database["public"]["Tables"]["applicant_rounds"]["Row"] | null;
    error: any;
  };

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    message: "Applicant accepted successfully (final round).",
    updatedRecord: data
  });
}
