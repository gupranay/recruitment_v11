"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Loader2,
  Send,
  Trash2,
  Edit2,
  FileText,
  User,
  ExternalLink,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  MessageSquare,
  ArrowLeft,
  FileIcon,
  ClipboardList,
  BarChart3,
  Maximize2,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import RichTextEditor, {
  ToolbarItem,
  createDefaultToolbarItems,
} from "@/components/RichTextEditor";
import RichTextEditorSettings from "@/components/RichTextEditorSettings";
import useUser from "@/app/hook/useUser";

// Types
interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  user_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at?: string;
  round_name: string | null;
  source: string | null;
  is_edited?: boolean;
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
  user_name: string | null;
  user_id: string;
  avatar_url: string | null;
  scores: Score[];
  weighted_average: number;
}

interface Metric {
  id: string;
  name: string;
  weight: number;
}

interface ApplicantData {
  id: string;
  name: string;
  email: string | null;
  headshot_url: string | null;
  data: Record<string, string>;
}

interface InterviewData {
  applicant: ApplicantData;
  applicant_round: {
    id: string;
    status: string;
  };
  recruitment_round: {
    id: string;
    name: string;
    column_order: string[] | null;
  };
  recruitment_cycle: {
    id: string;
    name: string;
  };
  organization_id: string;
  scores: Submission[];
  metrics: Metric[];
  comments: Comment[];
  user_role: string;
}

// Helper functions for smart field type detection
const isEmail = (value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

const isPhoneNumber = (value: string): boolean => {
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(value.replace(/\s/g, ""));
};

const isLongText = (value: string): boolean => {
  return value.length > 400;
};

const getFieldType = (
  value: string
): "url" | "email" | "phone" | "longText" | "text" => {
  try {
    new URL(value);
    return "url";
  } catch {}

  if (isEmail(value)) return "email";
  if (isPhoneNumber(value)) return "phone";
  if (isLongText(value)) return "longText";
  return "text";
};

// Resume field detection - checks for common resume field names
const RESUME_FIELD_NAMES = [
  "resume",
  "resume_url",
  "resume url",
  "resume link",
  "resumeurl",
  "resumelink",
  "cv",
  "cv_url",
  "cv url",
  "cv link",
  "cvurl",
  "cvlink",
];

const findResumeUrl = (data: Record<string, string>): string | null => {
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase().trim();
    if (RESUME_FIELD_NAMES.includes(normalizedKey)) {
      // Check if it's a valid URL
      try {
        new URL(value);
        return value;
      } catch {}
    }
  }
  return null;
};

// Component for rendering expandable long text
const ExpandableText = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const previewLength = 400;

  if (text.length <= previewLength) {
    return <p className="text-foreground whitespace-pre-wrap">{text}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-foreground whitespace-pre-wrap">
        {isExpanded ? text : `${text.slice(0, previewLength)}...`}
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-auto p-0 text-primary hover:text-primary/80"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4 mr-1" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-1" />
            Show more
          </>
        )}
      </Button>
    </div>
  );
};

