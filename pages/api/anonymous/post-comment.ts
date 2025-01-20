import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { createDecipheriv } from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Destructure fields from body
  const { recruitment_round_id, applicant_id, user_id, comment_text } = req.body;

  // Basic validation
  if (!recruitment_round_id || !applicant_id || !user_id || !comment_text) {
    return res.status(400).json({
      error: "Missing one or more required fields: recruitment_round_id, applicant_id, user_id, comment_text",
    });
  }

  // Create Supabase client
  const supabase = supabaseBrowser();

  // 1) Find the applicant_rounds row that matches this applicant + round
  const { data: bridgingRow, error: bridgingError } = await supabase
    .from("applicant_rounds")
    .select("id") // We only need the ID
    .eq("recruitment_round_id", recruitment_round_id)
    .eq("applicant_id", applicant_id)
    .single();

  if (bridgingError) {
    console.error("Error fetching applicant_rounds row:", bridgingError);
    return res.status(500).json({ error: bridgingError.message });
  }

  if (!bridgingRow) {
    return res.status(404).json({
      error: "No matching applicant_round found for that applicant + round",
    });
  }

  // bridgingRow.id is the applicant_round_id we need for the comments table
  const applicantRoundId = bridgingRow.id;

  // 2) Insert the comment with is_anonymous = true
  const { data: insertedComment, error: commentError } = await supabase
    .from("comments")
    .insert({
      applicant_round_id: applicantRoundId,
      user_id,
      comment_text,
      is_anonymous: true, // or a similarly named boolean column
    })
    .select()
    .single();

  if (commentError) {
    console.error("Error inserting comment:", commentError);
    return res.status(500).json({ error: commentError.message });
  }

  // Return the inserted comment
  return res.status(200).json({
    comment_text: insertedComment.comment_text,
    created_at: insertedComment.created_at,
  });
}
