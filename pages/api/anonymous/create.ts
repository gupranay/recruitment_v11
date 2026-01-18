import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Database } from "@/lib/types/supabase";

function generateRandomSlug() {
  return Math.random().toString(36).substring(2, 8);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { recruitment_round_id, omitted_fields } = req.body;
  if (!recruitment_round_id) {
    return res.status(400).json({ error: "Missing recruitment_round_id" });
  }

  const supabase = supabaseBrowser();

  // 1) Create a new row in `anonymous_readings`
  const slug = generateRandomSlug();

  const insertData: Database["public"]["Tables"]["anonymous_readings"]["Insert"] = {
    recruitment_round_id,
    slug,
    omitted_fields: omitted_fields || [],
  };

  const result = await supabase
    .from("anonymous_readings")
    .insert(insertData as any)
    .select()
    .single();
  
  const { data: readingData, error: readingError } = result as {
    data: Database["public"]["Tables"]["anonymous_readings"]["Row"] | null;
    error: any;
  };

  if (readingError || !readingData) {
    return res.status(500).json({
      error: readingError?.message || "Failed to create anonymized reading",
    });
  }

  // 2) Return the newly created reading
  return res.status(200).json({
    id: slug,            // You can rename this if desired
  });
}
