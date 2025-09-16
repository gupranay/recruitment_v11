import { useState, useCallback, useEffect, useMemo } from "react";
import ApplicantCard from "./ApplicantCard";
import ApplicantListItem from "./ApplicantListItem";
import LoadingModal from "@/components/LoadingModal2";
import { ApplicantCardType } from "@/lib/types/ApplicantCardType";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { MultiSelect } from "./ui/MultiSelect";
import UploadApplicantsDialog3 from "./UploadApplicantsDialog3";
import CreateAnonymizedAppDialog from "./CreateAnonymizedAppDialog";
import ApplicationDialog from "./ApplicationDialog";
import { exportToCSV } from "@/lib/utils/exportAppsToCSV";
import { RecruitmentRound } from "@/lib/types/RecruitmentRound";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";
import useUser from "@/app/hook/useUser";

type SortOption =
  | "current_weighted_asc"
  | "current_weighted_desc"
  | "last_weighted_asc"
  | "last_weighted_desc"
  | "status";

type ApplicantGridProps = {
  rounds: RecruitmentRound[];
  currentRound: number;
  onMoveToNextRound: (applicantId: string) => Promise<void>;
  onReject: (applicantId: string) => Promise<void>;
  isLastRound: boolean;
  currentCycle: RecruitmentCycle | null;
};

