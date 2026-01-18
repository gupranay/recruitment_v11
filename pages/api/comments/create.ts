// api/comments/create.ts
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

  const { applicant_round_id, comment_text, source = "R" } = req.body;

  if (!applicant_round_id || !comment_text) {
    return res.status(400).json({
      error: "Missing required fields: applicant_round_id, comment_text",
    });
  }

  try {
    // Insert the comment
    const insertData: Database["public"]["Tables"]["comments"]["Insert"] = {
      applicant_round_id,
      user_id: user.id,
      comment_text,
      source,
    };
    
    const insertResult = await (supabase
      .from("comments") as any)
      .insert([insertData as any] as any)
      .select()
      .single();
    
    const { data, error } = insertResult as {
      data: Database["public"]["Tables"]["comments"]["Row"] | null;
      error: any;
    };

    if (error) {
      console.log(error);
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
