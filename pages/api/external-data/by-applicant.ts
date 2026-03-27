import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";

interface SubmitterProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface ExternalEntry {
  id: string;
  created_at: string;
  submission_text: string;
  submitted_by_user_id: string | null;
}

interface ExternalRedFlagEntry extends ExternalEntry {
  is_anonymous_to_owner: boolean;
  wants_board_follow_up: boolean;
  follow_up_contact: string | null;
}

interface ApplicantMeta {
  id: string;
  name: string;
  recruitment_cycle_id: string | null;
}

interface ApplicantRoundLookup {
  applicant_id: string;
  applicants: {
    id: string;
    name: string;
  } | null;
  recruitment_rounds: {
    recruitment_cycle_id: string;
  } | null;
}

interface CycleMeta {
  id: string;
  name: string;
  organization_id: string | null;
}

interface OrganizationOwner {
  owner_id: string;
}

interface SubmitterRow {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

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

  const applicantIdInput = req.body?.applicant_id;
  const applicantRoundIdInput = req.body?.applicant_round_id;
  if (
    (!applicantIdInput || typeof applicantIdInput !== "string") &&
    (!applicantRoundIdInput || typeof applicantRoundIdInput !== "string")
  ) {
    return res.status(400).json({
      error: "Missing required field: applicant_id or applicant_round_id",
    });
  }

  let resolvedApplicantId: string | null =
    typeof applicantIdInput === "string" ? applicantIdInput : null;
  let resolvedApplicantName: string | null = null;
  let resolvedCycleId: string | null = null;

  if (resolvedApplicantId) {
    const applicantResult = await supabase
      .from("applicants")
      .select("id, name, recruitment_cycle_id")
      .eq("id", resolvedApplicantId)
      .maybeSingle();

    const { data: applicant, error: applicantError } = applicantResult as {
      data: ApplicantMeta | null;
      error: any;
    };

    if (!applicantError && applicant) {
      resolvedApplicantName = applicant.name;
      resolvedCycleId = applicant.recruitment_cycle_id;
    }
  }

  if (!resolvedApplicantId || !resolvedCycleId) {
    if (typeof applicantRoundIdInput === "string") {
      const roundLookupResult = await (supabase
        .from("applicant_rounds")
        .select(
          `
          applicant_id,
          applicants!applicant_rounds_applicant_id_fkey (
            id,
            name
          ),
          recruitment_rounds!applicant_rounds_recruitment_round_id_fkey (
            recruitment_cycle_id
          )
        `,
        )
        .eq("id", applicantRoundIdInput)
        .maybeSingle() as any);

      const { data: roundLookup, error: roundLookupError } =
        roundLookupResult as {
          data: ApplicantRoundLookup | null;
          error: any;
        };

      if (
        !roundLookupError &&
        roundLookup?.recruitment_rounds?.recruitment_cycle_id
      ) {
        resolvedApplicantId = roundLookup.applicant_id;
        resolvedApplicantName =
          roundLookup.applicants?.name || resolvedApplicantName;
        resolvedCycleId = roundLookup.recruitment_rounds.recruitment_cycle_id;
      }
    }
  }

  if (!resolvedApplicantId || !resolvedCycleId) {
    return res.status(404).json({ error: "Applicant or cycle not found" });
  }

  const cycleId = resolvedCycleId;
  const cycleResult = await supabase
    .from("recruitment_cycles")
    .select("id, name, organization_id")
    .eq("id", cycleId)
    .single();

  const { data: cycle, error: cycleError } = cycleResult as {
    data: CycleMeta | null;
    error: any;
  };

  if (cycleError || !cycle?.organization_id) {
    return res.status(404).json({ error: "Recruitment cycle not found" });
  }

  const organizationResult = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", cycle.organization_id)
    .single();

  const { data: organization, error: orgError } = organizationResult as {
    data: OrganizationOwner | null;
    error: any;
  };

