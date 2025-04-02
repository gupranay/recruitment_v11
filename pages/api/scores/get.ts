import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { applicant_round_id } = req.body;

  //console.log("Fetching scores for applicant_round_id:", applicant_round_id);

  // Validate input
  if (!applicant_round_id) {
    return res.status(400).json({
      error: "Missing required field: applicant_round_id",
    });
  }

  const supabase = supabaseBrowser();

  try {
    /*
      We fetch from "scores", referencing:
        - user: referencing the "users" table
        - metric: referencing the "metrics" table

      Often, you need the explicit constraint name like:
        user:users!scores_user_id_fkey ( full_name )
        metric:metrics!scores_metric_id_fkey ( id, name, weight )

      The exact constraint name depends on your DB. 
      Adjust to match your actual foreign key names if Supabase can’t auto-detect them.
    */

    const { data: scoreRows, error: scoreError } = await supabase
      .from("scores")
      .select(`
        id,
        score_value,
        created_at,
        user_id,

        user:users!scores_user_id_fkey (
          full_name
        ),

        metric:metrics!scores_metric_id_fkey (
          id,
          name,
          weight
        )
      `)
      .eq("applicant_round_id", applicant_round_id);

    if (scoreError) {
      console.error("Error fetching scores:", scoreError.message);
      return res.status(500).json({ error: scoreError.message });
    }

    // If no scores found, return an empty array
    if (!scoreRows || scoreRows.length === 0) {
      return res.status(200).json([]);
    }

    // Build a flat array of score objects
    const results = scoreRows.map((row) => ({
      score_id: row.id,
      score_value: row.score_value,
      created_at: row.created_at,
      user_id: row.user_id || null,
      user_name: row.user?.full_name || null,
      metric_id: row.metric?.id || null,
      metric_name: row.metric?.name || null,
      metric_weight: row.metric?.weight || null
    }));
    console.log("Fetched scores:", results);

    return res.status(200).json(results);

  } catch (err) {
    console.error("Unexpected error fetching scores:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
