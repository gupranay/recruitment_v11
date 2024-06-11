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
    
    // Convert formidable file to a stream and upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('Applicant_Uploads')
      .upload(`${file.originalFilename}`, fileData, {
        contentType: 'text/csv',
       // duplex: "true",
      });
      // console.log("Data", data);
      // console.log("Error", error);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: "File uploaded successfully", filePath: data.path });
  });
}

