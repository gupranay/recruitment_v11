"use client";

import { Suspense } from "react";
import ExternalFormPage from "@/components/external-forms/ExternalFormPage";

function RedFlagFormContent() {
  return (
    <ExternalFormPage
      formType="red-flag"
      title="Red Flag Form"
      subtitle="Use this when you know of behavior severe enough that the applicant should not be admitted."
      placeholder="Document the issue clearly and factually, including what happened and why this should block admission."
      helperText="Include concrete details. For urgent concerns, request board follow-up."
    />
  );
}

export default function RedFlagFormPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading form...</div>}>
      <RedFlagFormContent />
    </Suspense>
  );
}
