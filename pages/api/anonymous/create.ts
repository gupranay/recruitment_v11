import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

function generateRandomSlug() {
  return Math.random().toString(36).substring(2, 8);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
  const { data: readingData, error: readingError } = await supabase
    .from("anonymous_readings")
    .insert({
      recruitment_round_id,
      slug,
      omitted_fields: omitted_fields || [],
    })
    .select()
    .single();

  if (readingError || !readingData) {
    return res.status(500).json({
      error: readingError?.message || "Failed to create anonymized reading",
    });
  }

  // readingData now has the generated 'id' from the DB
  const { id: readingId } = readingData;

  // 2) Fetch all applicants in the specified round
  const { data: bridgingData, error: bridgingErr } = await supabase
    .from("applicant_rounds")
    .select("applicant_id")
    .eq("recruitment_round_id", recruitment_round_id);

  if (bridgingErr) {
    return res.status(500).json({ error: bridgingErr.message });
  }

  const uniqueApplicantIds = Array.from(new Set(bridgingData.map(a => a.applicant_id)));

  // 3) Insert into `anonymous_reading_applicants`
  //    That table should also have a default gen_random_uuid() for id
  const inserts = uniqueApplicantIds.map((appId, idx) => ({
    reading_id: readingId,
    applicant_id: appId,
    anonymous_number: idx + 1,
  }));

  const { data: mappingRes, error: mapErr } = await supabase
    .from("anonymous_reading_applicants")
    .insert(inserts)
    .select();

  if (mapErr) {
    return res.status(500).json({ error: mapErr.message });
  }

  return res.status(200).json({
    message: "Anonymized reading created successfully.",
    reading: readingData,        // includes {id, slug, omitted_fields}
    total_applicants: mappingRes.length,
  });
}
