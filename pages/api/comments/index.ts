import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { applicant_id } = req.body;
  if (!applicant_id) {
    return res.status(400).json({ error: "Missing applicant_id" });
  }

  const supabase = supabaseBrowser();

  const { data, error } = await supabase
    .from("applicant_rounds")
    .select(
      `
      id,
      recruitment_round_id,
      status,
      applicant_id,
      comments (
        id,
        user_id,
        comment_text,
        created_at,
        is_anonymous,
        user:users!comments_user_id_fkey (
          full_name
        )
      ),
      recruitment_rounds!applicant_rounds_recruitment_round_id_fkey (
        name
      )
    `
    )
    .eq("applicant_id", applicant_id);

  if (error) {
    console.error("Error fetching applicant rounds and comments:", error);
    return res.status(500).json({ error: error.message });
  }

  const allComments = [];
  for (const round of data) {
    const roundName = round.recruitment_rounds?.name ?? null;

    for (const c of round.comments ?? []) {
      allComments.push({
        id: c.id,
        user_id: c.user_id,
        comment_text: c.comment_text,
        created_at: c.created_at,
        user_name: c.user?.full_name ?? null,
        round_name: roundName,
        anonymous: c.is_anonymous,
      });
    }
  }

  return res.status(200).json(allComments);
}
