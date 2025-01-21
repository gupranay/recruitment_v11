import { ApplicantCardType } from "@/lib/types/ApplicantCardType";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
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
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false); // Confirm dialog state

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

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-card hover:shadow-md border rounded-lg cursor-pointer transition-all"
    >
      {/* Left: Applicant Name and Status */}
      <div>
        <h3 className="text-lg font-medium">{applicant.name || "Unnamed Applicant"}</h3>
        <Badge
          variant={
            applicant.status === "accepted"
              ? "default"
              : applicant.status === "rejected"
              ? "destructive"
              : "secondary"
          }
        >
          {applicant.status}
        </Badge>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center space-x-2">
        {applicant.status === "in_progress" && (
          <>
            <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="p-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevents triggering the parent onClick
                    setIsAlertDialogOpen(true);
                  }}
                >
                  Decide
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                  <AlertDialogDescription>
                    What do you want to do with {applicant.name || "this applicant"}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex justify-end space-x-4">
                  <AlertDialogCancel
                    className="w-auto px-4 py-2"
                    onClick={(e) => e.stopPropagation()} // Prevents parent click on cancel
                  >
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents parent click
                      handleMoveToNextRound();
                    }}
                    disabled={isAccepting}
                    className="w-auto px-4 py-2 bg-green-500 text-white hover:bg-green-600"
                  >
                    {isAccepting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {isLastRound ? "Finalize" : "Move to Next Round"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents parent click
                      handleRejectApplicant();
                    }}
                    disabled={isRejecting}
                    className="w-auto px-4 py-2 bg-red-500 text-white hover:bg-red-600"
                  >
                    {isRejecting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Reject
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
        {applicant.status === "accepted" && (
          <Button
            size="sm"
            variant="outline"
            className="p-1 text-xs opacity-50 cursor-not-allowed"
            disabled
          >
            Accepted
          </Button>
        )}
      </div>
    </div>
  );
}
