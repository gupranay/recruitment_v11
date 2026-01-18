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

  if (!recruitment_round_id) {
    return res.status(400).json({
      error: "Missing required field: recruitment_round_id",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // Verify the round exists
    const roundResult = await supabase
      .from("recruitment_rounds")
      .select("id")
      .eq("id", recruitment_round_id)
      .single();
    
    const { data: roundData, error: roundError } = roundResult as {
      data: { id: string } | null;
      error: any;
    };

    if (roundError || !roundData) {
      return res.status(404).json({
        error: roundError?.message || "Recruitment round not found",
      });
    }

    // Get all applicant_rounds for this recruitment round
    const applicantRoundsResult = await supabase
      .from("applicant_rounds")
      .select("id")
      .eq("recruitment_round_id", recruitment_round_id);
    
    const { data: applicantRounds, error: applicantRoundsError } = applicantRoundsResult as {
      data: Array<{ id: string }> | null;
      error: any;
    };

    if (applicantRoundsError) {
      console.error("Error fetching applicant_rounds:", applicantRoundsError);
      return res.status(500).json({ error: applicantRoundsError.message });
    }

    if (!applicantRounds || applicantRounds.length === 0) {
      // No applicant rounds, so no scores to delete
      return res.status(200).json({ success: true, deletedCount: 0 });
    }

    const applicantRoundIds = applicantRounds.map((ar) => ar.id);

    // Delete all scores for these applicant_rounds
    const deleteScoresQuery = (supabase
      .from("scores") as any)
      .delete()
      .in("applicant_round_id", applicantRoundIds);
    const { error: deleteScoresError } = await deleteScoresQuery as { error: any };

    if (deleteScoresError) {
      console.error("Error deleting scores:", deleteScoresError);
      return res.status(500).json({ error: deleteScoresError.message });
    }

    // Clear weighted_score in applicant_rounds table
    const clearData: Database["public"]["Tables"]["applicant_rounds"]["Update"] = {
      weighted_score: null,
    };
    const clearQuery = (supabase
      .from("applicant_rounds") as any)
      .update(clearData)
      .eq("recruitment_round_id", recruitment_round_id);
    const { error: clearWeightedScoreError } = await clearQuery as { error: any };

    if (clearWeightedScoreError) {
      console.error(
        "Error clearing weighted_score:",
        clearWeightedScoreError
      );
      // Don't fail the request if this fails, but log it
      console.warn(
        "Warning: Scores deleted but weighted_score not cleared for some records"
      );
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Unexpected error deleting scores for round:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
