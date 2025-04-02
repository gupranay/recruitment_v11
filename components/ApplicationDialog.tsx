import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Send, Trash2, Edit2 } from "lucide-react";
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

interface ApplicationDialogProps {
  applicantId: string;
  applicantRoundId: string;
  userId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export default function ApplicationDialog({
  applicantId,
  applicantRoundId,
  userId,
  isOpen,
  onClose,
}: ApplicationDialogProps) {
  const { selectedOrganization } = useOrganization();
  const [applicantData, setApplicantData] = useState<{
    name: string;
    headshot_url: string;
    data: Record<string, string>;
  } | null>(null);
  const [comments, setComments] = useState<
    {
      id: string;
      user_id: string;
      comment_text: string;
      user_name: string | null;
      created_at: string;
      round_name: string;
      anonymous: boolean;
    }[]
  >([]);
  const [newComment, setNewComment] = useState<string>(""); // New comment input
  const [isAddingComment, setIsAddingComment] = useState(false); // Loading state for adding a comment
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedScores, setFetchedScores] = useState<any[]>([]); // State to hold fetched scores
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
  const [isOrgOwner, setIsOrgOwner] = useState(false);

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

    const fetchComments = async () => {
      try {
        const response = await fetch("/api/comments/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ applicant_id: applicantId }),
        });
        const data = await response.json();
        setComments(data || []);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };

    const checkOrgOwner = async () => {
      if (!userId || !selectedOrganization?.id) return;

      try {
        const response = await fetch("/api/organizations/check-owner", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            organization_id: selectedOrganization.id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to check organization owner status");
        }

        const { isOwner } = await response.json();
        setIsOrgOwner(isOwner);
      } catch (error) {
        console.error("Error checking organization owner status:", error);
        setIsOrgOwner(false);
      }
    };

    const fetchScores = async () => {
      if (!applicantId || !applicantRoundId) return;

      try {
        const response = await fetch("/api/scores/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicant_round_id: applicantRoundId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setFetchedScores(data); // Assuming the API returns an array of scores
        } else {
          console.error("Failed to fetch scores");
        }
      } catch (error) {
        console.error("Error fetching scores:", error);
      }
    };