  if (orgError || !organization) {
    return res.status(404).json({ error: "Organization not found" });
  }

  if (organization.owner_id !== user.id) {
    return res
      .status(403)
      .json({ error: "Only the organization owner can access this data" });
  }

  const [
    { data: conflicts, error: conflictsError },
    { data: referrals, error: referralsError },
    { data: redFlags, error: redFlagsError },
  ] = await Promise.all([
    supabase
      .from("external_conflict_forms" as any)
      .select("id, created_at, submission_text, submitted_by_user_id")
      .eq("applicant_id", resolvedApplicantId)
      .eq("recruitment_cycle_id", cycleId)
      .order("created_at", { ascending: false }),
    supabase
      .from("external_referral_forms" as any)
      .select("id, created_at, submission_text, submitted_by_user_id")
      .eq("applicant_id", resolvedApplicantId)
      .eq("recruitment_cycle_id", cycleId)
      .order("created_at", { ascending: false }),
    supabase
      .from("external_red_flag_forms" as any)
      .select(
        "id, created_at, submission_text, submitted_by_user_id, is_anonymous_to_owner, wants_board_follow_up, follow_up_contact",
      )
      .eq("applicant_id", resolvedApplicantId)
      .eq("recruitment_cycle_id", cycleId)
      .order("created_at", { ascending: false }),
  ]);

  if (conflictsError || referralsError || redFlagsError) {
    return res.status(500).json({
      error:
        conflictsError?.message ||
        referralsError?.message ||
        redFlagsError?.message ||
        "Failed to fetch external data",
    });
  }

  const allUserIds = new Set<string>();
  (conflicts || []).forEach((entry: ExternalEntry) => {
    if (entry.submitted_by_user_id) allUserIds.add(entry.submitted_by_user_id);
  });
  (referrals || []).forEach((entry: ExternalEntry) => {
    if (entry.submitted_by_user_id) allUserIds.add(entry.submitted_by_user_id);
  });
  (redFlags || []).forEach((entry: ExternalRedFlagEntry) => {
    if (entry.submitted_by_user_id) allUserIds.add(entry.submitted_by_user_id);
  });

  const submitterMap = new Map<string, SubmitterProfile>();
  if (allUserIds.size > 0) {
    const usersResult = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url")
      .in("id", Array.from(allUserIds));

    const { data: users } = usersResult as {
      data: SubmitterRow[] | null;
      error: any;
    };

    (users || []).forEach((u) => {
      submitterMap.set(u.id, u);
    });
  }

  const withSubmitter = (entry: ExternalEntry, isAnonymous = false) => {
    const profile = entry.submitted_by_user_id
      ? submitterMap.get(entry.submitted_by_user_id) || null
      : null;

    return {
      id: entry.id,
      created_at: entry.created_at,
      submission_text: entry.submission_text,
      submitter: isAnonymous
        ? {
            id: null,
            full_name: "Anonymous",
            email: null,
            avatar_url: null,
          }
        : profile,
    };
  };

  return res.status(200).json({
    applicant: {
      id: resolvedApplicantId,
      name: resolvedApplicantName,
    },
    cycle: {
      id: cycle.id,
      name: cycle.name,
    },
    conflict_forms: (conflicts || []).map((entry: ExternalEntry) =>
      withSubmitter(entry),
    ),
    referral_forms: (referrals || []).map((entry: ExternalEntry) =>
      withSubmitter(entry),
    ),
    red_flag_forms: (redFlags || []).map((entry: ExternalRedFlagEntry) => ({
      ...withSubmitter(entry, entry.is_anonymous_to_owner),
      is_anonymous_to_owner: entry.is_anonymous_to_owner,
      wants_board_follow_up: entry.wants_board_follow_up,
      follow_up_contact: entry.is_anonymous_to_owner
        ? null
        : entry.follow_up_contact,
    })),
  });
}
