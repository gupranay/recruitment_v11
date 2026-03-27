"use client";

import { Suspense } from "react";
import ExternalFormPage from "@/components/external-forms/ExternalFormPage";

function ConflictFormContent() {
  return (
    <ExternalFormPage
      formType="conflict"
      title="Conflict of Interest Form"
      subtitle="Submit this when you are too close to an applicant to provide an objective evaluation."
      placeholder="Describe the nature of the relationship and why you should be recused from evaluating this applicant."
      helperText="Example: close family member, close friend, roommate, or other material conflict."
    />
  );
}

export default function ConflictFormPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading form...</div>}>
      <ConflictFormContent />
    </Suspense>
  );
}
