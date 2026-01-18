import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Database } from "@/lib/types/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { recruitment_round_id } = req.body;

  // Basic validation
  if (!recruitment_round_id) {
    return res.status(400).json({
      error: "Missing required field: recruitment_round_id",
    });
  }

  const supabase = supabaseBrowser();

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

    // 2) Check for dependent data - applicant_rounds
    const applicantRoundsResult = await supabase
      .from("applicant_rounds")
      .select("id")
      .eq("recruitment_round_id", recruitment_round_id)
      .limit(1);
    
    const { data: applicantRounds, error: applicantRoundsError } = applicantRoundsResult as {
      data: Array<{ id: string }> | null;
      error: any;
    };

    if (applicantRoundsError) {
      return res.status(500).json({
        error: `Error checking applicants: ${applicantRoundsError.message}`,
      });
    }

    if (applicantRounds && applicantRounds.length > 0) {
      return res.status(400).json({
        error: "Cannot delete round: This round contains applicants. Please remove all applicants before deleting the round.",
      });
    }

    // 3) Check for dependent data - anonymous_readings
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

    // 4) All checks passed - safe to delete
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

    // 5) Reorder remaining rounds: decrement sort_order for rounds with higher sort_order
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