export default function ApplicantGrid({
  rounds,
  currentRound,
  onMoveToNextRound,
  onReject,
  isLastRound,
  currentCycle,
}: ApplicantGridProps) {
  const { data: user } = useUser();
  const [applicants, setApplicants] = useState<ApplicantCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading applicants...");
  const [isListView, setIsListView] = useState(false);
  const [selectedApplicant, setSelectedApplicant] =
    useState<ApplicantCardType | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("status");
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [selectedDecisions, setSelectedDecisions] = useState<string[]>([]);

  const fetchApplicants = useCallback(async () => {
    if (!rounds[currentRound]?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Loading applicants...");
    try {
      const lastRoundID =
        currentRound === 0 ? null : rounds[currentRound - 1]?.id;
      const response = await fetch("/api/applicants/index2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recruitment_round_id: rounds[currentRound].id,
          last_round_id: lastRoundID,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch applicants");
      }

      const data: ApplicantCardType[] = await response.json();
      setApplicants(data);
    } catch (error) {
      console.error("Error fetching applicants:", error);
    } finally {
      setIsLoading(false);
    }
  }, [rounds, currentRound]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  // Effect to open demographics when the selected round changes
  useEffect(() => {
    if (selectedRoundId) {
      const encodedRoundId = encodeURIComponent(selectedRoundId);
      const url = `/demographics/?id=${encodedRoundId}`;
      window.open(url, "_blank"); // Open in a new tab
      // Reset the selectedRoundId after opening the page
      setSelectedRoundId(null);
    }
  }, [selectedRoundId]);

  const handleRoundChange = (roundId: string) => {
    setSelectedRoundId(roundId); // Set the selected round ID
  };

  // Filtering and sorting logic
  const sortedApplicants = useMemo(() => {
    // First filter by decision status if any are selected
    let filteredApplicants = applicants;
    if (selectedDecisions.length > 0) {
      filteredApplicants = applicants.filter((applicant) =>
        selectedDecisions.includes(applicant.status)
      );
    }

    // Then sort the filtered results
    return [...filteredApplicants].sort((a, b) => {
      if (sortOption === "status") {
        // Default sorting: Accepted first, then Maybe, then Pending, then Rejected
        if (a.status === "accepted" && b.status !== "accepted") return -1;
        if (a.status !== "accepted" && b.status === "accepted") return 1;
        if (
          a.status === "maybe" &&
          b.status !== "maybe" &&
          b.status !== "accepted"
        )
          return -1;
        if (
          a.status !== "maybe" &&
          b.status === "maybe" &&
          a.status !== "accepted"
        )
          return 1;
        if (a.status === "rejected" && b.status !== "rejected") return 1;
        if (a.status !== "rejected" && b.status === "rejected") return -1;
        return 0;
      }

      // Sorting by weighted scores
      const isAscending = sortOption.includes("asc");
      const key = sortOption.includes("last_weighted")
        ? "last_round_weighted"
        : "current_round_weighted";

      return isAscending
        ? (a[key] ?? -Infinity) - (b[key] ?? -Infinity)
        : (b[key] ?? -Infinity) - (a[key] ?? -Infinity);
    });
  }, [applicants, sortOption, selectedDecisions]);

  const handleOpenDialog = (applicant: ApplicantCardType) => {
    setSelectedApplicant(applicant);
  };

  const handleCloseDialog = () => {
    setSelectedApplicant(null);
  };

  if (isLoading) {
    return <LoadingModal isOpen={true} message={loadingMessage} />;
  }

  if (!rounds[currentRound]?.id) {
    return (
      <div className="text-center text-muted-foreground">
        No recruitment round selected.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Action Buttons */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-medium text-lg">Applicant Overview</div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Primary Actions Group */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => handleRoundChange(rounds[currentRound].id)}
              className="bg-blue-500 text-white"
            >
              View Demographics
            </Button>
            <Button
              onClick={() => {
                const encodedRoundId = encodeURIComponent(
                  rounds[currentRound].id
                );
                window.open(`/feedback/?id=${encodedRoundId}`, "_blank");
              }}
              className="bg-orange-500 text-white"
            >
              Launch Feedback Form
            </Button>
          </div>

          {/* Secondary Actions Group */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                exportToCSV(
                  applicants.map(({ name, email, status }) => ({
                    name: name || "N/A",
                    email: email || "N/A",
                    status: status || "N/A",
                  })),
                  rounds[currentRound].name || "applicants"
                );
              }}
              variant="outline"
            >
              Export Decisions
            </Button>
            <CreateAnonymizedAppDialog
              recruitment_round_id={rounds[currentRound].id || ""}
              recruitment_round_name={
                rounds[currentRound].name || "Unknown Round"
              }
              applicant_id={applicants[0]?.applicant_id || ""}
            />
            <UploadApplicantsDialog3
              recruitment_round_id={rounds[currentRound].id}
              fetchApplicants={fetchApplicants}
            />
          </div>

          {/* View Controls Group */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Filter by Decision:
              </span>
              <div className="w-52">
                <MultiSelect
                  options={["accepted", "in_progress", "maybe", "rejected"]}
                  selectedOptions={selectedDecisions}
                  onChange={setSelectedDecisions}
                  placeholder="All decisions"
                />
              </div>
              {selectedDecisions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDecisions([])}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Sort Applicants</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => setSortOption("current_weighted_asc")}
                >
                  Current Round Weighted (Ascending)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOption("current_weighted_desc")}
                >
                  Current Round Weighted (Descending)
                </DropdownMenuItem>
                {currentRound > 0 && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setSortOption("last_weighted_asc")}
                    >
                      Last Round Weighted (Ascending)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortOption("last_weighted_desc")}
                    >
                      Last Round Weighted (Descending)
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => setSortOption("status")}>
                  Accepted / Rejected (Default)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center space-x-2">
              <span className="text-sm">Grid View</span>
              <Switch
                checked={isListView}
                onCheckedChange={setIsListView}
                className="toggle-view"
              />
              <span className="text-sm">List View</span>
            </div>
          </div>
        </div>
      </div>
      <Separator className="mb-4" />

      {sortedApplicants.length > 0 ? (
        <>
          {isListView ? (
            <div className="space-y-2">
              {sortedApplicants.map((applicant) => (
                <ApplicantListItem
                  key={applicant.applicant_id}
                  applicant={applicant}
                  onClick={() => handleOpenDialog(applicant)}
                  onMoveToNextRound={onMoveToNextRound}
                  onReject={onReject}
                  isLastRound={isLastRound}
                  fetchApplicants={fetchApplicants}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedApplicants.map((applicant) => (
                <ApplicantCard
                  key={applicant.applicant_id}
                  applicant={applicant}
                  onMoveToNextRound={onMoveToNextRound}
                  onReject={onReject}
                  fetchApplicants={fetchApplicants}
                  isLastRound={isLastRound}
                  onClick={() => handleOpenDialog(applicant)}
                />
              ))}
            </div>
          )}

          {/* Add ApplicationDialog */}
          {selectedApplicant && user?.id && (
            <ApplicationDialog
              applicantId={selectedApplicant.applicant_id}
              applicantRoundId={selectedApplicant.applicant_round_id}
              userId={user.id}
              isOpen={!!selectedApplicant}
              onClose={handleCloseDialog}
              fetchApplicants={fetchApplicants}
            />
          )}
        </>
      ) : (
        <div className="text-center text-muted-foreground">
          Please upload applicants.
        </div>
      )}
    </div>
  );
}