    if (isOpen) {
      fetchApplicantDetails();
      fetchComments();
      checkOrgOwner();
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
      const response = await fetch("/api/comments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_round_id: applicantRoundId,
          user_id: userId,
          comment_text: newComment.trim(),
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
        created_at: comment.created_at,
        round_name: "Current Round",
        anonymous: false,
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

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
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

      // Update fetchedScores with the new scores
      const newScores = Object.entries(scores).map(
        ([metricId, { score_value, weight }]) => ({
          metric_id: metricId,
          score_value,
          weight,
          metric_name: scoringMetrics.find((metric) => metric.id === metricId)
            ?.name, // Get the metric name
        })
      );

      setFetchedScores((prevScores) => [...prevScores, ...newScores]); // Append new scores to the existing scores
      setScoreSubmitted(true);
      setScores({}); // Clear the scores after successful submission
      toast.success("Scores submitted successfully!"); // Show toast notification
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
            ? { ...c, comment_text: comment.comment_text }
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

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent className="mt-5 max-w-5xl mx-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          applicantData && (
            <div className="flex flex-col bg-white rounded-lg shadow-md h-[80vh]">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-white z-10 shadow px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 truncate">
                  {applicantData.name}
                </h2>
                <button
                  onClick={closeDialog}
                  className="text-gray-500 hover:text-gray-800 transition"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-6">
                {/* Headshot Section */}
                <div className="flex justify-center mb-8">
                  <div className="w-[250px] h-[250px] relative">
                    <Image
                      src={
                        applicantData.headshot_url ||
                        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                      }
                      alt={`Headshot of ${applicantData.name}`}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-lg shadow-md"
                      placeholder="blur"
                      blurDataURL="/placeholder-image.png"
                    />
                  </div>
                </div>

                {/* Dynamic Data Fields */}
                <div className="grid grid-cols-1 gap-y-6 mb-8">
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
                <Separator className="my-6" />

                {/* Scores Section */}
                <div className="bg-white shadow-md rounded-lg p-4 mt-4 mb-8">
                  <h2 className="text-lg font-semibold mb-2">Scores</h2>
                  {fetchedScores.length > 0 ? (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">
                          Weighted Average Score
                        </h3>
                        <p className="text-2xl font-bold text-primary">
                          {(
                            fetchedScores.reduce(
                              (acc, score) =>
                                acc + score.score_value * score.metric_weight,
                              0
                            ) /
                            fetchedScores.reduce(
                              (acc, score) => acc + score.metric_weight,
                              0
                            )
                          ).toFixed(2)}
                        </p>
                      </div>
                      {fetchedScores.map((score) => (
                        <div key={score.metric_id} className="border-b py-2">
                          <p className="font-medium">{score.metric_name}</p>
                          <p>Score: {score.score_value}</p>
                          <p>Weight: {score.metric_weight}</p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <p>
                        No scores available for this applicant. Please submit
                        scores:
                      </p>
                      <form className="space-y-4">
                        {scoringMetrics.map((metric) => (
                          <div key={metric.id} className="flex flex-col">
                            <label className="text-sm font-medium">
                              {metric.name} (Weight: {metric.weight})
                            </label>
                            <Input
                              type="number"
                              value={scores[metric.id]?.score_value || ""}
                              onChange={(e) =>
                                setScores((prev) => ({
                                  ...prev,
                                  [metric.id]: {
                                    score_value: Number(e.target.value),
                                    weight: metric.weight,
                                  },
                                }))
                              }
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
                    </>
                  )}
                </div>

                {/* Comments Section */}
                <div>
                  <h4 className="text-lg font-medium mb-4">Comments</h4>
                  {comments.length > 0 ? (
                    comments.map((comment, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-100 rounded-lg mb-2 relative group"
                      >
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingCommentText}
                              onChange={(e) =>
                                setEditingCommentText(e.target.value)
                              }
                              className="w-full"
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
                              <p className="text-sm">
                                <span className="font-medium">
                                  {comment.user_name || "Anonymous"}:
                                </span>{" "}
                                {comment.comment_text}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {comment.round_name && (
                                  <span className="font-semibold">
                                    Round: {comment.round_name}
                                    {comment.anonymous ? " (Anonymous)" : ""}
                                  </span>
                                )}
                                <span className="ml-2">
                                  {new Date(
                                    comment.created_at
                                  ).toLocaleString()}
                                </span>
                              </p>
                            </div>
                            {(comment.user_id === userId || isOrgOwner) && (
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
                                {comment.user_id === userId && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingCommentText(
                                          comment.comment_text
                                        );
                                      }}
                                      className="text-blue-500 hover:text-blue-700"
                                      title="Edit comment"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setCommentToDelete(comment.id)
                                      }
                                      className="text-red-500 hover:text-red-700"
                                      title="Delete comment"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                {isOrgOwner && comment.user_id !== userId && (
                                  <button
                                    onClick={() =>
                                      setCommentToDelete(comment.id)
                                    }
                                    className="text-red-500 hover:text-red-700"
                                    title="Delete comment"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No comments yet.</p>
                  )}
                  <Textarea
                    placeholder="Add a new comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="mb-4 mt-4"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={isAddingComment}
                    className="w-full flex items-center justify-center"
                  >
                    {isAddingComment && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    <Send className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </div>

                {/* Delete Comment Confirmation Dialog */}
                <AlertDialog
                  open={!!commentToDelete}
                  onOpenChange={() => setCommentToDelete(null)}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this comment? This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteComment}
                        disabled={isDeletingComment}
                        className="bg-red-500 hover:bg-red-600"
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
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
