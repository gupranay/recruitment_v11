"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RichTextEditor from "@/components/RichTextEditor";
import LoadingModal from "@/components/LoadingModal2";
import { cn } from "@/lib/utils";

function applicantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

interface ApplicantOption {
  id: string;
  name: string;
  headshot_url: string | null;
}

interface ExternalFormPageProps {
  title: string;
  subtitle: string;
  formType: "conflict" | "referral" | "red-flag";
  placeholder: string;
  helperText: string;
}

export default function ExternalFormPage({
  title,
  subtitle,
  formType,
  placeholder,
  helperText,
}: ExternalFormPageProps) {
  const searchParams = useSearchParams();
  const cycleId = searchParams?.get("cycle_id") || "";

  const [cycleName, setCycleName] = useState<string>("");
  const [organizationName, setOrganizationName] = useState<string>("");
  const [loadingApplicants, setLoadingApplicants] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<ApplicantOption[]>([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string>("");
  const [submissionText, setSubmissionText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [isAnonymousToOwner, setIsAnonymousToOwner] = useState(false);
  const [wantsBoardFollowUp, setWantsBoardFollowUp] = useState(false);
  const [followUpContact, setFollowUpContact] = useState("");
  const [headshotPreviewOpen, setHeadshotPreviewOpen] = useState(false);

  const selectedApplicant = useMemo(
    () =>
      applicants.find((applicant) => applicant.id === selectedApplicantId) ||
      null,
    [applicants, selectedApplicantId],
  );

  useEffect(() => {
    setHeadshotPreviewOpen(false);
  }, [selectedApplicantId]);

  useEffect(() => {
    const fetchApplicants = async () => {
      setLoadError(null);
      if (!cycleId) {
        setLoadError("Missing cycle_id in URL.");
        setLoadingApplicants(false);
        return;
      }

      try {
        const response = await fetch(
          "/api/external-forms/get-cycle-applicants",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cycle_id: cycleId }),
          },
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || "Failed to fetch applicants");
        }

        const data = await response.json();
        setApplicants(data.applicants || []);
        setCycleName(data.cycle?.name || "");
        setOrganizationName(data.organization?.name || "");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load form context";
        setLoadError(message);
        toast.error(message);
      } finally {
        setLoadingApplicants(false);
      }
    };

    fetchApplicants();
  }, [cycleId]);

  const endpointByFormType = {
    conflict: "/api/external-forms/conflict/create",
    referral: "/api/external-forms/referral/create",
    "red-flag": "/api/external-forms/red-flag/create",
  } as const;

  const handleSubmit = async () => {
    const textContent = submissionText.replace(/<[^>]*>/g, "").trim();

    if (!cycleId || !selectedApplicantId || !textContent) {
      toast.error(
        "Please select an applicant and complete the form before submitting.",
      );
      return;
    }

    if (
      formType === "red-flag" &&
      isAnonymousToOwner &&
      wantsBoardFollowUp &&
      !followUpContact.trim()
    ) {
      toast.error(
        "Add contact details so the board can follow up while preserving anonymity.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        cycle_id: cycleId,
        applicant_id: selectedApplicantId,
        submission_text: submissionText.trim(),
      };

      if (formType === "red-flag") {
        payload.is_anonymous_to_owner = isAnonymousToOwner;
        payload.wants_board_follow_up = wantsBoardFollowUp;
        payload.follow_up_contact = followUpContact.trim();
      }

      const response = await fetch(endpointByFormType[formType], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to submit form");
      }

      setSubmissionText("");
      setSelectedApplicantId("");
      setHeadshotPreviewOpen(false);
      if (formType === "red-flag") {
        setIsAnonymousToOwner(false);
        setWantsBoardFollowUp(false);
        setFollowUpContact("");
      }

      toast.success(
        "Submission received. You can submit another entry any time.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingApplicants) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.12),transparent_32%),radial-gradient(circle_at_80%_0%,hsl(var(--primary)/0.08),transparent_30%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.25))]">
        <Toaster position="top-right" />
        <LoadingModal isOpen={true} message="Preparing form context..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.12),transparent_32%),radial-gradient(circle_at_80%_0%,hsl(var(--primary)/0.08),transparent_30%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.25))]">
      <Toaster position="top-right" />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border-border/70 shadow-xl backdrop-blur-sm bg-background/95">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-semibold tracking-tight">
              {title}
            </CardTitle>
            <CardDescription className="text-base">{subtitle}</CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">
                Organization: {organizationName || "Unknown organization"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Cycle: {cycleName || cycleId || "Unknown cycle"}
              </Badge>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="space-y-6 pt-6">
            {loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : applicants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No applicants found for this cycle, or you do not have access.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="applicant-selector">Applicant</Label>
                  <Select
                    value={selectedApplicantId || undefined}
                    onValueChange={setSelectedApplicantId}
                  >
                    <SelectTrigger id="applicant-selector">
                      <SelectValue placeholder="Select an applicant" />
                    </SelectTrigger>
                    <SelectContent>
                      {applicants.map((applicant) => (
                        <SelectItem key={applicant.id} value={applicant.id}>
                          {applicant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedApplicant && (
                  <>
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
                      <span className="text-sm text-muted-foreground">
                        Submitting for:
                      </span>
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <button
                          type="button"
                          disabled={!selectedApplicant.headshot_url}
                          onClick={() =>
                            selectedApplicant.headshot_url &&
                            setHeadshotPreviewOpen(true)
                          }
                          className={cn(
                            "shrink-0 rounded-full p-0 outline-none transition-[opacity,box-shadow] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            selectedApplicant.headshot_url
                              ? "cursor-pointer hover:opacity-90"
                              : "cursor-default",
                          )}
                          aria-label={
                            selectedApplicant.headshot_url
                              ? `View full-size photo of ${selectedApplicant.name}`
                              : undefined
                          }
                        >
                          <Avatar className="pointer-events-none h-12 w-12 border border-border/60 shadow-sm">
                            {selectedApplicant.headshot_url ? (
                              <AvatarImage
                                src={selectedApplicant.headshot_url}
                                alt=""
                              />
                            ) : null}
                            <AvatarFallback className="text-sm font-semibold">
                              {applicantInitials(selectedApplicant.name)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <span className="min-w-0 truncate text-base font-medium">
                          {selectedApplicant.name}
                        </span>
                      </div>
                    </div>
                    <Dialog
                      open={headshotPreviewOpen}
                      onOpenChange={setHeadshotPreviewOpen}
                    >
                      <DialogContent className="max-h-[min(92vh,900px)] w-[min(92vw,900px)] max-w-[min(92vw,900px)] gap-0 overflow-hidden border bg-background p-0 sm:max-w-[min(92vw,900px)]">
                        <DialogHeader className="sr-only">
                          <DialogTitle>
                            {selectedApplicant.name} — headshot
                          </DialogTitle>
                        </DialogHeader>
                        {selectedApplicant.headshot_url ? (
                          <img
                            src={selectedApplicant.headshot_url}
                            alt={`${selectedApplicant.name} headshot`}
                            className="max-h-[min(88vh,860px)] w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                      </DialogContent>
                    </Dialog>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="submission-text">Details</Label>
                  <div id="submission-text" className="min-h-[280px]">
                    <RichTextEditor
                      content={submissionText}
                      onChange={setSubmissionText}
                      placeholder={placeholder}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{helperText}</p>
                </div>

                {formType === "red-flag" && (
                  <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="anonymous-switch">
                          Submit anonymously
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Your identity will be hidden.
                        </p>
                      </div>
                      <Switch
                        id="anonymous-switch"
                        checked={isAnonymousToOwner}
                        onCheckedChange={setIsAnonymousToOwner}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="followup-switch">
                          Should the board follow up with you?
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Turn this on if you'd like us to follow up with you.
                        </p>
                      </div>
                      <Switch
                        id="followup-switch"
                        checked={wantsBoardFollowUp}
                        onCheckedChange={setWantsBoardFollowUp}
                      />
                    </div>

                    {wantsBoardFollowUp && (
                      <div className="space-y-2">
                        <Label htmlFor="follow-up-contact">
                          Contact details
                        </Label>
                        <Input
                          id="follow-up-contact"
                          value={followUpContact}
                          onChange={(e) => setFollowUpContact(e.target.value)}
                          placeholder="Email, phone, or preferred contact method"
                        />
                        <p className="text-xs text-muted-foreground">
                          How should the board reach you?
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !selectedApplicantId}
                  className="w-full"
                >
                  {submitting ? "Submitting..." : "Submit Form"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
