import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2,
  Send,
  Trash2,
  Edit2,
  Pencil,
  MoreVertical,
  ExternalLink,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Link as LinkIcon,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Separator } from "./ui/separator";
import { Input } from "@/components/ui/input";
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
import { useOrganization } from "@/contexts/OrganizationContext";
import RichTextEditor from "./RichTextEditor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApplicationDialogProps {
  applicantId: string;
  applicantRoundId: string;
  userId: string | undefined;
  userAvatarUrl?: string | null;
  applicantStatus?: string;
  isOpen: boolean;
  onClose: () => void;
  fetchApplicants?: () => Promise<void>;
}

// Get gradient and ring colors based on applicant status
const getStatusColors = (status?: string) => {
  switch (status) {
    case 'accepted':
      return {
        gradient: 'from-emerald-500/10 via-emerald-500/15 to-emerald-500/10',
        ring: 'ring-emerald-500/30',
        badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      };
    case 'rejected':
      return {
        gradient: 'from-red-500/10 via-red-500/15 to-red-500/10',
        ring: 'ring-red-500/30',
        badge: 'bg-red-500/10 text-red-600 border-red-500/20',
      };
    case 'maybe':
      return {
        gradient: 'from-yellow-500/10 via-yellow-500/15 to-yellow-500/10',
        ring: 'ring-yellow-500/30',
        badge: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      };
    default: // pending, in_progress, or unknown
      return {
        gradient: 'from-muted via-muted/80 to-muted',
        ring: 'ring-border',
        badge: 'bg-muted text-muted-foreground border-border',
      };
  }
};

interface Score {
  score_id: string;
  metric_id: string;
  metric_name: string | null;
  score_value: number;
  metric_weight: number | null;
}

interface Submission {
  submission_id: string;
  created_at: string;
  user_name: string;
  user_id: string;
  avatar_url: string | null;
  scores: Score[];
  weighted_average: number;
}

interface EditingScore {
  score_id: string;
  score_value: number;
}

// Helper functions for smart field type detection
const isEmail = (value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

const isPhoneNumber = (value: string): boolean => {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(value.replace(/\s/g, ''));
};

const isLongText = (value: string): boolean => {
  return value.length > 400;
};

const getFieldType = (value: string): 'url' | 'email' | 'phone' | 'longText' | 'text' => {
  try {
    new URL(value);
    return 'url';
  } catch {}
  
  if (isEmail(value)) return 'email';
  if (isPhoneNumber(value)) return 'phone';
  if (isLongText(value)) return 'longText';
  return 'text';
};

// Component for rendering expandable long text
const ExpandableText = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const previewLength = 400;
  
  if (text.length <= previewLength) {
    return <p className="text-foreground whitespace-pre-wrap">{text}</p>;
  }
  
  return (
    <div className="space-y-2">
      <p className="text-foreground whitespace-pre-wrap">
        {isExpanded ? text : `${text.slice(0, previewLength)}...`}
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-auto p-0 text-primary hover:text-primary/80"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4 mr-1" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-1" />
            Show more
          </>
        )}
      </Button>
    </div>
  );
};

