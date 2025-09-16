import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { applicant_id } = req.body;

    if (!applicant_id) {
      return res.status(400).json({ error: "Missing applicant_id" });
    }

    const supabase = supabaseBrowser();

    // Delete the applicant - database functions will handle cascading deletes
    const { error: deleteError } = await supabase
      .from("applicants")
      .delete()
      .eq("id", applicant_id);

    if (deleteError) {
      console.error("Error deleting applicant:", deleteError);
      return res.status(500).json({ error: "Failed to delete applicant" });
    }

    return res.status(200).json({ message: "Applicant deleted successfully" });
  } catch (error) {
    console.error("Error in delete applicant API:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
