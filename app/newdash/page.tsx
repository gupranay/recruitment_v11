"use client"

import { useState, useEffect, SetStateAction } from "react"
import { ChevronDown, ChevronRight, LogOut, Plus, Settings, Upload, X, Expand, Loader2, Send } from 'lucide-react'
import Link from "next/link"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Toast, ToastProvider } from "@/components/ui/Toast"
import { Textarea } from "@/components/ui/textarea"
import useUser from "../hook/useUser"
import { Organization } from "@/contexts/OrganizationContext"
import React from "react"
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle"

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
  )
}

interface Applicant {
  name?: string;
  email?: string;
  status?: string;
}

function ApplicationDialog({ applicant, isOpen, onClose }: { 
  applicant: Applicant; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [newComment, setNewComment] = useState<string>("");
  const [comments, setComments] = useState<{ text: string; timestamp: Date }[]>([]);

  const addComment = () => {
    if (newComment.trim()) {
      setComments([...comments, { text: newComment, timestamp: new Date() }])
      setNewComment("")
    }
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{applicant?.name || 'Applicant'}'s Application</DialogTitle>
          <DialogDescription>Full details of the applicant's submission</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-32 h-32 rounded-full overflow-hidden">
            <Image
              src="/placeholder.svg?height=128&width=128"
              alt={`${applicant?.name || 'Applicant'}'s headshot`}
              layout="fill"
              objectFit="cover"
            />
          </div>
          <h2 className="text-2xl font-bold">{applicant?.name || 'Applicant'}</h2>
          <Badge>{applicant?.status || 'Unknown'}</Badge>
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
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2">Comments</h3>
              {comments.map((comment, index) => (
                <div key={index} className="bg-muted p-2 rounded-md mb-2">
                  <p className="text-sm">{comment.text}</p>
                  <p className="text-xs text-muted-foreground">{comment.timestamp.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <div className="mt-4 space-y-2">
          <Textarea
            placeholder="Add a new comment..."
            value={newComment}
            onChange={(e: { target: { value: SetStateAction<string> } }) => setNewComment(e.target.value)}
          />
          <Button onClick={addComment} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Add Comment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
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

function ApplicantCard({ applicant, onMoveToNextRound, onReject }: ApplicantCardProps) {
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);

  return (
    <Card className={applicant?.rejected ? "border-destructive" : ""}>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          {applicant?.name || 'Unnamed Applicant'}
          {applicant?.rejected && (
            <Badge variant="destructive">Rejected</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-[3/4] rounded-lg bg-muted" />
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">{applicant?.status || 'Unknown'}</div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsApplicationDialogOpen(true)}
          >
            <Expand className="h-4 w-4" />
            <span className="sr-only">Expand application</span>
          </Button>
          <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
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
                  Do you want to move {applicant?.name || 'Applicant'} to the next round or reject them?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                {!applicant?.rejected && (
                  <AlertDialogAction
                    onClick={() => {
                      onMoveToNextRound(applicant.id)
                      setIsAlertDialogOpen(false)
                    }}
                  >
                    Move to Next Round
                  </AlertDialogAction>
                )}
                {!applicant?.rejected && (
                  <AlertDialogAction
                    onClick={() => {
                      setShowRejectConfirmation(true)
                      setIsAlertDialogOpen(false)
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
      <AlertDialog open={showRejectConfirmation} onOpenChange={setShowRejectConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject {applicant?.name || 'Applicant'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRejectConfirmation(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReject(applicant.id)
                setShowRejectConfirmation(false)
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
  )
}

function Header({ currentOrg, setCurrentOrg, currentCycle, setCurrentCycle, organizations, recruitmentCycles }: { 
  currentOrg: Organization; 
  setCurrentOrg: (org: Organization) => void; 
  currentCycle: { id: number; name: string }; 
  setCurrentCycle: (cycle: { id: number; name: string }) => void; 
  organizations: Organization[];
  recruitmentCycles: RecruitmentCycle[];
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <Link href="#" className="font-semibold">
        Recruitify
      </Link>
      <div className="flex items-center gap-4">
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
            {organizations.map(org => (
              <DropdownMenuItem 
                key={org.id} 
                onSelect={() => setCurrentOrg(org)}
              >
                {org.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </DropdownMenuItem>
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
                  <DialogDescription>Edit the details of your organization.</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input id="orgName" defaultValue={currentOrg?.name || ""} />
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {currentOrg 
                ? (recruitmentCycles.length > 0 ? currentCycle.name : "Create Recruitment Cycle")
                : "Select Organization"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Select Cycle</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recruitmentCycles.map(cycle => (
              <DropdownMenuItem 
                key={cycle.id} 
                onSelect={() => setCurrentCycle({ id: Number(cycle.id), name: cycle.name })}
              >
                {cycle.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus className="mr-2 h-4 w-4" />
              Create Recruitment Cycle
            </DropdownMenuItem>
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
                  <DialogDescription>Edit the details of your recruitment cycle.</DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="cycleName">Cycle Name</Label>
                      <Input id="cycleName" defaultValue={currentCycle.name} />
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
        <Button variant="ghost" size="icon">
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    </header>
  )
}

function Sidebar({ rounds, currentRound, setCurrentRound }: { rounds: string[]; currentRound: number; setCurrentRound: (index: number) => void; }) {
  return (
    <aside className="w-64 border-r">
      <div className="flex items-center justify-between p-4">
        <div className="font-medium">Recruitment Rounds</div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Plus className="h-4 w-4" />
              <span className="sr-only">Create Round</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Round</DialogTitle>
              <DialogDescription>Add a new round to the recruitment process.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="roundName">Round Name</Label>
                  <Input id="roundName" name="roundName" placeholder="Enter round name" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Round</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Separator />
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-1 p-2">
          {rounds.map((round, index) => (
            <Button
              key={round}
              variant={index === currentRound ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setCurrentRound(index)}
            >
              {round}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}

function ApplicantGrid({ applicants, onMoveToNextRound, onReject }: { applicants: { id: number; name: string; status: string; round: number; rejected: boolean; }[]; onMoveToNextRound: (applicantId: number) => Promise<void>; onReject: (applicantId: number) => Promise<void>; }) {
  if (applicants.length === 0) {
    return <div className="text-center text-muted-foreground">No applicants in this round.</div>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {applicants.map((applicant) => (
        <ApplicantCard
          key={applicant.id.toString()} // Convert id to string
          applicant={{ 
            ...applicant, 
            id: applicant.id.toString() // Convert id to string for compatibility
          }}
          onMoveToNextRound={(id) => onMoveToNextRound(Number(id))}
          onReject={(id) => onReject(Number(id))}
        />
      ))}
    </div>
  )
}

export default function Component() {
  const { isFetching, data: user, error } = useUser();
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState(organizations[0]);
  const [currentCycle, setCurrentCycle] = useState({ id: 1, name: "W24" })
  const [rounds, setRounds] = useState(["Initial Applications", "First Interview", "Second Interview", "Final Decision"])
  const [recruitmentCycles, setRecruitmentCycles] = useState<RecruitmentCycle[]>([]);
  const [currentRound, setCurrentRound] = useState(0)
  const [applicants, setApplicants] = useState([
    { id: 1, name: "Applicant 1", status: "Pending Review", round: 0, rejected: false },
    { id: 2, name: "Applicant 2", status: "Interviewed", round: 0, rejected: false },
    { id: 3, name: "Applicant 3", status: "Pending Review", round: 0, rejected: false },
    { id: 4, name: "Applicant 4", status: "Scheduled", round: 0, rejected: false },
    { id: 5, name: "Applicant 5", status: "Interviewed", round: 0, rejected: false },
    { id: 6, name: "Applicant 6", status: "Pending Review", round: 0, rejected: false },
  ] || [])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")

  React.useEffect(() => {
    const fetchOrganizations = async () => {
      if(!user) return;
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
        console.log(data);
      } catch (err: any) {
        console.error(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, [user]);

  React.useEffect(() => {
    if (currentOrg) {
      const fetchRecruitmentCycles = async () => {
        const response = await fetch("/api/recruitment_cycles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ organization_id: currentOrg.id }),
        });

        if (response.ok) {
          const data = await response.json();
          setRecruitmentCycles(data);
          
          if (data.length > 0) {
            setCurrentCycle(data[data.length - 1]);
          }
        }
      };

      fetchRecruitmentCycles();
    }
  }, [currentOrg]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setLoadingMessage("Loading initial data...");
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      setIsLoading(false);
    };
    loadInitialData();
  }, []);

  const moveToNextRound = async (applicantId: number) => {
    setIsLoading(true)
    setLoadingMessage("Moving applicant to next round...")
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulating API call
    setApplicants(applicants.map(applicant =>
      applicant?.id === applicantId && applicant?.round < rounds.length - 1
        ? { ...applicant, round: applicant.round + 1, rejected: false }
        : applicant
    ))
    setIsLoading(false)
    Toast({ message: `Applicant Moved: Applicant has been moved to ${rounds[currentRound + 1]}.`, type: "success" })
  }

  const rejectApplicant = async (applicantId: number) => {
    setIsLoading(true)
    setLoadingMessage("Rejecting applicant...")
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulating API call
    setApplicants(applicants.map(applicant =>
      applicant?.id === applicantId
        ? { ...applicant, rejected: true }
        : applicant
    ))
    setIsLoading(false)
    Toast({ message: "Applicant Rejected: The applicant has been marked as rejected.", type: "info" })
  }

  const currentApplicants = applicants.filter(applicant => applicant.round === currentRound)

  return (
    <div className="flex h-screen flex-col">
      <ToastProvider />
      <LoadingModal isOpen={isLoading} message={loadingMessage} />
      <Header
        currentOrg={currentOrg}
        setCurrentOrg={setCurrentOrg}
        currentCycle={currentCycle}
        setCurrentCycle={setCurrentCycle}
        organizations={organizations}
        recruitmentCycles={recruitmentCycles}
      />
      <div className="flex flex-1">
        <Sidebar
          rounds={rounds}
          currentRound={currentRound}
          setCurrentRound={setCurrentRound}
        />
        <main className="flex-1">
          <div className="border-b">
            <div className="flex h-14 items-center justify-between px-6">
              <div className="font-medium">Current Round: {rounds[currentRound]}</div>
              <Button size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Applicants
              </Button>
            </div>
          </div>
          <div className="p-6">
            <ApplicantGrid
              applicants={currentApplicants}
              onMoveToNextRound={(id) => moveToNextRound(Number(id))}
              onReject={(id) => rejectApplicant(Number(id))}
            />
          </div>
        </main>
      </div>
    </div>
  )
}