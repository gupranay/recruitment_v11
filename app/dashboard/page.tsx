"use client";
import { CreateOrganizationDialog } from "@/components/CreateOrganizationDialog";
import useUser from "@/app/hook/useUser";
import React, { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { OrgSelector } from "@/components/OrgSelector";
import {
  OrganizationProvider,
  useOrganization,
} from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/Toast";
import Sidebar from "@/components/ui/Sidebar";
import { ApplicantsProvider } from "@/contexts/ApplicantsContext";
import ApplicantsList from "@/components/ApplicantsList";
import { RecruitmentCycleProvider } from "@/contexts/RecruitmentCycleContext";
import UploadApplicants from "@/components/UploadApplicants";
import UploadApplicantsDialog from "@/components/UploadApplicantsDialog";

export default function Page() {
  const { isFetching, data: user, error } = useUser();

  if (isFetching) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading user data.</div>;
  }

  return (
    <OrganizationProvider>
      <ToastProvider />
      <RecruitmentCycleProvider>
      <ApplicantsProvider>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex flex-col flex-1">
            <div className="flex justify-between items-center p-4 bg-white shadow-md">
              <OrgSelector user={user} />
              <CreateOrganizationDialog user={user} />
            </div>
            <main className="flex-1 p-4 overflow-auto">
              <UploadApplicantsDialog />
              <ApplicantsList />
              </main>
          </div>
        </div>
      </ApplicantsProvider>
      </RecruitmentCycleProvider>
      
    </OrganizationProvider>
  );
}
