import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = supabaseBrowser();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    parsedData,
    nameHeader,
    emailHeader,
    headShotHeader,
    recruitment_round_id
  } = req.body;

  console.log("recruitment_round_id: ", recruitment_round_id);

  if (!parsedData || !nameHeader || !emailHeader || !recruitment_round_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Function to convert Google Drive link format
  const convertGoogleDriveLink = (url: string | null) => {
    if (url && url.includes("https://drive.google.com/open?id=")) {
      const id = url.split("id=")[1];
      return `https://drive.usercontent.google.com/download?id=${id}&export=view`;
    }
    return url; // Return as-is if it doesn't match the Google Drive format
  };

  // Create applicant objects
  const applicants = parsedData.map((record: any) => ({
    name: record[nameHeader],
    email: record[emailHeader],
    headshot_url: headShotHeader ? convertGoogleDriveLink(record[headShotHeader]) : null,
    data: record
    /*
      No longer storing recruitment_round_id in the applicants table,
      since bridging is handled by applicant_rounds.
    */
  }));

  // --- Step 1: Insert Applicants ---
  const { data: insertedApplicants, error: insertError } = await supabase
    .from("applicants")
    .insert(applicants)
    .select(); // .select() returns the newly inserted rows

  console.log(insertError);

  if (insertError) {
    console.error("Error inserting applicants:", insertError.message);
    return res.status(500).json({ error: insertError.message });
  }

  // --- Step 2: Insert into applicant_rounds ---
  // For each inserted applicant, create a bridging record referencing recruitment_round_id.
  const bridgingData = insertedApplicants.map((applicant) => ({
    applicant_id: applicant.id,
    recruitment_round_id: recruitment_round_id,
    status: "in_progress" 
  }));

  const { data: bridgingRes, error: bridgingError } = await supabase
    .from("applicant_rounds")
    .insert(bridgingData)
    .select();

  if (bridgingError) {
    console.error("Error inserting applicant_rounds:", bridgingError.message);
    return res.status(500).json({ error: bridgingError.message });
  }

  
  return res.status(200).json({
    message: "Applicants uploaded and linked to the round successfully.",
    applicants: insertedApplicants,
    applicantRounds: bridgingRes
  });
}
