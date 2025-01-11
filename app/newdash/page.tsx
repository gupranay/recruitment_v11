"use client";

import { useState, useEffect, SetStateAction } from "react";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Plus,
  Settings,
  Upload,
  X,
  Expand,
  Loader2,
  Send,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Toaster, toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import useUser from "../hook/useUser";
import { Organization } from "@/contexts/OrganizationContext";
import React from "react";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";
import CreateRecruitmentCycleDialog from "../../components/CreateRecruitmentCycleDialog";
import { RecruitmentRound } from "@/lib/types/RecruitmentRound";
import { handleClientScriptLoad } from "next/script";
import CreateRecruitmentRoundDialog from "@/components/CreateRecruitmentRoundDialog";
import { CreateOrganizationDialog } from "@/components/CreateOrganizationDialog";
import UploadApplicantsDialog from "@/components/UploadApplicantsDialog";
import UploadApplicantsDialog3 from "@/components/UploadApplicantsDialog3";
import NextImage from "next/image";
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

type ApplicantCardType = {
  applicant_round_id: string;
  applicant_id: string;
  name: string;
  headshot_url: string;
  status: string;
};

function ApplicationDialog({
  applicantId,
  isOpen,
  onClose,
}: {
  applicantId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [applicantData, setApplicantData] = useState<{
    name: string;
    headshot_url: string;
    data: Record<string, string>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchApplicantDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/applicant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ applicant_id: applicantId }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch applicant details");
        }
        const data = await response.json();
        setApplicantData(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchApplicantDetails();
    }
  }, [isOpen, applicantId]);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto p-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          applicantData && (
            <>
              {/* Name and Headshot */}
              <div className="flex flex-col items-center mb-8">
                <img
                  src={
                    applicantData.headshot_url ||
                    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                  }
                  alt={`Headshot of ${applicantData.name}`}
                  className="w-48 h-48 rounded-full object-cover mb-4 shadow-md"
                />
                <h2 className="text-2xl font-bold text-gray-800">
                  {applicantData.name}
                </h2>
              </div>

              {/* Dynamic Data Fields */}
              <div className="grid grid-cols-1 gap-y-6">
                {Object.entries(applicantData.data || {}).map(
                  ([key, value]) => (
                    <div key={key} className="flex flex-col">
                      <h3 className="text-sm font-bold text-black">{key}</h3>
                      {isValidUrl(value) ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          View {key}
                        </a>
                      ) : (
                        <p className="text-gray-700 mt-1">{value}</p>
                      )}
                    </div>
                  )
                )}
              </div>
            </>
          )
        )}
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

interface ApplicantCardProps {
  applicant: ApplicantCardType;
  onMoveToNextRound: (id: string) => void;
  onReject: (id: string) => void;
  fetchApplicants: () => Promise<void>;
}

