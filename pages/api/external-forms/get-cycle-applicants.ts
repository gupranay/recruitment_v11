import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { getCycleAccess } from "@/lib/api/external-forms";

interface ApplicantOption {
  id: string;
  name: string;
  headshot_url: string | null;
}

interface RoundIdRow {
  id: string;
}

interface OrganizationRow {
  id: string;
  name: string;
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

  const cycleId = req.body?.cycle_id;
  if (!cycleId || typeof cycleId !== "string") {
    return res.status(400).json({ error: "Missing required field: cycle_id" });
  }

  const cycleAccess = await getCycleAccess(supabase, cycleId, user.id);
  if (!cycleAccess || !cycleAccess.isMember) {
    return res.status(403).json({ error: "Not authorized for this cycle" });
  }

  const orgResult = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", cycleAccess.organizationId)
    .single();

  const { data: organization, error: orgError } = orgResult as {
    data: OrganizationRow | null;
    error: any;
  };

  if (orgError || !organization) {
    return res.status(404).json({ error: "Organization not found" });
  }

  const roundsResult = await supabase
    .from("recruitment_rounds")
    .select("id")
    .eq("recruitment_cycle_id", cycleId);

  const { data: rounds, error: roundsError } = roundsResult as {
    data: RoundIdRow[] | null;
    error: any;
  };

  if (roundsError) {
    return res.status(500).json({ error: roundsError.message });
  }

  const roundIds = (rounds || []).map((r) => r.id);

  // Source of truth: applicants linked to any round in this cycle.
  // Also includes legacy rows where recruitment_cycle_id is populated.
  let applicants: ApplicantOption[] = [];
  if (roundIds.length > 0) {
    const bridgeResult = await (supabase
      .from("applicant_rounds")
      .select(
        `
        applicants (
          id,
          name,
          headshot_url
        )
      `,
      )
      .in("recruitment_round_id", roundIds) as any);

    const { data: bridgeRows, error: bridgeError } = bridgeResult as {
      data:
        | {
            applicants: ApplicantOption | null;
          }[]
        | null;
      error: any;
    };

    if (bridgeError) {
      return res.status(500).json({ error: bridgeError.message });
    }

    const deduped = new Map<string, ApplicantOption>();
    for (const row of bridgeRows || []) {
      const applicant = row.applicants;
      if (applicant && !deduped.has(applicant.id)) {
        deduped.set(applicant.id, applicant);
      }
    }
    applicants = Array.from(deduped.values());
  }

  // Fallback/merge for legacy rows directly tied to cycle.
  const legacyResult = await supabase
    .from("applicants")
    .select("id, name, headshot_url")
    .eq("recruitment_cycle_id", cycleId)
    .order("name", { ascending: true });

  const { data: legacyApplicants, error: legacyError } = legacyResult as {
    data: ApplicantOption[] | null;
    error: any;
  };

  if (legacyError) {
    return res.status(500).json({ error: legacyError.message });
  }

  const merged = new Map<string, ApplicantOption>();
  for (const applicant of legacyApplicants || []) {
    merged.set(applicant.id, applicant);
  }
  for (const applicant of applicants) {
    merged.set(applicant.id, applicant);
  }

  const sortedApplicants = Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return res.status(200).json({
    cycle: {
      id: cycleAccess.cycleId,
      name: cycleAccess.cycleName,
    },
    organization: {
      id: organization.id,
      name: organization.name,
    },
    applicants: sortedApplicants,
  });
}
