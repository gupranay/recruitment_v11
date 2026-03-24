 "use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SessionStatus = "open" | "locked";

interface ApplicantToolbarProps {
  roundName: string;
  sessionStatus: SessionStatus | null;
  isOwnerOrAdmin: boolean;
  onToggleLock?: () => void;
  isSubmittingLock?: boolean;
  primaryActions?: ReactNode;
  secondaryActions?: ReactNode;
  filtersRow?: ReactNode;
}

export function ApplicantToolbar({
  roundName,
  sessionStatus,
  isOwnerOrAdmin,
  onToggleLock,
  isSubmittingLock,
  primaryActions,
  secondaryActions,
  filtersRow,
}: ApplicantToolbarProps) {
  const router = useRouter();

  const isLocked = sessionStatus === "locked";

  return (
    <header className="border-b px-6 py-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dash")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Delibs: {roundName}</h1>
              <p className="text-sm text-muted-foreground">
                Deliberation voting for final round applicants
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant={isLocked ? "destructive" : "secondary"}
              className="flex items-center gap-1"
            >
              {isLocked ? "Locked" : "Open"}
            </Badge>

            {isOwnerOrAdmin && onToggleLock && (
              <Button
                variant={isLocked ? "outline" : "destructive"}
                size="sm"
                disabled={isSubmittingLock}
                onClick={onToggleLock}
              >
                {isLocked ? "Unlock voting" : "Lock voting"}
              </Button>
            )}
          </div>
        </div>

        {(primaryActions || secondaryActions) && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {primaryActions}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {secondaryActions}
            </div>
          </div>
        )}

        {filtersRow && (
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/60 mt-1">
            {filtersRow}
          </div>
        )}
      </div>
    </header>
  );
}

