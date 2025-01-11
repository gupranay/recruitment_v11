"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useRecruitmentCycle } from "@/contexts/RecruitmentCycleContext";

export default function UploadApplicants() {
  const [file, setFile] = useState<File | null>(null);
  const { selectedOrganization } = useOrganization();
  const { selectedRecruitmentCycle } = useRecruitmentCycle();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    if (!selectedOrganization) {
      toast.error("Please select an organization");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("organization_id", selectedOrganization.id);
    // console.log(selectedRecruitmentCycle);
    if (selectedRecruitmentCycle?.id) {
      formData.append("recruitment_cycle_id", selectedRecruitmentCycle.id);
    }

    

    const response = await fetch("/api/applicants/upload", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      toast.success("Applicants uploaded successfully!");
    } else {
      const error = await response.json();
      toast.error(error.message);
    }
  };

  return (
    <div>
      <Input type="file" accept=".csv" onChange={handleFileChange} />
      <Button onClick={handleUpload}>Upload Applicants</Button>
    </div>
  );
}

