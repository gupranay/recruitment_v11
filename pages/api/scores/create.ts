import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";
import { randomUUID } from "crypto";

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

  const {
    applicant_id,
    recruitment_round_id,
    scores, // array of { metric_id, score_value, weight }
  } = req.body;

  // Basic validation
  if (
    !applicant_id ||
    !recruitment_round_id ||
    !Array.isArray(scores) ||
    scores.length === 0
  ) {
    return res.status(400).json({
      error:
        "Missing or invalid fields: applicant_id, recruitment_round_id, and a non-empty scores array",
    });
  }

  try {
    // 1) Find or verify the applicant_rounds record
    const applicantRoundResult = await supabase
      .from("applicant_rounds")
      .select("id")
      .eq("applicant_id", applicant_id)
      .eq("recruitment_round_id", recruitment_round_id)
      .single();
    
    const { data: applicantRound, error: bridgingError } = applicantRoundResult as {
      data: { id: string } | null;
      error: any;
    };

    if (bridgingError) {
      console.error("Error fetching applicant_rounds row:", bridgingError);
      return res.status(500).json({ error: bridgingError.message });
    }
    if (!applicantRound) {
      return res.status(404).json({
        error:
          "No matching applicant_round found for the given applicant + round",
      });
    }

    const applicantRoundId = applicantRound.id;

    // 2) Build the insert data for scores
    //    e.g. { applicant_round_id, metric_id, score_value, user_id }
    //    ignoring weight on the DB side (unless you store it in 'scores' or 'metrics' as well).
    const submission_id = randomUUID(); // Generate a new submission_id
    const insertData = scores.map((item) => ({
      applicant_round_id: applicantRoundId,
      metric_id: item.metric_id,
      score_value: item.score_value,
      user_id: user.id,
      submission_id, // assign the same submission_id to all
    }));

    // 3) Insert (or upsert) into 'scores'
    //    If you want to allow updates for existing rows, you can do onConflict:
    //      .upsert(insertData, { onConflict: "metric_id,applicant_round_id" })
    //    Otherwise, a plain insert might fail if there's a unique constraint for the same metric+round.
    const scoresInsertData: Database["public"]["Tables"]["scores"]["Insert"][] = insertData.map(item => ({
      applicant_round_id: item.applicant_round_id,
      metric_id: item.metric_id,
      score_value: item.score_value,
      user_id: item.user_id,
      submission_id: item.submission_id,
    }));
    
    const scoresResult = await (supabase
      .from("scores") as any)
      .insert(scoresInsertData as any)
      .select();
    
    const { data: insertedScores, error: insertError } = scoresResult as {
      data: Database["public"]["Tables"]["scores"]["Row"][] | null;
      error: any;
    };

    if (insertError || !insertedScores) {
      console.error("Error inserting scores:", insertError?.message || "No data returned");
      return res.status(500).json({ error: insertError?.message || "Failed to insert scores" });
    }

    // 4) Compute the new weighted average from request data
    //    sum(score_value * weight) / sum(weight)
    //    But since the user said all metrics' weights sum to 1, we can do just sum(score_value * weight).
    let numerator = 0;
    let denominator = 0;
    scores.forEach((item) => {
      // if you trust all metrics add up to 1, denominator can remain 1
      // but we'll do a real sum if needed
      numerator += (item.score_value ?? 0) * (item.weight ?? 0);
      denominator += item.weight ?? 0;
    });

    let weightedAverage = null;
    if (denominator > 0) {
      weightedAverage = numerator / denominator;
    }

    // 5) Update applicant_rounds.weighted_score
    const updateData: Database["public"]["Tables"]["applicant_rounds"]["Update"] = {
      weighted_score: weightedAverage ?? null,
    };
    const updateQuery = (supabase
      .from("applicant_rounds") as any)
      .update(updateData)
      .eq("id", applicantRoundId);
    const { error: updateErr } = await updateQuery as { error: any };

    if (updateErr) {
      console.error("Error updating weighted_score:", updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    // 6) Return success
    return res.status(200).json({
      message: "Scores created and weighted average updated successfully",
      scores: insertedScores,
      weighted_score: weightedAverage,
    });
  } catch (err) {
    console.error("Unexpected error in creating scores:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
