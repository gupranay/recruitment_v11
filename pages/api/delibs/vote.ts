import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/database.types";

type DelibsVote = Database["public"]["Tables"]["delibs_votes"]["Row"];

// Valid vote values for delibs
const VALID_VOTE_VALUES = [-10, -5, 0, 5, 10];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = supabaseApi(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // POST: Submit or update a vote
  if (req.method === "POST") {
    const { delibs_session_id, applicant_round_id, vote_value } = req.body;

    if (!delibs_session_id || !applicant_round_id || vote_value === undefined) {
      return res.status(400).json({
        error: "Missing required fields: delibs_session_id, applicant_round_id, vote_value",
      });
    }

    // Validate vote value
    if (!VALID_VOTE_VALUES.includes(vote_value)) {
      return res.status(400).json({
        error: `Invalid vote_value. Must be one of: ${VALID_VOTE_VALUES.join(", ")}`,
      });
    }

    try {
      // Verify session exists and get organization context
      const sessionResult = await (supabase
        .from("delibs_sessions") as any)
        .select(`
          id,
          status,
          recruitment_round_id,
          recruitment_rounds!delibs_sessions_recruitment_round_id_fkey (
            recruitment_cycles!fk_recruitment_cycle (
              organization_id
            )
          )
        `)
        .eq("id", delibs_session_id)
        .single();

      const { data: session, error: sessionError } = sessionResult as {
        data: {
          id: string;
          status: string;
          recruitment_round_id: string;
          recruitment_rounds: {
            recruitment_cycles: { organization_id: string } | null;
          } | null;
        } | null;
        error: any;
      };

      if (sessionError || !session) {
        return res.status(404).json({ error: "Delibs session not found" });
      }

      // Check if session is locked
      if (session.status === "locked") {
        return res.status(403).json({ error: "Session is locked. Voting is closed." });
      }

      const organizationId = session.recruitment_rounds?.recruitment_cycles?.organization_id;

      if (!organizationId) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Verify user is a member of the organization
      const membershipResult = await supabase
        .from("organization_users")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      const { data: membership, error: membershipError } = membershipResult as {
        data: { id: string } | null;
        error: any;
      };

      if (membershipError || !membership) {
        return res.status(403).json({ error: "Not authorized to vote in this session" });
      }

      // Verify applicant_round belongs to the same recruitment_round
      const arResult = await supabase
        .from("applicant_rounds")
        .select("id, recruitment_round_id")
        .eq("id", applicant_round_id)
        .single();

      const { data: applicantRound, error: arError } = arResult as {
        data: { id: string; recruitment_round_id: string } | null;
        error: any;
      };

      if (arError || !applicantRound) {
        return res.status(404).json({ error: "Applicant round not found" });
      }

      if (applicantRound.recruitment_round_id !== session.recruitment_round_id) {
        return res.status(400).json({
          error: "Applicant round does not belong to this delibs session's recruitment round",
        });
      }

      // Atomic upsert to avoid TOCTOU race condition
      // Uses unique constraint on (delibs_session_id, applicant_round_id, voter_user_id)
      // This replaces the separate select-then-insert/update flow with a single atomic operation
      const upsertResult = await (supabase
        .from("delibs_votes") as any)
        .upsert(
          {
            delibs_session_id,
            applicant_round_id,
            voter_user_id: user.id,
            vote_value,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "delibs_session_id,applicant_round_id,voter_user_id",
            ignoreDuplicates: false, // Update on conflict instead of ignoring
          }
        )
        .select()
        .single();

      const { data: vote, error: upsertError } = upsertResult as {
        data: DelibsVote | null;
        error: any;
      };

      if (upsertError || !vote) {
        console.error("Error upserting vote:", upsertError);
        return res.status(500).json({ error: "Failed to submit vote" });
      }

      // Determine if this was an insert or update by checking if created_at equals updated_at
      // (approximate check - in practice, upsert always returns the final state)
      const isNewVote = vote.created_at === vote.updated_at;

      return res.status(isNewVote ? 201 : 200).json({
        vote,
        message: isNewVote ? "Vote submitted successfully" : "Vote updated successfully",
      });
    } catch (error) {
      console.error("Error in delibs vote POST:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // GET: Get the current user's vote for a given session + applicant
  if (req.method === "GET") {
    const { delibs_session_id, applicant_round_id } = req.query;

    if (!delibs_session_id || !applicant_round_id) {
      return res.status(400).json({
        error: "Missing required query params: delibs_session_id, applicant_round_id",
      });
    }

    try {
      // Verify session access
      const sessionResult = await (supabase
        .from("delibs_sessions") as any)
        .select(`
          id,
          status,
          recruitment_rounds!delibs_sessions_recruitment_round_id_fkey (
            recruitment_cycles!fk_recruitment_cycle (
              organization_id
            )
          )
        `)
        .eq("id", delibs_session_id)
        .single();

      const { data: session, error: sessionError } = sessionResult as {
        data: {
          id: string;
          status: string;
          recruitment_rounds: {
            recruitment_cycles: { organization_id: string } | null;
          } | null;
        } | null;
        error: any;
      };

      if (sessionError || !session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const organizationId = session.recruitment_rounds?.recruitment_cycles?.organization_id;

      if (!organizationId) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Verify membership
      const membershipResult = await supabase
        .from("organization_users")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      const { data: membership, error: membershipError } = membershipResult as {
        data: { id: string } | null;
        error: any;
      };

      if (membershipError || !membership) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get user's vote
      const voteResult = await (supabase
        .from("delibs_votes") as any)
        .select("*")
        .eq("delibs_session_id", delibs_session_id)
        .eq("applicant_round_id", applicant_round_id)
        .eq("voter_user_id", user.id)
        .single();

      const { data: vote, error: voteError } = voteResult as {
        data: DelibsVote | null;
        error: any;
      };

      if (voteError && voteError.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error fetching vote:", voteError);
        return res.status(500).json({ error: "Failed to fetch vote" });
      }

      return res.status(200).json({
        vote: vote || null,
        session_status: session.status,
      });
    } catch (error) {
      console.error("Error in delibs vote GET:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // DELETE: Remove a vote (only when session is open)
  if (req.method === "DELETE") {
    const { delibs_session_id, applicant_round_id } = req.body;

    if (!delibs_session_id || !applicant_round_id) {
      return res.status(400).json({
        error: "Missing required fields: delibs_session_id, applicant_round_id",
      });
    }

    try {
      // Verify session exists and get organization context
      const sessionResult = await (supabase
        .from("delibs_sessions") as any)
        .select(`
          id,
          status,
          recruitment_round_id,
          recruitment_rounds!delibs_sessions_recruitment_round_id_fkey (
            recruitment_cycles!fk_recruitment_cycle (
              organization_id
            )
          )
        `)
        .eq("id", delibs_session_id)
        .single();

      const { data: session, error: sessionError } = sessionResult as {
        data: {
          id: string;
          status: string;
          recruitment_round_id: string;
          recruitment_rounds: {
            recruitment_cycles: { organization_id: string } | null;
          } | null;
        } | null;
        error: any;
      };

      if (sessionError || !session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const organizationId = session.recruitment_rounds?.recruitment_cycles?.organization_id;

      if (!organizationId) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Verify user is a member of the organization
      const membershipResult = await supabase
        .from("organization_users")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

      const { data: membership, error: membershipError } = membershipResult as {
        data: { id: string } | null;
        error: any;
      };

      if (membershipError || !membership) {
        return res.status(403).json({ error: "Not authorized to delete votes in this session" });
      }

      if (session.status === "locked") {
        return res.status(403).json({ error: "Session is locked. Cannot delete vote." });
      }

      const deleteResult = await (supabase
        .from("delibs_votes") as any)
        .delete()
        .eq("delibs_session_id", delibs_session_id)
        .eq("applicant_round_id", applicant_round_id)
        .eq("voter_user_id", user.id);

      const { error: deleteError } = deleteResult as { error: any };

      if (deleteError) {
        console.error("Error deleting vote:", deleteError);
        return res.status(500).json({ error: "Failed to delete vote" });
      }

      return res.status(200).json({ message: "Vote deleted successfully" });
    } catch (error) {
      console.error("Error in delibs vote DELETE:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
