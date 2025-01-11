import { NextApiRequest, NextApiResponse } from "next";
import { supabaseBrowser } from "@/lib/supabase/browser";
// import csv from "csv-parser";
import csv from "csvtojson";
import { Readable } from "stream";
import { parseStream } from "fast-csv";
import { promisify } from "util";
import stream from "stream";
import fs from "fs";

const pipeline = promisify(stream.pipeline);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  // try{

  const { filePath } = req.body;
  // console.log("File Path", filePath);

  const supabase = supabaseBrowser();

  const { data, error } = await supabase.storage
    .from("Applicant_Uploads")
    .download(filePath);
  // console.log("Data", data);
  // console.log("Error", error);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  const text = await data.text();
  csv({
    noheader: false,
    output: "csv",
  })
    .fromString(text)
    .then((jsonObj) => {
      console.log(jsonObj);
      /**
       * [
       * 	{a:"1", b:"2", c:"3"},
       * 	{a:"4", b:"5". c:"6"}
       * ]
       */
    });

  //headers are first line separated by comma, but not if comma surrounded by ""
  // const text = await data.text()
  // const headers1 = text.split('\n')[0].split(',');
  // console.log("Headers", headers1);
  // const results: any[] = [];

  // const headers: string[] = [];
  //   const buffer = Buffer.from(await data.arrayBuffer());
  //   console.log("Buffer", buffer);
  //   const stream = Readable.from(buffer);
  //   console.log("Stream", stream);
  //   const parsedStream = parseStream(stream, { headers: true })
  //   .pipe(csv())
  //   .on('data', (data) => results.push(data))
  //   .on('end', () => {
  //     console.log(results);
  //   })
  // } catch (error) {
  //   console.error('Error downloading CSV file:', error);
  //   res.status(500).json({ error: 'Error downloading CSV file' });
  // }
}
