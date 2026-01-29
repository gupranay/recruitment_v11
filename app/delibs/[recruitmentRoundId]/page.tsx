"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  Lock,
  Unlock,
  User,
  ArrowLeft,
  Trophy,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import useUser from "@/app/hook/useUser";

// Types
interface ApplicantWithVote {
  applicant_round_id: string;
  applicant_id: string;
  name: string;
  headshot_url: string | null;
  status: string;
  my_vote: number | null;
}

interface DelibsSession {
  id: string;
  status: "open" | "locked";
}

interface DelibsResult {
  applicant_round_id: string;
  applicant_id: string;
  name: string;
  headshot_url: string | null;
  avg_vote: number;
  vote_count: number;
  rank_dense: number;
  is_tied: boolean;
}

interface DemographicsBreakdown {
  status: string;
  field_value: string;
  count: number;
  percentage: number;
}

// Vote button component
const VoteButton = ({
  value,
  selected,
  disabled,
  onClick,
}: {
  value: number;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) => {
  const getButtonStyle = () => {
    if (selected) {
      if (value === 10) return "bg-green-600 hover:bg-green-700 text-white";
      if (value === 5) return "bg-green-500 hover:bg-green-600 text-white";
      if (value === 0) return "bg-gray-500 hover:bg-gray-600 text-white";
      if (value === -5) return "bg-red-500 hover:bg-red-600 text-white";
      if (value === -10) return "bg-red-600 hover:bg-red-700 text-white";
    }
    return "bg-secondary hover:bg-secondary/80";
  };

  const getLabel = () => {
    if (value === 10) return "Strong Yes";
    if (value === 5) return "Yes";
    if (value === 0) return "Neutral";
    if (value === -5) return "No";
    if (value === -10) return "Strong No";
    return value.toString();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center px-3 py-2 h-auto min-w-[70px] ${getButtonStyle()}`}
    >
      <span className="text-lg font-bold">
        {value > 0 ? `+${value}` : value}
      </span>
      <span className="text-[10px] opacity-80">{getLabel()}</span>
    </Button>
  );
};

// Applicant voting card component
const ApplicantVoteCard = ({
  applicant,
  sessionStatus,
  onVote,
  isSubmitting,
  onClear,
}: {
  applicant: ApplicantWithVote;
  sessionStatus: "open" | "locked";
  onVote: (applicantRoundId: string, value: number) => void;
  isSubmitting: boolean;
  onClear: (applicantRoundId: string) => void;
}) => {
  const isLocked = sessionStatus === "locked";
  const hasVoted = applicant.my_vote !== null;

  return (
    <Card className={`${hasVoted ? "border-green-500/50" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            {applicant.headshot_url ? (
              <Image
                src={applicant.headshot_url}
                alt={applicant.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Name and status */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/full-application/${applicant.applicant_round_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 font-semibold truncate text-primary hover:text-primary/80 hover:underline underline-offset-4"
            >
              <span className="truncate">{applicant.name}</span>
              <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 flex-shrink-0" />
            </Link>
            <div className="flex items-center gap-2 mt-1">
              {hasVoted && (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Voted:{" "}
                  {applicant.my_vote! > 0
                    ? `+${applicant.my_vote}`
                    : applicant.my_vote}
                </Badge>
              )}
            </div>
          </div>

          {/* Vote buttons + clear */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              {[-10, -5, 0, 5, 10].map((value) => (
                <VoteButton
                  key={value}
                  value={value}
                  selected={applicant.my_vote === value}
                  disabled={isLocked || isSubmitting}
                  onClick={() => onVote(applicant.applicant_round_id, value)}
                />
              ))}
            </div>
            {hasVoted && !isLocked && (
              <Button
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => onClear(applicant.applicant_round_id)}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
              >
                <X className="h-3 w-3 mr-1" />
                Clear vote
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Results card component
const ResultCard = ({
  result,
  totalMembers,
  isOwnerOrAdmin,
  isLastRound,
  onAccept,
  onReject,
  onMaybe,
  isProcessingDecision,
}: {
  result: DelibsResult;
  totalMembers: number;
  isOwnerOrAdmin: boolean;
  isLastRound: boolean;
  onAccept: (applicantId: string, applicantRoundId: string) => Promise<void>;
  onReject: (applicantId: string, applicantRoundId: string) => Promise<void>;
  onMaybe: (applicantId: string, applicantRoundId: string) => Promise<void>;
  isProcessingDecision: string | null;
}) => {
  const getRankColor = () => {
    if (result.rank_dense === 1) return "bg-yellow-500 text-white";
    if (result.rank_dense === 2) return "bg-gray-400 text-white";
    if (result.rank_dense === 3) return "bg-amber-600 text-white";
    return "bg-muted text-muted-foreground";
  };

  const getVoteColor = () => {
    if (result.avg_vote >= 5) return "text-green-600";
    if (result.avg_vote > 0) return "text-green-500";
    if (result.avg_vote === 0) return "text-gray-500";
    if (result.avg_vote > -5) return "text-red-500";
    return "text-red-600";
  };

  return (
    <Card className={result.is_tied ? "border-amber-500/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Rank - only show if there are votes */}
          {result.vote_count > 0 && (
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold ${getRankColor()}`}
            >
              {result.rank_dense === 1 ? (
                <Trophy className="h-5 w-5" />
              ) : (
                `#${result.rank_dense}`
              )}
            </div>
          )}

          {/* Avatar */}
          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            {result.headshot_url ? (
              <Image
                src={result.headshot_url}
                alt={result.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Name and tie indicator */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/full-application/${result.applicant_round_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 font-semibold truncate text-primary hover:text-primary/80 hover:underline underline-offset-4"
            >
              <span className="truncate">{result.name}</span>
              <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 flex-shrink-0" />
            </Link>
            <div className="flex items-center gap-2 mt-1">
              {result.is_tied && (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-600 text-xs"
                >
                  Tied
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {result.vote_count} / {totalMembers} voted
              </span>
            </div>
            {/* Decision buttons for Owner/Admin */}
            {isOwnerOrAdmin && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onAccept(result.applicant_id, result.applicant_round_id)
                  }
                  disabled={isProcessingDecision === result.applicant_round_id}
                  className="h-7 px-2 text-xs bg-green-500 text-white hover:bg-green-600"
                >
                  {isProcessingDecision === result.applicant_round_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isLastRound ? (
                    "Finalize"
                  ) : (
                    "Accept"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onMaybe(result.applicant_id, result.applicant_round_id)
                  }
                  disabled={isProcessingDecision === result.applicant_round_id}
                  className="h-7 px-2 text-xs bg-yellow-500 text-white hover:bg-yellow-600"
                >
                  {isProcessingDecision === result.applicant_round_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Maybe"
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    onReject(result.applicant_id, result.applicant_round_id)
                  }
                  disabled={isProcessingDecision === result.applicant_round_id}
                  className="h-7 px-2 text-xs"
                >
                  {isProcessingDecision === result.applicant_round_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Reject"
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Score */}
          <div className="text-right">
            <div className={`text-2xl font-bold ${getVoteColor()}`}>
              {result.avg_vote > 0 ? "+" : ""}
              {result.avg_vote.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">avg score</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DelibsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();

  const recruitmentRoundId = params?.recruitmentRoundId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [applicants, setApplicants] = useState<ApplicantWithVote[]>([]);
  const [session, setSession] = useState<DelibsSession | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [roundName, setRoundName] = useState<string>("");
  const [results, setResults] = useState<DelibsResult[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [unauthorized, setUnauthorized] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isLastRound, setIsLastRound] = useState(false);
  const [demographicsColumns, setDemographicsColumns] = useState<string[]>([]);
  const [selectedDemographicField, setSelectedDemographicField] =
    useState<string>("");
  const [isLoadingDemographics, setIsLoadingDemographics] = useState(false);
  const [demographicsData, setDemographicsData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingDecision, setIsProcessingDecision] = useState<
    string | null
  >(null);
  const [lockAction, setLockAction] = useState<"lock" | "unlock" | null>(null);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);

  // Compute if user is Owner or Admin
  const isOwnerOrAdmin = useMemo(() => {
    return userRole === "Owner" || userRole === "Admin";
  }, [userRole]);

  const fetchApplicants = useCallback(async () => {
    if (!recruitmentRoundId) return;

    try {
      const response = await fetch("/api/delibs/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruitment_round_id: recruitmentRoundId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          // Not authenticated – rely on middleware, but also client-redirect as fallback
          const nextPath =
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : `/delibs/${recruitmentRoundId}`;
          router.push(`/auth?next=${encodeURIComponent(nextPath)}`);
          return;
        }

        if (response.status === 403) {
          // Authenticated but not a member of the org
          setUnauthorized(true);
          setIsLoading(false);
          return;
        }

        throw new Error(
          (errorData as any).error || "Failed to fetch applicants",
        );
      }

      const data = await response.json();
      setApplicants(data.applicants);
      setSession(data.session);
      setUserRole(data.user_role);
      setRoundName(data.round_name);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load applicants",
      );
    } finally {
      setIsLoading(false);
    }
  }, [recruitmentRoundId, router]);

  // Fetch results (Owner/Admin only)
  const fetchResults = useCallback(async () => {
    if (!recruitmentRoundId || !isOwnerOrAdmin) return;

    setIsLoadingResults(true);
    try {
      const response = await fetch("/api/delibs/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruitment_round_id: recruitmentRoundId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch results");
      }

      const data = await response.json();
      setResults(data.results);
      setTotalMembers(data.total_members);
      setIsLastRound(data.is_last_round || false);
      if (data.session) {
        setSession(data.session);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load results",
      );
    } finally {
      setIsLoadingResults(false);
    }
  }, [recruitmentRoundId, isOwnerOrAdmin]);

  // Initial load
  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  // Fetch results when user role is determined and they're admin
  useEffect(() => {
    if (isOwnerOrAdmin) {
      fetchResults();
    }
  }, [isOwnerOrAdmin, fetchResults]);

  // Fetch available demographic columns
  useEffect(() => {
    if (!recruitmentRoundId || !isOwnerOrAdmin) return;

    const fetchColumns = async () => {
      try {
        const response = await fetch("/api/demographics/get-cols", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recruitment_round_id: recruitmentRoundId }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch columns");
        }

        const colData: string[] = await response.json();
        // Filter to only include gender and grade (case-insensitive)
        const filteredCols = colData.filter(
          (col) =>
            col.toLowerCase() === "gender" || col.toLowerCase() === "grade",
        );
        setDemographicsColumns(filteredCols);
      } catch (error) {
        console.error("Error fetching demographic columns:", error);
      }
    };

    fetchColumns();
  }, [recruitmentRoundId, isOwnerOrAdmin]);

  // Fetch demographics data when field is selected
  useEffect(() => {
    const fetchDemographics = async () => {
      if (!recruitmentRoundId || !selectedDemographicField || !isOwnerOrAdmin)
        return;

      setIsLoadingDemographics(true);
      try {
        const response = await fetch("/api/demographics/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recruitment_round_id: recruitmentRoundId,
            field: selectedDemographicField,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch demographics data");
        }

        const breakdownData: DemographicsBreakdown[] = await response.json();
        // Show all applicants regardless of status
        setDemographicsData(breakdownData);
      } catch (error) {
        console.error("Error fetching demographic data:", error);
      } finally {
        setIsLoadingDemographics(false);
      }
    };

    fetchDemographics();
  }, [recruitmentRoundId, selectedDemographicField, isOwnerOrAdmin]);

  // Handle vote submission
  const handleVote = async (applicantRoundId: string, voteValue: number) => {
    if (!session) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/delibs/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delibs_session_id: session.id,
          applicant_round_id: applicantRoundId,
          vote_value: voteValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit vote");
      }

      // Update local state
      setApplicants((prev) =>
        prev.map((a) =>
          a.applicant_round_id === applicantRoundId
            ? { ...a, my_vote: voteValue }
            : a,
        ),
      );

      toast.success("Vote submitted!");

      // Refresh results if admin
      if (isOwnerOrAdmin) {
        fetchResults();
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit vote",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle clearing a vote
  const handleClearVote = async (applicantRoundId: string) => {
    if (!session) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/delibs/vote", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delibs_session_id: session.id,
          applicant_round_id: applicantRoundId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to clear vote");
      }

      setApplicants((prev) =>
        prev.map((a) => {
          if (a.applicant_round_id === applicantRoundId) {
            return { ...a, my_vote: null };
          }
          return a;
        }),
      );

      toast.success("Vote cleared");

      if (isOwnerOrAdmin) {
        fetchResults();
      }
    } catch (error) {
      console.error("Error clearing vote:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to clear vote",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle decision actions
  const handleAccept = async (
    applicantId: string,
    applicantRoundId: string,
  ) => {
    setIsProcessingDecision(applicantRoundId);
    try {
      const endpoint = isLastRound
        ? "/api/applicant/finalize"
        : "/api/applicant/accept";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: applicantId,
          applicant_round_id: applicantRoundId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept applicant");
      }

      toast.success(
        isLastRound ? "Applicant finalized!" : "Applicant accepted!",
      );
      // Refresh results to reflect the change
      fetchResults();
    } catch (error) {
      console.error("Error accepting applicant:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to accept applicant",
      );
    } finally {
      setIsProcessingDecision(null);
    }
  };

  const handleReject = async (
    applicantId: string,
    applicantRoundId: string,
  ) => {
    setIsProcessingDecision(applicantRoundId);
    try {
      const response = await fetch("/api/applicant/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: applicantId,
          applicant_round_id: applicantRoundId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject applicant");
      }

      toast.success("Applicant rejected!");
      // Refresh results to reflect the change
      fetchResults();
    } catch (error) {
      console.error("Error rejecting applicant:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reject applicant",
      );
    } finally {
      setIsProcessingDecision(null);
    }
  };

  const handleMaybe = async (applicantId: string, applicantRoundId: string) => {
    setIsProcessingDecision(applicantRoundId);
    try {
      const response = await fetch("/api/applicant/maybe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: applicantId,
          applicant_round_id: applicantRoundId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to mark applicant as maybe");
      }

      toast.success("Applicant marked as maybe!");
      // Refresh results to reflect the change
      if (isOwnerOrAdmin) {
        fetchResults();
      }
    } catch (error) {
      console.error("Error marking applicant as maybe:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to mark applicant as maybe",
      );
    } finally {
      setIsProcessingDecision(null);
    }
  };

  const handleLockToggle = async () => {
    if (!session?.id || !lockAction) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/delibs/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          action: lockAction,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${lockAction} session`);
      }

      const data = await response.json();
      setSession(data.session);
      toast.success(
        `Session ${lockAction === "lock" ? "locked" : "unlocked"} successfully!`,
      );
      setLockDialogOpen(false);
    } catch (error) {
      console.error(`Error ${lockAction}ing session:`, error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${lockAction} session`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we somehow have no user after loading, rely on middleware redirect,
  // but avoid flashing a broken page.
  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLoading) {
    if (unauthorized) {
      return (
        <div className="flex h-screen items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Not authorized
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You are not a member of the organization that owns this
                recruitment round, so you can&apos;t access its delibs session.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Toaster />

      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Delibs: {roundName}</h1>
              <p className="text-sm text-muted-foreground">
                Deliberation voting for final round applicants
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Session status */}
            <Badge
              variant={
                session?.status === "locked" ? "destructive" : "secondary"
              }
              className="flex items-center gap-1"
            >
              {session?.status === "locked" ? (
                <>
                  <Lock className="h-3 w-3" />
                  Locked
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3" />
                  Open
                </>
              )}
            </Badge>

            {/* Lock/Unlock button for Owner/Admin */}
            {isOwnerOrAdmin && session && (
              <Button
                variant={
                  session.status === "locked" ? "outline" : "destructive"
                }
                size="sm"
                onClick={() => {
                  setLockAction(
                    session.status === "locked" ? "unlock" : "lock",
                  );
                  setLockDialogOpen(true);
                }}
              >
                {session.status === "locked" ? (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock Voting
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Lock Voting
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {isOwnerOrAdmin ? (
          <Tabs defaultValue="vote" className="h-full flex flex-col">
            <div className="border-b px-6">
              <TabsList>
                <TabsTrigger value="vote">Vote</TabsTrigger>
                <TabsTrigger value="results">Results & Rankings</TabsTrigger>
                <TabsTrigger value="demographics">Demographics</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="vote" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-3">
                  {session?.status === "locked" && (
                    <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 mb-4">
                      <AlertCircle className="h-5 w-5" />
                      <span>
                        Voting is locked. Members cannot change their votes.
                      </span>
                    </div>
                  )}
                  {applicants.map((applicant) => (
                    <ApplicantVoteCard
                      key={applicant.applicant_round_id}
                      applicant={applicant}
                      sessionStatus={session?.status ?? "locked"}
                      onVote={handleVote}
                      isSubmitting={isSubmitting}
                      onClear={handleClearVote}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="results" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      Rankings by Average Score
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchResults}
                      disabled={isLoadingResults}
                    >
                      {isLoadingResults ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Refresh"
                      )}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {results.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          No votes have been submitted yet.
                        </CardContent>
                      </Card>
                    ) : (
                      results.map((result) => (
                        <ResultCard
                          key={result.applicant_round_id}
                          result={result}
                          totalMembers={totalMembers}
                          isOwnerOrAdmin={isOwnerOrAdmin}
                          isLastRound={isLastRound}
                          onAccept={handleAccept}
                          onReject={handleReject}
                          onMaybe={handleMaybe}
                          isProcessingDecision={isProcessingDecision}
                        />
                      ))
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="demographics"
              className="flex-1 overflow-hidden m-0"
            >
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  {/* Dropdown for selecting demographic field */}
                  <Select
                    onValueChange={(value) =>
                      setSelectedDemographicField(value)
                    }
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {demographicsColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col.charAt(0).toUpperCase() +
                            col.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isLoadingDemographics ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : selectedDemographicField &&
                    demographicsData.length > 0 ? (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>
                            Breakdown for &quot;{selectedDemographicField}&quot;
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                <th className="border p-2">Status</th>
                                <th className="border p-2">Field Value</th>
                                <th className="border p-2">Count</th>
                                <th className="border p-2">Percentage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {demographicsData.map((row, index) => (
                                <tr key={index} className="text-center">
                                  <td className="border p-2">{row.status}</td>
                                  <td className="border p-2">
                                    {row.field_value}
                                  </td>
                                  <td className="border p-2">{row.count}</td>
                                  <td className="border p-2">
                                    {Math.floor(row.percentage * 100) / 100}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>

                      {/* Chart Component using shadcn */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Visualization</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ChartContainer
                            config={{
                              accepted: { color: "#10B981" }, // Green
                              rejected: { color: "#EF4444" }, // Red
                              in_progress: { color: "#F59E0B" }, // Yellow
                            }}
                            className="w-full"
                          >
                            <ResponsiveContainer width="100%" height={400}>
                              <BarChart data={demographicsData}>
                                <XAxis
                                  dataKey="field_value"
                                  tickFormatter={(value, index) =>
                                    `${value} | ${demographicsData[index].status}`
                                  }
                                />
                                <YAxis />
                                <Tooltip content={<ChartTooltipContent />} />
                                <ChartLegend />
                                <Bar
                                  dataKey="count"
                                  name="Applicants"
                                  fill="var(--color-accepted)"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        </CardContent>
                      </Card>
                    </div>
                  ) : selectedDemographicField ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No applicants found for this demographic field.
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          // Members only see voting view
          <ScrollArea className="h-full">
            <div className="p-6 space-y-3">
              {session?.status === "locked" && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 mb-4">
                  <AlertCircle className="h-5 w-5" />
                  <span>Voting is locked. You cannot change your votes.</span>
                </div>
              )}
              {applicants.map((applicant) => (
                <ApplicantVoteCard
                  key={applicant.applicant_round_id}
                  applicant={applicant}
                  sessionStatus={session?.status || "open"}
                  onVote={handleVote}
                  isSubmitting={isSubmitting}
                  onClear={handleClearVote}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </main>

      {/* Lock/Unlock confirmation dialog */}
      <AlertDialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lockAction === "lock" ? "Lock Voting?" : "Unlock Voting?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lockAction === "lock"
                ? "Locking will prevent all members from submitting or changing their votes. You can unlock later if needed."
                : "Unlocking will allow members to submit or change their votes again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleLockToggle();
              }}
              disabled={isSubmitting}
              className={
                lockAction === "lock"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {lockAction === "lock" ? "Lock Voting" : "Unlock Voting"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
