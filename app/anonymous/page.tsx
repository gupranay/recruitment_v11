"use client";

import { useSearchParams } from "next/navigation";
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
import useUser from "../hook/useUser";

interface AnonApplicant {
  id: string; // The actual UUID of the applicant
  number: number; // Sequential number for display
}

export default function ReadingPage() {
  // Hooks must always be called unconditionally
  const { data: user } = useUser();
  const searchParams = useSearchParams();
  const slug = searchParams?.get("id"); // Allow `slug` to be null initially
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ensure slug is valid before fetching data
    if (!slug) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
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
            {selectedApplicant ? (
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
              </>
            ) : (
              <p className="text-muted-foreground">No details available.</p>
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
