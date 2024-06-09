import { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { IncomingForm, File } from 'formidable';
import csv from "csv-parser";
import fs from "fs";
import path from "path";
import { Applicant } from "@/contexts/ApplicantsContext";

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
      if (err) {
        return res.status(500).json({ error: "Failed to parse form data" });
      }
  
      const file = files.file as unknown as File;
      const organization_id = fields.organization_id as unknown as string;
      const recruitment_cycle_id = fields.recruitment_cycle_id as unknown as string;
  
      if (!file || !organization_id || !recruitment_cycle_id || !file.filepath) {
        console.log("Missing required fields or file path is undefined");
        console.log("FilePath",file?.filepath);
        return res.status(400).json({ error: "Missing required fields or file path is undefined" });
      }
  
      const filePath = file.filepath;
  
      const applicants: Applicant[] = [];
  
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => {
          // Ensure data is a properly structured JSON object
          const structuredData = JSON.parse(JSON.stringify(data));

          const applicant: Applicant = {
            created_at: new Date().toISOString(),
            data: structuredData, // Ensure this is a valid Json object
            email: data.email || null,
            id: data.id,
            name: data.name,
            recruitment_cycle_id,
          };
          applicants.push(applicant);
        })
        .on("end", async () => {
          const supabase = supabaseServer();
  
          const { data, error } = await supabase
            .from("applicants")
            .insert(applicants);
  
          if (error) {
            return res.status(500).json({ error: error.message });
          }
  
          res.status(200).json({ message: "Applicants uploaded successfully" });
        })
        .on("error", (error) => {
          res.status(500).json({ error: "Failed to parse CSV file" });
        });
    });
  }