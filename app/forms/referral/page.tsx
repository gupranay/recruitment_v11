"use client";

import { Suspense } from "react";
import ExternalFormPage from "@/components/external-forms/ExternalFormPage";

function ReferralFormContent() {
  return (
    <ExternalFormPage
      formType="referral"
      title="Referral Form"
      subtitle="Submit this when you can genuinely vouch for an applicant's character, skill, and fit."
      placeholder="Share specific examples that support your referral and why this applicant should be admitted."
      helperText="Strong referrals include direct examples, context, and observable impact."
    />
  );
}

export default function ReferralFormPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading form...</div>}>
      <ReferralFormContent />
    </Suspense>
  );
}
