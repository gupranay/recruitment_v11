import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // For best REST semantics, let's say we only allow GET here.
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // We can read applicant_id from query parameters, e.g. /api/get-comments-for-applicant?applicant_id=abc123
  const { applicant_id } = req.query;

  // Basic validation
  if (!applicant_id || typeof applicant_id !== "string") {
    return res.status(400).json({ error: "Missing or invalid applicant_id in query." });
  }

  const supabase = supabaseBrowser();

  /*
    We'll start from the applicant_rounds table (the bridging table).
    For each applicant_round, we fetch the array of related comments.

    Structure of the select:
      .select(`
        id,
        recruitment_round_id,
        comments (
          id,
          comment_text,
          created_at,
          updated_at,
          user_id
        )
      `)

    So each record will look like:
      {
        id: "uuid-of-applicant_rounds",
        recruitment_round_id: "uuid-of-the-round",
        comments: [
          {
            id: "uuid-of-comment",
            comment_text: "...",
            created_at: "...",
            user_id: "who wrote it"
          },
          ...
        ]
      }
  */
  const { data: applicantRounds, error } = await supabase
    .from("applicant_rounds")
    .select(`
      id,
      recruitment_round_id,
      status,
      comments (
        id,
        comment_text,
        created_at,
        updated_at,
        user_id
      )
    `)
    .eq("applicant_id", applicant_id);

  // Handle error
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // If you want to return comments in a flat array instead of grouped by round:
  // We'll map over each round, extract its comments, and flatten them.
  const allComments = applicantRounds?.flatMap((round) => {
    // We can optionally attach some round info to each comment, or just return them as is
    return round.comments.map((c) => ({
      ...c,
      applicant_round_id: round.id,
      recruitment_round_id: round.recruitment_round_id,
      status: round.status,
    }));
  }) ?? [];

  // Return the data as you prefer. Either grouped by rounds, or flattened.
  // 1) Grouped by rounds (the raw response from the DB):
  // return res.status(200).json(applicantRounds);

  // 2) Flattened array of comments:
  return res.status(200).json(allComments);
}
