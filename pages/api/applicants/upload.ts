// pages/api/applicants/upload.ts
import { NextApiRequest, NextApiResponse } from "next";
import  { IncomingForm, File } from "formidable";
import { supabaseBrowser } from "@/lib/supabase/browser";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    // console.log("FILES:  ",files);
    // console.log("FIELDS:  ",fields);
    // console.log("ERROR:  ",err);
    if (err) {
      return res.status(500).json({ error: "Failed to parse form data" });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const fileData = fs.readFileSync(file?.filepath || '');
    // console.log("File Data", fileData);

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const supabase = supabaseBrowser();
    const uniqueFilename = await ensureUniqueFilename(supabase, file.originalFilename);
    
    
    // Convert formidable file to a stream and upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('Applicant_Uploads')
      .upload(`${uniqueFilename}`, fileData, {
        contentType: 'text/csv',
       // duplex: "true",
      });
      // console.log("Data", data);
      // console.log("Error", error);
    if (error) {
      if(error.message.includes("already exists")){
        console.log("File already exists");
        return res.status(400).json({ error: "File already exists" });
      }
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: "File uploaded successfully", filePath: data.path });
  });
}


async function ensureUniqueFilename(supabase: any, filename: any) {
  let uniqueFilename = filename;
  let exists = true;
  let counter = 0;

  while (exists) {
    console.log("Unique Filename", uniqueFilename);
    const { data, error } = await supabase.storage
      .from('Applicant_Uploads')
      .list('', { limit: 1, search: uniqueFilename });
    // console.log("Data", data);
    // console.log("Error", error);
    if (error) {
      throw new Error('Failed to check for existing filename');
    }
    if (!data || data === '') {
      exists = false;
    }
    exists = data.length > 0;

    if (exists) {
      // Append a unique letter (or increment it) to the filename
      uniqueFilename = `${filename}_${counter}`; // 97 is ASCII for 'a'
      counter++;
    }
  }

  return uniqueFilename;
}
