import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Applicant {
  id: string;
  name: string;
  status: string;
  rejected: boolean;
}

interface ApplicantCardProps {
  applicant: Applicant;
  onMoveToNextRound: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ApplicantCard({ applicant, onMoveToNextRound, onReject }: ApplicantCardProps) {
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [showRejectConfirmation, setShowRejectConfirmation] = useState(false);

  return (
    <Card className={applicant.rejected ? "border-destructive" : ""}>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          {applicant.name}
          {applicant.rejected && <Badge variant="destructive">Rejected</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-[3/4] rounded-lg bg-muted" />
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">{applicant.status}</div>
        <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setIsAlertDialogOpen(true)}
            >
              {applicant.rejected ? "Rejected" : "Move or Reject"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Action</AlertDialogTitle>
              <AlertDialogDescription>
                Do you want to move {applicant.name} to the next round or reject them?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {!applicant.rejected && (
                <>
                  <AlertDialogAction
                    onClick={() => {
                      onMoveToNextRound(applicant.id);
                      setIsAlertDialogOpen(false);
                    }}
                  >
                    Move to Next Round
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => {
                      setShowRejectConfirmation(true);
                      setIsAlertDialogOpen(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject Applicant
                  </AlertDialogAction>
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
      <AlertDialog open={showRejectConfirmation} onOpenChange={setShowRejectConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject {applicant.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRejectConfirmation(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReject(applicant.id);
                setShowRejectConfirmation(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
