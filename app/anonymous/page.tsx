"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import toast, { Toaster } from "react-hot-toast";
import useUser from "../hook/useUser";
import { create } from "domain";
import { Loader2, Pencil, Trash2, ExternalLink } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import LoadingModal from "@/components/LoadingModal2";

interface AnonApplicant {
  id: string; // The actual UUID of the applicant
  number: number; // Sequential number for display
}

// Utility function to detect URLs and format them as hyperlinks
const isUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Utility function to format field values with hyperlinks
const formatFieldValue = (key: string, value: any): React.ReactNode => {
  if (typeof value === "object") {
    return (
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (!value || value === "N/A") {
    return "N/A";
  }

  const stringValue = String(value);

  // Check if the value is a URL
  if (isUrl(stringValue)) {
    return (
      <a
        href={stringValue}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline transition-colors"
      >
        View {key}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  return <span className="break-words">{stringValue}</span>;
};

const ReadingPageContent = () => {
  const { data: user } = useUser();
  const searchParams = useSearchParams();
  const slug = searchParams?.get("id");

  const [applicants, setApplicants] = useState<
    {
      id: string;
      created_at: string;
      number: number;
      applicant_round_id: string;
    }[]
  >([]);
  const [readingDetails, setReadingDetails] = useState<any>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<{
    id: string;
    number: number;
    applicant_round_id: string;
    [key: string]: any;
  } | null>(null);
  const [comments, setComments] = useState<
    {
      id: string;
      user_id: string;
      comment_text: string;
      created_at: string;
      user_name?: string;
      updated_at?: string;
    }[]
  >([]);
  const [newComment, setNewComment] = useState<string>("");
  const [scores, setScores] = useState<{
    [metricId: string]: { score_value: number; weight: number };
  }>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scoringMetrics, setScoringMetrics] = useState<any[]>([]);
  const [fetchedScores, setFetchedScores] = useState<any[]>([]);
  const [editingScore, setEditingScore] = useState<{
    score_id: string;
    score_value: number;
  } | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [cycleName, setCycleName] = useState<string>("");
  const [roundName, setRoundName] = useState<string>("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>("");
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/anonymous/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }

        const apiResponse = await response.json();
        const {
          reading,
          applicants: fetchedApplicants,
          organization_name,
          recruitment_cycle_name,
          recruitment_round_name,
        } = apiResponse;

        setReadingDetails(reading);
        setApplicants(
          fetchedApplicants.map(
            (
              applicant: {
                applicant_id: string;
                created_at: string;
                applicant_round_id: string;
              },
              index: number
            ) => ({
              id: applicant.applicant_id,
              created_at: applicant.created_at,
              number: index + 1,
              applicant_round_id: applicant.applicant_round_id,
            })
          )
        );
        setOrganizationName(organization_name || "");
        setCycleName(recruitment_cycle_name || "");
        setRoundName(recruitment_round_name || "");
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!slug) return;

      try {
        const response = await fetch("/api/metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recruitment_round_id: readingDetails?.recruitment_round_id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch metrics");
        }

        const metrics = await response.json();
        const updatedMetrics = metrics.map(
          (metric: { id: any; name: any; weight: any }) => ({
            id: metric.id,
            name: metric.name,
            weight: metric.weight,
          })
        );
        setScoringMetrics(updatedMetrics);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      }
    };

    fetchMetrics();
  }, [slug, readingDetails]);

  useEffect(() => {
    const fetchUserScores = async () => {
      if (!selectedApplicant || !readingDetails || !user?.id) return;
      if (!selectedApplicant.applicant_round_id) return;
      try {
        const response = await fetch("/api/scores/get", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
          },
          body: JSON.stringify({
            applicant_round_id: selectedApplicant.applicant_round_id,
            user_id: user.id,
          }),
        });
        if (response.ok) {
          const scoresData = await response.json();
          setFetchedScores(scoresData);
        }
      } catch (error) {
        console.error("Error fetching user scores:", error);
      }
    };
    fetchUserScores();
  }, [selectedApplicant, readingDetails, user]);

  const fetchApplicantData = async (applicant: {
    id: string;
    created_at: string;
    number: number;
    applicant_round_id: string;
  }) => {
    try {
      setFetchedScores([]); // Always clear scores when opening a new dialog
      const response = await fetch(`/api/applicant/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          applicant_id: applicant.id,
          applicant_round_id: applicant.applicant_round_id
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch applicant data");
      }

      const { data, column_order } = await response.json();

      // Build filtered data respecting the column order
      let orderedKeys: string[];
      const omittedFields = readingDetails?.omitted_fields ?? [];
      if (column_order && Array.isArray(column_order)) {
        // Use stored order, filtering out omitted fields
        const dataKeys = new Set(Object.keys(data));
        orderedKeys = [];
        
        for (const key of column_order) {
          if (dataKeys.has(key) && !omittedFields.includes(key)) {
            orderedKeys.push(key);
            dataKeys.delete(key);
          }
        }
        
        // Add any remaining keys not in the stored order
        for (const key of dataKeys) {
          if (!omittedFields.includes(key)) {
            orderedKeys.push(key);
          }
        }
      } else {
        // Fallback to default order, filtering out omitted fields
        orderedKeys = Object.keys(data).filter(
          (key) => !omittedFields.includes(key)
        );
      }

      const filteredData = orderedKeys.reduce((obj: Record<string, any>, key) => {
        obj[key] = data[key];
        return obj;
      }, {});

      setSelectedApplicant({
        id: applicant.id,
        number: applicant.number,
        applicant_round_id: applicant.applicant_round_id,
        ...filteredData,
      });

      const commentsResponse = await fetch("/api/anonymous/get-user-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: applicant.id,
          recruitment_round_id: readingDetails.recruitment_round_id,
          user_id: user?.id,
        }),
      });

      if (commentsResponse.ok) {
        const { comments: fetchedComments } = await commentsResponse.json();
        setComments(fetchedComments || []);
      } else {
        console.error("Error fetching comments");
        setComments([]);
      }

      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching applicant data:", error);
    }
  };

  const postComment = async () => {
    if (!selectedApplicant || !newComment.trim()) return;

    try {
      const response = await fetch(`/api/anonymous/post-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: selectedApplicant.id,
          comment_text: newComment, // HTML
          user_id: user?.id,
          recruitment_round_id: readingDetails.recruitment_round_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      const { comment } = await response.json();
      setComments((prevComments) => [
        ...prevComments,
        {
          ...comment,
          user_name: user?.full_name || user?.email || "You",
        },
      ]);
      setNewComment("");
      toast.success("Comment added successfully!");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const validateScores = () => {
    return scoringMetrics.every(
      (metric) => scores[metric.id] !== undefined // Check if score exists for each metric
    );
  };

  const submitScores = async () => {
    if (!selectedApplicant) return;
    if (!selectedApplicant.applicant_round_id) return;

    if (!validateScores()) {
      toast.error("All scores must not be empty.");
      return;
    }

    // Build the optimistic (pending) submission
    const optimisticSubmission = {
      submission_id: `pending-${Date.now()}`,
      created_at: new Date().toISOString(),
      user_name: "You",
      user_id: user?.id,
      scores: Object.entries(scores).map(
        ([metricId, { score_value, weight }]) => ({
          score_id: `pending-${metricId}`,
          score_value,
          metric_id: metricId,
          metric_name: scoringMetrics.find((m) => m.id === metricId)?.name,
          metric_weight: weight,
        })
      ),
      weighted_average:
        Object.entries(scores).reduce(
          (acc, [_, { score_value, weight }]) => acc + score_value * weight,
          0
        ) /
        Object.entries(scores).reduce(
          (acc, [_, { weight }]) => acc + weight,
          0
        ),
      pending: true,
    };
    setFetchedScores((prev) => [optimisticSubmission, ...prev]);

    try {
      const response = await fetch(`/api/scores/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: selectedApplicant.id,
          recruitment_round_id: readingDetails.recruitment_round_id,
          user_id: user?.id,
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

      setScores({});
      toast.success("Scores submitted successfully!");
      // Refresh scores after submission and remove the pending card
      if (selectedApplicant.applicant_round_id && user?.id) {
        try {
          const scoresResponse = await fetch("/api/scores/get", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": user.id,
            },
            body: JSON.stringify({
              applicant_round_id: selectedApplicant.applicant_round_id,
              user_id: user.id,
            }),
          });
          if (scoresResponse.ok) {
            const scoresData = await scoresResponse.json();
            setFetchedScores(scoresData);
          }
        } catch (error) {
          console.error("Error fetching user scores after submit:", error);
        }
      } else {
        // Remove the pending card if we can't refresh
        setFetchedScores((prev) => prev.filter((s) => !s.pending));
      }
    } catch (error) {
      // Remove the pending card on error
      setFetchedScores((prev) => prev.filter((s) => !s.pending));
      console.error("Error submitting scores:", error);
      toast.error("Failed to submit scores.");
    }
  };

  const openDialog = (applicant: {
    id: string;
    created_at: string;
    number: number;
    applicant_round_id: string;
  }) => {
    setIsDialogOpen(true);
    setSelectedApplicant(null);
    fetchApplicantData(applicant);
  };

  const closeDialog = () => {
    setSelectedApplicant(null);
    setComments([]);
    setIsDialogOpen(false);
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!user?.id) return;
    setIsDeletingSubmission(true);
    try {
      const response = await fetch("/api/scores/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          user_id: user.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to delete submission");
      setFetchedScores((prevScores) =>
        prevScores.filter((score) => score.submission_id !== submissionId)
      );
      toast.success("Submission deleted successfully!");
    } catch (error) {
      console.error("Error deleting submission:", error);
      toast.error("Failed to delete submission");
    } finally {
      setIsDeletingSubmission(false);
    }
  };

  const handleUpdateScore = async (scoreId: string, newValue: number) => {
    if (!user?.id) return;
    try {
      const response = await fetch("/api/scores/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score_id: scoreId,
          score_value: newValue,
          user_id: user.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to update score");
      const { weighted_average } = await response.json();
      setFetchedScores((prevScores) =>
        prevScores.map((submission) => {
          if (
            submission.scores.some((score: any) => score.score_id === scoreId)
          ) {
            return {
              ...submission,
              scores: submission.scores.map((score: any) =>
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

  // Add delete comment handler for anonymous comments
  const handleDeleteComment = async (comment: {
    id: string;
    user_id: string;
  }) => {
    if (!selectedApplicant || !user?.id) return;
    try {
      const response = await fetch("/api/anonymous/delete-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: comment.id,
          user_id: user.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to delete comment");
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      toast.success("Comment deleted successfully!");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  // Add update comment handler for anonymous comments
  const handleEditComment = async () => {
    if (!editingCommentId || !editingCommentText.trim() || !user?.id) return;

    setIsEditingComment(true);
    try {
      const response = await fetch("/api/comments/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: editingCommentId,
          user_id: user?.id,
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

  if (!slug) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 font-semibold">Invalid or missing slug.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <LoadingModal
        isOpen={true}
        message="Loading anonymous feedback form..."
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster />
      <h1 className="text-2xl font-bold text-center">
        Applications for {organizationName}
        {cycleName ? `: ${cycleName}` : ""}
        {roundName ? `, ${roundName}` : ""}
      </h1>
      <Separator className="my-4" />

      {applicants.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {applicants
            .slice()
            .sort((a, b) => a.number - b.number)
            .map((applicant) => (
              <button
                key={applicant.id}
                onClick={() => openDialog(applicant)}
                className="rounded-lg border border-muted bg-card shadow-sm p-4 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring transition"
              >
                <p className="text-lg font-semibold text-center">
                  Applicant #{applicant.number}
                </p>
              </button>
            ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">
          No applicants found.
        </p>
      )}

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        {/* Application loading modal */}
        <LoadingModal
          isOpen={isDialogOpen && !selectedApplicant}
          message="Loading applicant details..."
        />
        {selectedApplicant ? (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Applicant #{selectedApplicant.number || "N/A"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[70vh] overflow-auto">
              {/* Applicant details, comments, and scores sections go here (unchanged) */}
              {Object.entries(selectedApplicant).map(([key, value]) => (
                <div
                  key={key}
                  className="flex flex-col bg-muted/10 p-3 rounded-lg"
                >
                  <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    {key}
                  </p>
                  <div className="text-sm text-foreground">
                    {formatFieldValue(key, value)}
                  </div>
                </div>
              ))}
              <Separator className="my-4" />
              {/* Comments Section - refactored to match ApplicationDialog */}
              <div className="bg-card shadow-md rounded-lg p-4 mt-4">
                <h2 className="text-lg font-semibold mb-4 text-card-foreground">
                  Comments
                </h2>
                <div className="space-y-4 mb-6">
                  {comments.length > 0 ? (
                    comments.map((comment, index) => (
                      <div
                        key={index}
                        className="p-4 bg-muted rounded-lg relative group"
                      >
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2 border border-border rounded-lg p-2 bg-card">
                            <RichTextEditor
                              content={editingCommentText}
                              onChange={setEditingCommentText}
                            />
                            <div className="flex justify-end space-x-2">
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
                                {isEditingComment ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="pr-8">
                              <div className="flex items-start gap-2 mb-2">
                                <span className="font-semibold text-primary text-sm">
                                  You
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(
                                    comment.created_at
                                  ).toLocaleString()}
                                  {comment.updated_at &&
                                    new Date(comment.updated_at) >
                                      new Date(comment.created_at) && (
                                      <span className="ml-1">(edited)</span>
                                    )}
                                </span>
                              </div>
                              <div
                                className="text-sm text-card-foreground leading-relaxed rich-text-content"
                                dangerouslySetInnerHTML={{
                                  __html: comment.comment_text,
                                }}
                              />
                            </div>
                            {/* Edit and Delete buttons, top right, visible on hover */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditingCommentText(comment.comment_text);
                                }}
                                className="text-primary hover:text-primary/80"
                                title="Edit comment"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment)}
                                className="text-destructive hover:text-destructive-foreground"
                                title="Delete comment"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        No comments yet.
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <RichTextEditor
                    content={newComment}
                    onChange={setNewComment}
                    placeholder="Add a new comment..."
                  />
                  <Button
                    onClick={postComment}
                    className="w-full flex items-center justify-center"
                  >
                    Post Comment
                  </Button>
                </div>
              </div>
              <Separator className="my-4" />
              {/* Scores Section - refactored to match ApplicationDialog */}
              <div className="bg-card shadow-md rounded-lg p-4 mt-4 mb-8">
                <h2 className="text-lg font-semibold mb-2 text-card-foreground">
                  Scores
                </h2>
                {/* Existing Scores Display - now above the submission form */}
                {fetchedScores.length > 0 && (
                  <div className="space-y-6 mb-8">
                    {fetchedScores.map((submission, index) => (
                      <div
                        key={submission.submission_id}
                        className={`border rounded-lg p-4 border-border ${
                          submission.pending
                            ? "border-yellow-400 bg-yellow-100/10"
                            : ""
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-card-foreground">
                            Submission {index + 1}
                          </h4>
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-muted-foreground">
                              {new Date(submission.created_at).toLocaleString()}
                              <span className="ml-2">by You</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteSubmission(submission.submission_id)
                              }
                              disabled={isDeletingSubmission}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {submission.scores?.map((score: any) => (
                            <div
                              key={score.metric_id}
                              className="border-b py-2 border-border"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-card-foreground">
                                    {score.metric_name}
                                  </p>
                                  {editingScore &&
                                  editingScore.score_id === score.score_id ? (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Input
                                        type="number"
                                        value={editingScore.score_value}
                                        onChange={(e) =>
                                          setEditingScore({
                                            score_id: editingScore.score_id,
                                            score_value: Number(
                                              parseFloat(e.target.value) || 0
                                            ),
                                          })
                                        }
                                        min={1}
                                        max={parseInt(
                                          score.metric_name.match(
                                            /1-(\\d+)/
                                          )?.[1] || "100",
                                          10
                                        )}
                                        className="w-20"
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleUpdateScore(
                                            score.score_id,
                                            editingScore.score_value
                                          )
                                        }
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingScore(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <p className="text-foreground">
                                      Score: {score.score_value}
                                    </p>
                                  )}
                                </div>
                                {!editingScore && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setEditingScore({
                                        score_id: score.score_id,
                                        score_value: score.score_value,
                                      })
                                    }
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-muted-foreground">
                                Weight: {score.metric_weight}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Score Submission Form - now below the scores list */}
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="text-md font-semibold text-muted-foreground mb-4">
                    Submit New Scores
                  </h3>
                  <form className="space-y-4">
                    {scoringMetrics.map((metric) => (
                      <div key={metric.id} className="flex flex-col">
                        <label className="text-sm font-medium text-card-foreground mb-2">
                          {metric.name} (Weight: {metric.weight})
                        </label>
                        <Input
                          type="number"
                          value={scores[metric.id]?.score_value || ""}
                          onChange={(e) =>
                            setScores((prev) => ({
                              ...prev,
                              [metric.id]: {
                                score_value: Number(
                                  parseFloat(e.target.value) || 0
                                ),
                                weight: metric.weight,
                              },
                            }))
                          }
                          min={1}
                          max={parseInt(
                            metric.name.match(/1-(\\d+)/)?.[1] || "100",
                            10
                          )}
                          className="w-full"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      onClick={submitScores}
                      disabled={Object.keys(scores).length === 0}
                      className="w-full"
                    >
                      Submit Scores
                    </Button>
                  </form>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={closeDialog} variant="outline">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
};

export default function ReadingPage() {
  return (
    <Suspense fallback={<p>Loading page...</p>}>
      <ReadingPageContent />
    </Suspense>
  );
}
