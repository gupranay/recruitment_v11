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

  const { name, organization_id } = req.body;

  if (!name || !organization_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const insertData: Database["public"]["Tables"]["recruitment_cycles"]["Insert"] = {
    name,
    organization_id,
  };
  const insertResult = await (supabase
    .from("recruitment_cycles") as any)
    .insert(insertData as any)
    .select();
  
  const { data, error } = insertResult as {
    data: Database["public"]["Tables"]["recruitment_cycles"]["Row"][] | null;
    error: any;
  };

  if (error || !data || data.length === 0) {
    return res.status(400).json({ error: error?.message || "Failed to create recruitment cycle" });
  }

  const recruitmentCycleId = data[0]?.id;

  if (!recruitmentCycleId) {
    return res
      .status(500)
      .json({ error: "Failed to retrieve recruitment cycle ID" });
  }

  // const { error: roundError } = await supabase
  //   .from("recruitment_rounds")
  //   .insert({ name: "Initial Applicants", recruitment_cycle_id: recruitmentCycleId, sort_order: 0 });

  // if (roundError) {
  //   return res.status(400).json({ error: roundError.message });
  // }

  res.status(201).json(data);
}
