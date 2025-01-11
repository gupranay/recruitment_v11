import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { applicant_id, applicant_round_id } = req.body;
  console.log(req.body);

  // Basic validation
  if (!applicant_id || !applicant_round_id) {
    return res.status(400).json({
      error: "Missing required fields: applicant_id, applicant_round_id",
    });
  }

  const supabase = supabaseBrowser();

  // 1) Fetch the current applicant_round record
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
    .eq("applicant_id", applicant_id) // extra safety check
    .single();

  if (currentRoundError || !currentRoundData) {
    return res.status(400).json({
      error: currentRoundError?.message || "Current applicant round not found",
    });
  }

  // Extract details
  const { id: bridgingId, recruitment_rounds } = currentRoundData;
  const { sort_order: currentSortOrder, recruitment_cycle_id } = recruitment_rounds;

  // 2) Find the *next* round in the SAME cycle with a higher sort_order
  const { data: nextRound, error: nextRoundError } = await supabase
    .from("recruitment_rounds")
    .select("id, name, sort_order")
    .eq("recruitment_cycle_id", recruitment_cycle_id)
    .gt("sort_order", currentSortOrder)            // only those bigger than the current
    .order("sort_order", { ascending: true })     // smallest bigger sort_order first
    .limit(1)
    .single();

  if (nextRoundError) {
    return res.status(500).json({ error: nextRoundError.message });
  }

  if (!nextRound) {
    // That means we are at the LAST round, no "next" round. 
    // Decide how you want to handle this scenario. 
    return res.status(400).json({
      error: "No next round found (you might be at the final round).",
    });
  }

  // 3) Update the OLD bridging record to mark it as "completed" or "passed"
  const { error: updateOldRoundError } = await supabase
    .from("applicant_rounds")
    .update({ status: "accepted" }) // or "passed", etc.
    .eq("id", bridgingId);

  if (updateOldRoundError) {
    return res.status(500).json({ error: updateOldRoundError.message });
  }

  // 4) Create a NEW bridging record for the applicant in the next round
  const { data: newRoundData, error: newRoundError } = await supabase
    .from("applicant_rounds")
    .insert([
      {
        applicant_id,
        recruitment_round_id: nextRound.id,
        status: "in_progress", // set initial status as you prefer
      },
    ])
    .select()
    .single();

  if (newRoundError) {
    return res.status(500).json({ error: newRoundError.message });
  }

  // 5) Return a success response, possibly including the new bridging record
  return res.status(200).json({
    message: "Moved applicant to the next round successfully.",
    old_round_id: bridgingId,
    new_round: newRoundData,
    next_round_info: nextRound,
  });
}
