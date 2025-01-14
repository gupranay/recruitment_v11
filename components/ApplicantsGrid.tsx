// components/ApplicantsGrid.tsx

import { useState, useCallback, useEffect } from "react";
import ApplicantCard from "./ApplicantCard";
import  LoadingModal  from "@/components/LoadingModal2";
import { ApplicantCardType } from "@/lib/types/ApplicantCardType";
import { Button } from "./ui/button";
import { exportToCSV } from "@/lib/utils/exportAppsToCSV";
import { Separator } from "./ui/separator";
import UploadApplicantsDialog3 from "./UploadApplicantsDialog3";

type ApplicantGridProps = {
  recruitment_round_id: string | undefined;
  recruitment_round_name: string | undefined;
  onMoveToNextRound: (applicantId: string) => Promise<void>;
  onReject: (applicantId: string) => Promise<void>;
  isLastRound: boolean;
};

export default function ApplicantGrid({
  recruitment_round_id,
  recruitment_round_name,
  onMoveToNextRound,
  onReject,
  isLastRound,
}: ApplicantGridProps) {
  const [applicants, setApplicants] = useState<ApplicantCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading applicants...");

  const fetchApplicants = useCallback(async () => {
    if (!recruitment_round_id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Loading applicants...");
    try {
      const response = await fetch("/api/applicants/index2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recruitment_round_id }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch applicants");
      }

      const data: ApplicantCardType[] = await response.json();
      const sortedData = [...data].sort((a, b) => {
        if (a.status === "accepted" && b.status !== "accepted") return -1;
        if (a.status !== "accepted" && b.status === "accepted") return 1;
        if (a.status === "rejected" && b.status !== "rejected") return 1;
        if (a.status !== "rejected" && b.status === "rejected") return -1;
        return 0;
      });

      setApplicants(sortedData);
    } catch (error) {
      console.error("Error fetching applicants:", error);
    } finally {
      setIsLoading(false);
    }
  }, [recruitment_round_id]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants, recruitment_round_id]);

  if (isLoading) {
    return <LoadingModal isOpen={true} message={loadingMessage} />;
  }

  if (!recruitment_round_id) {
    return (
      <div className="text-center text-muted-foreground">
        No recruitment round selected.
      </div>
    );
  }

  // if (applicants.length === 0) {
  //   return (
  //     <div className="text-center text-muted-foreground">
  //       No applicants in this round.
  //     </div>
  //   );
  // }

  return (
    <div className="relative">
      {/* Export Button */}
      <div className="flex items-center justify-between mb-4 ">
        <div className="font-medium text-lg">Applicant Overview</div>
        <div className="flex items-center ml-auto space-x-2">
          <Button
            onClick={() => {
              const applicantsData = applicants || [];
              exportToCSV(
                applicantsData.map(({ name, email, status }) => ({
                  name: name || "N/A",
                  email: email || "N/A",
                  status: status || "N/A",
                })), recruitment_round_name || "applicants"
              );
            }}
            variant="outline"
          >
            Export to CSV
          </Button>
          <UploadApplicantsDialog3 
          recruitment_round_id={recruitment_round_id} 
          fetchApplicants={fetchApplicants} />
        </div>
      </div>
      <Separator className="mb-4" />
      {/* Applicant Grid */}
      {applicants.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {applicants.map((applicant) => (
            <ApplicantCard
              key={applicant.applicant_id}
              applicant={applicant}
              onMoveToNextRound={onMoveToNextRound}
              onReject={onReject}
              fetchApplicants={fetchApplicants}
              isLastRound={isLastRound}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          Please upload applicants.
        </div>
      )}
    </div>
  );
}
