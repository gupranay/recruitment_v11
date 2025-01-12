import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Read applicant_id from the request body
  const { applicant_id } = req.body;
  
  // Basic validation
  if (!applicant_id) {
    return res.status(400).json({ error: "Missing required field: applicant_id" });
  }

  const supabase = supabaseBrowser();

  /*
    We'll select from "comments" and nest relationships:
      - user: referencing "users" to get full_name (or email, etc.)
      - applicant_rounds: bridging table referencing "recruitment_rounds" for round name.

    Make sure your foreign key constraints are properly set:
    - comments.user_id -> users.id
    - comments.applicant_round_id -> applicant_rounds.id
    - applicant_rounds.recruitment_round_id -> recruitment_rounds.id

    Also note that if Supabase can't autodetect the relationship from user_id -> users.id,
    you may need to specify the constraint name (e.g. users!comments_user_id_fkey).
  */

  const { data, error } = await supabase
    .from("comments")
    .select(`
      comment_text,
      created_at,

      user:users (
        full_name
      ),

      applicant_rounds (
        applicant_id,
        recruitment_rounds (
          name
        )
      )
    `)
    // Filter to only comments for the given applicant_id
    .eq("applicant_rounds.applicant_id", applicant_id);

  if (error) {
    console.error("Error fetching comments:", error.message);
    return res.status(500).json({ error: error.message });
  }

  // Transform data into a simpler format
  const comments = data.map((item) => ({
    comment_text: item.comment_text,
    created_at: item.created_at,
    user_name: item.user?.full_name || null,
    round_name: item.applicant_rounds?.recruitment_rounds?.name || null,
  }));

  return res.status(200).json(comments);
}
