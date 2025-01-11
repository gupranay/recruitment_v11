"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "react-hot-toast";
// import { Textarea } from "@/components/ui/textarea";
import useUser from "../hook/useUser";
import { Organization } from "@/contexts/OrganizationContext";
import React from "react";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";
import { RecruitmentRound } from "@/lib/types/RecruitmentRound";
import CreateRecruitmentRoundDialog from "@/components/CreateRecruitmentRoundDialog";
import UploadApplicantsDialog3 from "@/components/UploadApplicantsDialog3";
import ApplicantGrid from "@/components/ApplicantsGrid";
import Header from "@/components/Header";
import { CreateOrganizationDialog } from "@/components/CreateOrganizationDialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

function LoadingModal({ isOpen, message = "Loading..." }: LoadingModalProps) {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-center text-lg font-medium">{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface Applicant {
  id: string;
  name?: string;
  email?: string;
  status?: string;
  rejected: boolean;
}

function Sidebar({
  rounds,
  setRecruitmentRounds,
  currentRound,
  setCurrentRound,
  currentRecruitmentCycle,
}: {
  rounds: RecruitmentRound[];
  setRecruitmentRounds: (rounds: RecruitmentRound[]) => void;
  currentRound: number;
  setCurrentRound: (index: number) => void;
  currentRecruitmentCycle: RecruitmentCycle;
}) {
  return (
    <aside className="w-64 border-r">
      <div className="flex items-center justify-between p-4">
        <div className="font-medium">Recruitment Rounds</div>
        <CreateRecruitmentRoundDialog
          currentRecruitmentCycle={currentRecruitmentCycle}
          recruitmentRounds={rounds}
          setRecruitmentRounds={setRecruitmentRounds}
        />
      </div>
      <Separator />
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-1 p-2">
          {rounds.map((round, index) => (
            <Button
              key={round.id}
              variant={index === currentRound ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setCurrentRound(index)}
            >
              {round.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </aside>
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
          body: JSON.stringify({ organization_id: currentOrg.id }),
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
        if (data.length === 0) {
          setIsLoading(false); // Stop loading if no rounds exist
        }
      } catch (error) {
        console.error((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecruitmentRounds();
  }, [currentCycle]);

  useEffect(() => {
    console.log("Updated recruitmentRounds:", recruitmentRounds);
  }, [recruitmentRounds]);

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
          />
        ) : (
          <div className="w-64 border-r p-4 text-muted-foreground">
            No recruitment cycles available.
          </div>
        )}
        <main className="flex-1">
          <div className="border-b">
            <div className="flex h-14 items-center justify-between px-6">
              <div className="font-medium">Applicants</div>
              <UploadApplicantsDialog3/>
            </div>
          </div>
          <div className="p-6">
            <ApplicantGrid
              recruitment_round_id={recruitmentRounds[currentRound]?.id}
              onMoveToNextRound={(id) => Promise.resolve()}
              onReject={(id) => Promise.resolve()}
              isLastRound={currentRound === recruitmentRounds.length - 1}
            />
          </div>
        </main>
      </div>
    </div>
  );
}