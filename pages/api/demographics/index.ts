import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { field, recruitment_round_id } = req.body;
  // console.log("Fetching demographics for field:", field, "round_id:", recruitment_round_id);
  if (!field || !recruitment_round_id) {
    return res.status(400).json({
      error: "Missing required fields: field, recruitment_round_id"
    });
  }

  const supabase = supabaseBrowser();

  // 1) Call the RPC function get_demographics
  //    which we define in Postgres
  const rpcCall = (supabase.rpc as any)("get_demographics", {
    field_name: field,
    round_id: recruitment_round_id
  });
  
  const result = await rpcCall;
  const { data, error } = result as {
    data: any;
    error: any;
  };

  if (error) {
    console.error("Error fetching demographics:", error.message);
    return res.status(500).json({ error: error.message });
  }
  // console.log("Demographics data:", data);

  // data should be an array of { status, field_value, count, percentage }
  return res.status(200).json(data || []);
}
