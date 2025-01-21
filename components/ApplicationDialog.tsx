import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Send } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { Separator } from "./ui/separator";

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
  const [scores, setScores] = useState<
    {
      user_id: string;
      user_name: string | null;
      scores: {
        metric_name: string;
        score_value: number;
        created_at: string;
      }[];
    }[]
  >([]);
  const [newComment, setNewComment] = useState<string>(""); // New comment input
  const [isAddingComment, setIsAddingComment] = useState(false); // Loading state for adding a comment
  const [isLoading, setIsLoading] = useState(false);

  // Fetch applicant details, comments, and scores
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
      try {
        const response = await fetch("/api/scores/get", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ applicant_round_id: applicantRoundId }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch scores");
        }

        const data = await response.json();
        setScores(data || []);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto p-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          applicantData && (
            <>
              {/* Name and Headshot */}
              <div className="flex flex-col items-center mb-8">
                <Image
                  src={
                    applicantData.headshot_url ||
                    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                  }
                  alt={`Headshot of ${applicantData.name}`}
                  width={192}
                  height={192}
                  className="w-48 h-48 rounded-full object-cover mb-4 shadow-md"
                />
                <h2 className="text-2xl font-bold text-gray-800">
                  {applicantData.name}
                </h2>
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
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-2">Scores</h4>
                {scores.length > 0 ? (
                  scores.map((user) => (
                    <div key={user.user_id} className="mb-4">
                      <p className="font-bold text-gray-800">
                        {user.user_name || "Anonymous User"}
                      </p>
                      <ul className="list-disc list-inside">ujj
                        {user.scores.map((score, index) => (
                          <li key={`${score.metric_name}-${index}`}>
                            Metric: {score.metric_name}, Score:{" "}
                            {score.score_value}, Date:{" "}
                            {new Date(score.created_at).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No scores submitted yet.
                  </p>
                )}
              </div>
              <Separator className="my-6" />
              {/* Comments Section */}
              <div>
                <h4 className="text-lg font-medium mb-2">Comments</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto mb-4">
                  {comments.length > 0 ? (
                    comments.map((comment, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        <div>
                          <span className="font-medium">
                            {comment.user_name || "Anonymous"}:
                          </span>{" "}
                          {comment.comment_text}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {comment.round_name ? (
                            <span className="font-semibold">
                              Round: {comment.round_name}
                              {comment.anonymous ? " (Anonymous)" : ""}
                            </span>
                          ) : (
                            "No round information"
                          )}
                          <span className="ml-2">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No comments yet.
                    </p>
                  )}
                </div>
                <Textarea
                  placeholder="Add a new comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-2"
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
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
