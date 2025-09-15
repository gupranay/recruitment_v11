import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
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

  const supabase = supabaseBrowser();

  try {
    // First, get the current applicant_round record to check if it exists
    const { data: currentRoundData, error: currentRoundError } = await supabase
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
      const { data: lastRound, error: lastRoundError } = await supabase
        .from("recruitment_rounds")
        .select("id, sort_order")
        .eq("recruitment_cycle_id", recruitment_cycle_id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      if (lastRoundError) {
        return res.status(500).json({ error: lastRoundError.message });
      }

      const isLastRound =
        lastRound.id === currentRoundData.recruitment_round_id;

      if (!isLastRound) {
        // Find the next round
        const { data: nextRound, error: nextRoundError } = await supabase
          .from("recruitment_rounds")
          .select("id, name, sort_order")
          .eq("recruitment_cycle_id", recruitment_cycle_id)
          .gt("sort_order", currentSortOrder)
          .order("sort_order", { ascending: true })
          .limit(1)
          .single();

        if (nextRoundError) {
          return res.status(500).json({ error: nextRoundError.message });
        }

        if (!nextRound) {
          return res.status(400).json({
            error: "No next round found. Cannot accept applicant.",
          });
        }

        // Update current round to accepted
        const { error: updateCurrentError } = await supabase
          .from("applicant_rounds")
          .update({ status: "accepted" })
          .eq("id", applicant_round_id);

        if (updateCurrentError) {
          return res.status(500).json({ error: updateCurrentError.message });
        }

        // Check if applicant already exists in next round
        const { data: existingNextRound, error: checkNextError } =
          await supabase
            .from("applicant_rounds")
            .select("id, status")
            .eq("applicant_id", applicant_id)
            .eq("recruitment_round_id", nextRound.id)
            .single();

        if (checkNextError && checkNextError.code !== "PGRST116") {
          return res.status(500).json({ error: checkNextError.message });
        }

        if (existingNextRound) {
          // Update existing record to in_progress
          const { error: updateNextError } = await supabase
            .from("applicant_rounds")
            .update({ status: "in_progress" })
            .eq("id", existingNextRound.id);

          if (updateNextError) {
            return res.status(500).json({ error: updateNextError.message });
          }
        } else {
          // Create new record for next round
          const { error: createNextError } = await supabase
            .from("applicant_rounds")
            .insert([
              {
                applicant_id,
                recruitment_round_id: nextRound.id,
                status: "in_progress",
              },
            ]);

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
        const { data, error } = await supabase
          .from("applicant_rounds")
          .update({ status: "accepted" })
          .eq("id", applicant_round_id)
          .select()
          .single();

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
      const { data, error } = await supabase
        .from("applicant_rounds")
        .update({
          status: new_status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicant_round_id)
        .select()
        .single();

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
