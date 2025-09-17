"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import useUser from "../hook/useUser";
import { useSearchParams } from "next/navigation";
import RichTextEditor from "@/components/RichTextEditor";
import LoadingModal from "@/components/LoadingModal2";

interface Applicant {
  id: string;
  name: string;
  headshot_url: string;
}

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  updated_at?: string;
  source?: string;
  round_name?: string;
}

function FeedbackContent() {
  const searchParams = useSearchParams();
  const recruitmentRoundId = searchParams?.get("id");
  const { data: user } = useUser();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
    null
  );
  const [newComment, setNewComment] = useState<string>("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplicantLoading, setIsApplicantLoading] = useState(false);
  const [cycleName, setCycleName] = useState<string>("");
  const [roundName, setRoundName] = useState<string>("");
  const [search, setSearch] = useState("");

  // Fetch all applicants in the round
  useEffect(() => {
    const fetchApplicants = async () => {
      if (!recruitmentRoundId) return;

      setIsLoading(true);
      try {
        const response = await fetch("/api/input/get-applicants-in-round", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recruitment_round_id: recruitmentRoundId }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch applicants");
        }

        const data: Applicant[] = await response.json();
        setApplicants(data);

        // Fetch round and cycle names using the new API
        const infoRes = await fetch("/api/input/get-round-and-cycle-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recruitment_round_id: recruitmentRoundId }),
        });
        if (infoRes.ok) {
          const { round_name, cycle_name } = await infoRes.json();
          setRoundName(round_name || "");
          setCycleName(cycle_name || "");
        }
      } catch (error) {
        console.error("Error fetching applicants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplicants();
  }, [recruitmentRoundId]);

  const fetchComments = async (applicantId: string) => {
    if (!user?.id || !recruitmentRoundId) return;
    try {
      const response = await fetch("/api/anonymous/get-user-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: applicantId,
          recruitment_round_id: recruitmentRoundId,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const { comments: fetchedComments } = await response.json();
      setComments(fetchedComments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    }
  };

  const handleCardClick = async (applicant: Applicant) => {
    setIsApplicantLoading(true);
    setSelectedApplicant(applicant);
    await fetchComments(applicant.id);
    setIsApplicantLoading(false);
    setIsDialogOpen(true);
  };

  // Helper function to check if comment has actual content (not just empty HTML)
  const hasValidComment = (comment: string) => {
    if (!comment) return false;
    // Remove HTML tags and check if there's actual text content
    const textContent = comment.replace(/<[^>]*>/g, "").trim();
    return textContent.length > 0;
  };

  const postComment = async () => {
    console.log("postComment called", {
      selectedApplicant: !!selectedApplicant,
      newComment: newComment,
      newCommentTrimmed: newComment.trim(),
      hasValidComment: hasValidComment(newComment),
      userId: !!user?.id,
      recruitmentRoundId: !!recruitmentRoundId,
    });

    if (!selectedApplicant) {
      console.log("No applicant selected");
      toast.error("Please select an applicant.");
      return;
    }

    if (!hasValidComment(newComment)) {
      console.log("No valid comment content");
      toast.error("Please enter a comment.");
      return;
    }

    if (!user?.id) {
      console.log("No user ID");
      toast.error("Please log in to post comments.");
      return;
    }

    if (!recruitmentRoundId) {
      console.log("No recruitment round ID");
      toast.error("No recruitment round selected.");
      return;
    }

    try {
      const response = await fetch("/api/anonymous/post-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: selectedApplicant.id,
          recruitment_round_id: recruitmentRoundId,
          comment_text: newComment,
          user_id: user.id,
          source: "F", // Feedback form source
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to post comment");
      }

      const { comment } = await response.json();
      setComments((prevComments) => [
        ...prevComments,
        {
          id: comment.id,
          comment_text: comment.comment_text,
          created_at: comment.created_at,
          source: "F", // Add source to the comment object
          round_name: "Current Round",
        },
      ]);
      setNewComment("");
      toast.success("Comment posted successfully!");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error(
        `Failed to post comment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const closeDialog = () => {
    setSelectedApplicant(null);
    setComments([]);
    setIsDialogOpen(false);
  };

  // Filtered applicants based on search
  const filteredApplicants = applicants.filter((applicant) =>
    applicant.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <>
        <LoadingModal isOpen={true} message="Loading Feedback form" />
      </>
    );
  }

  if (!recruitmentRoundId) {
    return (
      <p className="text-center text-muted-foreground">
        No recruitment round selected.
      </p>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-right" />
      <LoadingModal
        isOpen={isApplicantLoading}
        message="Loading applicant details"
      />
      <h1 className="text-2xl font-bold text-center">
        Feedback form{cycleName || roundName ? " for " : ""}
        {cycleName ? `${cycleName}` : ""}
        {cycleName && roundName ? ": " : ""}
        {roundName ? `${roundName}` : ""}
      </h1>
      <Separator className="my-4" />

      {/* Search Bar */}
      <div className="flex justify-center mb-6">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicants by name..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Clear search"
            >
              &#10005;
            </button>
          )}
        </div>
      </div>

      {filteredApplicants.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredApplicants.map((applicant) => (
            <button
              key={applicant.id}
              onClick={() => handleCardClick(applicant)}
              className="rounded-lg border border-muted bg-card shadow-sm p-4 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring transition flex flex-col items-center"
            >
              {applicant.headshot_url && (
                <Image
                  src={applicant.headshot_url}
                  alt={`${applicant.name}'s headshot`}
                  width={300}
                  height={500}
                  className="w-full h-80 object-cover rounded-lg mb-4"
                />
              )}
              <p className="text-lg font-semibold text-center">
                {applicant.name}
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
        <DialogContent className="max-w-3xl max-h-[90vh] sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedApplicant?.name || "Applicant Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto overscroll-contain">
            {selectedApplicant && (
              <>
                {selectedApplicant.headshot_url && (
                  <div className="mx-auto mb-4 rounded-lg overflow-hidden w-64">
                    <Image
                      src={selectedApplicant.headshot_url}
                      alt={`${selectedApplicant.name}'s headshot`}
                      width={256}
                      height={256}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <p className="text-sm">
                  <strong>Name:</strong> {selectedApplicant.name}
                </p>
                <div className="space-y-4">
                  <h3 className="font-medium">Comments</h3>
                  <div className="space-y-2">
                    {comments.map((comment, index) => (
                      <div key={index} className="p-2 bg-muted/10 rounded-lg">
                        <div
                          className="text-sm"
                          dangerouslySetInnerHTML={{
                            __html: comment.comment_text,
                          }}
                        />
                        <span className="text-xs text-gray-500 block mt-1">
                          {new Date(comment.created_at).toLocaleString()}
                          {comment.updated_at &&
                            new Date(comment.updated_at) >
                              new Date(comment.created_at) && (
                              <span className="ml-1 text-gray-400">
                                (edited)
                              </span>
                            )}
                        </span>
                        {comment.round_name && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-semibold">
                              Round: {comment.round_name}
                              {comment.source === "F"
                                ? " (Feedback Form)"
                                : comment.source === "A"
                                ? " (Anonymous)"
                                : ""}
                            </span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <RichTextEditor
                  content={newComment}
                  onChange={setNewComment}
                  placeholder="Add a comment..."
                />
                <Button
                  onClick={postComment}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    postComment();
                  }}
                  className="mt-2 w-full sm:w-auto"
                  type="button"
                  disabled={!hasValidComment(newComment)}
                >
                  Post Comment
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={<p className="text-center text-muted-foreground">Loading...</p>}
    >
      <FeedbackContent />
    </Suspense>
  );
}
