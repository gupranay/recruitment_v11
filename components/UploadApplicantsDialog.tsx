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

export default function UploadApplicantsDialog() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // Track steps
  const [headers, setHeaders] = useState<string[]>([]);
  const [nameColumn, setNameColumn] = useState("");
  const [emailColumn, setEmailColumn] = useState("");
  const [headshotColumn, setHeadshotColumn] = useState("");
  const [filePath, setFilePath] = useState(""); // Added this line
  const { selectedRecruitmentCycle } = useRecruitmentCycle();

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setFile(null);
      setStep(1);
      setHeaders([]);
      setNameColumn("");
      setEmailColumn("");
      setHeadshotColumn("");
    }
  }, [open]);

  if (!selectedRecruitmentCycle) {
    return null;
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleUploadClick = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
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
      
      const { filePath } = await response.json();
      console.log(filePath);
      setFilePath(filePath); // Set filePath state here
      const headersResponse = await fetch("/api/applicants/readHeaders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filePath }),
      });

      if (headersResponse.ok) {
        const { headers } = await headersResponse.json();
        setHeaders(headers);
        setStep(2);
      } else {
        toast.error("Failed to read CSV headers");
      }
    } else {
      const error = await response.json();
      toast.error(error.message);
    }

    setLoading(false);
  };

  const handleProcessClick = async () => {
    if (!nameColumn || !emailColumn || !headshotColumn) {
      toast.error("Please map all required columns");
      return;
    }

    setLoading(true);

    const processResponse = await fetch("/api/applicants/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filePath, // Use filePath state here
        nameColumn,
        emailColumn,
        headshotColumn,
        recruitmentCycleId: selectedRecruitmentCycle.id,
      }),
    });

    if (processResponse.ok) {
      toast.success("Applicants processed successfully!");
      setOpen(false);
    } else {
      const error = await processResponse.json();
      toast.error(error.message);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Upload Applicants</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Applicants</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Select a CSV file to upload the applicants." : "Map the columns to the correct fields."}
          </DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <Input type="file" accept=".csv" onChange={handleFileChange} />
        ) : (
          <div>
            <label>Name Column</label>
            <select value={nameColumn} onChange={(e) => setNameColumn(e.target.value)}>
              <option value="">Select Column</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
            <label>Email Column</label>
            <select value={emailColumn} onChange={(e) => setEmailColumn(e.target.value)}>
              <option value="">Select Column</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
            <label>Headshot Column</label>
            <select value={headshotColumn} onChange={(e) => setHeadshotColumn(e.target.value)}>
              <option value="">Select Column</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        )}
        <DialogFooter>
          {step === 1 ? (
            <Button onClick={handleUploadClick} disabled={loading}>
              {loading ? "Uploading..." : "Upload"}
            </Button>
          ) : (
            <Button onClick={handleProcessClick} disabled={loading}>
              {loading ? "Processing..." : "Process"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
