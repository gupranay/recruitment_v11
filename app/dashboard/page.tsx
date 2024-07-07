// app/dashboard/page.tsx
"use client";
import { CreateOrganizationDialog } from "@/components/CreateOrganizationDialog";
import useUser from "@/app/hook/useUser";
import React from "react";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ToastProvider } from "@/components/ui/Toast";
import Sidebar from "@/components/ui/Sidebar";
import { ApplicantsProvider } from "@/contexts/ApplicantsContext";
import { RecruitmentCycleProvider } from "@/contexts/RecruitmentCycleContext";
import NavBar from "@/components/NavBar";
import UploadApplicantsDialog2 from "@/components/UploadApplicantsDialog2";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import ApplicantsGrid from "@/components/ApplicantsGrid";
import { OrgSelector } from "@/components/OrgSelector";

export default function Page() {
  const { isFetching, data: user, error } = useUser();

  if (isFetching) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div>Error loading user data.</div>;
  }

  return (
    <OrganizationProvider>
      <ToastProvider />
      <RecruitmentCycleProvider>
        <ApplicantsProvider>
          <NavBar />
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex flex-col flex-1">
              <div className="flex justify-between items-center p-4 bg-white shadow-md">
                <OrgSelector user={user} />
                <CreateOrganizationDialog user={user} />
              </div>
              <main className="flex-1 p-4 overflow-auto">
                <UploadApplicantsDialog2 />
                <ApplicantsGrid />
              </main>
            </div>
          </div>
        </ApplicantsProvider>
      </RecruitmentCycleProvider>
    </OrganizationProvider>
  );
}
