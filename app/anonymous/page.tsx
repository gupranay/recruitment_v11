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

interface AnonApplicant {
  id: string; // The actual UUID of the applicant
  number: number; // Sequential number for display
}

const scoringMetrics = [
  { id: "46c45cdc-72c9-4985-b86a-bb108b9cecc4", name: "Ambition: 1-4" },
  { id: "6db2526a-c410-4a62-803a-57c5bceab66c", name: "Cultural Fit: 1-4" },
  { id: "cb1c3d8e-9bf3-4455-9af6-7934fad55ac0", name: "Technical Ability: 1-4" },
  { id: "f93aa642-85ea-41bc-9a56-6fed0fc5b82c", name: "Talent Index: 1-4" },
];

function ReadingPageContent() {
  const { data: user } = useUser();
  const searchParams = useSearchParams();
  const slug = searchParams?.get("id");

  const [applicants, setApplicants] = useState<AnonApplicant[]>([]);
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
  const [scores, setScores] = useState<{ [metricId: string]: number }>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

        const { reading, applicants: fetchedApplicants } = await response.json();

        setReadingDetails(reading);
        setApplicants(
          fetchedApplicants.map((applicantId: string, index: number) => ({
            id: applicantId,
            number: index + 1,
          }))
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const fetchApplicantData = async (applicant: AnonApplicant) => {
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
      (metric) =>
        scores[metric.id] &&
        scores[metric.id] >= 1 &&
        scores[metric.id] <= 4
    );
  };

  const submitScores = async () => {
    if (!selectedApplicant) return;

    if (!validateScores()) {
      toast.error("All scores must be filled and between 1-4.");
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
          scores: Object.entries(scores).map(([metricId, scoreValue]) => ({
            metric_id: metricId,
            score_value: scoreValue,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit scores");
      }

      toast.success("Scores submitted successfully!");
      setScores({}); // Clear the scores after successful submission
    } catch (error) {
      console.error("Error submitting scores:", error);
      toast.error("Failed to submit scores.");
    }
  };

  const openDialog = (applicant: AnonApplicant) => {
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
        <p className="text-center text-muted-foreground">No applicants found.</p>
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
                <form className="space-y-4">
                  {scoringMetrics.map((metric) => (
                    <div key={metric.id} className="flex flex-col">
                      <label className="text-sm font-medium">{metric.name}</label>
                      <Input
                        type="number"
                        min={1}
                        max={4}
                        value={scores[metric.id] || ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [metric.id]: Number(e.target.value),
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
}

export default function ReadingPage() {
  return (
    <Suspense fallback={<p>Loading page...</p>}>
      <ReadingPageContent />
    </Suspense>
  );
}