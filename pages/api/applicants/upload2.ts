import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

type RecruitmentRound = Database["public"]["Tables"]["recruitment_rounds"]["Row"];

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

  const {
    parsedData,
    nameHeader,
    emailHeader,
    headShotHeader,
    recruitment_round_id,
    columnOrder
  } = req.body;

  console.log("recruitment_round_id: ", recruitment_round_id);

  if (!parsedData || !nameHeader || !emailHeader || !recruitment_round_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Save the column order to the recruitment round if provided
  // Uses a merge approach: preserve existing column order, append new columns at the end
  if (columnOrder && Array.isArray(columnOrder) && columnOrder.length > 0) {
    // First, fetch the existing column order
    const roundResult = await supabase
      .from("recruitment_rounds")
      .select("column_order")
      .eq("id", recruitment_round_id)
      .single();
    
    if (roundResult.error) {
      console.error("Error fetching existing column order:", roundResult.error.message);
      // Proceed with new columnOrder only, or handle as needed
    }

    const existingRound = roundResult.data as Pick<RecruitmentRound, "column_order"> | null;

    let mergedColumnOrder: string[];

    if (existingRound?.column_order && Array.isArray(existingRound.column_order) && existingRound.column_order.length > 0) {
      // Merge: keep existing order, append any new columns from this upload
      const existingOrder = existingRound.column_order;
      const existingSet = new Set(existingOrder);
      
      // Start with existing order
      mergedColumnOrder = [...existingOrder];
      
      // Append any new columns that weren't in the existing order
      for (const col of columnOrder) {
        if (!existingSet.has(col)) {
          mergedColumnOrder.push(col);
        }
      }
    } else {
      // No existing order, use the new one as-is
      mergedColumnOrder = columnOrder;
    }

    const updateResult = await (supabase
      .from("recruitment_rounds") as any)
      .update({ column_order: mergedColumnOrder })
      .eq("id", recruitment_round_id);
    const updateError = updateResult.error;

    if (updateError) {
      console.error("Error updating column order:", updateError.message);
      // Don't fail the upload, just log the error
    }
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
  const insertResult = await (supabase
    .from("applicants")
    .insert(applicants as any)
    .select() as any); // .select() returns the newly inserted rows
  
  const { data: insertedApplicants, error: insertError } = insertResult as {
    data: Database["public"]["Tables"]["applicants"]["Row"][] | null;
    error: any;
  };

  console.log(insertError);

  if (insertError || !insertedApplicants) {
    console.error("Error inserting applicants:", insertError?.message || "No data returned");
    return res.status(500).json({ error: insertError?.message || "Failed to insert applicants" });
  }

  // --- Step 2: Insert into applicant_rounds ---
  // For each inserted applicant, create a bridging record referencing recruitment_round_id.
  const bridgingData = insertedApplicants.map((applicant) => ({
    applicant_id: applicant.id,
    recruitment_round_id: recruitment_round_id,
    status: "in_progress" 
  }));

  const bridgingInsertData: Database["public"]["Tables"]["applicant_rounds"]["Insert"][] = bridgingData.map(d => ({
    applicant_id: d.applicant_id,
    recruitment_round_id: d.recruitment_round_id,
    status: d.status,
  }));
  
  const bridgingResult = await (supabase
    .from("applicant_rounds")
    .insert(bridgingInsertData as any)
    .select() as any);
  
  const { data: bridgingRes, error: bridgingError } = bridgingResult as {
    data: Database["public"]["Tables"]["applicant_rounds"]["Row"][] | null;
    error: any;
  };

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
