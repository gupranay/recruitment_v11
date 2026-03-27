import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import ApplicantCard from "./ApplicantCard";
import ApplicantListItem from "./ApplicantListItem";
import LoadingModal from "@/components/LoadingModal2";
import { ApplicantCardType } from "@/lib/types/ApplicantCardType";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { MultiSelect } from "./ui/MultiSelect";
import { Input } from "./ui/input";
import UploadApplicantsDialog3 from "./UploadApplicantsDialog3";
import CreateAnonymizedAppDialog from "./CreateAnonymizedAppDialog";
import ApplicationDialog from "./ApplicationDialog";
import { exportToCSV } from "@/lib/utils/exportAppsToCSV";
import { cn } from "@/lib/utils";
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
import { Organization } from "@/contexts/OrganizationContext";
import { Search, X } from "lucide-react";

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
  currentOrg: Organization | null;
};

export default function ApplicantGrid({
  rounds,
  currentRound,
  onMoveToNextRound,
  onReject,
  isLastRound,
  currentCycle,
  currentOrg,
}: ApplicantGridProps) {
  const { data: user } = useUser();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  
  // Check if user is Owner or Admin (not Member)
  const isOwnerOrAdmin = currentOrg && user ? (
    currentOrg.owner_id === user.id ||
    currentOrg.role === "Owner" ||
    currentOrg.role === "Admin"
  ) : undefined;
  const [applicants, setApplicants] = useState<ApplicantCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading applicants...");
  const [isListView, setIsListView] = useState(false);
  const [selectedApplicant, setSelectedApplicant] =
    useState<ApplicantCardType | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("status");
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [selectedDecisions, setSelectedDecisions] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    if (!isSearchOpen) return;
    // Defer focus until after the input has mounted/animated in
    const id = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [isSearchOpen]);

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

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filteredApplicants = filteredApplicants.filter((applicant) => {
        const name = (applicant.name ?? "").toString().toLowerCase();
        return name.includes(q);
      });
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
  }, [applicants, sortOption, selectedDecisions, searchQuery]);

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
      {/* Header + Actions */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Applicants
            </div>
            <div className="font-semibold text-lg">Overview</div>
          </div>

          {isOwnerOrAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Primary action */}
              <Button
                onClick={() => {
                  const encodedRoundId = encodeURIComponent(rounds[currentRound].id);
                  window.open(`/feedback/?id=${encodedRoundId}`, "_blank");
                }}
                className="bg-emerald-500 text-white hover:bg-emerald-600"
              >
                Launch feedback
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!currentCycle?.id}
                  >
                    Launch forms
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      if (!currentCycle?.id) return;
                      window.open(
                        `/forms/conflict?cycle_id=${encodeURIComponent(currentCycle.id)}`,
                        "_blank",
                      );
                    }}
                  >
                    Conflict of Interest Form
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (!currentCycle?.id) return;
                      window.open(
                        `/forms/referral?cycle_id=${encodeURIComponent(currentCycle.id)}`,
                        "_blank",
                      );
                    }}
                  >
                    Referral Form
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (!currentCycle?.id) return;
                      window.open(
                        `/forms/red-flag?cycle_id=${encodeURIComponent(currentCycle.id)}`,
                        "_blank",
                      );
                    }}
                  >
                    Red Flag Form
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sub-primary: anonymized reading */}
              <CreateAnonymizedAppDialog
                recruitment_round_id={rounds[currentRound].id || ""}
                recruitment_round_name={
                  rounds[currentRound].name || "Unknown Round"
                }
                applicant_id={applicants[0]?.applicant_id || ""}
              />

              {/* Neutral utilities */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => handleRoundChange(rounds[currentRound].id)}
                  >
                    View demographics
                  </DropdownMenuItem>
                  <DropdownMenuItem
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
                  >
                    Export decisions (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {currentRound === 0 && (
                <UploadApplicantsDialog3
                  recruitment_round_id={rounds[currentRound].id}
                  fetchApplicants={fetchApplicants}
                />
              )}
            </div>
          )}
        </div>

        {/* Filters & view controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Filter by decision
            </span>
            <div className="w-56">
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Search (expands into input) */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "overflow-hidden transition-[width,opacity] duration-200 ease-out",
                  isSearchOpen ? "w-64 opacity-100" : "w-0 opacity-0"
                )}
                aria-hidden={!isSearchOpen}
              >
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search names…"
                    className="h-9 pl-8 pr-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setSearchQuery("");
                        setIsSearchOpen(false);
                        searchButtonRef.current?.focus();
                      }
                    }}
                  />
                  {searchQuery.trim().length > 0 && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Clear search</span>
                    </button>
                  )}
                </div>
              </div>
              <Button
                ref={searchButtonRef}
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSearchOpen((v) => {
                    const next = !v;
                    if (!next) setSearchQuery("");
                    return next;
                  });
                }}
                className={cn(isSearchOpen && "bg-accent")}
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sort applicants
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => setSortOption("current_weighted_asc")}
                >
                  Current round weighted (asc)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortOption("current_weighted_desc")}
                >
                  Current round weighted (desc)
                </DropdownMenuItem>
                {currentRound > 0 && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setSortOption("last_weighted_asc")}
                    >
                      Last round weighted (asc)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSortOption("last_weighted_desc")}
                    >
                      Last round weighted (desc)
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => setSortOption("status")}>
                  Accepted / rejected (default)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center space-x-2 text-sm">
              <span>Grid view</span>
              <Switch
                checked={isListView}
                onCheckedChange={setIsListView}
                className="toggle-view"
              />
              <span>List view</span>
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
                  isOwnerOrAdmin={isOwnerOrAdmin}
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
                  isOwnerOrAdmin={isOwnerOrAdmin}
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
              userAvatarUrl={user.avatar_url}
              applicantStatus={selectedApplicant.status}
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