// Component for rendering a single data field with smart type detection
const DataField = ({ label, value }: { label: string; value: string }) => {
  const fieldType = getFieldType(value);
  
  const getIcon = () => {
    switch (fieldType) {
      case 'url':
        return <LinkIcon className="h-4 w-4 text-muted-foreground" />;
      case 'email':
        return <Mail className="h-4 w-4 text-muted-foreground" />;
      case 'phone':
        return <Phone className="h-4 w-4 text-muted-foreground" />;
      case 'longText':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };
  
  const renderValue = () => {
    switch (fieldType) {
      case 'url':
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1 underline-offset-4 hover:underline"
          >
            <span className="truncate max-w-[200px]">{new URL(value).hostname}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        );
      case 'email':
        return (
          <a
            href={`mailto:${value}`}
            className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
          >
            {value}
          </a>
        );
      case 'phone':
        return (
          <a
            href={`tel:${value}`}
            className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
          >
            {value}
          </a>
        );
      case 'longText':
        return <ExpandableText text={value} />;
      default:
        return <p className="text-foreground">{value}</p>;
    }
  };
  
  // For long text, render in full width
  if (fieldType === 'longText') {
    return (
      <div className="col-span-full">
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-2">
              {getIcon()}
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
            {renderValue()}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <div className="flex items-center gap-2 mb-1">
        {getIcon()}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      {renderValue()}
    </div>
  );
};

export default function ApplicationDialog({
  applicantId,
  applicantRoundId,
  userId,
  userAvatarUrl,
  applicantStatus,
  isOpen,
  onClose,
  fetchApplicants,
}: ApplicationDialogProps) {
  const statusColors = getStatusColors(applicantStatus);
  const { selectedOrganization, organizations, loading, error } =
    useOrganization();
  const [applicantData, setApplicantData] = useState<{
    name: string;
    headshot_url: string;
    data: Record<string, string>;
    column_order: string[] | null;
  } | null>(null);
  const [comments, setComments] = useState<
    {
      id: string;
      user_id: string;
      comment_text: string;
      user_name: string | null;
      avatar_url: string | null;
      created_at: string;
      round_name: string;
      anonymous: boolean;
      updated_at?: string;
      source: string;
    }[]
  >([]);
  const [newComment, setNewComment] = useState<string>(""); // New comment input
  const [isAddingComment, setIsAddingComment] = useState(false); // Loading state for adding a comment
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedScores, setFetchedScores] = useState<Submission[]>([]); // State to hold fetched scores
  const [scoringMetrics, setScoringMetrics] = useState<any[]>([]); // State for metrics
  const [scores, setScores] = useState<{
    [metricId: string]: { score_value: number; weight: number };
  }>({}); // State for scores
  const [scoreSubmitted, setScoreSubmitted] = useState<boolean>(false); // State for score submission status
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>("");
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [editingScore, setEditingScore] = useState<EditingScore | null>(null);
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<string | null>(null);
  const [showDeleteApplicantDialog, setShowDeleteApplicantDialog] =
    useState(false);
  const [isDeletingApplicant, setIsDeletingApplicant] = useState(false);

  // Check if user is Owner or Admin (not just Member)
  const isOwnerOrAdmin = selectedOrganization && (
    selectedOrganization.role === "Owner" ||
    selectedOrganization.role === "Admin"
  );

  useEffect(() => {
    const fetchApplicantDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/applicant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            applicant_id: applicantId,
            applicant_round_id: applicantRoundId 
          }),
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


    const fetchComments = async () => {
      try {
        const response = await fetch("/api/comments/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicant_id: applicantId,
            organization_id: selectedOrganization?.id,
          }),
        });
        const data = await response.json();
        setComments(data || []);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    const fetchScores = async () => {
      if (!applicantId || !applicantRoundId) return;

      try {
        const response = await fetch("/api/scores/get", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId || "",
          },
          body: JSON.stringify({
            applicant_round_id: applicantRoundId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch scores");
        }

        const data = await response.json();
        setFetchedScores(data);
      } catch (error) {
        console.error("Error fetching scores:", error);
        toast.error("Failed to fetch scores");
      }
    };

    if (isOpen) {
      fetchApplicantDetails();
      fetchComments();
      fetchScores();
    }
  }, [isOpen, applicantId, applicantRoundId, userId, selectedOrganization?.id]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!applicantRoundId) return;

      try {
        const response = await fetch("/api/metrics/index2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicant_round_id: applicantRoundId }),
        });

        if (response.ok) {
          const metrics = await response.json();
          setScoringMetrics(metrics); // Assuming the API returns an array of metrics
        } else {
          console.error("Failed to fetch metrics");
        }
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };

    if (isOpen && fetchedScores.length === 0) {
      fetchMetrics();
    }
  }, [isOpen, fetchedScores.length, applicantRoundId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsAddingComment(true);
    try {
      // Source types:
      // "R" - Regular comment from application dialog
      // "A" - Anonymous comment from public form
      // "F" - Feedback comment from candidate feedback form
      const response = await fetch("/api/comments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_round_id: applicantRoundId,
          user_id: userId,
          comment_text: newComment.trim(),
          source: "R", // Regular comment from application dialog
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      const { comment } = await response.json();
      const newCommentObj = {
        id: comment.id,
        user_id: userId || "",
        comment_text: comment.comment_text,
        user_name: "You",
        avatar_url: userAvatarUrl || null,
        created_at: comment.created_at,
        round_name: "Current Round",
        anonymous: false,
        source: "R", // Regular application source
      };
      setComments((prev) => [...prev, newCommentObj]);
      setNewComment(""); // Clear input after adding
      toast.success("Comment added successfully!");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsAddingComment(false);
    }
  };

  const closeDialog = () => {
    onClose();
  };

  const submitScores = async () => {
    if (!applicantId) return;

    try {
      const response = await fetch(`/api/scores/create2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_round_id: applicantRoundId,
          user_id: userId,
          scores: Object.entries(scores).map(
            ([metricId, { score_value, weight }]) => ({
              metric_id: metricId,
              score_value,
              weight,
            })
          ),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit scores");
      }

      const { scores: newScores, submission_weighted_average } =
        await response.json();

      // Create a new submission object with the correct structure
      const newSubmission = {
        submission_id: newScores[0]?.submission_id || new Date().toISOString(),
        created_at: new Date().toISOString(),
        user_name: "You",
        user_id: userId || "",
        avatar_url: userAvatarUrl || null,
        scores: newScores.map((score: any) => ({
          score_id: score.id,
          score_value: score.score_value,
          metric_id: score.metric_id,
          metric_name: scoringMetrics.find((m) => m.id === score.metric_id)
            ?.name,
          metric_weight: scoringMetrics.find((m) => m.id === score.metric_id)
            ?.weight,
        })),
        weighted_average: submission_weighted_average,
      };

      // Update the fetchedScores state with the new submission
      setFetchedScores((prevScores) => [newSubmission, ...prevScores]);
      setScoreSubmitted(true);
      setScores({}); // Clear the scores after successful submission
      toast.success("Scores submitted successfully!");
    } catch (error) {
      console.error("Error submitting scores:", error);
      toast.error("Failed to submit scores.");
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete || !userId || !selectedOrganization?.id) return;

    setIsDeletingComment(true);
    try {
      const response = await fetch("/api/comments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: commentToDelete,
          user_id: userId,
          organization_id: selectedOrganization.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete comment");
      }

      // Remove the comment from the local state
      setComments((prev) =>
        prev.filter((comment) => comment.id !== commentToDelete)
      );
      toast.success("Comment deleted successfully");
      setCommentToDelete(null);
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete comment"
      );
    } finally {
      setIsDeletingComment(false);
    }
  };

  const handleEditComment = async () => {
    if (!editingCommentId || !editingCommentText.trim() || !userId) return;

    setIsEditingComment(true);
    try {
      const response = await fetch("/api/comments/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: editingCommentId,
          user_id: userId,
          comment_text: editingCommentText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update comment");
      }

      const { comment } = await response.json();
      setComments((prev) =>
        prev.map((c) =>
          c.id === editingCommentId
            ? {
                ...c,
                comment_text: comment.comment_text,
                updated_at: comment.updated_at,
              }
            : c
        )
      );
      toast.success("Comment updated successfully!");
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    } finally {
      setIsEditingComment(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!userId) return;

    setDeletingSubmissionId(submissionId);
    try {
      const response = await fetch("/api/scores/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete submission");
      }

      // Remove the deleted submission from the state
      setFetchedScores((prevScores) =>
        prevScores.filter((score) => score.submission_id !== submissionId)
      );
      toast.success("Submission deleted successfully!");
    } catch (error) {
      console.error("Error deleting submission:", error);
      toast.error("Failed to delete submission");
    } finally {
      setDeletingSubmissionId(null);
    }
  };

  const handleUpdateScore = async (scoreId: string, newValue: number) => {
    if (!userId) return;

    try {
      const response = await fetch("/api/scores/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score_id: scoreId,
          score_value: newValue,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update score");
      }

      const { weighted_average } = await response.json();

      // Update the score in the state
      setFetchedScores((prevScores) =>
        prevScores.map((submission) => {
          if (submission.scores.some((score) => score.score_id === scoreId)) {
            return {
              ...submission,
              scores: submission.scores.map((score) =>
                score.score_id === scoreId
                  ? { ...score, score_value: newValue }
                  : score
              ),
              weighted_average,
            };
          }
          return submission;
        })
      );

      setEditingScore(null);
      toast.success("Score updated successfully!");
    } catch (error) {
      console.error("Error updating score:", error);
      toast.error("Failed to update score");
    }
  };

  const handleDeleteApplicant = async () => {
    if (!applicantId) return;

    setIsDeletingApplicant(true);
    try {
      const response = await fetch("/api/applicant/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: applicantId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete applicant");
      }

      toast.success("Applicant deleted successfully");
      onClose(); // Close the dialog after successful deletion
      // Refresh the applicants list if callback is provided
      if (fetchApplicants) {
        await fetchApplicants();
      }
    } catch (error) {
      console.error("Error deleting applicant:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete applicant"
      );
    } finally {
      setIsDeletingApplicant(false);
      setShowDeleteApplicantDialog(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent className="max-w-5xl mx-auto p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">
          {applicantData ? `Application details for ${applicantData.name}` : "Application details"}
        </DialogTitle>
        {isLoading ? (
          <div className="flex items-center justify-center h-[80vh]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading applicant details...</p>
            </div>
          </div>
        ) : (
          applicantData && (
            <div className="flex flex-col bg-card h-[85vh]">
              {/* Enhanced Header with Avatar */}
              <div className={`bg-gradient-to-r ${statusColors.gradient} border-b border-border`}>
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar in Header */}
                      <div className={`relative w-16 h-16 rounded-full overflow-hidden ring-2 ${statusColors.ring} ring-offset-2 ring-offset-background shadow-lg`}>
                        <Image
                          src={
                            applicantData.headshot_url ||
                            "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                          }
                          alt={`${applicantData.name}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-col">
                        <h2 className="text-2xl font-bold text-card-foreground">
                          {applicantData.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          {fetchedScores.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <BarChart3 className="h-3 w-3 mr-1" />
                              {fetchedScores.length} {fetchedScores.length === 1 ? 'Review' : 'Reviews'}
                            </Badge>
                          )}
                          {comments.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Add right margin to account for the dialog close button */}
                    <div className="flex items-center gap-2 mr-8">
                      {isOwnerOrAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setShowDeleteApplicantDialog(true)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Applicant
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabbed Content */}
              <Tabs defaultValue="application" className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-border px-6">
                  <TabsList className="h-12 bg-transparent p-0 w-full justify-start gap-4">
                    <TabsTrigger 
                      value="application" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-3"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Application
                    </TabsTrigger>
                    <TabsTrigger 
                      value="scores" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-3"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Scores
                      {fetchedScores.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          {fetchedScores.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="comments" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-3 pt-3"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Comments
                      {comments.length > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          {comments.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Application Tab */}
                <TabsContent value="application" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-6">
                      {/* Large Headshot */}
                      <div className="flex justify-center mb-8">
                        <div className="relative w-48 h-48 rounded-xl overflow-hidden shadow-lg ring-1 ring-border">
                          <Image
                            src={
                              applicantData.headshot_url ||
                              "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                            }
                            alt={`Headshot of ${applicantData.name}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>

                      {/* Dynamic Data Fields in Modern Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(() => {
                          const data = applicantData.data || {};
                          const columnOrder = applicantData.column_order;
                          
                          // If we have a stored column order, use it
                          if (columnOrder && Array.isArray(columnOrder)) {
                            const orderedEntries: [string, string][] = [];
                            const dataKeys = new Set(Object.keys(data));
                            
                            // Add entries in the stored order
                            for (const key of columnOrder) {
                              if (dataKeys.has(key)) {
                                orderedEntries.push([key, data[key]]);
                                dataKeys.delete(key);
                              }
                            }
                            
                            // Add any remaining entries that weren't in the stored order
                            for (const key of dataKeys) {
                              orderedEntries.push([key, data[key]]);
                            }
                            
                            return orderedEntries.map(([key, value]) => (
                              <DataField key={key} label={key} value={value} />
                            ));
                          }
                          
                          // Fallback to default Object.entries order
                          return Object.entries(data).map(([key, value]) => (
                            <DataField key={key} label={key} value={value} />
                          ));
                        })()}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Scores Tab */}
                <TabsContent value="scores" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">

                      {/* Overall Score Card */}
                      {fetchedScores.length > 0 && (
                        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                  Overall Weighted Average
                                </p>
                                <p className="text-4xl font-bold text-primary">
                                  {(
                                    fetchedScores.reduce(
                                      (acc, submission) =>
                                        acc + submission.weighted_average,
                                      0
                                    ) / fetchedScores.length
                                  ).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  Based on {fetchedScores.length} {fetchedScores.length === 1 ? 'review' : 'reviews'}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Individual Submissions */}
                      {fetchedScores.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-card-foreground">
                            Review History
                          </h3>
                          {fetchedScores.map((submission, index) => (
                            <Card key={submission.submission_id} className="overflow-hidden">
                              <CardHeader className="bg-muted/30 py-3 px-4">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-3">
                                    {submission.avatar_url ? (
                                      <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-border">
                                        <Image
                                          src={submission.avatar_url}
                                          alt={submission.user_name || "Reviewer"}
                                          width={32}
                                          height={32}
                                          className="object-cover w-full h-full"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-4 w-4 text-primary" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-medium text-card-foreground">
                                        {submission.user_name || 'Anonymous'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(submission.created_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="font-semibold">
                                      Avg: {submission.weighted_average?.toFixed(2) ?? 'N/A'}
                                    </Badge>
                                    {submission.user_id === userId && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteSubmission(submission.submission_id)}
                                        disabled={deletingSubmissionId === submission.submission_id}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                      >
                                        {deletingSubmissionId === submission.submission_id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {submission.scores?.map((score: Score) => (
                                    <div
                                      key={score.metric_id}
                                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                    >
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-card-foreground">
                                          {score.metric_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Weight: {score.metric_weight}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {editingScore?.score_id === score.score_id ? (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              type="number"
                                              value={editingScore.score_value}
                                              onChange={(e) =>
                                                setEditingScore({
                                                  ...editingScore,
                                                  score_value: Number(parseFloat(e.target.value) || 0),
                                                })
                                              }
                                              min={0}
                                              max={100}
                                              className="w-16 h-8"
                                            />
                                            <Button
                                              size="sm"
                                              className="h-8"
                                              onClick={() => handleUpdateScore(score.score_id, editingScore.score_value)}
                                            >
                                              Save
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8"
                                              onClick={() => setEditingScore(null)}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        ) : (
                                          <>
                                            <span className="text-lg font-bold text-primary">
                                              {score.score_value}
                                            </span>
                                            {submission.user_id === userId && !editingScore && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() =>
                                                  setEditingScore({
                                                    score_id: score.score_id,
                                                    score_value: score.score_value,
                                                  })
                                                }
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Score Submission Form */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Submit New Scores</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {scoringMetrics.map((metric) => (
                                <div key={metric.id} className="space-y-2">
                                  <label className="text-sm font-medium text-card-foreground flex items-center justify-between">
                                    <span>{metric.name}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      Weight: {metric.weight}
                                    </Badge>
                                  </label>
                                  <Input
                                    type="number"
                                    value={scores[metric.id]?.score_value || ""}
                                    onChange={(e) =>
                                      setScores((prev) => ({
                                        ...prev,
                                        [metric.id]: {
                                          score_value: Number(parseFloat(e.target.value) || 0),
                                          weight: metric.weight,
                                        },
                                      }))
                                    }
                                    min={0}
                                    max={100}
                                    placeholder="0-100"
                                    className="w-full"
                                  />
                                </div>
                              ))}
                            </div>
                            <Button
                              type="button"
                              onClick={submitScores}
                              disabled={Object.keys(scores).length === 0}
                              className="w-full"
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Submit Scores
                            </Button>
                          </form>
                        </CardContent>
                      </Card>

                      {/* Empty state */}
                      {fetchedScores.length === 0 && scoringMetrics.length === 0 && (
                        <Card className="border-dashed">
                          <CardContent className="flex flex-col items-center justify-center py-12">
                            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground text-center">
                              No scoring metrics configured for this round.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      {/* Comments List */}
                      <div className="space-y-4">
                        {comments.length > 0 ? (
                          comments.map((comment, index) => (
                            <Card key={comment.id ?? `comment-${index}`} className="group">
                              <CardContent className="p-4">
                                {editingCommentId === comment.id ? (
                                  <div className="space-y-3">
                                    <RichTextEditor
                                      content={editingCommentText}
                                      onChange={setEditingCommentText}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setEditingCommentText("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={handleEditComment}
                                        disabled={isEditingComment}
                                      >
                                        {isEditingComment && (
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        )}
                                        Save Changes
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <div className="flex items-start gap-3">
                                      {comment.avatar_url ? (
                                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-border">
                                          <Image
                                            src={comment.avatar_url}
                                            alt={comment.user_name || "User"}
                                            width={32}
                                            height={32}
                                            className="object-cover w-full h-full"
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                          <User className="h-4 w-4 text-primary" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-card-foreground">
                                            {comment.user_name || "Anonymous"}
                                          </span>
                                          {comment.round_name && (
                                            <Badge variant="outline" className="text-xs">
                                              {comment.round_name}
                                              {comment.source === "F" && " (Feedback)"}
                                              {comment.source === "A" && " (Anonymous)"}
                                            </Badge>
                                          )}
                                        </div>
                                        <div
                                          className="text-sm text-foreground rich-text-content prose prose-sm max-w-none"
                                          dangerouslySetInnerHTML={{
                                            __html: comment.comment_text,
                                          }}
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {new Date(comment.created_at).toLocaleString()}
                                          {comment.updated_at &&
                                            new Date(comment.updated_at) > new Date(comment.created_at) && (
                                              <span className="ml-1">(edited)</span>
                                            )}
                                        </p>
                                      </div>
                                    </div>
                                    {(comment.user_id === userId || isOwnerOrAdmin) && (
                                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        {comment.user_id === userId && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => {
                                              setEditingCommentId(comment.id);
                                              setEditingCommentText(comment.comment_text);
                                            }}
                                          >
                                            <Edit2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                          onClick={() => setCommentToDelete(comment.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                              <p className="text-muted-foreground text-center">
                                No comments yet. Be the first to add one!
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Add Comment Form */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Add a Comment</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <RichTextEditor
                            content={newComment}
                            onChange={setNewComment}
                            placeholder="Write your comment here..."
                          />
                          <Button
                            onClick={handleAddComment}
                            disabled={isAddingComment || !newComment.trim()}
                            className="w-full"
                          >
                            {isAddingComment && (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            )}
                            <Send className="h-4 w-4 mr-2" />
                            Post Comment
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )
        )}

        {/* Delete Comment Confirmation Dialog */}
        <AlertDialog
          open={!!commentToDelete}
          onOpenChange={() => setCommentToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Comment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this comment? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteComment}
                disabled={isDeletingComment}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeletingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Applicant Confirmation Dialog */}
        <AlertDialog
          open={showDeleteApplicantDialog}
          onOpenChange={setShowDeleteApplicantDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Applicant</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span>
                  Are you sure you want to delete{" "}
                  <strong>{applicantData?.name || "this applicant"}</strong>?
                </span>
                <span className="block">This will permanently delete:</span>
                <ul className="list-disc list-inside text-sm">
                  <li>All application data</li>
                  <li>All scores and submissions</li>
                  <li>All comments</li>
                  <li>All round assignments</li>
                </ul>
                <span className="block font-semibold text-destructive">
                  This action cannot be undone.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteApplicant}
                disabled={isDeletingApplicant}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeletingApplicant ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Applicant
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