// Component for rendering a single data field with smart type detection
const DataField = ({ label, value }: { label: string; value: string }) => {
  const fieldType = getFieldType(value);

  const getIcon = () => {
    switch (fieldType) {
      case "url":
        return <LinkIcon className="h-4 w-4 text-muted-foreground" />;
      case "email":
        return <Mail className="h-4 w-4 text-muted-foreground" />;
      case "phone":
        return <Phone className="h-4 w-4 text-muted-foreground" />;
      case "longText":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const renderValue = () => {
    switch (fieldType) {
      case "url":
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 inline-flex items-center gap-1 underline-offset-4 hover:underline"
          >
            <span className="truncate max-w-[200px]">
              {new URL(value).hostname}
            </span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        );
      case "email":
        return (
          <a
            href={`mailto:${value}`}
            className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
          >
            {value}
          </a>
        );
      case "phone":
        return (
          <a
            href={`tel:${value}`}
            className="text-primary hover:text-primary/80 underline-offset-4 hover:underline"
          >
            {value}
          </a>
        );
      case "longText":
        return <ExpandableText text={value} />;
      default:
        return <p className="text-foreground">{value}</p>;
    }
  };

  // For long text, render in full width
  if (fieldType === "longText") {
    return (
      <div className="col-span-full">
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-2">
              {getIcon()}
              <span className="text-sm font-medium text-muted-foreground">
                {label}
              </span>
            </div>
            {renderValue()}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <div className="flex items-center gap-2 mb-1">
        {getIcon()}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      {renderValue()}
    </div>
  );
};

// Resume Viewer Component
const ResumeViewer = ({ resumeUrl }: { resumeUrl: string | null }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentEmbedUrl, setCurrentEmbedUrl] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RETRIES = 3;
  const LOAD_TIMEOUT = 10000; // 10 seconds timeout for iframe to load

  // Generate embed URL from resume URL
  const generateEmbedUrl = (url: string): string => {
    if (url.includes("drive.google.com")) {
      // Convert Google Drive sharing link to embed format
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
      }
    } else if (!url.toLowerCase().endsWith(".pdf")) {
      // For non-PDF URLs, try using Google Docs viewer
      return `https://docs.google.com/viewer?url=${encodeURIComponent(
        url
      )}&embedded=true`;
    }
    return url;
  };

  // Retry loading with exponential backoff
  const retryLoad = useCallback(() => {
    if (retryCount >= MAX_RETRIES || !resumeUrl) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
    
    retryTimeoutRef.current = setTimeout(() => {
      setRetryCount((prev) => prev + 1);
      setIsLoading(true);
      setHasError(false);
      
      // Force iframe reload by changing the src
      const embedUrl = generateEmbedUrl(resumeUrl);
      setCurrentEmbedUrl(`${embedUrl}?retry=${retryCount + 1}&t=${Date.now()}`);
    }, delay);
  }, [retryCount, resumeUrl]);

  // Handle iframe load success
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
  }, []);

  // Handle iframe load error
  const handleError = useCallback(() => {
    setIsLoading(false);
    retryLoad();
  }, [retryLoad]);

  // Initialize embed URL when resumeUrl changes
  useEffect(() => {
    if (resumeUrl) {
      setRetryCount(0);
      setIsLoading(true);
      setHasError(false);
      const embedUrl = generateEmbedUrl(resumeUrl);
      setCurrentEmbedUrl(embedUrl);
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [resumeUrl]);

  // Set up load timeout
  useEffect(() => {
    if (isLoading && currentEmbedUrl) {
      loadTimeoutRef.current = setTimeout(() => {
        // If still loading after timeout, consider it an error
        if (isLoading) {
          handleError();
        }
      }, LOAD_TIMEOUT);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [isLoading, currentEmbedUrl, handleError]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current && iframeRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Standard PDF width is typically 8.5 inches at 96 DPI = 816px
        // We'll use a base width and scale to fit container
        const baseWidth = 816;
        const newScale = containerWidth / baseWidth;
        setScale(Math.max(0.5, Math.min(2, newScale))); // Clamp between 0.5x and 2x
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [resumeUrl]);

  if (!resumeUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <FileIcon className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No Resume Found</p>
        <p className="text-sm mt-2">
          No resume URL was detected in the application data.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <span className="text-sm text-muted-foreground truncate max-w-[70%]">
          {resumeUrl}
        </span>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {retryCount > 0 && (
                <span>Retrying... ({retryCount}/{MAX_RETRIES})</span>
              )}
            </div>
          )}
          {hasError && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRetryCount(0);
                setHasError(false);
                setIsLoading(true);
                const embedUrl = generateEmbedUrl(resumeUrl);
                setCurrentEmbedUrl(`${embedUrl}?retry=0&t=${Date.now()}`);
              }}
              className="h-7 text-xs"
            >
              Retry
            </Button>
          )}
          <a
            href={resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            Open in new tab
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-auto"
        style={{ position: "relative" }}
      >
        {hasError && retryCount >= MAX_RETRIES ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileIcon className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Failed to Load Resume</p>
            <p className="text-sm mt-2 mb-4">
              The resume could not be loaded after {MAX_RETRIES} attempts.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setRetryCount(0);
                setHasError(false);
                setIsLoading(true);
                const embedUrl = generateEmbedUrl(resumeUrl);
                setCurrentEmbedUrl(`${embedUrl}?retry=0&t=${Date.now()}`);
              }}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div
            style={{
              width: "816px",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              height: `${1056 * scale}px`, // Standard letter size height scaled
            }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading resume...</p>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={currentEmbedUrl || undefined}
              className="border-0"
              style={{
                width: "816px",
                height: "1056px",
                opacity: isLoading ? 0 : 1,
                transition: "opacity 0.3s ease-in-out",
              }}
              title="Resume"
              allow="autoplay"
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Application View Component
const ApplicationView = ({
  applicant,
  columnOrder,
}: {
  applicant: ApplicantData;
  columnOrder: string[] | null;
}) => {
  const data = applicant.data || {};

  // Order the entries based on column_order if available
  const getOrderedEntries = (): [string, string][] => {
    if (columnOrder && Array.isArray(columnOrder)) {
      const orderedEntries: [string, string][] = [];
      const dataKeys = new Set(Object.keys(data));

      // Add entries in the stored order
      for (const key of columnOrder) {
        if (dataKeys.has(key)) {
          orderedEntries.push([key, data[key]]);
          dataKeys.delete(key);
        }
      }

      // Add any remaining entries that weren't in the stored order
      for (const key of dataKeys) {
        orderedEntries.push([key, data[key]]);
      }

      return orderedEntries;
    }

    return Object.entries(data);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {/* Large Headshot */}
        <div className="flex justify-center mb-8">
          <div className="relative w-32 h-32 rounded-xl overflow-hidden shadow-lg ring-1 ring-border">
            <Image
              src={
                applicant.headshot_url ||
                "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
              }
              alt={`Headshot of ${applicant.name}`}
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Dynamic Data Fields in Modern Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {getOrderedEntries().map(([key, value]) => (
            <DataField key={key} label={key} value={value} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

// Main Interview Page Component
export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();

  const applicantRoundId = params?.applicantRoundId as string | undefined;

  const [interviewData, setInterviewData] = useState<InterviewData | null>(
    null
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [scores, setScores] = useState<Submission[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comment state
  const [newComment, setNewComment] = useState(() => {
    // Load saved comment from localStorage if available
    if (typeof window !== "undefined" && applicantRoundId) {
      const saved = localStorage.getItem(`comment_draft_${applicantRoundId}`);
      return saved || "";
    }
    return "";
  });
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  // Save comment draft to localStorage whenever it changes
  useEffect(() => {
    if (applicantRoundId && typeof window !== "undefined") {
      if (newComment.trim()) {
        localStorage.setItem(`comment_draft_${applicantRoundId}`, newComment);
      } else {
        localStorage.removeItem(`comment_draft_${applicantRoundId}`);
      }
    }
  }, [newComment, applicantRoundId]);

  // Score input state
  const [scoreInputs, setScoreInputs] = useState<{
    [metricId: string]: { score_value: number; weight: number };
  }>({});
  const [isSubmittingScores, setIsSubmittingScores] = useState(false);

  // Panel tab states
  const [leftPanelTab, setLeftPanelTab] = useState<"resume" | "application">(
    "resume"
  );
  const [rightPanelTab, setRightPanelTab] = useState<"comments" | "scores">(
    "comments"
  );

  // My comments section collapse state
  const [isMyCommentsExpanded, setIsMyCommentsExpanded] = useState(false);
  
  // Other comments section collapse state
  const [isOtherCommentsExpanded, setIsOtherCommentsExpanded] = useState(false);
  
  // Full-screen editor dialog state
  const [isFullScreenEditorOpen, setIsFullScreenEditorOpen] = useState(false);

  // Toolbar configuration state
  const [toolbarConfig, setToolbarConfig] = useState<ToolbarItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("richTextEditorToolbarConfig");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Map icon IDs back to actual icon components
          const defaultItems = createDefaultToolbarItems();
          const iconMap = new Map(defaultItems.map((item) => [item.id, item.icon]));
          
          // Validate and restore with proper icon components
          const validItems: ToolbarItem[] = parsed
            .filter((item: { id: string }) => iconMap.has(item.id))
            .map((item: { id: string }): ToolbarItem | undefined => {
              const defaultItem = defaultItems.find((d) => d.id === item.id);
              return defaultItem;
            })
            .filter((item: ToolbarItem | undefined): item is ToolbarItem => item !== null && item !== undefined);
          
          if (validItems.length > 0) {
            return validItems;
          }
        } catch (e) {
          console.error("Error loading toolbar config:", e);
        }
      }
    }
    return createDefaultToolbarItems();
  });

  // Save toolbar config to localStorage (only save IDs, not components)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const configToSave = toolbarConfig.map((item) => ({
        id: item.id,
        label: item.label,
      }));
      localStorage.setItem(
        "richTextEditorToolbarConfig",
        JSON.stringify(configToSave)
      );
    }
  }, [toolbarConfig]);

  // Check if user is Owner or Admin
  const isOwnerOrAdmin =
    interviewData?.user_role === "Owner" ||
    interviewData?.user_role === "Admin";

  // Fetch interview data
  useEffect(() => {
    const fetchInterviewData = async () => {
      if (!applicantRoundId || !user?.id) return;

      setIsLoading(true);
      try {
        const response = await fetch("/api/interview/get", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ applicant_round_id: applicantRoundId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch interview data");
        }

        const data: InterviewData = await response.json();
        setInterviewData(data);
        setComments(data.comments);
        setScores(data.scores || []);
        setMetrics(data.metrics || []);
      } catch (err) {
        console.error("Error fetching interview data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    if (!userLoading) {
      fetchInterviewData();
    }
  }, [applicantRoundId, user?.id, userLoading]);

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !interviewData || !applicantRoundId) return;

    setIsAddingComment(true);
    try {
      const response = await fetch("/api/comments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_round_id: applicantRoundId,
          user_id: user?.id,
          comment_text: newComment.trim(),
          source: "R", // Regular comment
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      const { comment } = await response.json();
      const newCommentObj: Comment = {
        id: comment.id,
        user_id: user?.id || "",
        comment_text: comment.comment_text,
        user_name: "You",
        avatar_url: user?.avatar_url || null,
        created_at: comment.created_at,
        round_name: interviewData.recruitment_round.name,
        source: "R",
      };
      setComments((prev) => [...prev, newCommentObj]);
      setNewComment("");
      // Clear saved draft after successful submission
      if (typeof window !== "undefined" && applicantRoundId) {
        localStorage.removeItem(`comment_draft_${applicantRoundId}`);
      }
      toast.success("Comment added successfully!");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsAddingComment(false);
    }
  };

  // Handle edit comment
  const handleEditComment = async () => {
    if (!editingCommentId || !editingCommentText.trim() || !user?.id) return;

    setIsEditingComment(true);
    try {
      const response = await fetch("/api/comments/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: editingCommentId,
          user_id: user.id,
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
                is_edited: true,
              }
            : c
        )
      );
      toast.success("Comment updated successfully!");
      setEditingCommentId(null);
      setEditingCommentText("");
      setNewComment(""); // Clear new comment field when done editing
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    } finally {
      setIsEditingComment(false);
    }
  };

  // Handle delete comment
  const handleDeleteComment = async () => {
    if (!commentToDelete || !user?.id || !interviewData) return;

    setIsDeletingComment(true);
    try {
      const response = await fetch("/api/comments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: commentToDelete,
          user_id: user.id,
          organization_id: interviewData.organization_id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete comment");
      }

      setComments((prev) => prev.filter((c) => c.id !== commentToDelete));
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

  // Handle submit scores
  const handleSubmitScores = async () => {
    if (!applicantRoundId || !user?.id || Object.keys(scoreInputs).length === 0)
      return;

    setIsSubmittingScores(true);
    try {
      const response = await fetch("/api/scores/create2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_round_id: applicantRoundId,
          user_id: user.id,
          scores: Object.entries(scoreInputs).map(
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

      // Create a new submission object
      const newSubmission: Submission = {
        submission_id: newScores[0]?.submission_id || new Date().toISOString(),
        created_at: new Date().toISOString(),
        user_name: "You",
        user_id: user.id,
        avatar_url: user.avatar_url || null,
        scores: newScores.map((score: any) => ({
          score_id: score.id,
          score_value: score.score_value,
          metric_id: score.metric_id,
          metric_name: metrics.find((m) => m.id === score.metric_id)?.name,
          metric_weight: metrics.find((m) => m.id === score.metric_id)?.weight,
        })),
        weighted_average: submission_weighted_average,
      };

      // Add the new submission to the scores list
      setScores((prevScores) => [newSubmission, ...prevScores]);
      setScoreInputs({}); // Clear the inputs
      toast.success("Scores submitted successfully!");
    } catch (error) {
      console.error("Error submitting scores:", error);
      toast.error("Failed to submit scores");
    } finally {
      setIsSubmittingScores(false);
    }
  };

  // Loading state
  if (isLoading || userLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">
            Loading interview mode...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <FileText className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Unable to Load Interview</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => router.push("/dash")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // No data state
  if (!interviewData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">No data available</p>
          <Button onClick={() => router.push("/dash")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const resumeUrl = findResumeUrl(interviewData.applicant.data);

  // Filter user's own comments
  const myComments = comments.filter((comment) => comment.user_id === user?.id);
  
  // Filter other users' comments
  const otherComments = comments.filter((comment) => comment.user_id !== user?.id);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Toaster />

      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.close()}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Close
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-border">
                <Image
                  src={
                    interviewData.applicant.headshot_url ||
                    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                  }
                  alt={interviewData.applicant.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold">
                  {interviewData.applicant.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {interviewData.recruitment_cycle.name} -{" "}
                  {interviewData.recruitment_round.name}
                </p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="capitalize">
            {interviewData.applicant_round.status}
          </Badge>
        </div>
      </header>

      {/* Main Content - Split View 50/50 */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Half - Resume/Application */}
        <div className="w-1/2 flex flex-col border-r">
          <div className="border-b px-4 py-2 flex items-center gap-2 bg-muted/30">
            <span className="text-sm text-muted-foreground mr-2">View: </span>
            <div className="inline-flex rounded-md border border-input bg-background">
              <Button
                variant={leftPanelTab === "resume" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setLeftPanelTab("resume")}
                className="rounded-r-none border-r"
              >
                <FileIcon className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button
                variant={leftPanelTab === "application" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setLeftPanelTab("application")}
                className="rounded-l-none"
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Application
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {leftPanelTab === "resume" ? (
              <ResumeViewer resumeUrl={resumeUrl} />
            ) : (
              <ApplicationView
                applicant={interviewData.applicant}
                columnOrder={interviewData.recruitment_round.column_order}
              />
            )}
          </div>
        </div>

        {/* Right Half - Comments/Scores */}
        <div className="w-1/2 flex flex-col bg-card">
          <div className="border-b px-4 py-2 flex items-center gap-2 bg-muted/30">
            <span className="text-sm text-muted-foreground mr-2">View:</span>
            <div className="inline-flex rounded-md border border-input bg-background">
              <Button
                variant={rightPanelTab === "comments" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setRightPanelTab("comments")}
                className="rounded-r-none border-r"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {comments.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={rightPanelTab === "scores" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setRightPanelTab("scores")}
                className="rounded-l-none"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Scores
                {scores.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {scores.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {rightPanelTab === "comments" ? (
            <div className="flex-1 flex flex-col relative overflow-hidden">
              {/* Scrollable Comments Area */}
              <div className="overflow-auto flex-shrink" style={{ maxHeight: 'calc(100% - 400px)' }}>
                <div className="flex flex-col">
                  {/* My Comments Section - Collapsible */}
                  {myComments.length > 0 && (
                    <div className="flex-shrink-0 border-b bg-card">
                      <button
                        onClick={() => setIsMyCommentsExpanded(!isMyCommentsExpanded)}
                        className="w-full px-6 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-sm">My Comments</h3>
                          <Badge variant="secondary" className="h-5 px-1.5">
                            {myComments.length}
                          </Badge>
                        </div>
                        {isMyCommentsExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {isMyCommentsExpanded && (
                        <div className="border-t">
                          <div className="p-4 space-y-3">
                            {myComments.map((comment, index) => (
                              <Card
                                key={comment.id ?? `my-comment-${index}`}
                                className="group hover:bg-muted/50 transition-colors"
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-2">
                                    {comment.avatar_url ? (
                                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-border">
                                        <Image
                                          src={comment.avatar_url}
                                          alt={comment.user_name || "User"}
                                          width={24}
                                          height={24}
                                          className="object-cover w-full h-full"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <User className="h-3 w-3 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0 pr-2">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="font-medium text-sm text-card-foreground">
                                          {comment.user_name || "Anonymous"}
                                        </span>
                                        {comment.round_name && (
                                          <Badge variant="outline" className="text-xs h-4 px-1">
                                            {comment.round_name}
                                          </Badge>
                                        )}
                                        {(comment.is_edited || (comment.updated_at && comment.updated_at !== comment.created_at)) && (
                                          <Badge variant="secondary" className="text-xs h-4 px-1">
                                            Edited
                                          </Badge>
                                        )}
                                      </div>
                                      <div
                                        className="text-xs text-foreground rich-text-content prose prose-sm max-w-none break-words overflow-wrap-anywhere"
                                        dangerouslySetInnerHTML={{
                                          __html: comment.comment_text,
                                        }}
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(comment.created_at).toLocaleDateString()}
                                        {comment.updated_at && comment.updated_at !== comment.created_at && (
                                          <span className="ml-2">(edited {new Date(comment.updated_at).toLocaleDateString()})</span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingCommentId(comment.id);
                                          setEditingCommentText(comment.comment_text);
                                        }}
                                        title="Edit comment"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCommentToDelete(comment.id);
                                        }}
                                        title="Delete comment"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Other Comments Section - Collapsible */}
                  {otherComments.length > 0 && (
                    <div className="flex-shrink-0 border-b bg-card">
                      <button
                        onClick={() => setIsOtherCommentsExpanded(!isOtherCommentsExpanded)}
                        className="w-full px-6 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-sm">Other Comments</h3>
                          <Badge variant="secondary" className="h-5 px-1.5">
                            {otherComments.length}
                          </Badge>
                        </div>
                        {isOtherCommentsExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {isOtherCommentsExpanded && (
                        <div className="border-t">
                          <div className="p-4 space-y-3">
                            {otherComments.map((comment, index) => (
                              <Card
                                key={comment.id ?? `other-comment-${index}`}
                                className="group hover:bg-muted/50 transition-colors"
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-2">
                                    {comment.avatar_url ? (
                                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-border">
                                        <Image
                                          src={comment.avatar_url}
                                          alt={comment.user_name || "User"}
                                          width={24}
                                          height={24}
                                          className="object-cover w-full h-full"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <User className="h-3 w-3 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0 pr-2">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="font-medium text-sm text-card-foreground">
                                          {comment.user_name || "Anonymous"}
                                        </span>
                                        {comment.round_name && (
                                          <Badge variant="outline" className="text-xs h-4 px-1">
                                            {comment.round_name}
                                          </Badge>
                                        )}
                                        {(comment.is_edited || (comment.updated_at && comment.updated_at !== comment.created_at)) && (
                                          <Badge variant="secondary" className="text-xs h-4 px-1">
                                            Edited
                                          </Badge>
                                        )}
                                      </div>
                                      <div
                                        className="text-xs text-foreground rich-text-content prose prose-sm max-w-none break-words overflow-wrap-anywhere"
                                        dangerouslySetInnerHTML={{
                                          __html: comment.comment_text,
                                        }}
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {new Date(comment.created_at).toLocaleDateString()}
                                        {comment.updated_at && comment.updated_at !== comment.created_at && (
                                          <span className="ml-2">(edited {new Date(comment.updated_at).toLocaleDateString()})</span>
                                        )}
                                      </p>
                                    </div>
                                    {(comment.user_id === user?.id || isOwnerOrAdmin) && (
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        {comment.user_id === user?.id && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingCommentId(comment.id);
                                              setEditingCommentText(comment.comment_text);
                                            }}
                                            title="Edit comment"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCommentToDelete(comment.id);
                                          }}
                                          title="Delete comment"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Full-page comment editor - Flexes based on available space */}
              <div className="flex-1 flex flex-col border-t bg-card min-h-0" style={{ minHeight: '400px' }}>
                <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b">
                  <h2 className="text-lg font-semibold">
                    {editingCommentId ? "Edit Comment" : "Write Comment"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFullScreenEditorOpen(true)}
                      title="Open in full screen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <RichTextEditorSettings
                      toolbarItems={toolbarConfig}
                      onToolbarChange={setToolbarConfig}
                    />
                  </div>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  <ScrollArea className="flex-1">
                    <div className="p-6 flex flex-col">
                      <RichTextEditor
                        content={editingCommentId ? editingCommentText : newComment}
                        onChange={
                          editingCommentId
                            ? setEditingCommentText
                            : setNewComment
                        }
                        placeholder="Start writing your comment... (Markdown supported: **bold**, *italic*, # heading, etc.)"
                        toolbarItems={toolbarConfig}
                      />
                      <div className="mt-4 flex justify-end gap-2 flex-shrink-0">
                        {editingCommentId && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentText("");
                            }}
                            size="lg"
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          onClick={
                            editingCommentId ? handleEditComment : handleAddComment
                          }
                          disabled={
                            editingCommentId
                              ? isEditingComment ||
                                !editingCommentText.trim()
                              : isAddingComment || !newComment.trim()
                          }
                          size="lg"
                        >
                          {(editingCommentId ? isEditingComment : isAddingComment) && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          )}
                          <Send className="h-4 w-4 mr-2" />
                          {editingCommentId ? "Save Changes" : "Post Comment"}
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Overall Score Card */}
                  {scores.length > 0 && (
                    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              Overall Weighted Average
                            </p>
                            <p className="text-3xl font-bold text-primary">
                              {(
                                scores.reduce(
                                  (acc, submission) =>
                                    acc + submission.weighted_average,
                                  0
                                ) / scores.length
                              ).toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              Based on {scores.length}{" "}
                              {scores.length === 1 ? "review" : "reviews"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Individual Submissions */}
                  {scores.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-card-foreground">
                        Review History
                      </h3>
                      {scores.map((submission) => (
                        <Card key={submission.submission_id} className="overflow-hidden">
                          <CardHeader className="bg-muted/30 py-2 px-3">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                {submission.avatar_url ? (
                                  <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-border">
                                    <Image
                                      src={submission.avatar_url}
                                      alt={submission.user_name || "Reviewer"}
                                      width={28}
                                      height={28}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-card-foreground">
                                    {submission.user_name || "Anonymous"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(submission.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="font-semibold text-xs">
                                Avg: {submission.weighted_average?.toFixed(2) ?? "N/A"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3">
                            <div className="grid grid-cols-1 gap-2">
                              {submission.scores?.map((score: Score) => (
                                <div
                                  key={score.metric_id}
                                  className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-card-foreground">
                                      {score.metric_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Weight: {score.metric_weight}
                                    </p>
                                  </div>
                                  <span className="text-lg font-bold text-primary">
                                    {score.score_value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <BarChart3 className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground text-center text-sm">
                          No scores submitted yet.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>

              {/* Submit Score Form */}
              {metrics.length > 0 && (
                <div className="border-t p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Submit New Scores</h3>
                  <div className="space-y-2">
                    {metrics.map((metric) => (
                      <div key={metric.id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-sm text-card-foreground">
                            {metric.name}
                          </label>
                          <span className="text-xs text-muted-foreground ml-2">
                            (Weight: {metric.weight})
                          </span>
                        </div>
                        <Input
                          type="number"
                          value={scoreInputs[metric.id]?.score_value ?? ""}
                          onChange={(e) =>
                            setScoreInputs((prev) => ({
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
                          placeholder="0-100"
                          className="w-20"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleSubmitScores}
                    disabled={
                      isSubmittingScores || Object.keys(scoreInputs).length === 0
                    }
                    className="w-full"
                  >
                    {isSubmittingScores && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Submit Scores
                  </Button>
                </div>
              )}
            </>
          )}
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
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteComment}
              disabled={isDeletingComment}
              className="bg-destructive hover:bg-destructive/90"
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

      {/* Full-Screen Editor Dialog */}
      {isFullScreenEditorOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingCommentId ? "Edit Comment" : "Write Comment"}
            </h2>
            <div className="flex items-center gap-2">
              <RichTextEditorSettings
                toolbarItems={toolbarConfig}
                onToolbarChange={setToolbarConfig}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullScreenEditorOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-6">
            <div className="flex-1 flex flex-col min-h-0">
              <RichTextEditor
                content={editingCommentId ? editingCommentText : newComment}
                onChange={
                  editingCommentId
                    ? setEditingCommentText
                    : setNewComment
                }
                placeholder="Start writing your comment... (Markdown supported: **bold**, *italic*, # heading, etc.)"
                toolbarItems={toolbarConfig}
              />
              <div className="mt-4 flex justify-end gap-2 flex-shrink-0">
                {editingCommentId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditingCommentText("");
                      setIsFullScreenEditorOpen(false);
                    }}
                    size="lg"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={async () => {
                    if (editingCommentId) {
                      await handleEditComment();
                      setIsFullScreenEditorOpen(false);
                    } else {
                      await handleAddComment();
                      setIsFullScreenEditorOpen(false);
                    }
                  }}
                  disabled={
                    editingCommentId
                      ? isEditingComment ||
                        !editingCommentText.trim()
                      : isAddingComment || !newComment.trim()
                  }
                  size="lg"
                >
                  {(editingCommentId ? isEditingComment : isAddingComment) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  <Send className="h-4 w-4 mr-2" />
                  {editingCommentId ? "Save Changes" : "Post Comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
