import { supabaseApi } from "@/lib/supabase/api";

type ApiSupabase = ReturnType<typeof supabaseApi>;

export interface CycleAccessResult {
  cycleId: string;
  cycleName: string | null;
  organizationId: string;
  isOwner: boolean;
  isMember: boolean;
}

export interface ApplicantInCycleResult {
  id: string;
  name: string;
}

interface CycleRow {
  id: string;
  name: string | null;
  organization_id: string | null;
}

interface OrganizationOwnerRow {
  owner_id: string;
}

interface MembershipRow {
  id: string;
}

interface RoundIdRow {
  id: string;
}

export async function getCycleAccess(
  supabase: ApiSupabase,
  cycleId: string,
  userId: string,
): Promise<CycleAccessResult | null> {
  const cycleResult = await supabase
    .from("recruitment_cycles")
    .select("id, name, organization_id")
    .eq("id", cycleId)
    .single();

  const { data: cycleRow, error: cycleError } = cycleResult as {
    data: CycleRow | null;
    error: any;
  };

  if (cycleError || !cycleRow?.organization_id) {
    return null;
  }

  const organizationId = cycleRow.organization_id;

  const orgResult = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", organizationId)
    .single();

  const { data: orgRow, error: orgError } = orgResult as {
    data: OrganizationOwnerRow | null;
    error: any;
  };

  if (orgError || !orgRow) {
    return null;
  }

  const isOwner = orgRow.owner_id === userId;

  let isMember = false;
  if (isOwner) {
    isMember = true;
  } else {
    const membershipResult = await supabase
      .from("organization_users")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    const { data: membershipRow } = membershipResult as {
      data: MembershipRow | null;
      error: any;
    };

    isMember = !!membershipRow;
  }

  return {
    cycleId: cycleRow.id,
    cycleName: cycleRow.name,
    organizationId,
    isOwner,
    isMember,
  };
}

export async function getApplicantInCycle(
  supabase: ApiSupabase,
  applicantId: string,
  cycleId: string,
): Promise<ApplicantInCycleResult | null> {
  // Legacy-compatible check:
  // some applicant rows may not have recruitment_cycle_id populated,
  // so we validate via applicant_rounds -> recruitment_rounds bridge.
  const roundsResult = await supabase
    .from("recruitment_rounds")
    .select("id")
    .eq("recruitment_cycle_id", cycleId);

  const { data: rounds, error: roundsError } = roundsResult as {
    data: RoundIdRow[] | null;
    error: any;
  };

  if (roundsError || !rounds || rounds.length === 0) {
    return null;
  }

  const roundIds = rounds.map((round) => round.id);
  const bridgeResult = await (supabase
    .from("applicant_rounds")
    .select(
      `
      applicant_id,
      applicants (
        id,
        name
      )
    `,
    )
    .eq("applicant_id", applicantId)
    .in("recruitment_round_id", roundIds)
    .limit(1)
    .maybeSingle() as any);

  const { data: bridgeRow, error: bridgeError } = bridgeResult as {
    data: {
      applicant_id: string;
      applicants: ApplicantInCycleResult | null;
    } | null;
    error: any;
  };

  if (bridgeError || !bridgeRow?.applicants) {
    return null;
  }

  return bridgeRow.applicants;
}
