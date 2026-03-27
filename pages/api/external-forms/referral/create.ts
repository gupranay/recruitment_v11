import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { getApplicantInCycle, getCycleAccess } from "@/lib/api/external-forms";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
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

  const cycleId = req.body?.cycle_id;
  const applicantId = req.body?.applicant_id;
  const rawSubmission = req.body?.submission_text;
  const submissionText =
    typeof rawSubmission === "string" ? rawSubmission.trim() : null;

  if (!cycleId || !applicantId || !submissionText) {
    return res.status(400).json({
      error: "Missing required fields: cycle_id, applicant_id, submission_text",
    });
  }

  const cycleAccess = await getCycleAccess(supabase, cycleId, user.id);
  if (!cycleAccess || !cycleAccess.isMember) {
    return res.status(403).json({ error: "Not authorized for this cycle" });
  }

  const applicant = await getApplicantInCycle(supabase, applicantId, cycleId);
  if (!applicant) {
    return res.status(404).json({ error: "Applicant not found in this cycle" });
  }

  const insertData = {
    organization_id: cycleAccess.organizationId,
    recruitment_cycle_id: cycleId,
    applicant_id: applicantId,
    submitted_by_user_id: user.id,
    submission_text: submissionText,
  };

  const { data, error } = await (supabase
    .from("external_referral_forms" as any)
    .insert([insertData as any] as any)
    .select("id, created_at")
    .single() as any);

  if (error || !data) {
    return res
      .status(500)
      .json({ error: error?.message || "Failed to submit form" });
  }

  return res.status(200).json({
    message: "Referral form submitted",
    submission: data,
  });
}
