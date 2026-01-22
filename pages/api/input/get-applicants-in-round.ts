// /pages/api/get-applicants-in-round.ts
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

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

  const { recruitment_round_id } = req.body;
  if (!recruitment_round_id) {
    return res.status(400).json({ error: "Missing required field: recruitment_round_id" });
  }

  // For example, "applicant_rounds" bridging table ties applicant -> round
  type RowWithApplicant = {
    applicant_id: string;
    applicants: {
      id: string;
      name: string;
      headshot_url: string | null;
    } | null;
  };
  
  const result = await supabase
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
  
  const { data, error } = result as {
    data: RowWithApplicant[] | null;
    error: any;
  };

  if (error || !data) {
    return res.status(500).json({ error: error?.message || "Failed to fetch data" });
  }

  // Flatten the data so it's an array of applicant objects
  const applicants = data.map((row) => row.applicants).filter((a): a is NonNullable<typeof a> => a !== null);

  return res.status(200).json(applicants);
}
