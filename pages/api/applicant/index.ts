import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

type Applicant = Database["public"]["Tables"]["applicants"]["Row"];
type ApplicantRound = Database["public"]["Tables"]["applicant_rounds"]["Row"];
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

  const { applicant_id, applicant_round_id } = req.body;

  if (!applicant_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Fetch the applicant
  const result = await supabase
    .from("applicants")
    .select("*")
    .eq("id", applicant_id);

  if (result.error) {
    console.error("[/api/applicant] Fetch error:", result.error);
    return res.status(400).json({ error: result.error.message });
  }

  const applicants = result.data as Applicant[] | null;

  if (!applicants || applicants.length === 0) {
    console.error("[/api/applicant] Not found:", applicant_id);
    return res.status(404).json({ error: "Applicant not found" });
  }

  let columnOrder: string[] | null = null;

  // If applicant_round_id is provided, fetch the column order from the recruitment round
  if (applicant_round_id) {
    // First get the recruitment_round_id from applicant_rounds
    const roundResult = await supabase
      .from("applicant_rounds")
      .select("recruitment_round_id")
      .eq("id", applicant_round_id)
      .single();
    
    if (roundResult.error && roundResult.error.code !== "PGRST116") {
      console.error("Error fetching applicant_round:", roundResult.error);
    }

    const roundData = roundResult.data as Pick<ApplicantRound, "recruitment_round_id"> | null;

    if (roundData?.recruitment_round_id) {
      // Then get the column_order from recruitment_rounds
      const recruitmentRoundResult = await supabase
        .from("recruitment_rounds")
        .select("column_order")
        .eq("id", roundData.recruitment_round_id)
        .single();
      
      if (recruitmentRoundResult.error && recruitmentRoundResult.error.code !== "PGRST116") {
        console.error("Error fetching recruitment_round:", recruitmentRoundResult.error);
      }

      const recruitmentRound = recruitmentRoundResult.data as Pick<RecruitmentRound, "column_order"> | null;

      if (recruitmentRound?.column_order) {
        columnOrder = recruitmentRound.column_order;
      }
    }
  }

  // Return applicant with column_order for proper field ordering
  res.status(200).json({ ...applicants[0], column_order: columnOrder });
}