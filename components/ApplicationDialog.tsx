import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Send } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Separator } from "./ui/separator";
import { Input } from "@/components/ui/input";

export default function ApplicationDialog({
  applicantId,
  applicantRoundId,
  userId,
  isOpen,
  onClose,
}: {
  applicantId: string;
  applicantRoundId: string;
  userId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [applicantData, setApplicantData] = useState<{
    name: string;
    headshot_url: string;
    data: Record<string, string>;
  } | null>(null);
  const [comments, setComments] = useState<
    {
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
      fetchScores();
    }
  }, [isOpen, applicantId, applicantRoundId]);

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
      setComments((prev) => [
        ...prev,
        {
          comment_text: comment.comment_text,
          user_name: "You",
          created_at: comment.created_at,
          round_name: "Current Round",
          anonymous: false,
        },
      ]);
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
                <div className="bg-white shadow-md rounded-lg p-4 mt-4">
                  <h2 className="text-lg font-semibold mb-2">Scores</h2>
                  {fetchedScores.length > 0 ? (
                    fetchedScores.map((score) => (
                      <div key={score.metric_id} className="border-b py-2">
                        <p className="font-medium">{score.metric_name}</p>
                        <p>Score: {score.score_value}</p>
                        <p>Weight: {score.weight}</p>
                      </div>
                    ))
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
                        className="p-2 bg-gray-100 rounded-lg mb-2"
                      >
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
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </p>
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
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
