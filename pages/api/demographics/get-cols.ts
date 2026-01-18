import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Database } from "@/lib/types/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { recruitment_round_id } = req.body;
  if (!recruitment_round_id) {
    return res.status(400).json({
      error: "Missing required field: recruitment_round_id"
    });
  }

  const supabase = supabaseBrowser();

  try {
    // 1) Find the FIRST applicant in that round, and fetch their data column
    //    We limit(1) so we only get the first row. You could also order by created_at, etc.
    type RowWithApplicant = {
      applicant_id: string;
      applicants: {
        data: Database["public"]["Tables"]["applicants"]["Row"]["data"];
      } | null;
    };
    
    const result = await supabase
      .from("applicant_rounds")
      .select(`
        applicant_id,
        applicants (
          data
        )
      `)
      .eq("recruitment_round_id", recruitment_round_id)
      .limit(1); // we only want the first row, not single() in case none found
    
    const { data: rows, error: selectError } = result as {
      data: RowWithApplicant[] | null;
      error: any;
    };

    if (selectError) {
      console.error("Error fetching first applicant:", selectError.message);
      return res.status(500).json({ error: selectError.message });
    }

    if (!rows || rows.length === 0) {
      // No applicants found for this round
      return res.status(200).json([]);
    }

    // 2) Extract the data JSON from the first row
    //    row shape: { applicant_id, applicants: { data: ... } }
    const row = rows[0];
    const applicantData = row.applicants?.data; // this is presumably a JSON object

    // If there's no data or it's not an object, return empty
    if (!applicantData || typeof applicantData !== "object") {
      return res.status(200).json([]);
    }

    // 3) Get the top-level keys
    //    If applicantData is indeed a JS object, just do Object.keys
    const columns = Object.keys(applicantData);

    // 4) Return the list of columns
    return res.status(200).json(columns);
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
