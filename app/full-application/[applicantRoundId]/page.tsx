"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Link as LinkIcon,
  FileText,
  MessageSquare,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import useUser from "@/app/hook/useUser";
import toast from "react-hot-toast";

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

interface ScoreRow {
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
  scores: ScoreRow[];
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

// Helpers (borrowed from ApplicationDialog / InterviewPage)
const isEmail = (value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

const isPhoneNumber = (value: string): boolean => {
  const phoneRegex =
    /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  return phoneRegex.test(value.replace(/\s/g, ""));
};

const isLongText = (value: string): boolean => value.length > 400;

type FieldType = "url" | "email" | "phone" | "longText" | "text";

const getFieldType = (value: string): FieldType => {
  try {
    new URL(value);
    return "url";
  } catch {}

  if (isEmail(value)) return "email";
  if (isPhoneNumber(value)) return "phone";
  if (isLongText(value)) return "longText";
  return "text";
};

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
        {isExpanded ? "Show less" : "Show more"}
      </Button>
    </div>
  );
};

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
            <span className="text-xs">Open</span>
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

export default function FullApplicationPage() {
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
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!applicantRoundId) return;

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
          const data = await response.json().catch(() => ({}));

          if (response.status === 401) {
            const nextPath =
              typeof window !== "undefined"
                ? window.location.pathname + window.location.search
                : `/full-application/${applicantRoundId}`;
            router.push(`/auth?next=${encodeURIComponent(nextPath)}`);
            return;
          }

          if (response.status === 403) {
            setUnauthorized(true);
            setIsLoading(false);
            return;
          }

          throw new Error(data.error || "Failed to fetch application");
        }

        const data: InterviewData = await response.json();
        setInterviewData(data);
        setComments(data.comments || []);
        setScores(data.scores || []);
        setMetrics(data.metrics || []);
      } catch (err) {
        console.error("Error fetching full application:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load application"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (!userLoading) {
      fetchData();
    }
  }, [applicantRoundId, userLoading, router]);

  if (unauthorized) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Not authorized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You are not a member of the organization that owns this
              recruitment round, so you can&apos;t access this application.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!interviewData || error) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {error ? "Error loading application" : "Application not found"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error || "We couldn&apos;t find this application."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { applicant, recruitment_round, recruitment_cycle } = interviewData;

  const getOrderedEntries = (): [string, string][] => {
    const data = applicant.data || {};
    const columnOrder = recruitment_round.column_order;

    if (columnOrder && columnOrder.length > 0) {
      const orderedEntries: [string, string][] = [];
      const dataKeys = new Set(Object.keys(data));

      for (const key of columnOrder) {
        if (dataKeys.has(key)) {
          orderedEntries.push([key, data[key]]);
          dataKeys.delete(key);
        }
      }

      for (const key of dataKeys) {
        orderedEntries.push([key, data[key]]);
      }

      return orderedEntries;
    }

    return Object.entries(data);
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-full bg-muted">
                <Image
                  src={
                    applicant.headshot_url ||
                    "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                  }
                  alt={applicant.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{applicant.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {recruitment_cycle.name} • {recruitment_round.name}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {applicant.email && (
              <a
                href={`mailto:${applicant.email}`}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">{applicant.email}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-hidden">
        <Tabs defaultValue="application" className="flex h-full flex-col">
          <div className="border-b px-6 pt-4">
            <TabsList>
              <TabsTrigger value="application">
                <FileText className="h-4 w-4 mr-2" />
                Application
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="scores">
                <BarChart3 className="h-4 w-4 mr-2" />
                Scores
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="application" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getOrderedEntries().map(([key, value]) => (
                    <DataField key={key} label={key} value={value} />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No comments yet.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                            {comment.avatar_url ? (
                              <Image
                                src={comment.avatar_url}
                                alt={comment.user_name || "Reviewer"}
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {comment.user_name
                                  ? comment.user_name[0]
                                  : "?"}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {comment.user_name || "Reviewer"}
                                </span>
                                {comment.round_name && (
                                  <Badge variant="outline">
                                    {comment.round_name}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  comment.created_at
                                ).toLocaleString()}
                              </span>
                            </div>
                            <div
                              className="mt-2 text-sm text-foreground rich-text-content prose prose-sm max-w-none break-words overflow-wrap-anywhere"
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(comment.comment_text),
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="scores" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {scores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No scores have been submitted yet.
                  </p>
                ) : (
                  scores.map((submission) => (
                    <Card key={submission.submission_id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                            {submission.avatar_url ? (
                              <Image
                                src={submission.avatar_url}
                                alt={submission.user_name || "Reviewer"}
                                width={36}
                                height={36}
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {submission.user_name
                                  ? submission.user_name[0]
                                  : "?"}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              {submission.user_name || "Reviewer"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(
                                submission.created_at
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            Avg:{" "}
                            {submission.weighted_average != null ? submission.weighted_average.toFixed(2) : "N/A"}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {submission.scores.map((score) => {
                            const metric = metrics.find(
                              (m) => m.id === score.metric_id
                            );
                            return (
                              <div
                                key={score.score_id}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {metric?.name || score.metric_name}
                                  </span>
                                  {metric && (
                                    <span className="text-xs text-muted-foreground">
                                      (w {metric.weight})
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono">
                                  {score.score_value > 0 ? "+" : ""}
                                  {score.score_value}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

