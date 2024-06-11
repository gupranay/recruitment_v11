import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
import csv from "csv-parser";
import fs from "fs";
import { promisify } from "util";
import stream from "stream";

const pipeline = promisify(stream.pipeline);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { filePath } = req.body;

  const supabase = supabaseBrowser();

  const { data, error } = await supabase.storage.from('Applicant_Uploads').download(filePath);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const headers: string[] = [];

  await pipeline(
    data.stream(),
    csv()
      .on('headers', (headerList) => {
        headers.push(...headerList);
      })
  );

  res.status(200).json({ headers });
}
