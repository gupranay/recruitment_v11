import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { applicant_round_id } = req.body;

  // Basic validation
  if (!applicant_round_id) {
    return res.status(400).json({
      error: "Missing required field: applicant_round_id",
    });
  }

  const supabase = supabaseBrowser();

  try {
    // 1) Fetch scores for this applicant_round_id
    //    We also nest user info AND metric info (the metric name instead of metric_id)
    const { data: scoreRows, error: scoreError } = await supabase
      .from("scores")
      .select(`
        id,
        score_value,
        created_at,
        user_id,

        user:users (
          full_name
        ),

        metric:metrics (
          name
        )
      `)
      .eq("applicant_round_id", applicant_round_id);

    if (scoreError) {
      return res.status(500).json({ error: scoreError.message });
    }

    // If no scores found, return empty array
    if (!scoreRows || scoreRows.length === 0) {
      return res.status(200).json([]);
    }

    // 2) Group them by user_id
    const groupedByUser: Record<string, {
      user_id: string | null;
      user_name: string | null;
      scores: {
        score_id: string;
        metric_name: string | null;
        score_value: number | null;
        created_at: string;
      }[];
    }> = {};

    for (const row of scoreRows) {
      const uid = row.user_id || "no-user-id";

      // If this is the first time we see this user_id, initialize
      if (!groupedByUser[uid]) {
        groupedByUser[uid] = {
          user_id: uid === "no-user-id" ? null : uid,
          user_name: row.user?.full_name ?? null,
          scores: []
        };
      }

      // Push the score object
      groupedByUser[uid].scores.push({
        score_id: row.id,
        metric_name: row.metric?.name ?? null, // We now have the metric name
        score_value: row.score_value,
        created_at: row.created_at
      });
    }

    // 3) Convert the map to an array
    const groupedArray = Object.values(groupedByUser);

    // 4) Return the grouped array
    return res.status(200).json(groupedArray);

  } catch (err) {
    console.error("Unexpected error fetching scores:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
