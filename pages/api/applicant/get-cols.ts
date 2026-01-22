import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
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

  // Expect applicant_id in the request body, optionally recruitment_round_id for ordering
  const { applicant_id, recruitment_round_id } = req.body;
  if (!applicant_id) {
    return res.status(400).json({ error: "applicant_id is required" });
  }

  try {
    // Fetch the applicant data - RLS handles authorization
    const result = await supabase
      .from("applicants")
      .select("data")
      .eq("id", applicant_id)
      .single();
    
    const { data, error } = result as {
      data: { data: Database["public"]["Tables"]["applicants"]["Row"]["data"] } | null;
      error: any;
    };

    if (error) {
      console.error("Error fetching applicant data:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Applicant not found or no data" });
    }

    // 2) Extract the JSON object from `data`
    const applicantJsonData = data.data; // if `data` column is named `data`
    if (!applicantJsonData || typeof applicantJsonData !== "object") {
      // If it's null, empty, or not an object
      return res.status(200).json({ columns: [] });
    }

    // 3) Get top-level keys from the JSON object
    let columns = Object.keys(applicantJsonData);

    // 4) If recruitment_round_id is provided, try to get the column order
    if (recruitment_round_id) {
      const roundResult = await supabase
        .from("recruitment_rounds")
        .select("column_order")
        .eq("id", recruitment_round_id)
        .single();
      
      const { data: roundData, error: roundError } = roundResult as {
        data: { column_order: string[] | null } | null;
        error: any;
      };

      if (!roundError && roundData?.column_order && Array.isArray(roundData.column_order)) {
        // Use the stored column order, but only include columns that exist in the data
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
    }

    // 5) Return them
    return res.status(200).json({ columns });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
