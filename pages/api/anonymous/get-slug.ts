import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Database } from "@/lib/types/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { recruitment_round_id } = req.body;
  if (!recruitment_round_id) {
    return res.status(400).json({ error: "Missing required field: recruitment_round_id" });
  }

  const supabase = supabaseBrowser();

  try {
    // Query the anonymous_readings table for the reading that matches this round
    const result = await supabase
      .from("anonymous_readings")
      .select("slug")
      .eq("recruitment_round_id", recruitment_round_id)
      .single();
    
    const { data: reading, error } = result as {
      data: { slug: string } | null;
      error: any;
    };

    // Handle possible errors
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!reading) {
      return res.status(404).json({ error: "No reading found for that round" });
    }
    // console.log("Found reading:", reading);
    // Return the slug
    return res.status(200).json({
      slug: reading.slug,
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
