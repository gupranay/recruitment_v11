import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract fields from request body
  const { applicant_round_id, user_id, comment_text } = req.body;

  // Basic validation
  if (!applicant_round_id || !user_id || !comment_text) {
    return res.status(400).json({
      error: "Missing required fields: applicant_round_id, user_id, comment_text",
    });
  }

  // Initialize Supabase client
  const supabase = supabaseBrowser();

  // Insert a new comment
  const { data, error } = await supabase
    .from("comments")
    .insert([
      {
        applicant_round_id,
        user_id,
        comment_text
      },
    ])
    .select()
    .single();

  // Handle errors
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Success
  return res.status(200).json({
    message: "Comment created successfully",
    comment: data,
  });
}
