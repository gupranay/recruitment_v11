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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import useUser from "../hook/useUser";

interface Applicant {
  id: string;
  name: string;
  headshot_url: string;
}

export default function ApplicantsGridPage() {
  const { data: user } = useUser(); // Get user data
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
    null
  );
  const [newComment, setNewComment] = useState<string>("");
  const [comments, setComments] = useState<
    { comment_text: string; created_at: string }[]
  >([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const recruitmentRoundId = "da7841db-5f8c-4f8c-9c9a-5b8eab214dab"; // Replace with the actual recruitment round ID

  // Fetch all applicants in the round
  useEffect(() => {
    const fetchApplicants = async () => {
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
    if (!user?.id) return; // Ensure user is logged in
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
    if (!selectedApplicant || !newComment.trim() || !user?.id) return;

    try {
      const response = await fetch("/api/anonymous/post-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: selectedApplicant.id,
          recruitment_round_id: recruitmentRoundId,
          comment_text: newComment,
          user_id: user.id, // Include user ID
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

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold text-center">Applicants</h1>
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
                  height={500} // Increased height for taller images
                  className="w-full h-80 object-cover rounded-lg mb-4" // Ensures consistent height
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
                <p className="text-sm">
                  <strong>Headshot URL:</strong>{" "}
                  <a
                    href={selectedApplicant.headshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {selectedApplicant.headshot_url}
                  </a>
                </p>
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
