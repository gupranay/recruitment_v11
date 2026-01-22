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
    return res.status(400).json({
      error: "Missing required field: recruitment_round_id"
    });
  }

  try {
    // 1) First try to get the column order from the recruitment round
    const roundResult = await supabase
      .from("recruitment_rounds")
      .select("column_order")
      .eq("id", recruitment_round_id)
      .single();
    
    const { data: roundData, error: roundError } = roundResult as {
      data: { column_order: string[] | null } | null;
      error: any;
    };

    if (roundError && roundError.code !== "PGRST116") {
      // PGRST116 = no rows returned; other errors are unexpected
      console.error("Error fetching recruitment round:", roundError.message);
      return res.status(500).json({ error: roundError.message });
    }

    // 2) Find the FIRST applicant in that round, and fetch their data column
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

    // 3) Extract the data JSON from the first row
    const row = rows[0];
    const applicantData = row.applicants?.data;

    // If there's no data or it's not an object, return empty
    if (!applicantData || typeof applicantData !== "object") {
      return res.status(200).json([]);
    }

    // 4) Get the top-level keys
    let columns = Object.keys(applicantData);

    // 5) If we have a stored column order, use it
    if (roundData?.column_order && Array.isArray(roundData.column_order)) {
      const orderedColumns: string[] = [];
      const dataKeys = new Set(columns);
      
      // Add columns in the stored order
      for (const col of roundData.column_order) {
        if (dataKeys.has(col)) {
          orderedColumns.push(col);
          dataKeys.delete(col);
        }
      }
      
      // Add any remaining columns that weren't in the stored order
      for (const col of dataKeys) {
        orderedColumns.push(col);
      }
      
      columns = orderedColumns;
    }

    // 6) Return the list of columns
    return res.status(200).json(columns);
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
