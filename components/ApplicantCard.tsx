//components/ApplicantCard.tsx
import { ApplicantCardType } from "@/lib/types/ApplicantCardType";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogClose,
  AlertDialogHeader,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Expand, ChevronRight, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./ui/card";
import ApplicationDialog from "./ApplicationDialog";
import useUser from "@/app/hook/useUser";

interface ApplicantCardProps {
  applicant: ApplicantCardType;
  onMoveToNextRound: (id: string) => void;
  onReject: (id: string) => void;
  fetchApplicants: () => Promise<void>;
  isLastRound: boolean;
  onClick?: () => void;
  isOwnerOrAdmin?: boolean;
}

export default function ApplicantCard({
  applicant,
  onMoveToNextRound,
  onReject,
  fetchApplicants,
  isLastRound,
  isOwnerOrAdmin = true,
}: ApplicantCardProps) {
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSettingMaybe, setIsSettingMaybe] = useState(false);
  const [isChangingDecision, setIsChangingDecision] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showChangeDecisionDialog, setShowChangeDecisionDialog] =
    useState(false);
  const { data: user } = useUser();

  const handleSetMaybe = async () => {
    setIsSettingMaybe(true);
    try {
      const response = await fetch("/api/applicant/maybe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicant_id: applicant.applicant_id,
          applicant_round_id: applicant.applicant_round_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set the applicant as maybe.");
      }
    } catch (error) {
      console.error("Error setting applicant as maybe:", error);
      alert("An error occurred while setting the applicant as maybe.");
    } finally {
      setIsSettingMaybe(false);
      setIsAlertDialogOpen(false);
      toast.success("Applicant marked as maybe");
      fetchApplicants();
    }
  };

  const handleMoveToNextRound = async () => {
    setIsAccepting(true); // Start loading state for accepting
    try {
      const endpoint = isLastRound
        ? "/api/applicant/finalize" // Different API for the last recruitment round
        : "/api/applicant/accept";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicant_id: applicant.applicant_id,
          applicant_round_id: applicant.applicant_round_id,
        }),
      });

      if (!response.ok) {
        throw new Error(
          isLastRound
            ? "Failed to finalize the applicant."
            : "Failed to move the applicant to the next round."
        );
      }

      onMoveToNextRound(applicant.applicant_id);
    } catch (error) {
      console.error(error);
      alert(
        isLastRound
          ? "An error occurred while finalizing the applicant."
          : "An error occurred while moving the applicant to the next round."
      );
    } finally {
      setIsAccepting(false); // End loading state for accepting
      setIsAlertDialogOpen(false);
      toast.success(
        isLastRound
          ? "Applicant finalized successfully!"
          : "Applicant moved to the next round successfully!"
      );
      fetchApplicants();
    }
  };

  const handleRejectApplicant = async () => {
    setIsRejecting(true); // Start loading state for rejecting
    try {
      const response = await fetch("/api/applicant/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicant_id: applicant.applicant_id,
          applicant_round_id: applicant.applicant_round_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject the applicant.");
      }

      onReject(applicant.applicant_id);
    } catch (error) {
      console.error("Error rejecting applicant:", error);
      alert("An error occurred while rejecting the applicant.");
    } finally {
      setIsRejecting(false); // End loading state for rejecting
      setIsAlertDialogOpen(false);
      toast.success("Applicant rejected successfully");
      fetchApplicants();
    }
  };

  const handleChangeDecision = async (newStatus: string) => {
    setIsChangingDecision(true);
    try {
      const response = await fetch("/api/applicant/change-decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicant_id: applicant.applicant_id,
          applicant_round_id: applicant.applicant_round_id,
          new_status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change decision.");
      }

      const result = await response.json();

      // Update the UI based on the new status
      if (newStatus === "accepted") {
        onMoveToNextRound(applicant.applicant_id);
      } else if (newStatus === "rejected") {
        onReject(applicant.applicant_id);
      }

      toast.success(result.message);
      fetchApplicants();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "An error occurred while changing the decision."
      );
    } finally {
      setIsChangingDecision(false);
      setShowChangeDecisionDialog(false);
    }
  };

  return (
    <Card
      className={`${
        applicant.status === "accepted"
          ? "border-green-500"
          : applicant.status === "rejected"
          ? "border-destructive"
          : applicant.status === "maybe"
          ? "border-yellow-500"
          : ""
      } flex flex-col justify-between mx-auto w-[250px]`}
    >
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          {applicant.name || "Unnamed Applicant"}
          {applicant.status === "rejected" && (
            <Badge variant="destructive" className="text-xs">
              Rejected
            </Badge>
          )}
          {applicant.status === "accepted" && (
            <Badge variant="default" className="text-xs">
              Accepted
            </Badge>
          )}
          {applicant.status === "maybe" && (
            <Badge
              variant="outline"
              className="text-xs bg-yellow-100 dark:bg-yellow-900"
            >
              Maybe
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-[3/4] relative overflow-hidden rounded-lg bg-muted">
          {applicant.headshot_url && (
            <Image
              src={applicant.headshot_url}
              alt={`${applicant.name}'s headshot`}
              layout="fill"
              className="object-cover"
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-2">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="p-1 text-xs"
            onClick={() => setIsApplicationDialogOpen(true)}
          >
            <Expand className="h-3 w-3" />
            <span className="sr-only">Expand application</span>
          </Button>
          {isOwnerOrAdmin && (applicant.status === "in_progress" ||
            applicant.status === "maybe") && (
            <AlertDialog
              open={isAlertDialogOpen}
              onOpenChange={setIsAlertDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="p-1 text-xs"
                  onClick={() => setIsAlertDialogOpen(true)}
                >
                  Decide
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogClose onClick={() => setIsAlertDialogOpen(false)}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </AlertDialogClose>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Decision</AlertDialogTitle>
                  <AlertDialogDescription>
                    What do you want to do with{" "}
                    {applicant.name || "this applicant"}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col space-y-2">
                  <div className="flex flex-col space-y-2 w-full">
                    <Button
                      variant="outline"
                      onClick={handleMoveToNextRound}
                      disabled={isAccepting}
                      className="w-full bg-green-500 text-white hover:bg-green-600"
                    >
                      {isAccepting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {isLastRound
                        ? "Finalize Applicant"
                        : "Move to Next Round"}
                    </Button>
                    {applicant.status !== "maybe" && (
                      <Button
                        variant="outline"
                        onClick={handleSetMaybe}
                        disabled={isSettingMaybe}
                        className="w-full bg-yellow-500 text-white hover:bg-yellow-600"
                      >
                        {isSettingMaybe ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Mark as Maybe
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectConfirm(true)}
                      className="w-full"
                    >
                      Reject Applicant
                    </Button>
                  </div>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {isOwnerOrAdmin && (applicant.status === "accepted" ||
          applicant.status === "rejected") && (
          <Button
            size="sm"
            variant="outline"
            className="p-1 text-xs"
            onClick={() => setShowChangeDecisionDialog(true)}
            disabled={isChangingDecision}
          >
            {isChangingDecision ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            Change Decision
          </Button>
        )}
      </CardFooter>
      <ApplicationDialog
        applicantId={applicant.applicant_id}
        applicantRoundId={applicant.applicant_round_id}
        userId={user?.id}
        isOpen={isApplicationDialogOpen}
        onClose={() => setIsApplicationDialogOpen(false)}
        fetchApplicants={fetchApplicants}
      />
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject{" "}
              {applicant.name || "this applicant"}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRejectConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleRejectApplicant}
              disabled={isRejecting}
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Yes, Reject Applicant
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={showChangeDecisionDialog}
        onOpenChange={setShowChangeDecisionDialog}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Decision</AlertDialogTitle>
            <AlertDialogDescription>
              What would you like to change {applicant.name || "this applicant"}
              &apos;s status to?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2">
            <div className="flex flex-col space-y-2 w-full">
              {applicant.status === "rejected" && (
                <Button
                  variant="outline"
                  onClick={() => handleChangeDecision("accepted")}
                  disabled={isChangingDecision}
                  className="w-full bg-green-500 text-white hover:bg-green-600"
                >
                  {isChangingDecision ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {isLastRound
                    ? "Accept (Final)"
                    : "Accept & Move to Next Round"}
                </Button>
              )}
              {applicant.status === "accepted" && (
                <Button
                  variant="destructive"
                  onClick={() => handleChangeDecision("rejected")}
                  disabled={isChangingDecision}
                  className="w-full"
                >
                  {isChangingDecision ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Reject
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => handleChangeDecision("maybe")}
                disabled={isChangingDecision}
                className="w-full bg-yellow-500 text-white hover:bg-yellow-600"
              >
                {isChangingDecision ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Mark as Maybe
              </Button>
              <Button
                variant="outline"
                onClick={() => handleChangeDecision("in_progress")}
                disabled={isChangingDecision}
                className="w-full"
              >
                {isChangingDecision ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Reset to In Progress
              </Button>
            </div>
            <AlertDialogCancel
              onClick={() => setShowChangeDecisionDialog(false)}
            >
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
