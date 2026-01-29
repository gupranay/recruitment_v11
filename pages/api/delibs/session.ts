import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/database.types";

type DelibsSession = Database["public"]["Tables"]["delibs_sessions"]["Row"];

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

  // POST: Create or get session for a recruitment_round_id
  if (req.method === "POST") {
    const { recruitment_round_id } = req.body;

    if (!recruitment_round_id) {
      return res.status(400).json({ error: "Missing recruitment_round_id" });
    }

    try {
      // Verify the round exists and get organization context
      const roundResult = await supabase
        .from("recruitment_rounds")
        .select(`
          id,
          name,
          recruitment_cycles!fk_recruitment_cycle (
            id,
            organization_id
          )
        `)
        .eq("id", recruitment_round_id)
        .single();

      const { data: roundData, error: roundError } = roundResult as {
        data: {
          id: string;
          name: string;
          recruitment_cycles: { id: string; organization_id: string } | null;
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

      // Check if user is a member of the organization
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
        return res.status(403).json({ error: "Not authorized to access this round" });
      }

      // Check if session already exists (optimization for early return)
      const existingResult = await (supabase
        .from("delibs_sessions") as any)
        .select("*")
        .eq("recruitment_round_id", recruitment_round_id)
        .single();

      const { data: existingSession, error: existingError } = existingResult as {
        data: DelibsSession | null;
        error: any;
      };

      // Explicitly check existingResult.error - only "not found" is benign
      if (existingError) {
        // PGRST116 is the PostgREST error code for "No rows returned" (not found)
        const isNotFoundError = 
          existingError.code === "PGRST116" || 
          existingError.message?.includes("No rows returned") ||
          existingError.message?.includes("not found");
        
        if (!isNotFoundError) {
          console.error("Error checking for existing delibs session:", existingError);
          return res.status(500).json({ 
            error: "Failed to check for existing session",
            details: existingError 
          });
        }
        // If it's a "not found" error, proceed to create (existingSession will be null)
      }

      if (existingSession) {
        return res.status(200).json({
          session: existingSession,
          user_role: membership.role,
          round_name: roundData.name,
        });
      }

      // Atomically upsert session - replaces separate insert flow with atomic operation
      // This is idempotent and protected by the unique constraint on recruitment_round_id
      // If another request creates it concurrently, upsert will handle the conflict atomically
      const createResult = await (supabase
        .from("delibs_sessions") as any)
        .upsert({
          recruitment_round_id,
          created_by: user.id,
          status: "open",
        }, {
          onConflict: "recruitment_round_id",
          ignoreDuplicates: false
        })
        .select()
        .single();

      const { data: newSession, error: createError } = createResult as {
        data: DelibsSession | null;
        error: any;
      };

      if (createError || !newSession) {
        console.error("Error creating delibs session:", createError);
        return res.status(500).json({ error: "Failed to create session" });
      }

      return res.status(201).json({
        session: newSession,
        user_role: membership.role,
        round_name: roundData.name,
      });
    } catch (error) {
      console.error("Error in delibs session POST:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // PATCH: Lock or unlock a session (Owner/Admin only)
  if (req.method === "PATCH") {
    const { session_id, action } = req.body;

    if (!session_id || !action) {
      return res.status(400).json({ error: "Missing session_id or action" });
    }

    if (!["lock", "unlock"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Use 'lock' or 'unlock'" });
    }

    try {
      // Get session and verify access
      const sessionResult = await (supabase
        .from("delibs_sessions") as any)
        .select(`
          id,
          recruitment_round_id,
          status,
          recruitment_rounds!delibs_sessions_recruitment_round_id_fkey (
            recruitment_cycles!fk_recruitment_cycle (
              organization_id
            )
          )
        `)
        .eq("id", session_id)
        .single();

      const { data: session, error: sessionError } = sessionResult as {
        data: {
          id: string;
          recruitment_round_id: string;
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

      // Check if user is Owner or Admin
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
        return res.status(403).json({ error: "Only Owner or Admin can lock/unlock sessions" });
      }

      // Update session status
      const newStatus = action === "lock" ? "locked" : "open";
      const updateResult = await (supabase
        .from("delibs_sessions") as any)
        .update({
          status: newStatus,
          locked_at: action === "lock" ? new Date().toISOString() : null,
        })
        .eq("id", session_id)
        .select()
        .single();

      const { data: updatedSession, error: updateError } = updateResult as {
        data: DelibsSession | null;
        error: any;
      };

      if (updateError || !updatedSession) {
        console.error("Error updating session:", updateError);
        return res.status(500).json({ error: "Failed to update session" });
      }

      return res.status(200).json({ session: updatedSession });
    } catch (error) {
      console.error("Error in delibs session PATCH:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // GET: Get session by recruitment_round_id
  if (req.method === "GET") {
    const { recruitment_round_id } = req.query;

    if (!recruitment_round_id || typeof recruitment_round_id !== "string") {
      return res.status(400).json({ error: "Missing recruitment_round_id" });
    }

    try {
      // Verify access and get session
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

      // Check membership
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

      const sessionResult = await (supabase
        .from("delibs_sessions") as any)
        .select("*")
        .eq("recruitment_round_id", recruitment_round_id)
        .single();

      const { data: session, error: sessionError } = sessionResult as {
        data: DelibsSession | null;
        error: any;
      };

      if (sessionError) {
        console.error("Error fetching delibs session:", sessionError);
        return res.status(500).json({ error: "Failed to fetch session", details: sessionError });
      }

      if (!session) {
        return res.status(200).json({ session: null, user_role: membership.role });
      }

      return res.status(200).json({
        session,
        user_role: membership.role,
        round_name: roundData.name,
      });
    } catch (error) {
      console.error("Error in delibs session GET:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
