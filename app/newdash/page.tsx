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
  name?: string;
  email?: string;
  status?: string;
}

function ApplicationDialog({
  applicant,
  isOpen,
  onClose,
}: {
  applicant: Applicant;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [newComment, setNewComment] = useState<string>("");
  const [comments, setComments] = useState<{ text: string; timestamp: Date }[]>(
    []
  );

  const addComment = () => {
    if (newComment.trim()) {
      setComments([...comments, { text: newComment, timestamp: new Date() }]);
      setNewComment("");
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {applicant?.name || "Applicant"}'s Application
          </DialogTitle>
          <DialogDescription>
            Full details of the applicant's submission
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-32 h-32 rounded-full overflow-hidden">
            <Image
              src="/placeholder.svg?height=128&width=128"
              alt={`${applicant?.name || "Applicant"}'s headshot`}
              layout="fill"
              objectFit="cover"
            />
          </div>
          <h2 className="text-2xl font-bold">
            {applicant?.name || "Applicant"}
          </h2>
          <Badge>{applicant?.status || "Unknown"}</Badge>
        </div>
        <ScrollArea className="h-[300px] mt-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Email</h3>
              <p>{applicant?.email || "applicant@example.com"}</p>
            </div>
            <div>
              <h3 className="font-semibold">Resume</h3>
              <Button variant="outline" className="w-full mt-2">
                Download Resume
              </Button>
            </div>
            <div>
              <h3 className="font-semibold">Cover Letter</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Comments</h3>
              {comments.map((comment, index) => (
                <div key={index} className="bg-muted p-2 rounded-md mb-2">
                  <p className="text-sm">{comment.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {comment.timestamp.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <div className="mt-4 space-y-2">
          <Textarea
            placeholder="Add a new comment..."
            value={newComment}
            onChange={(e: { target: { value: SetStateAction<string> } }) =>
              setNewComment(e.target.value)
            }
          />
          <Button onClick={addComment} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Add Comment
          </Button>
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

interface ApplicantCardProps {
  applicant: Applicant;
  onMoveToNextRound: (id: string) => void;
  onReject: (id: string) => void;
}

function ApplicantCard({
  applicant,
  onMoveToNextRound,
  onReject,
}: ApplicantCardProps) {
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);

  return (
    <Card className={applicant?.rejected ? "border-destructive" : ""}>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          {applicant?.name || "Unnamed Applicant"}
          {applicant?.rejected && <Badge variant="destructive">Rejected</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-[3/4] rounded-lg bg-muted" />
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {applicant?.status || "Unknown"}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsApplicationDialogOpen(true)}
          >
            <Expand className="h-4 w-4" />
            <span className="sr-only">Expand application</span>
          </Button>
          <AlertDialog
            open={isAlertDialogOpen}
            onOpenChange={setIsAlertDialogOpen}
          >
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setIsAlertDialogOpen(true)}
              >
                {applicant?.rejected ? "Rejected" : "Move or Reject"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                <AlertDialogDescription>
                  Do you want to move {applicant?.name || "Applicant"} to the
                  next round or reject them?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                {!applicant?.rejected && (
                  <AlertDialogAction
                    onClick={() => {
                      onMoveToNextRound(applicant.id);
                      setIsAlertDialogOpen(false);
                    }}
                  >
                    Move to Next Round
                  </AlertDialogAction>
                )}
                {!applicant?.rejected && (
                  <AlertDialogAction
                    onClick={() => {
                      setShowRejectConfirmation(true);
                      setIsAlertDialogOpen(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject Applicant
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
      <AlertDialog
        open={showRejectConfirmation}
        onOpenChange={setShowRejectConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject {applicant?.name || "Applicant"}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRejectConfirmation(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReject(applicant.id);
                setShowRejectConfirmation(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ApplicationDialog
        applicant={applicant}
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

function ApplicantGrid({
  applicants,
  onMoveToNextRound,
  onReject,
}: {
  applicants: Applicant[];
  onMoveToNextRound: (applicantId: number) => Promise<void>;
  onReject: (applicantId: number) => Promise<void>;
}) {
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
          key={applicant.id.toString()} // Convert id to string
          applicant={{
            ...applicant,
            id: applicant.id.toString(), // Convert id to string for compatibility
          }}
          onMoveToNextRound={(id) => onMoveToNextRound(Number(id))}
          onReject={(id) => onReject(Number(id))}
        />
      ))}
    </div>
  );
}
export default function Component() {
  const { data: user } = useUser();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  const [recruitmentCycles, setRecruitmentCycles] = useState<RecruitmentCycle[]>([]);
  const [currentCycle, setCurrentCycle] = useState<RecruitmentCycle | null>(null);

  const [recruitmentRounds, setRecruitmentRounds] = useState<RecruitmentRound[]>([]);
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
      } catch (error) {
        console.error((error as Error).message);
      }
      finishLoading();
    };

    fetchRecruitmentRounds();
  }, [currentCycle]);

  if (isLoading) {
    return <LoadingModal isOpen={isLoading} message={loadingMessage} />;
  }

  return (
    <div className="flex h-screen flex-col">
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
              <Button size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Applicants
              </Button>
            </div>
          </div>
          <div className="p-6">
            <ApplicantGrid
              applicants={applicants}
              onMoveToNextRound={(id) => Promise.resolve()}
              onReject={(id) => Promise.resolve()}
            />
          </div>
        </main>
      </div>
    </div>
  );
}