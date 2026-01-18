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
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import useUser from "../hook/useUser";
import { useSearchParams } from "next/navigation";
import RichTextEditor from "@/components/RichTextEditor";
import LoadingModal from "@/components/LoadingModal2";
import { Search, X } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 max-w-7xl">
        <Toaster position="top-right" />
        <LoadingModal
          isOpen={isApplicantLoading}
          message="Loading applicant details"
        />
        
        {/* Header Section */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Feedback Form
            {cycleName || roundName ? (
              <span className="block text-xl sm:text-2xl mt-2 text-muted-foreground font-normal">
                {cycleName && `${cycleName}`}
                {cycleName && roundName ? ": " : ""}
                {roundName && `${roundName}`}
              </span>
            ) : null}
          </h1>
          <Separator className="my-4" />
        </div>

        {/* Search Bar */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicants by name..."
              className="w-full pl-10 pr-10 h-11 sm:h-12 text-base sm:text-sm bg-background/50 backdrop-blur-sm border-2 focus:border-primary/50 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded-sm p-1 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Applicants Grid */}
        {filteredApplicants.length > 0 ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredApplicants.map((applicant) => (
              <Card
                key={applicant.id}
                className="group cursor-pointer overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 active:scale-[0.98] bg-card/50 backdrop-blur-sm"
                onClick={() => handleCardClick(applicant)}
              >
                <CardContent className="p-0">
                  {applicant.headshot_url ? (
                    <div className="relative w-full aspect-[3/4] overflow-hidden bg-muted">
                      <Image
                        src={applicant.headshot_url}
                        alt={`${applicant.name}'s headshot`}
                        width={300}
                        height={400}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        priority={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  ) : (
                    <div className="w-full aspect-[3/4] bg-muted flex items-center justify-center">
                      <div className="text-4xl text-muted-foreground">
                        {applicant.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="p-4 sm:p-5">
                    <p className="text-base sm:text-lg font-semibold text-center group-hover:text-primary transition-colors line-clamp-2">
                      {applicant.name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
              <p className="text-center text-muted-foreground text-base sm:text-lg">
                {search ? "No applicants found matching your search." : "No applicants found."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
            <DialogTitle className="text-xl sm:text-2xl">
              {selectedApplicant?.name || "Applicant Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-6 space-y-6">
            {selectedApplicant && (
              <>
                {selectedApplicant.headshot_url && (
                  <div className="mx-auto mb-6 rounded-xl overflow-hidden w-48 sm:w-64 shadow-lg ring-2 ring-muted">
                    <Image
                      src={selectedApplicant.headshot_url}
                      alt={`${selectedApplicant.name}'s headshot`}
                      width={256}
                      height={256}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <div className="space-y-1 mb-6">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-base sm:text-lg font-semibold">
                    {selectedApplicant.name}
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-semibold">Comments</h3>
                    {comments.length > 0 && (
                      <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {comments.length}
                      </span>
                    )}
                  </div>
                  {comments.length > 0 ? (
                    <div className="space-y-3">
                      {comments.map((comment, index) => (
                        <Card key={index} className="border-2 bg-muted/30">
                          <CardContent className="p-4 sm:p-5">
                            <div
                              className="text-sm sm:text-base rich-text-content [&_p]:mb-2 [&_p]:last:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_strong]:font-semibold [&_em]:italic"
                              dangerouslySetInnerHTML={{
                                __html: comment.comment_text,
                              }}
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 pt-3 border-t">
                              <span className="text-xs sm:text-sm text-muted-foreground">
                                {new Date(comment.created_at).toLocaleString()}
                                {comment.updated_at &&
                                  new Date(comment.updated_at) >
                                    new Date(comment.created_at) && (
                                    <span className="ml-1 text-muted-foreground/70">
                                      (edited)
                                    </span>
                                  )}
                              </span>
                              {comment.round_name && (
                                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                                  Round: {comment.round_name}
                                  {comment.source === "F"
                                    ? " (Feedback Form)"
                                    : comment.source === "A"
                                    ? " (Anonymous)"
                                    : ""}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">
                          No comments yet. Be the first to add feedback!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
                <Separator />
                <div className="space-y-4">
                  <h4 className="text-base sm:text-lg font-semibold">Add Comment</h4>
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
                    className="w-full sm:w-auto sm:min-w-[140px] h-11 sm:h-10"
                    type="button"
                    disabled={!hasValidComment(newComment)}
                  >
                    Post Comment
                  </Button>
                </div>
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
