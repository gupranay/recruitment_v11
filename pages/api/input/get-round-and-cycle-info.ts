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

  const { recruitment_round_id } = req.body;
  if (!recruitment_round_id) {
    return res
      .status(400)
      .json({ error: "Missing required field: recruitment_round_id" });
  }

  try {
    // Fetch the round and join the cycle
    type RoundWithCycle = {
      id: string;
      name: string;
      recruitment_cycle_id: string;
      recruitment_cycles: {
        id: string;
        name: string;
      } | null;
    };
    
    const result = await supabase
      .from("recruitment_rounds")
      .select("id, name, recruitment_cycle_id, recruitment_cycles (id, name)")
      .eq("id", recruitment_round_id)
      .single();
    
    const { data: round, error: roundError } = result as {
      data: RoundWithCycle | null;
      error: any;
    };

    if (roundError || !round) {
      return res
        .status(404)
        .json({ error: roundError?.message || "Recruitment round not found" });
    }

    const round_name = round.name || null;
    const cycle_name = round.recruitment_cycles?.name || null;

    return res.status(200).json({ round_name, cycle_name });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
