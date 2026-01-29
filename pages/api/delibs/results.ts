import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";

interface DelibsResult {
  applicant_round_id: string;
  applicant_id: string;
  name: string;
  headshot_url: string | null;
  avg_vote: number;
  vote_count: number;
  rank_dense: number;
  is_tied: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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

  const { recruitment_round_id } = req.body;

  if (!recruitment_round_id) {
    return res.status(400).json({ error: "Missing recruitment_round_id" });
  }

  try {
    // Get the round and organization context
    const roundResult = await supabase
      .from("recruitment_rounds")
      .select(`
        id,
        name,
        recruitment_cycles!fk_recruitment_cycle (
          organization_id
        )
      `)
      .eq("id", recruitment_round_id)
      .single();

    const { data: roundData, error: roundError } = roundResult as {
      data: {
        id: string;
        name: string;
        recruitment_cycles: { organization_id: string } | null;
      } | null;
      error: any;
    };

    if (roundError || !roundData) {
      return res.status(404).json({ error: "Recruitment round not found" });
    }

    const organizationId = roundData.recruitment_cycles?.organization_id;

    if (!organizationId) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Check if user is Owner or Admin (only they can see results)
    const membershipResult = await supabase
      .from("organization_users")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    const { data: membership, error: membershipError } = membershipResult as {
      data: { role: string } | null;
      error: any;
    };

    if (membershipError || !membership) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (!["Owner", "Admin"].includes(membership.role)) {
      return res.status(403).json({
        error: "Only Owner or Admin can view delibs results",
      });
    }

    // Fetch secure aggregates via RPC (SECURITY DEFINER, aggregates-only)
    const rpcResult = await (supabase as any).rpc("get_delibs_results", {
      round_id: recruitment_round_id,
    });

    const { data: resultsData, error: rpcError } = rpcResult as {
      data: Array<{
        applicant_round_id: string;
        applicant_id: string;
        name: string;
        headshot_url: string | null;
        avg_vote: number | string | null;
        vote_count: number | null;
        rank_dense: number | null;
        is_tied: boolean | null;
      }> | null;
      error: any;
    };

    if (rpcError) {
      console.error("Error fetching delibs results via RPC:", rpcError);
      return res.status(500).json({ error: "Failed to fetch delibs results" });
    }

    const results: DelibsResult[] = (resultsData || []).map((r) => ({
      applicant_round_id: r.applicant_round_id,
      applicant_id: r.applicant_id,
      name: r.name,
      headshot_url: r.headshot_url,
      avg_vote: r.avg_vote === null ? 0 : Number(r.avg_vote),
      vote_count: r.vote_count ?? 0,
      rank_dense: r.rank_dense ?? 0,
      is_tied: r.is_tied ?? false,
    }));

    // Get session status (members can see locked/open state elsewhere too)
    const sessionResult = await (supabase
      .from("delibs_sessions") as any)
      .select("id, status")
      .eq("recruitment_round_id", recruitment_round_id)
      .single();

    const { data: session } = sessionResult as {
      data: { id: string; status: string } | null;
      error: any;
    };

    // Get total member count for context (how many could vote)
    const countResult = await supabase
      .from("organization_users")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    const { count: memberCount } = countResult as { count: number | null; error: any };

    // Check if this is the last round in the cycle
    const roundWithCycleResult = await supabase
      .from("recruitment_rounds")
      .select(`
        id,
        sort_order,
        recruitment_cycle_id
      `)
      .eq("id", recruitment_round_id)
      .single();

    const { data: roundWithCycle, error: roundWithCycleError } = roundWithCycleResult as {
      data: { id: string; sort_order: number | null; recruitment_cycle_id: string } | null;
      error: any;
    };

    let isLastRound = false;
    if (!roundWithCycleError && roundWithCycle) {
      // Get all rounds in the cycle to find the max sort_order
      const allRoundsResult = await supabase
        .from("recruitment_rounds")
        .select("id, sort_order")
        .eq("recruitment_cycle_id", roundWithCycle.recruitment_cycle_id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const { data: lastRound } = allRoundsResult as {
        data: { id: string; sort_order: number | null } | null;
        error: any;
      };

      if (lastRound && lastRound.id === recruitment_round_id) {
        isLastRound = true;
      }
    }

    return res.status(200).json({
      results,
      session: {
        id: session?.id ?? null,
        status: session?.status ?? null,
      },
      round_name: roundData.name,
      total_members: memberCount || 0,
      is_last_round: isLastRound,
    });
  } catch (error) {
    console.error("Error in delibs results:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
