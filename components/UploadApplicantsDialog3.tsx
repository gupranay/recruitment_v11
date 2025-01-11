"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRecruitmentCycle } from "@/contexts/RecruitmentCycleContext";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { parse } from "csv-parse/sync";
import { Upload } from "lucide-react";

export default function UploadApplicantsDialog(recruitment_round_id: any) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [nameHeader, setNameHeader] = useState<string | null>(null);
  const [emailHeader, setEmailHeader] = useState<string | null>(null);
  const [headShotHeader, setHeadShotHeader] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  

  // Always call hooks at the top level
  useEffect(() => {
    if (!open) {
      setLoading(false);
      setFile(null);
      setParsedData([]);
      setHeaders([]);
      setNameHeader(null);
      setEmailHeader(null);
      setHeadShotHeader(null);
    }
  }, [open]);

  if (!recruitment_round_id) {
    return null;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (csvFile: Blob) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      const records = parse(data, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      });
      setParsedData(records);
      if (records.length > 0) {
        const headers = Object.keys(records[0]);
        setHeaders(headers);
      }
    };
    reader.readAsText(csvFile);
  };

  const handleUploadClick = async () => {
    if (!file || !nameHeader || !emailHeader) {
      toast.error("Please select a file and all required headers");
      return;
    }

    setLoading(true);
    // console.log("recruitment_round_id actual: ", recruitment_round_id.recruitment_round_id.id);

    const payload = {
      parsedData,
      nameHeader,
      emailHeader,
      headShotHeader,
      recruitment_round_id: recruitment_round_id.recruitment_round_id.id,
    };

    // console.log("recruitment_round_id", recruitment_round_id);

    const response = await fetch("/api/applicants/upload2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      setOpen(false);
      setLoading(false);
      toast.success(`${file.name} uploaded successfully!`);
    } else {
      const error = await response.json();
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Applicants
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Applicants</DialogTitle>
          <DialogDescription>
            Select a CSV file to upload the applicants.
          </DialogDescription>
        </DialogHeader>
        <Input type="file" accept=".csv" onChange={handleFileChange} />
        {headers.length > 0 && (
          <div className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="font-semibold">Name Header</div>
                <Select
                  value={nameHeader || undefined}
                  onValueChange={(header) => setNameHeader(header)}
                >
                  <SelectTrigger className="w-full">
                    {nameHeader || "Select Name Header"}
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((header, index) => (
                      <SelectItem key={index} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="font-semibold">Email Header</div>
                <Select
                  value={emailHeader || undefined}
                  onValueChange={(header) => setEmailHeader(header)}
                >
                  <SelectTrigger className="w-full">
                    {emailHeader || "Select Email Header"}
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((header, index) => (
                      <SelectItem key={index} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="font-semibold">Headshot URL Header</div>
                <Select
                  value={headShotHeader || undefined}
                  onValueChange={(header) => setHeadShotHeader(header)}
                >
                  <SelectTrigger className="w-full">
                    {headShotHeader || "Select Headshot URL Header"}
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((header, index) => (
                      <SelectItem key={index} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUploadClick} disabled={loading}>
                {loading ? "Uploading..." : "Upload"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
