import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug } = req.body;
  if (!slug) {
    return res.status(400).json({ error: "Missing required field: slug" });
  }

  const supabase = supabaseBrowser();

  try {
    // 1) Fetch the reading for the given slug
    const { data: reading, error: readingError } = await supabase
      .from("anonymous_readings")
      .select("id, recruitment_round_id, omitted_fields")
      .eq("slug", slug)
      .single();

    if (readingError) {
      return res.status(500).json({ error: readingError.message });
    }
    if (!reading) {
      return res.status(404).json({ error: "Reading not found" });
    }

    // 2) Fetch applicant_ids for that round
    const { data: bridgingRows, error: bridgingErr } = await supabase
      .from("applicant_rounds")
      .select("applicant_id")
      .eq("recruitment_round_id", reading.recruitment_round_id);

    if (bridgingErr) {
      return res.status(500).json({ error: bridgingErr.message });
    }

    // Extract the applicant_ids into an array
    const applicants = bridgingRows.map(row => row.applicant_id);

    // 3) Return the reading plus the applicant IDs
    return res.status(200).json({
      reading,        // e.g. { id, recruitment_round_id, omitted_fields }
      applicants      // array of applicant_id (uuid)
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
