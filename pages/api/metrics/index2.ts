import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { applicant_round_id } = req.body;
  if (!applicant_round_id) {
    return res.status(400).json({ error: "Missing applicant_round_id" });
  }

  const supabase = supabaseBrowser();

  try {
    // 1) Find the bridging row to get the recruitment_round_id
    const { data: bridging, error: bridgingErr } = await supabase
      .from("applicant_rounds")
      .select("recruitment_round_id")
      .eq("id", applicant_round_id)
      .single();

    if (bridgingErr) {
      console.error("Error fetching applicant_round:", bridgingErr);
      return res.status(500).json({ error: bridgingErr.message });
    }
    if (!bridging) {
      return res.status(404).json({
        error: "No applicant_round found for the given applicant_round_id",
      });
    }

    const { recruitment_round_id } = bridging;

    // 2) Now fetch metrics for that round
    const { data: metrics, error: metricsErr } = await supabase
      .from("metrics")
      .select("*")
      .eq("recruitment_round_id", recruitment_round_id);

    if (metricsErr) {
      return res.status(500).json({ error: metricsErr.message });
    }

    return res.status(200).json(metrics || []);
  } catch (err) {
    console.error("Unexpected error fetching metrics by applicant_round_id:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
