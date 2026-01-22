import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

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

  const { applicant_id, applicant_round_id, new_status } = req.body;

  // Basic validation
  if (!applicant_id || !applicant_round_id || !new_status) {
    return res.status(400).json({
      error:
        "Missing required fields: applicant_id, applicant_round_id, new_status",
    });
  }

  // Validate status
  const validStatuses = ["in_progress", "maybe", "accepted", "rejected"];
  if (!validStatuses.includes(new_status)) {
    return res.status(400).json({
      error:
        "Invalid status. Must be one of: in_progress, maybe, accepted, rejected",
    });
  }

  try {
    // First, get the current applicant_round record to check if it exists
    type CurrentRoundData = {
      id: string;
      status: string;
      recruitment_round_id: string;
      applicants: { id: string };
      recruitment_rounds: {
        id: string;
        sort_order: number | null;
        recruitment_cycle_id: string;
      };
    };
    
    const currentRoundResult = await supabase
      .from("applicant_rounds")
      .select(
        `
        id,
        status,
        recruitment_round_id,
        applicants ( id ),
        recruitment_rounds (
          id,
          sort_order,
          recruitment_cycle_id
        )
      `
      )
      .eq("id", applicant_round_id)
      .eq("applicant_id", applicant_id)
      .single();
    
    const { data: currentRoundData, error: currentRoundError } = currentRoundResult as {
      data: CurrentRoundData | null;
      error: any;
    };

    if (currentRoundError || !currentRoundData) {
      return res.status(400).json({
        error: currentRoundError?.message || "Applicant round not found",
      });
    }

    const { recruitment_rounds } = currentRoundData;
    const { sort_order: currentSortOrder, recruitment_cycle_id } =
      recruitment_rounds;

    // If changing to "accepted" and it's not the last round, we need to handle moving to next round
    if (new_status === "accepted") {
      // Check if this is the last round
      const lastRoundResult = await supabase
        .from("recruitment_rounds")
        .select("id, sort_order")
        .eq("recruitment_cycle_id", recruitment_cycle_id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();
      
      const { data: lastRound, error: lastRoundError } = lastRoundResult as {
        data: { id: string; sort_order: number | null } | null;
        error: any;
      };

      if (lastRoundError || !lastRound) {
        return res.status(500).json({ error: lastRoundError?.message || "Failed to fetch last round" });
      }

      const isLastRound =
        lastRound.id === currentRoundData.recruitment_round_id;

      if (!isLastRound) {
        // Find the next round
        const nextRoundResult = await supabase
          .from("recruitment_rounds")
          .select("id, name, sort_order")
          .eq("recruitment_cycle_id", recruitment_cycle_id)
          .gt("sort_order", currentSortOrder)
          .order("sort_order", { ascending: true })
          .limit(1)
          .single();
        
        const { data: nextRound, error: nextRoundError } = nextRoundResult as {
          data: { id: string; name: string; sort_order: number | null } | null;
          error: any;
        };

        if (nextRoundError) {
          return res.status(500).json({ error: nextRoundError.message });
        }

        if (!nextRound) {
          return res.status(400).json({
            error: "No next round found. Cannot accept applicant.",
          });
        }

        // Update current round to accepted
        const updateData: Database["public"]["Tables"]["applicant_rounds"]["Update"] = {
          status: "accepted",
        };
        const updateQuery = (supabase
          .from("applicant_rounds") as any)
          .update(updateData)
          .eq("id", applicant_round_id);
        const { error: updateCurrentError } = await updateQuery as { error: any };

        if (updateCurrentError) {
          return res.status(500).json({ error: updateCurrentError.message });
        }

        // Check if applicant already exists in next round
        const existingNextRoundResult = await supabase
          .from("applicant_rounds")
          .select("id, status")
          .eq("applicant_id", applicant_id)
          .eq("recruitment_round_id", nextRound.id)
          .single();
        
        const { data: existingNextRound, error: checkNextError } = existingNextRoundResult as {
          data: { id: string; status: string } | null;
          error: any;
        };

        if (checkNextError && checkNextError.code !== "PGRST116") {
          return res.status(500).json({ error: checkNextError.message });
        }

        if (existingNextRound) {
          // Update existing record to in_progress
          const updateNextData: Database["public"]["Tables"]["applicant_rounds"]["Update"] = {
            status: "in_progress",
          };
          const updateNextQuery = (supabase
            .from("applicant_rounds") as any)
            .update(updateNextData)
            .eq("id", existingNextRound.id);
          const { error: updateNextError } = await updateNextQuery as { error: any };

          if (updateNextError) {
            return res.status(500).json({ error: updateNextError.message });
          }
        } else {
          // Create new record for next round
          const insertData: Database["public"]["Tables"]["applicant_rounds"]["Insert"] = {
            applicant_id,
            recruitment_round_id: nextRound.id,
            status: "in_progress",
          };
          const insertQuery = (supabase
            .from("applicant_rounds") as any)
            .insert([insertData as any]);
          const { error: createNextError } = await insertQuery as { error: any };

          if (createNextError) {
            return res.status(500).json({ error: createNextError.message });
          }
        }

        return res.status(200).json({
          message: "Applicant accepted and moved to next round successfully.",
          new_status: "accepted",
          next_round_info: nextRound,
        });
      } else {
        // This is the last round, just update status to accepted
        const lastUpdateData: Database["public"]["Tables"]["applicant_rounds"]["Update"] = {
          status: "accepted",
        };
        const lastUpdateQuery = (supabase
          .from("applicant_rounds") as any)
          .update(lastUpdateData)
          .eq("id", applicant_round_id)
          .select()
          .single();
        const lastUpdateResult = await lastUpdateQuery as any;
        const { data, error } = lastUpdateResult as {
          data: Database["public"]["Tables"]["applicant_rounds"]["Row"] | null;
          error: any;
        };

        if (error) {
          return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({
          message: "Applicant accepted successfully (final round).",
          new_status: "accepted",
          updatedRecord: data,
        });
      }
    } else {
      // For other statuses (in_progress, maybe, rejected), just update the current round
      const otherUpdateData: Database["public"]["Tables"]["applicant_rounds"]["Update"] = {
        status: new_status,
        updated_at: new Date().toISOString(),
      };
      const otherUpdateQuery = (supabase
        .from("applicant_rounds") as any)
        .update(otherUpdateData)
        .eq("id", applicant_round_id)
        .select()
        .single();
      const otherUpdateResult = await otherUpdateQuery as any;
      const { data, error } = otherUpdateResult as {
        data: Database["public"]["Tables"]["applicant_rounds"]["Row"] | null;
        error: any;
      };

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        message: `Applicant status changed to ${new_status} successfully.`,
        new_status,
        updatedRecord: data,
      });
    }
  } catch (error) {
    console.error("Error changing applicant decision:", error);
    return res.status(500).json({
      error: "An unexpected error occurred while changing the decision.",
    });
  }
}
