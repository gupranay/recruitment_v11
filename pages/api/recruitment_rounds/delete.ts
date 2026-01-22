import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

type DeleteMode = "normal" | "deleteAllApplicants" | "deleteRoundDataOnly";

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

  const { recruitment_round_id, mode = "normal" } = req.body as {
    recruitment_round_id: string;
    mode?: DeleteMode;
  };

  const validModes: DeleteMode[] = ["normal", "deleteAllApplicants", "deleteRoundDataOnly"];
  if (!validModes.includes(mode as DeleteMode)) {
    return res.status(400).json({
      error: `Invalid mode: ${mode}. Must be one of: ${validModes.join(", ")}`,
    });
  }

  // Basic validation
  if (!recruitment_round_id) {
    return res.status(400).json({
      error: "Missing required field: recruitment_round_id",
    });
  }

  try {
    // 1) Verify the round exists and get its details
    const roundResult = await supabase
      .from("recruitment_rounds")
      .select("id, sort_order, recruitment_cycle_id, name")
      .eq("id", recruitment_round_id)
      .single();
    
    const { data: roundData, error: roundError } = roundResult as {
      data: { id: string; sort_order: number | null; recruitment_cycle_id: string; name: string } | null;
      error: any;
    };

    if (roundError || !roundData) {
      return res.status(404).json({
        error: roundError?.message || "Recruitment round not found",
      });
    }

    const { sort_order: deletedSortOrder, recruitment_cycle_id } = roundData;

    // 2) Get all rounds in the cycle to determine position
    const allRoundsResult = await supabase
      .from("recruitment_rounds")
      .select("id, sort_order")
      .eq("recruitment_cycle_id", recruitment_cycle_id)
      .order("sort_order", { ascending: true });
    
    const { data: allRounds, error: allRoundsError } = allRoundsResult as {
      data: Array<{ id: string; sort_order: number | null }> | null;
      error: any;
    };

    if (allRoundsError) {
      return res.status(500).json({
        error: `Error fetching rounds: ${allRoundsError.message}`,
      });
    }

    const totalRounds = allRounds?.length || 0;
    const isOnlyRound = totalRounds === 1;
    const validSortOrders = allRounds
      ?.filter(r => r.sort_order !== null && r.sort_order !== undefined)
      .map(r => r.sort_order as number) || [];
    const maxSortOrder = Math.max(...validSortOrders, 0);
    const isLastRound = deletedSortOrder !== null && deletedSortOrder === maxSortOrder;
    const isFirstOrMiddleRound = !isOnlyRound && !isLastRound;

    // 3) Check for dependent data - applicant_rounds
    const applicantRoundsResult = await supabase
      .from("applicant_rounds")
      .select("id")
      .eq("recruitment_round_id", recruitment_round_id);
    
    const { data: applicantRounds, error: applicantRoundsError } = applicantRoundsResult as {
      data: Array<{ id: string }> | null;
      error: any;
    };

    if (applicantRoundsError) {
      return res.status(500).json({
        error: `Error checking applicants: ${applicantRoundsError.message}`,
      });
    }

    const hasApplicants = applicantRounds && applicantRounds.length > 0;

    // 4) Check for dependent data - anonymous_readings
    const anonymousReadingsResult = await supabase
      .from("anonymous_readings")
      .select("id")
      .eq("recruitment_round_id", recruitment_round_id)
      .limit(1);
    
    const { data: anonymousReadings, error: anonymousReadingsError } = anonymousReadingsResult as {
      data: Array<{ id: string }> | null;
      error: any;
    };

    if (anonymousReadingsError) {
      return res.status(500).json({
        error: `Error checking anonymous readings: ${anonymousReadingsError.message}`,
      });
    }

    if (anonymousReadings && anonymousReadings.length > 0) {
      return res.status(400).json({
        error: "Cannot delete round: This round has associated anonymous readings. Please remove all anonymous readings before deleting the round.",
      });
    }

    // 5) Handle applicants based on round position and mode
    if (hasApplicants) {
      // If mode is "normal", we need to inform the client about options
      if (mode === "normal") {
        if (isOnlyRound) {
          // Only one round - ask if they want to delete all applicants too
          return res.status(409).json({
            error: "Round contains applicants",
            code: "HAS_APPLICANTS_ONLY_ROUND",
            message: "This is the only round and it contains applicants. Would you like to delete all applicants and their data as well?",
            applicantCount: applicantRounds.length,
          });
        } else if (isFirstOrMiddleRound) {
          // First or middle round - cannot delete
          return res.status(409).json({
            error: "Cannot delete round",
            code: "HAS_APPLICANTS_NOT_LAST_ROUND",
            message: "This round contains applicants and has subsequent rounds that depend on it. You cannot delete a round that is not the last round when it contains applicants.",
          });
        } else if (isLastRound) {
          // Last round - can delete round data only
          return res.status(409).json({
            error: "Round contains applicants",
            code: "HAS_APPLICANTS_LAST_ROUND",
            message: "This round contains applicants. You can delete this round and all associated data (scores, comments) while keeping the applicants in previous rounds.",
            applicantCount: applicantRounds.length,
          });
        }
      }

      // Handle force deletion modes
      if (mode === "deleteAllApplicants" && isOnlyRound) {
        // Delete all applicants in the cycle
        const { data: cycleApplicants, error: fetchApplicantsError } = await supabase
          .from("applicants")
          .select("id")
          .eq("recruitment_cycle_id", recruitment_cycle_id) as {
            data: Array<{ id: string }> | null;
            error: any;
          };

        if (fetchApplicantsError) {
          return res.status(500).json({
            error: `Error fetching applicants: ${fetchApplicantsError.message}`,
          });
        }

        if (cycleApplicants && cycleApplicants.length > 0) {
          // Delete comments first (they reference applicant_rounds)
          const { error: deleteCommentsError } = await (supabase
            .from("comments") as any)
            .delete()
            .in("applicant_round_id", applicantRounds.map(ar => ar.id));

          if (deleteCommentsError) {
            return res.status(500).json({
              error: `Error deleting comments for applicant_rounds in round ${recruitment_round_id} (cycle ${recruitment_cycle_id}): ${deleteCommentsError.message}`,
            });
          }

          // Delete scores (they reference applicant_rounds)
          const { error: deleteScoresError } = await (supabase
            .from("scores") as any)
            .delete()
            .in("applicant_round_id", applicantRounds.map(ar => ar.id));

          if (deleteScoresError) {
            return res.status(500).json({
              error: `Error deleting scores for applicant_rounds in round ${recruitment_round_id} (cycle ${recruitment_cycle_id}): ${deleteScoresError.message}`,
            });
          }

          // Delete applicant_rounds
          const { error: deleteApplicantRoundsError } = await (supabase
            .from("applicant_rounds") as any)
            .delete()
            .eq("recruitment_round_id", recruitment_round_id);

          if (deleteApplicantRoundsError) {
            return res.status(500).json({
              error: `Error deleting applicant rounds: ${deleteApplicantRoundsError.message}`,
            });
          }

          // Delete applicants
          const { error: deleteApplicantsError } = await (supabase
            .from("applicants") as any)
            .delete()
            .eq("recruitment_cycle_id", recruitment_cycle_id);

          if (deleteApplicantsError) {
            return res.status(500).json({
              error: `Error deleting applicants: ${deleteApplicantsError.message}`,
            });
          }
        }
      } else if (mode === "deleteRoundDataOnly" && isLastRound) {
        // Delete only the round data (comments, scores, applicant_rounds) but keep applicants
        // Delete comments first (they reference applicant_rounds)
        const { error: deleteCommentsError } = await (supabase
          .from("comments") as any)
          .delete()
          .in("applicant_round_id", applicantRounds.map(ar => ar.id));

        if (deleteCommentsError) {
          return res.status(500).json({
            error: `Error deleting comments for applicant_rounds in round ${recruitment_round_id} (cycle ${recruitment_cycle_id}): ${deleteCommentsError.message}`,
          });
        }

        // Delete scores (they reference applicant_rounds)
        const { error: deleteScoresError } = await (supabase
          .from("scores") as any)
          .delete()
          .in("applicant_round_id", applicantRounds.map(ar => ar.id));

        if (deleteScoresError) {
          return res.status(500).json({
            error: `Error deleting scores for applicant_rounds in round ${recruitment_round_id} (cycle ${recruitment_cycle_id}): ${deleteScoresError.message}`,
          });
        }

        // Delete applicant_rounds for this round only
        const { error: deleteApplicantRoundsError } = await (supabase
          .from("applicant_rounds") as any)
          .delete()
          .eq("recruitment_round_id", recruitment_round_id);

        if (deleteApplicantRoundsError) {
          return res.status(500).json({
            error: `Error deleting applicant rounds: ${deleteApplicantRoundsError.message}`,
          });
        }
      } else if (mode !== "normal" && hasApplicants) {
        // Invalid mode for the round position
        return res.status(400).json({
          error: "Invalid deletion mode for this round position",
        });
      }
    }

    // 6) All checks passed - safe to delete the round
    // First, delete associated metrics (if any)
    const deleteMetricsQuery = (supabase
      .from("metrics") as any)
      .delete()
      .eq("recruitment_round_id", recruitment_round_id);
    const { error: deleteMetricsError } = await deleteMetricsQuery as { error: any };

    if (deleteMetricsError) {
      console.error("Error deleting metrics:", deleteMetricsError);
      // Continue with round deletion even if metrics deletion fails
      // (they may be cascade deleted by the database)
    }

    // Delete the round
    const deleteQuery = (supabase
      .from("recruitment_rounds") as any)
      .delete()
      .eq("id", recruitment_round_id);
    const { error: deleteError } = await deleteQuery as { error: any };

    if (deleteError) {
      return res.status(500).json({
        error: `Failed to delete round: ${deleteError.message}`,
      });
    }

    // 7) Reorder remaining rounds: decrement sort_order for rounds with higher sort_order
    // We need to update all rounds in the same cycle that have sort_order > deletedSortOrder
    if (deletedSortOrder !== null) {
      // Get all rounds with higher sort_order
      const roundsToUpdateResult = await supabase
        .from("recruitment_rounds")
        .select("id, sort_order")
        .eq("recruitment_cycle_id", recruitment_cycle_id)
        .gt("sort_order", deletedSortOrder)
        .order("sort_order", { ascending: true });
      
      const { data: roundsToUpdate, error: fetchError } = roundsToUpdateResult as {
        data: Array<{ id: string; sort_order: number | null }> | null;
        error: any;
      };

      if (fetchError) {
        console.error("Error fetching rounds to update:", fetchError);
        // Don't fail the deletion, but log the error
      } else if (roundsToUpdate && roundsToUpdate.length > 0) {
        // Update each round individually (Supabase doesn't support raw SQL in update easily)
        for (const round of roundsToUpdate) {
          // Only update if sort_order is not null
          if (round.sort_order !== null) {
            const newSortOrder = round.sort_order - 1;
            const updateData: Database["public"]["Tables"]["recruitment_rounds"]["Update"] = {
              sort_order: newSortOrder,
            };
            const updateQuery = (supabase
              .from("recruitment_rounds") as any)
              .update(updateData)
              .eq("id", round.id);
            const { error: updateError } = await updateQuery as { error: any };

            if (updateError) {
              console.error(
                `Error updating sort_order for round ${round.id}:`,
                updateError
              );
              // Continue with other updates even if one fails
            }
          }
        }
      }
    }

    return res.status(200).json({
      message: "Recruitment round deleted successfully",
      deleted_round_id: recruitment_round_id,
    });
  } catch (error) {
    console.error("Unexpected error deleting recruitment round:", error);
    return res.status(500).json({
      error: "An unexpected error occurred while deleting the round",
    });
  }
}
