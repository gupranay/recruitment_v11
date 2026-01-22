"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Toaster, toast } from "react-hot-toast";
import useUser from "../hook/useUser";
import { Organization } from "@/contexts/OrganizationContext";
import React from "react";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";
import { RecruitmentRound } from "@/lib/types/RecruitmentRound";
import CreateRecruitmentRoundDialog from "@/components/CreateRecruitmentRoundDialog";
import ApplicantGrid from "@/components/ApplicantsGrid";
import Header from "@/components/Header";
import UpdateMetricsDialog from "@/components/UpdateMetricsDialog";
import { Trash2, MoreVertical, BarChart3 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import LoadingModal from "@/components/LoadingModal2";

interface Applicant {
  id: string;
  name?: string;
  email?: string;
  status?: string;
  rejected: boolean;
}

type DeleteDialogType = 
  | "confirm" 
  | "onlyRoundWithApplicants" 
  | "notLastRoundWithApplicants" 
  | "lastRoundWithApplicants";

function Sidebar({
  rounds,
  setRecruitmentRounds,
  currentRound,
  setCurrentRound,
  currentRecruitmentCycle,
  onDeleteRound,
  currentOrg,
  user,
}: {
  rounds: RecruitmentRound[];
  setRecruitmentRounds: (rounds: RecruitmentRound[]) => void;
  currentRound: number;
  setCurrentRound: (index: number) => void;
  currentRecruitmentCycle: RecruitmentCycle;
  onDeleteRound: (roundId: string, roundIndex: number, mode?: string) => Promise<void>;
  currentOrg: Organization | null;
  user: any;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogType, setDeleteDialogType] = useState<DeleteDialogType>("confirm");
  const [roundToDelete, setRoundToDelete] = useState<{
    id: string;
    name: string;
    index: number;
  } | null>(null);
  const [applicantCount, setApplicantCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false);
  const [roundForMetrics, setRoundForMetrics] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Check if user is Owner or Admin (not Member)
  const isOwnerOrAdmin = currentOrg && user && (
    currentOrg.owner_id === user.id ||
    currentOrg.role === "Owner" ||
    currentOrg.role === "Admin"
  );

  const handleDeleteClick = (
    e: React.MouseEvent,
    round: RecruitmentRound,
    index: number
  ) => {
    e.stopPropagation(); // Prevent triggering the round selection
    setRoundToDelete({ id: round.id, name: round.name, index });
    setDeleteDialogType("confirm");
    setDeleteDialogOpen(true);
  };

  const handleMetricsClick = (
    e: React.MouseEvent,
    round: RecruitmentRound
  ) => {
    e.stopPropagation(); // Prevent triggering the round selection
    setRoundForMetrics({ id: round.id, name: round.name });
    setMetricsDialogOpen(true);
  };

  const handleConfirmDelete = async (mode?: string) => {
    if (!roundToDelete) return;

    setIsDeleting(true);
    try {
      await onDeleteRound(roundToDelete.id, roundToDelete.index, mode);
      setDeleteDialogOpen(false);
      setRoundToDelete(null);
      setDeleteDialogType("confirm");
      toast.success("Round deleted successfully");
    } catch (error: any) {
      // Check if error has a specific code for special handling
      if (error.code === "HAS_APPLICANTS_ONLY_ROUND") {
        setApplicantCount(error.applicantCount || 0);
        setDeleteDialogType("onlyRoundWithApplicants");
      } else if (error.code === "HAS_APPLICANTS_NOT_LAST_ROUND") {
        setDeleteDialogType("notLastRoundWithApplicants");
      } else if (error.code === "HAS_APPLICANTS_LAST_ROUND") {
        setApplicantCount(error.applicantCount || 0);
        setDeleteDialogType("lastRoundWithApplicants");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete round";
        toast.error(errorMessage);
        setDeleteDialogOpen(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleForceDelete = async (mode: "deleteAllApplicants" | "deleteRoundDataOnly") => {
    if (!roundToDelete) return;

    setIsDeleting(true);
    try {
      await onDeleteRound(roundToDelete.id, roundToDelete.index, mode);
      setDeleteDialogOpen(false);
      setRoundToDelete(null);
      setDeleteDialogType("confirm");
      toast.success("Round deleted successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete round";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDialogContent = () => {
    switch (deleteDialogType) {
      case "onlyRoundWithApplicants":
        return {
          title: "Delete Round and All Applicants?",
          description: `This is the only round and it contains ${applicantCount} applicant${applicantCount !== 1 ? "s" : ""}. Deleting this round will also permanently delete all applicants and their data (scores, comments, etc.). This action cannot be undone.`,
          confirmText: "Delete Round & All Applicants",
          onConfirm: () => handleForceDelete("deleteAllApplicants"),
        };
      case "notLastRoundWithApplicants":
        return {
          title: "Cannot Delete Round",
          description: "This round contains applicants and has subsequent rounds that depend on it. You can only delete the last round when rounds contain applicants. Please delete later rounds first, or remove all applicants from this round before deleting.",
          confirmText: null,
          onConfirm: null,
        };
      case "lastRoundWithApplicants":
        return {
          title: "Delete Round Data?",
          description: `This round contains ${applicantCount} applicant${applicantCount !== 1 ? "s" : ""}. Deleting this round will remove all scores and comments from this round. The applicants will remain in previous rounds. This action cannot be undone.`,
          confirmText: "Delete Round Data",
          onConfirm: () => handleForceDelete("deleteRoundDataOnly"),
        };
      default:
        return {
          title: "Delete Recruitment Round",
          description: `Are you sure you want to delete "${roundToDelete?.name}"? This action cannot be undone.`,
          confirmText: "Delete",
          onConfirm: () => handleConfirmDelete(),
        };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <>
      <aside className="w-64 border-r">
        <div className="flex items-center justify-between p-4">
          <div className="font-medium">Recruitment Rounds</div>
          {isOwnerOrAdmin && (
            <CreateRecruitmentRoundDialog
              currentRecruitmentCycle={currentRecruitmentCycle}
              recruitmentRounds={rounds}
              setRecruitmentRounds={setRecruitmentRounds}
            />
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-1 p-2">
            {rounds.map((round, index) => (
              <div
                key={round.id}
                className="group relative"
              >
                <div
                  className={cn(
                    "inline-flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors pr-2 cursor-pointer",
                    index === currentRound
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setCurrentRound(index)}
                >
                  <span className="flex-1 text-left">{round.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-transparent disabled:pointer-events-none disabled:opacity-50"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        disabled={isDeleting}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMetricsClick(e, round);
                        }}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        {isOwnerOrAdmin ? "View/Update Metrics" : "View Metrics"}
                      </DropdownMenuItem>
                      {isOwnerOrAdmin && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(e, round, index);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Round
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setDeleteDialogType("confirm");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {deleteDialogType === "notLastRoundWithApplicants" ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {dialogContent.confirmText && dialogContent.onConfirm && (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  dialogContent.onConfirm?.();
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : dialogContent.confirmText}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {roundForMetrics && (
        <UpdateMetricsDialog
          open={metricsDialogOpen}
          onOpenChange={(open) => {
            setMetricsDialogOpen(open);
            if (!open) {
              setRoundForMetrics(null);
            }
          }}
          recruitmentRoundId={roundForMetrics.id}
          roundName={roundForMetrics.name}
          cycleName={currentRecruitmentCycle.name}
          isReadOnly={!isOwnerOrAdmin}
        />
      )}
    </>
  );
}

export default function Component() {
  const { data: user } = useUser();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  const [recruitmentCycles, setRecruitmentCycles] = useState<
    RecruitmentCycle[]
  >([]);
  const [currentCycle, setCurrentCycle] = useState<RecruitmentCycle | null>(
    null
  );

  const [recruitmentRounds, setRecruitmentRounds] = useState<
    RecruitmentRound[]
  >([]);
  const [currentRound, setCurrentRound] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");

  const updateLoadingMessage = (message: string) => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const finishLoading = () => {
    setIsLoading(false);
  };

  const saveCurrentRoundToLocalStorage = useCallback(() => {
    if (currentOrg && currentCycle) {
      localStorage.setItem(
        `lastUsedRound_${user?.id}_${currentOrg.id}_${currentCycle.id}`,
        JSON.stringify(currentRound)
      );
    }
  }, [currentOrg, currentCycle, currentRound, user]);

  const loadCurrentRoundFromLocalStorage = useCallback(() => {
    if (currentOrg && currentCycle) {
      const lastUsedRound = localStorage.getItem(
        `lastUsedRound_${user?.id}_${currentOrg.id}_${currentCycle.id}`
      );
      if (lastUsedRound) {
        setCurrentRound(parseInt(lastUsedRound, 10) || 0);
      } else {
        setCurrentRound(0);
      }
    }
  }, [currentOrg, currentCycle, user]);

  // Fetch Organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user) return;
      updateLoadingMessage("Loading organizations...");
      try {
        const response = await fetch("/api/organizations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(user),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch organizations");
        }

        const data: Organization[] = await response.json();
        setOrganizations(data);

        const lastUsedOrg = localStorage.getItem(`lastUsedOrg_${user?.id}`);
        if (lastUsedOrg) {
          const parsedOrg = JSON.parse(lastUsedOrg);
          const org = data.find((o) => o.id === parsedOrg.id);
          if (org) setCurrentOrg(org);
        } else if (data.length > 0) {
          setCurrentOrg(data[0]);
        }
      } catch (error) {
        console.error((error as Error).message);
      }
      finishLoading();
    };

    fetchOrganizations();
  }, [user]);

  // Fetch Recruitment Cycles
  useEffect(() => {
    if (!currentOrg) {
      setRecruitmentCycles([]);
      setCurrentCycle(null);
      return;
    }

    updateLoadingMessage("Loading recruitment cycles...");
    const fetchRecruitmentCycles = async () => {
      try {
        const response = await fetch("/api/recruitment_cycles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            organization_id: currentOrg.id,
            user_id: user?.id 
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch recruitment cycles");
        }

        const data: RecruitmentCycle[] = await response.json();
        setRecruitmentCycles(data);
        setCurrentCycle(data.length > 0 ? data[data.length - 1] : null);
      } catch (error) {
        console.error((error as Error).message);
      }
      finishLoading();
    };

    fetchRecruitmentCycles();
  }, [currentOrg]);

  // Fetch Recruitment Rounds
  useEffect(() => {
    if (!currentCycle) {
      setRecruitmentRounds([]);
      setIsLoading(false); // Stop loading if no recruitment cycle exists
      return;
    }

    updateLoadingMessage("Loading recruitment rounds...");
    const fetchRecruitmentRounds = async () => {
      try {
        const response = await fetch("/api/recruitment_rounds", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recruitment_cycle_id: currentCycle.id }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch recruitment rounds");
        }

        const data: RecruitmentRound[] = await response.json();

        setRecruitmentRounds(data);
        loadCurrentRoundFromLocalStorage(); // Load the last used round
      } catch (error) {
        console.error((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecruitmentRounds();
  }, [currentCycle, loadCurrentRoundFromLocalStorage]);

  // Save current round whenever it changes
  useEffect(() => {
    saveCurrentRoundToLocalStorage();
  }, [currentRound, saveCurrentRoundToLocalStorage]);

  // Handle round deletion
  const handleDeleteRound = useCallback(
    async (roundId: string, roundIndex: number, mode?: string) => {
      if (!currentCycle) {
        throw new Error("No recruitment cycle selected");
      }

      const response = await fetch("/api/recruitment_rounds/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          recruitment_round_id: roundId,
          mode: mode || "normal"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Create a custom error with the code attached
        const error = new Error(errorData.error || "Failed to delete round") as Error & { 
          code?: string; 
          applicantCount?: number;
        };
        if (errorData.code) {
          error.code = errorData.code;
          error.applicantCount = errorData.applicantCount;
        }
        throw error;
      }

      // Refresh the rounds list
      const fetchResponse = await fetch("/api/recruitment_rounds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recruitment_cycle_id: currentCycle.id }),
      });

      if (!fetchResponse.ok) {
        throw new Error("Failed to refresh rounds list");
      }

      const updatedRounds: RecruitmentRound[] = await fetchResponse.json();
      setRecruitmentRounds(updatedRounds);

      // Adjust currentRound index if needed
      if (updatedRounds.length === 0) {
        // No rounds left
        setCurrentRound(0);
      } else if (roundIndex < currentRound) {
        // Deleted round was before current, decrement index
        setCurrentRound(currentRound - 1);
      } else if (roundIndex === currentRound) {
        // Deleted round was the current one
        // If it was the last round, move to the new last round
        // Otherwise, stay at the same index (which now points to the next round)
        setCurrentRound(Math.min(currentRound, updatedRounds.length - 1));
      }
      // If deleted round was after current (roundIndex > currentRound), no adjustment needed
    },
    [currentCycle, currentRound, setRecruitmentRounds]
  );

  if (isLoading) {
    return <LoadingModal isOpen={isLoading} message={loadingMessage} />;
  }

  return (
    <div className="flex h-screen flex-col">
      <Toaster />
      <Header
        currentOrg={currentOrg}
        setCurrentOrg={setCurrentOrg}
        organizations={organizations}
        setOrganizations={setOrganizations}
        currentCycle={currentCycle}
        setCurrentCycle={setCurrentCycle}
        recruitmentCycles={recruitmentCycles}
        setRecruitmentCycles={setRecruitmentCycles}
        userId={user?.id ?? ""}
      />
      <div className="flex flex-1">
        {currentCycle ? (
          <Sidebar
            rounds={recruitmentRounds}
            setRecruitmentRounds={setRecruitmentRounds}
            currentRound={currentRound}
            setCurrentRound={setCurrentRound}
            currentRecruitmentCycle={currentCycle}
            onDeleteRound={handleDeleteRound}
            currentOrg={currentOrg}
            user={user}
          />
        ) : (
          <div className="w-64 border-r p-4 text-muted-foreground">
            No recruitment cycles available.
          </div>
        )}
        <main className="flex-1">
          <div className="p-6">
            <ApplicantGrid
              rounds={recruitmentRounds}
              currentRound={currentRound}
              onMoveToNextRound={(id) => Promise.resolve()}
              onReject={(id) => Promise.resolve()}
              isLastRound={currentRound === recruitmentRounds.length - 1}
              currentCycle={currentCycle}
              currentOrg={currentOrg}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
