// UploadApplicantsDialog.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/Toast";
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
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { parse } from 'csv-parse/sync';

function parseCSVRow(rowString: string | Buffer) {
  // Parse the CSV row
  const records = parse(rowString, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true
  });

  // Return the first (and only) row
  return records[0];
}

export default function UploadApplicantsDialog() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [nameHeader, setNameHeader] = useState<string | null>(null);
  const [emailHeader, setEmailHeader] = useState<string | null>(null);
  const [headShotHeader, setHeadShotHeader] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { selectedRecruitmentCycle } = useRecruitmentCycle();

  // Always call hooks at the top level
  useEffect(() => {
    if (!open) {
      setLoading(false);
      setFile(null);
      setHeaders([]);
      setNameHeader(null);
      setEmailHeader(null);
      setHeadShotHeader(null);
    }
  }, [open]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      parseHeaders(selectedFile);
    }
  };

  const parseHeaders = (csvFile: Blob) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result as string;
      const lines = data.split("\n");
      if (lines.length > 0) {
        const headers = parseCSVRow(lines[0]);
        setHeaders(headers);
      }
    };
    reader.readAsText(csvFile);
  };

  const handleUploadClick = async () => {
    if (!file) {
      toast("Please select a file to upload", "error");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/applicants/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      setOpen(false);
      setLoading(false);
      toast(`${file.name} uploaded successfully!`, "success");
    } else {
      const error = await response.json();
      toast(error.message, "error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>Upload Applicants</Button>
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
                <Select value={nameHeader||undefined} onValueChange={(header) => setNameHeader(header)}>
                  <SelectTrigger className="w-full">{nameHeader || "Select Name Header"}</SelectTrigger>
                  <SelectContent>
                    {headers.map((header, index) => (
                      <SelectItem
                        key={index}
                        value={header}
                      >
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="font-semibold">Email Header</div>
                <Select value={emailHeader||undefined} onValueChange={(header) => setEmailHeader(header)}>
                  <SelectTrigger className="w-full">{emailHeader || "Select Email Header"}</SelectTrigger>
                  <SelectContent>
                    {headers.map((header, index) => (
                      <SelectItem
                        key={index}
                        value={header}
                      >
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="font-semibold">Headshot URL Header</div>
                <Select value={headShotHeader||undefined} onValueChange={(header) => setHeadShotHeader(header)}>
                  <SelectTrigger className="w-full">{headShotHeader || "Select Headshot URL Header"}</SelectTrigger>
                  <SelectContent>
                    {headers.map((header, index) => (
                      <SelectItem
                        key={index}
                        value={header}
                      >
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
