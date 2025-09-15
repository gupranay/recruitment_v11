import { ApplicantCardType } from "@/lib/types/ApplicantCardType";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { Loader2, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface ApplicantListItemProps {
  applicant: ApplicantCardType;
  onClick: () => void;
  onMoveToNextRound: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  isLastRound: boolean;
  fetchApplicants: () => Promise<void>;
}

export default function ApplicantListItem({
  applicant,
  onClick,
  onMoveToNextRound,
  onReject,
  isLastRound,
  fetchApplicants,
}: ApplicantListItemProps) {
  const [isAccepting, setIsAccepting] = useState(false); // Loading state for accepting
  const [isRejecting, setIsRejecting] = useState(false); // Loading state for rejecting
  const [isSettingMaybe, setIsSettingMaybe] = useState(false);
  const [isChangingDecision, setIsChangingDecision] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false); // Confirm dialog state
  const [showChangeDecisionDialog, setShowChangeDecisionDialog] =
    useState(false);

  const handleMoveToNextRound = async () => {
    setIsAccepting(true);
    try {
      const endpoint = isLastRound
        ? "/api/applicant/finalize"
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
        throw new Error("Failed to move the applicant to the next round.");
      }

      toast.success(
        isLastRound
          ? "Applicant finalized successfully!"
          : "Applicant moved to the next round successfully!"
      );
      onMoveToNextRound(applicant.applicant_id);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsAccepting(false);
      setIsAlertDialogOpen(false);
      fetchApplicants();
    }
  };

  const handleRejectApplicant = async () => {
    setIsRejecting(true);
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

      toast.success("Applicant rejected successfully.");
      onReject(applicant.applicant_id);
    } catch (error) {
      console.error("Error rejecting applicant:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsRejecting(false);
      setIsAlertDialogOpen(false);
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
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while changing the decision."
      );
    } finally {
      setIsChangingDecision(false);
      setShowChangeDecisionDialog(false);
    }
  };

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

  return (
    <div className="flex items-center justify-between p-4 bg-card hover:shadow-md border rounded-lg cursor-pointer transition-all">
      {/* Left: Applicant Name and Status */}
      <div className="flex items-center space-x-4 flex-grow" onClick={onClick}>
        <div>
          <h3 className="text-lg font-medium">
            {applicant.name || "Unnamed Applicant"}
          </h3>
          <Badge
            variant={
              applicant.status === "accepted"
                ? "default"
                : applicant.status === "rejected"
                ? "destructive"
                : applicant.status === "maybe"
                ? "outline"
                : "secondary"
            }
            className={
              applicant.status === "maybe" ? "bg-yellow-100" : undefined
            }
          >
            {applicant.status}
          </Badge>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="ml-2">View</span>
        </Button>
        {(applicant.status === "in_progress" ||
          applicant.status === "maybe") && (
          <>
            <AlertDialog
              open={isAlertDialogOpen}
              onOpenChange={setIsAlertDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="p-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAlertDialogOpen(true);
                  }}
                >
                  Decide
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </AlertDialogClose>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {applicant.status === "maybe"
                      ? "Confirm Decision"
                      : "Confirm Action"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    What do you want to do with{" "}
                    {applicant.name || "this applicant"}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col space-y-2">
                  <div className="flex flex-col space-y-2 w-full">
                    {applicant.status !== "maybe" && (
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetMaybe();
                        }}
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
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveToNextRound();
                      }}
                      disabled={isAccepting}
                      className="w-full bg-green-500 text-white hover:bg-green-600"
                    >
                      {isAccepting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {isLastRound ? "Finalize" : "Move to Next Round"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectApplicant();
                      }}
                      disabled={isRejecting}
                      className="w-full"
                    >
                      {isRejecting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Reject
                    </Button>
                  </div>
                  {applicant.status !== "maybe" && (
                    <AlertDialogCancel
                      className="w-full mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Cancel
                    </AlertDialogCancel>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        {(applicant.status === "accepted" ||
          applicant.status === "rejected") && (
          <Button
            size="sm"
            variant="outline"
            className="p-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setShowChangeDecisionDialog(true);
            }}
            disabled={isChangingDecision}
          >
            {isChangingDecision ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            Change Decision
          </Button>
        )}
      </div>
      <AlertDialog
        open={showChangeDecisionDialog}
        onOpenChange={setShowChangeDecisionDialog}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Decision</AlertDialogTitle>
            <AlertDialogDescription>
              What would you like to change {applicant.name || "this applicant"}
              's status to?
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
    </div>
  );
}
