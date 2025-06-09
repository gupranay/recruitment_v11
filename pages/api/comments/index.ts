import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";

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

  const supabase = supabaseApi(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

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
        updated_at,
        source,
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
        updated_at: c.updated_at,
        user_name: c.user?.full_name ?? null,
        round_name: roundName,
        source: c.source,
        is_edited:
          c.updated_at && new Date(c.updated_at) > new Date(c.created_at),
      });
    }
  }

  // Sort comments by created_at date (earliest to latest)
  allComments.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return res.status(200).json(allComments);
}
