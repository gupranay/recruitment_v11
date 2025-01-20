import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Expect applicant_id in the request body
  const { applicant_id } = req.body;
  if (!applicant_id) {
    return res.status(400).json({ error: "No Applicants" });
  }

  const supabase = supabaseBrowser();

  try {
    // 1) Fetch the applicant row, selecting only the `data` column
    const { data, error } = await supabase
      .from("applicants")
      .select("data")
      .eq("id", applicant_id)
      .single();

    if (error) {
      console.error("Error fetching applicant data:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Applicant not found or no data" });
    }

    // 2) Extract the JSON object from `data`
    const applicantData = data.data; // if `data` column is named `data`
    if (!applicantData || typeof applicantData !== "object") {
      // If it's null, empty, or not an object
      return res.status(200).json({ columns: [] });
    }

    // 3) Get top-level keys from the JSON object
    const columns = Object.keys(applicantData);

    // 4) Return them
    console.log("Columns:", columns);
    return res.status(200).json({ columns });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
