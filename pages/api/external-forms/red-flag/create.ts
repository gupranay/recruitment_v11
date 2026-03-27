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
  const submissionText = req.body?.submission_text?.trim();
  const isAnonymousToOwner = !!req.body?.is_anonymous_to_owner;
  const wantsBoardFollowUp = !!req.body?.wants_board_follow_up;
  const followUpContact =
    typeof req.body?.follow_up_contact === "string"
      ? req.body.follow_up_contact.trim()
      : "";

  if (!cycleId || !applicantId || !submissionText) {
    return res.status(400).json({
      error: "Missing required fields: cycle_id, applicant_id, submission_text",
    });
  }

  if (wantsBoardFollowUp && isAnonymousToOwner && !followUpContact) {
    return res.status(400).json({
      error:
        "Please provide contact details if you request board follow-up while remaining anonymous.",
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
    submitted_by_user_id: isAnonymousToOwner ? null : user.id,
    submission_text: submissionText,
    is_anonymous_to_owner: isAnonymousToOwner,
    wants_board_follow_up: wantsBoardFollowUp,
    follow_up_contact: followUpContact || null,
  };

  const { data, error } = await (supabase
    .from("external_red_flag_forms" as any)
    .insert([insertData as any] as any)
    .select("id, created_at")
    .single() as any);

  if (error || !data) {
    console.error("Red flag form insert error:", error);
    return res.status(500).json({ error: "Failed to submit form" });
  }

  return res.status(200).json({
    message: "Red flag form submitted",
    submission: data,
  });
}
