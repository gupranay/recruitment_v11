import { supabaseBrowser } from "@/lib/supabase/browser";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = supabaseBrowser();
  const user = req.body;
  
  
  const id = user.id;
  
  
  if (!id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  console.log(id);
  const { data, error: fetchError } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", id);

    console.log("data:",data);

  if (fetchError) {
    console.log("fetchError:", fetchError);
    return res.status(400).json({ error: fetchError.message });
  }

  res.status(200).json(data);
}
