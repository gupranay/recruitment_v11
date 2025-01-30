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

interface AnonApplicant {
  id: string; // The actual UUID of the applicant
  number: number; // Sequential number for display
}

const ReadingPageContent = () => {
  const { data: user } = useUser();
  const searchParams = useSearchParams();
  const slug = searchParams?.get("id");

  const [applicants, setApplicants] = useState<
    { id: string; created_at: string; number: number }[]
  >([]);
  const [readingDetails, setReadingDetails] = useState<any>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<{
    id: string;
    number: number;
    [key: string]: any;
  } | null>(null);
  const [comments, setComments] = useState<
    { comment_text: string; created_at: string }[]
  >([]);
  const [newComment, setNewComment] = useState<string>("");
  const [scores, setScores] = useState<{
    [metricId: string]: { score_value: number; weight: number };
  }>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [scoringMetrics, setScoringMetrics] = useState<any[]>([]);
  const [scoreSubmitted, setScoreSubmitted] = useState<boolean>(false);
  const [scoreMessage, setScoreMessage] = useState<string>("");
  const [fetchedScores, setFetchedScores] = useState<any[]>([]);

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

        const { reading, applicants: fetchedApplicants } =
          await response.json();

        setReadingDetails(reading);
        setApplicants(
          fetchedApplicants.map(
            (
              applicant: { applicant_id: string; created_at: string },
              index: number
            ) => ({
              id: applicant.applicant_id,
              created_at: applicant.created_at,
              number: index + 1,
            })
          )
        );
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
    const checkScore = async () => {
      if (!selectedApplicant || !readingDetails) return;

      try {
        const response = await fetch("/api/scores/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicant_id: selectedApplicant.id,
            recruitment_round_id: readingDetails.recruitment_round_id,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setScoreSubmitted(data.hasScore); // Check if a score exists
          setScoreMessage(data.message); // Set the message from the response
        } else {
          console.error("Failed to check score status");
        }
      } catch (error) {
        console.error("Error checking score status:", error);
      }
    };

    checkScore();
  }, [selectedApplicant, readingDetails]);

  const fetchApplicantData = async (applicant: {
    id: string;
    created_at: string;
    number: number;
  }) => {
    try {
      const response = await fetch(`/api/applicant/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicant_id: applicant.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch applicant data");
      }

      const { data } = await response.json();

      const filteredData = Object.keys(data)
        .filter((key) => !readingDetails.omitted_fields.includes(key))
        .reduce((obj: Record<string, any>, key) => {
          obj[key] = data[key];
          return obj;
        }, {});

      setSelectedApplicant({
        id: applicant.id,
        number: applicant.number,
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
          comment_text: newComment,
          user_id: user?.id,
          recruitment_round_id: readingDetails.recruitment_round_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      const { comment_text, created_at } = await response.json();
      setComments((prevComments) => [
        ...prevComments,
        { comment_text, created_at },
      ]);
      setNewComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  const validateScores = () => {
    return scoringMetrics.every(
      (metric) => scores[metric.id] !== undefined // Check if score exists for each metric
    );
  };

  const submitScores = async () => {
    if (!selectedApplicant) return;

    if (!validateScores()) {
      toast.error("All scores must not be empty.");
      return;
    }

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

      setScoreSubmitted(true);
      setScoreMessage("Scores submitted successfully!");
      setScores({});
    } catch (error) {
      console.error("Error submitting scores:", error);
      toast.error("Failed to submit scores.");
    }
  };

  const openDialog = (applicant: {
    id: string;
    created_at: string;
    number: number;
  }) => {
    fetchApplicantData(applicant);
  };

  const closeDialog = () => {
    setSelectedApplicant(null);
    setComments([]);
    setIsDialogOpen(false);
  };

  if (!slug) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 font-semibold">Invalid or missing slug.</p>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-center text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-right" reverseOrder={false} />
      <h1 className="text-2xl font-bold text-center">
        Anonymous Applications for {slug}
      </h1>
      <Separator className="my-4" />

      {applicants.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {applicants.map((applicant) => (
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Applicant #{selectedApplicant?.number || "N/A"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-auto">
            {selectedApplicant && (
              <>
                {Object.entries(selectedApplicant).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex flex-col bg-muted/10 p-3 rounded-lg"
                  >
                    <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {key}
                    </p>
                    <p className="text-sm text-gray-800 break-words">
                      {typeof value === "object"
                        ? JSON.stringify(value, null, 2)
                        : value || "N/A"}
                    </p>
                  </div>
                ))}
                <Separator className="my-4" />
                <h3 className="text-lg font-semibold">Comments</h3>
                <div className="space-y-2">
                  {comments.map(({ comment_text, created_at }, index) => (
                    <div key={index} className="p-2 bg-muted/10 rounded-lg">
                      <p className="text-sm">{comment_text}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment"
                  className="mt-4"
                />
                <Button onClick={postComment} className="mt-2">
                  Post Comment
                </Button>
                <Separator className="my-4" />
                <h3 className="text-lg font-semibold">Submit Scores</h3>
                {scoreSubmitted ? (
                  <p className="text-center text-green-500">{scoreMessage}</p>
                ) : (
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
                      disabled={!validateScores()}
                      className="w-full"
                    >
                      Submit Scores
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={closeDialog} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
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
