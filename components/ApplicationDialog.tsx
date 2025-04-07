import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Send, Trash2, Edit2, Pencil } from "lucide-react";
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

interface ApplicationDialogProps {
  applicantId: string;
  applicantRoundId: string;
  userId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}

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
  scores: Score[];
  weighted_average: number;
}

interface EditingScore {
  score_id: string;
  score_value: number;
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
  const [isOrgOwner, setIsOrgOwner] = useState(false);
  const [editingScore, setEditingScore] = useState<EditingScore | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);

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
        console.log("Fetched scores in ApplicationDialog:", data);
        setFetchedScores(data);
      } catch (error) {
        console.error("Error fetching scores:", error);
        toast.error("Failed to fetch scores");
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
          source: "R", // Regular application source
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

      const { scores: newScores, submission_weighted_average } =
        await response.json();

      // Create a new submission object with the correct structure
      const newSubmission = {
        submission_id: newScores[0]?.submission_id || new Date().toISOString(),
        created_at: new Date().toISOString(),
        user_name: "You",
        user_id: userId || "",
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

    setIsDeletingSubmission(true);
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
      setIsDeletingSubmission(false);
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

  // Add debug logging for scores rendering
  console.log("Current fetchedScores state:", fetchedScores);

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

                  {/* Score Submission Form - Always visible */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="text-md font-semibold text-gray-700 mb-4">
                      Submit New Scores
                    </h3>
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
                                  score_value: Number(
                                    parseFloat(e.target.value) || 0
                                  ),
                                  weight: metric.weight,
                                },
                              }))
                            }
                            min={0}
                            max={100}
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

                  {/* Existing Scores Display */}
                  {fetchedScores.length > 0 && (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">
                          Overall Weighted Average Score
                        </h3>
                        <p className="text-2xl font-bold text-primary">
                          {(
                            fetchedScores.reduce(
                              (acc, submission) =>
                                acc + submission.weighted_average,
                              0
                            ) / fetchedScores.length
                          ).toFixed(2)}
                        </p>
                      </div>
                      <div className="space-y-6">
                        {fetchedScores.map((submission, index) => (
                          <div
                            key={submission.submission_id}
                            className="border rounded-lg p-4"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium">
                                Submission {index + 1}
                              </h4>
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-gray-500">
                                  {new Date(
                                    submission.created_at
                                  ).toLocaleString()}
                                  {submission.user_name && (
                                    <span className="ml-2">
                                      by {submission.user_name}
                                    </span>
                                  )}
                                </div>
                                {submission.user_id === userId && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteSubmission(
                                        submission.submission_id
                                      )
                                    }
                                    disabled={isDeletingSubmission}
                                  >
                                    {isDeletingSubmission ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {submission.scores?.map((score: Score) => (
                                <div
                                  key={score.metric_id}
                                  className="border-b py-2"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium">
                                        {score.metric_name}
                                      </p>
                                      {editingScore?.score_id ===
                                      score.score_id ? (
                                        <div className="flex items-center gap-2 mt-1">
                                          <Input
                                            type="number"
                                            value={editingScore.score_value}
                                            onChange={(e) =>
                                              setEditingScore({
                                                ...editingScore,
                                                score_value: Number(
                                                  parseFloat(e.target.value) ||
                                                    0
                                                ),
                                              })
                                            }
                                            min={0}
                                            max={100}
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
                                            onClick={() =>
                                              setEditingScore(null)
                                            }
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      ) : (
                                        <p>Score: {score.score_value}</p>
                                      )}
                                    </div>
                                    {submission.user_id === userId &&
                                      !editingScore && (
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
                                  <p>Weight: {score.metric_weight}</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-sm text-gray-600">
                                Submission Weighted Average:{" "}
                                <span className="font-semibold">
                                  {submission.weighted_average?.toFixed(2) ??
                                    "N/A"}
                                </span>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Comments Section */}
                <div className="bg-white shadow-md rounded-lg p-4 mt-4">
                  <h2 className="text-lg font-semibold mb-4">Comments</h2>
                  <div className="space-y-4 mb-6">
                    {comments.length > 0 ? (
                      comments.map((comment, index) => (
                        <div
                          key={index}
                          className="p-4 bg-gray-50 rounded-lg relative group"
                        >
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
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
                                <p className="text-sm">
                                  <span className="font-medium">
                                    {comment.user_name || "Anonymous"}:
                                  </span>{" "}
                                  <span
                                    dangerouslySetInnerHTML={{
                                      __html: comment.comment_text,
                                    }}
                                  />
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {comment.round_name && (
                                    <span className="font-semibold">
                                      Round: {comment.round_name}
                                      {comment.source === "F"
                                        ? " (Feedback Form)"
                                        : comment.source === "A"
                                        ? " (Anonymous)"
                                        : ""}
                                    </span>
                                  )}
                                  <span className="ml-2">
                                    {new Date(
                                      comment.created_at
                                    ).toLocaleString()}
                                    {comment.updated_at &&
                                      new Date(comment.updated_at) >
                                        new Date(comment.created_at) && (
                                        <span className="ml-1 text-gray-400">
                                          (edited)
                                        </span>
                                      )}
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
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">
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
