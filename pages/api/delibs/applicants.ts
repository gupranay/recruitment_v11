import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/database.types";

type DelibsSession = Database["public"]["Tables"]["delibs_sessions"]["Row"];

interface ApplicantWithVote {
  applicant_round_id: string;
  applicant_id: string;
  name: string;
  headshot_url: string | null;
  status: string;
  my_vote: number | null;
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

  const { recruitment_round_id } = req.body;

  // Validate recruitment_round_id is a non-empty string
  if (!recruitment_round_id || typeof recruitment_round_id !== "string") {
    return res.status(400).json({
      error: "recruitment_round_id must be a non-empty string",
    });
  }

  // Validate UUID format (case-insensitive)
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(recruitment_round_id)) {
    return res.status(400).json({
      error: "recruitment_round_id must be a valid UUID",
    });
  }

  try {
    // Get the round and organization context
    const roundResult = await supabase
      .from("recruitment_rounds")
      .select(
        `
        id,
        name,
        recruitment_cycles!fk_recruitment_cycle (
          organization_id
        )
      `,
      )
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

    // Check if user is a member
    const membershipResult = await supabase
      .from("organization_users")
      .select("id, role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    const { data: membership, error: membershipError } = membershipResult as {
      data: { id: string; role: string } | null;
      error: any;
    };

    if (membershipError || !membership) {
      return res
        .status(403)
        .json({ error: "Not authorized to access this round" });
    }

    // Get or create session
    const sessionCheckResult = await (supabase.from("delibs_sessions") as any)
      .select("id, status")
      .eq("recruitment_round_id", recruitment_round_id)
      .single();

    let { data: sessionData, error: sessionCheckError } =
      sessionCheckResult as {
        data: { id: string; status: string } | null;
        error: any;
      };

    // PGRST116 = "no rows returned" from .single()
    const isNotFound = sessionCheckError?.code === "PGRST116";

    if (sessionCheckError && !isNotFound) {
      console.error("Error checking session:", sessionCheckError);
      return res.status(500).json({ error: "Failed to check session" });
    }

    if (!sessionData && isNotFound) {
      // Create session if it doesn't exist
      const createResult = await (supabase.from("delibs_sessions") as any)
        .insert({
          recruitment_round_id,
          created_by: user.id,
          status: "open",
        })
        .select()
        .single();

      const { data: newSession, error: createError } = createResult as {
        data: DelibsSession | null;
        error: any;
      };

      if (createError || !newSession) {
        console.error("Error creating session:", createError);
        return res.status(500).json({ error: "Failed to create session" });
      }

      sessionData = { id: newSession.id, status: newSession.status };
    }

    // Get all applicants in this round
    const arResult = await supabase
      .from("applicant_rounds")
      .select(
        `
        id,
        applicant_id,
        status,
        applicants!applicant_rounds_applicant_id_fkey (
          id,
          name,
          headshot_url
        )
      `,
      )
      .eq("recruitment_round_id", recruitment_round_id);

    const { data: applicantRounds, error: arError } = arResult as {
      data: Array<{
        id: string;
        applicant_id: string;
        status: string;
        applicants: {
          id: string;
          name: string;
          headshot_url: string | null;
        } | null;
      }> | null;
      error: any;
    };

    if (arError) {
      console.error("Error fetching applicant rounds:", arError);
      return res.status(500).json({ error: "Failed to fetch applicants" });
    }

    // Ensure sessionData exists before proceeding
    if (!sessionData) {
      return res.status(500).json({ error: "Session data is missing" });
    }

    // Get the user's votes for this session
    const votesResult = await (supabase.from("delibs_votes") as any)
      .select("applicant_round_id, vote_value")
      .eq("delibs_session_id", sessionData.id)
      .eq("voter_user_id", user.id);

    const { data: myVotes, error: votesError } = votesResult as {
      data: Array<{ applicant_round_id: string; vote_value: number }> | null;
      error: any;
    };

    if (votesError) {
      console.error("Error fetching votes:", votesError);
      return res.status(500).json({ error: "Failed to fetch votes" });
    }

    // Create a map of votes
    const voteMap = new Map<string, number>();
    for (const vote of myVotes || []) {
      voteMap.set(vote.applicant_round_id, vote.vote_value);
    }

    // Build the response
    const applicants: ApplicantWithVote[] = [];
    for (const ar of applicantRounds || []) {
      const applicant = ar.applicants;

      if (applicant) {
        applicants.push({
          applicant_round_id: ar.id,
          applicant_id: applicant.id,
          name: applicant.name,
          headshot_url: applicant.headshot_url,
          status: ar.status,
          my_vote: voteMap.get(ar.id) ?? null,
        });
      }
    }

    // Sort alphabetically by name
    applicants.sort((a, b) => a.name.localeCompare(b.name));

    // Count how many the user has voted on
    const votedCount = applicants.filter((a) => a.my_vote !== null).length;

    return res.status(200).json({
      applicants,
      session: {
        id: sessionData.id,
        status: sessionData.status,
      },
      round_name: roundData.name,
      user_role: membership.role,
      voted_count: votedCount,
      total_count: applicants.length,
    });
  } catch (error) {
    console.error("Error in delibs applicants:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