function ApplicantCard({
  applicant,
  onMoveToNextRound,
  onReject,
  fetchApplicants,
  isLastRound,
}: ApplicantCardProps & { isLastRound: boolean }) {
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false); // Loading state for accepting
  const [isRejecting, setIsRejecting] = useState(false); // Loading state for rejecting

  const handleMoveToNextRound = async () => {
    setIsAccepting(true); // Start loading state for accepting
    try {
      const endpoint = isLastRound
        ? "/api/applicant/finalize" // Different API for the last recruitment round
        : "/api/applicant/accept";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicant_id: applicant.applicant_id,
          applicant_round_id: applicant.applicant_round_id,
        }),
      });

      if (!response.ok) {
        throw new Error(
          isLastRound
            ? "Failed to finalize the applicant."
            : "Failed to move the applicant to the next round."
        );
      }

      onMoveToNextRound(applicant.applicant_id);
    } catch (error) {
      console.error(error);
      alert(
        isLastRound
          ? "An error occurred while finalizing the applicant."
          : "An error occurred while moving the applicant to the next round."
      );
    } finally {
      setIsAccepting(false); // End loading state for accepting
      setIsAlertDialogOpen(false);
      toast.success(
        isLastRound
          ? "Applicant finalized successfully!"
          : "Applicant moved to the next round successfully!"
      );
      fetchApplicants();
    }
  };

  const handleRejectApplicant = async () => {
    setIsRejecting(true); // Start loading state for rejecting
    try {
      const response = await fetch("/api/applicant/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicant_id: applicant.applicant_id,
          applicant_round_id: applicant.applicant_round_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject the applicant.");
      }

      onReject(applicant.applicant_id);
    } catch (error) {
      console.error("Error rejecting applicant:", error);
      alert("An error occurred while rejecting the applicant.");
    } finally {
      setIsRejecting(false); // End loading state for rejecting
      setIsAlertDialogOpen(false);
      toast.success("Applicant rejected successfully");
      fetchApplicants();
    }
  };

  return (
    <Card
      className={`${
        applicant.status === "accepted"
          ? "border-green-500"
          : applicant.status === "rejected"
          ? "border-destructive"
          : ""
      } flex flex-col justify-between mx-auto w-[250px]`} // Fixed card width
    >
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          {applicant.name || "Unnamed Applicant"}
          {applicant.status === "rejected" && (
            <Badge variant="destructive" className="text-xs">
              Rejected
            </Badge>
          )}
          {applicant.status === "accepted" && (
            <Badge variant="default" className="text-xs">
              Accepted
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-[3/4] relative overflow-hidden rounded-lg bg-muted">
          {applicant.headshot_url && (
            <Image
              src={applicant.headshot_url}
              alt={`${applicant.name}'s headshot`}
              layout="fill"
              className="object-cover"
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-2">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="p-1 text-xs"
            onClick={() => setIsApplicationDialogOpen(true)}
          >
            <Expand className="h-3 w-3" />
            <span className="sr-only">Expand application</span>
          </Button>
          {applicant.status === "in_progress" && (
            <AlertDialog
              open={isAlertDialogOpen}
              onOpenChange={setIsAlertDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="p-1 text-xs"
                  onClick={() => setIsAlertDialogOpen(true)}
                >
                  Decide
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                  <AlertDialogDescription>
                    What do you want to do with{" "}
                    {applicant.name || "this applicant"}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex justify-end space-x-4">
                  <AlertDialogCancel className="w-auto px-4 py-2">
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    variant="outline"
                    onClick={handleMoveToNextRound}
                    disabled={isAccepting} // Disable the button while loading
                    className="w-auto px-4 py-2 bg-green-500 text-white hover:bg-green-600"
                  >
                    {isAccepting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {isLastRound ? "Finalize Applicant" : "Move to Next Round"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRejectApplicant}
                    disabled={isRejecting} // Disable the button while loading
                    className="w-auto px-4 py-2 bg-red-500 text-white hover:bg-red-600"
                  >
                    {isRejecting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Reject Applicant
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {applicant.status === "accepted" && (
          <Button
            size="sm"
            variant="outline"
            className="p-1 text-xs opacity-50 cursor-not-allowed"
            disabled
          >
            Accepted
          </Button>
        )}
      </CardFooter>
      <ApplicationDialog
        applicantId={applicant.applicant_id}
        isOpen={isApplicationDialogOpen}
        onClose={() => setIsApplicationDialogOpen(false)}
      />
    </Card>
  );
}


export function Header({
  currentOrg,
  setCurrentOrg,
  currentCycle,
  setCurrentCycle,
  organizations,
  setOrganizations,
  recruitmentCycles,
  setRecruitmentCycles,
  userId,
}: {
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  currentCycle: RecruitmentCycle | null;
  setCurrentCycle: (cycle: RecruitmentCycle) => void;
  organizations: Organization[];
  setOrganizations: (orgs: Organization[]) => void;
  recruitmentCycles: RecruitmentCycle[];
  setRecruitmentCycles: (cycles: RecruitmentCycle[]) => void;
  userId: string;
}) {
  const { isFetching, data: user, error } = useUser();
  useEffect(() => {
    const lastUsedOrg = localStorage.getItem(`lastUsedOrg_${userId}`);
    if (lastUsedOrg) {
      const parsedOrg = JSON.parse(lastUsedOrg);
      const org = organizations.find((o) => o.id === parsedOrg.id);
      if (org) {
        setCurrentOrg(org);
      }
    }
  }, [organizations, userId]);

  const handleOrgSelect = (org: Organization) => {
    setCurrentOrg(org);
    localStorage.setItem(`lastUsedOrg_${userId}`, JSON.stringify(org));
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <Link href="#" className="font-semibold">
        Recruitify
      </Link>
      <div className="flex items-center gap-4">
        {/* Organization Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {currentOrg ? currentOrg.name : "Select Organization"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Select Organization</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onSelect={() => handleOrgSelect(org)}
              >
                {org.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <CreateOrganizationDialog
              user={user}
              organizations={organizations}
              setOrganizations={setOrganizations}
              setCurrentOrg={setCurrentOrg}
            />
            <Dialog>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Organization
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Organization</DialogTitle>
                  <DialogDescription>
                    Edit the details of your organization.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        defaultValue={currentOrg?.name || ""}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Recruitment Cycle Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!currentOrg}>
              {currentOrg
                ? recruitmentCycles.length > 0
                  ? currentCycle?.name || "Create Recruitment Cycle"
                  : "Create Recruitment Cycle"
                : "Select Organization"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Select Cycle</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recruitmentCycles.map((cycle) => (
              <DropdownMenuItem
                key={cycle.id}
                onSelect={() =>
                  setCurrentCycle({
                    id: cycle.id,
                    name: cycle.name,
                    created_at: cycle.created_at,
                    organization_id: cycle.organization_id,
                  })
                }
              >
                {cycle.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {currentOrg && (
              <CreateRecruitmentCycleDialog
                selectedOrganization={currentOrg}
                recruitmentCycles={recruitmentCycles}
                setRecruitmentCycles={setRecruitmentCycles}
              />
            )}
            <Dialog>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Recruitment Cycle
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Recruitment Cycle</DialogTitle>
                  <DialogDescription>
                    Edit the details of your recruitment cycle.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="cycleName">Cycle Name</Label>
                      <Input id="cycleName" defaultValue={currentCycle?.name} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logout Button */}
        <Button variant="ghost" size="icon">
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  );
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

type ApplicantGridProps = {
  recruitment_round_id: string | undefined;
  onMoveToNextRound: (applicantId: string) => Promise<void>;
  onReject: (applicantId: string) => Promise<void>;
  isLastRound: boolean;
};

function ApplicantGrid({
  recruitment_round_id,
  onMoveToNextRound,
  onReject,
  isLastRound,
}: ApplicantGridProps) {
  const [applicants, setApplicants] = useState<ApplicantCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading applicants...");

  const fetchApplicants = async () => {
    if (!recruitment_round_id) {
      setIsLoading(false); // Stop loading if no round ID exists
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

      // Sort applicants: accepted at the top, rejected at the bottom
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
  };

  useEffect(() => {
    fetchApplicants();
  }, [recruitment_round_id]);

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

  if (applicants.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No applicants in this round.
      </div>
    );
  }

  return (
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

  const [applicants, setApplicants] = useState<Applicant[]>([]);

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
              <UploadApplicantsDialog3
                recruitment_round_id={recruitmentRounds[currentRound]}
              />
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
