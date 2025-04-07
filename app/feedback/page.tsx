"use client";

import { useState, useEffect } from "react";
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

export default function FeedbackPage() {
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
    setSelectedApplicant(applicant);
    await fetchComments(applicant.id);
    setIsDialogOpen(true);
  };

  const postComment = async () => {
    if (
      !selectedApplicant ||
      !newComment.trim() ||
      !user?.id ||
      !recruitmentRoundId
    ) {
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
        throw new Error("Failed to post comment");
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
      toast.error("Failed to post comment.");
    }
  };

  const closeDialog = () => {
    setSelectedApplicant(null);
    setComments([]);
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return <p className="text-center text-muted-foreground">Loading...</p>;
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
      <h1 className="text-2xl font-bold text-center">Feedback Form</h1>
      <Separator className="my-4" />

      {applicants.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {applicants.map((applicant) => (
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedApplicant?.name || "Applicant Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[70vh] overflow-auto">
            {selectedApplicant && (
              <>
                {selectedApplicant.headshot_url && (
                  <div className="mx-auto mb-4 rounded-lg overflow-hidden w-64">
                    <img
                      src={selectedApplicant.headshot_url}
                      alt={`${selectedApplicant.name}'s headshot`}
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
                            {new Date(comment.created_at).toLocaleString()}
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
                    ))}
                  </div>
                </div>
                <RichTextEditor
                  content={newComment}
                  onChange={setNewComment}
                  placeholder="Add a comment..."
                />
                <Button onClick={postComment} className="mt-2">
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
