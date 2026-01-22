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
    comment_text,
    recruitment_round_id,
    source = "A", // Default to anonymous for this endpoint
  } = req.body;

  if (!applicant_id || !comment_text || !recruitment_round_id) {
    return res.status(400).json({
      error:
        "Missing required fields: applicant_id, comment_text, recruitment_round_id",
    });
  }

  try {
    // First get the applicant_round_id
    const applicantRoundResult = await supabase
      .from("applicant_rounds")
      .select("id")
      .eq("applicant_id", applicant_id)
      .eq("recruitment_round_id", recruitment_round_id)
      .single();
    
    const { data: applicantRound, error: applicantRoundError } = applicantRoundResult as {
      data: { id: string } | null;
      error: any;
    };

    if (applicantRoundError || !applicantRound) {
      return res.status(404).json({ error: "Applicant round not found" });
    }

    // Insert the comment - SECURITY: Use authenticated user.id
    const insertData: Database["public"]["Tables"]["comments"]["Insert"] = {
      applicant_round_id: applicantRound.id,
      user_id: user.id,
      comment_text,
      source,
    };

    const commentResult = await (supabase
      .from("comments")
      .insert([insertData as any] as any)
      .select()
      .single() as any);
    
    const { data, error } = commentResult as {
      data: Database["public"]["Tables"]["comments"]["Row"] | null;
      error: any;
    };

    if (error) {
      console.error("Error creating comment:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      message: "Comment created successfully",
      comment: data,
    });
  } catch (err) {
    console.error("Error creating comment:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
