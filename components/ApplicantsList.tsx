"use client";
import React from "react";
import { useApplicants } from "@/contexts/ApplicantsContext";
import UploadApplicants from "./UploadApplicants";

export default function ApplicantsList() {
  const { applicants } = useApplicants();

  return (
    <div className="p-4">
        <UploadApplicants />
      <h3 className="text-lg font-semibold">Applicants</h3>
      <ul className="mt-4">
        {applicants.map((applicant) => (
          <li key={applicant.id} className="p-2">
            {applicant.name} - {applicant.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
