//components/ApplicantCard.tsx
import { ApplicantCardType } from "@/lib/types/ApplicantCardType";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Expand, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import toast from "react-hot-toast";
import { AlertDialogHeader, AlertDialogFooter } from "./ui/alert-dialog";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import ApplicationDialog from "./ApplicationDialog";
import useUser from "@/app/hook/useUser";

interface ApplicantCardProps {
  applicant: ApplicantCardType;
  onMoveToNextRound: (id: string) => void;
  onReject: (id: string) => void;
  fetchApplicants: () => Promise<void>;
  isLastRound: boolean;
  onClick?: () => void;
}

export default function ApplicantCard({
  applicant,
  onMoveToNextRound,
  onReject,
  fetchApplicants,
  isLastRound,
}: ApplicantCardProps) {
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false); // Loading state for accepting
  const [isRejecting, setIsRejecting] = useState(false); // Loading state for rejecting
  const { data: user } = useUser();

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

  return (
    <Card
      className={`${
        applicant.status === "accepted"
          ? "border-green-500"
          : applicant.status === "rejected"
          ? "border-destructive"
          : ""
      } flex flex-col justify-between mx-auto w-[250px]`} // Fixed card width
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
          {applicant.status === "in_progress" && (
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
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                  <AlertDialogDescription>
                    What do you want to do with{" "}
                    {applicant.name || "this applicant"}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex justify-end space-x-4">
                  <AlertDialogCancel className="w-auto px-4 py-2">
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    variant="outline"
                    onClick={handleMoveToNextRound}
                    disabled={isAccepting} // Disable the button while loading
                    className="w-auto px-4 py-2 bg-green-500 text-white hover:bg-green-600"
                  >
                    {isAccepting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {isLastRound ? "Finalize Applicant" : "Move to Next Round"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRejectApplicant}
                    disabled={isRejecting} // Disable the button while loading
                    className="w-auto px-4 py-2 bg-red-500 text-white hover:bg-red-600"
                  >
                    {isRejecting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Reject Applicant
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
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
      </CardFooter>
      <ApplicationDialog
        applicantId={applicant.applicant_id}
        applicantRoundId={applicant.applicant_round_id}
        userId={user?.id}
        isOpen={isApplicationDialogOpen}
        onClose={() => setIsApplicationDialogOpen(false)}
      />
    </Card>
  );
}