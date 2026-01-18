import { NextApiRequest, NextApiResponse } from "next";
import { supabaseApi } from "@/lib/supabase/api";
import { Database } from "@/lib/types/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { applicant_id, organization_id } = req.body;
  if (!applicant_id || !organization_id) {
    return res
      .status(400)
      .json({ error: "Missing applicant_id or organization_id" });
  }

  const supabase = supabaseApi(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Check if user is a member of the organization
  const { data: orgUser, error: orgUserError } = await supabase
    .from("organization_users")
    .select("id")
    .eq("organization_id", organization_id)
    .eq("user_id", user.id)
    .single();

  if (orgUserError || !orgUser) {
    return res
      .status(403)
      .json({ error: "Not authorized for this organization" });
  }

  type RoundWithComments = {
    id: string;
    recruitment_round_id: string;
    status: string;
    applicant_id: string;
    comments: Array<{
      id: string;
      user_id: string;
      comment_text: string;
      created_at: string;
      updated_at: string;
      source: string | null;
      user: { full_name: string | null } | null;
    }> | null;
    recruitment_rounds: { name: string } | null;
  };
  
  const result = await supabase
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
  
  const { data, error } = result as {
    data: RoundWithComments[] | null;
    error: any;
  };

  if (error || !data) {
    console.error("Error fetching applicant rounds and comments:", error?.message || "No data");
    return res.status(500).json({ error: error?.message || "Failed to fetch data" });
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
