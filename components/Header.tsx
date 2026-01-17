import useUser from "@/app/hook/useUser";
import { Organization } from "@/contexts/OrganizationContext";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/contexts/OrganizationContext";
import toast from "react-hot-toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ChevronDown, Settings, Archive, ArchiveRestore, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { ManageOrganizationDialog } from "./ManageOrganizationDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
import CreateRecruitmentCycleDialog from "./CreateRecruitmentCycleDialog";
import LogOutButton from "./LogOut";

export default function Header({
  currentOrg,
  setCurrentOrg,
  organizations,
  setOrganizations,
  currentCycle,
  setCurrentCycle,
  recruitmentCycles,
  setRecruitmentCycles,
  userId,
}: {
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  organizations: Organization[];
  setOrganizations: (orgs: Organization[]) => void;
  currentCycle: RecruitmentCycle | null;
  setCurrentCycle: (cycle: RecruitmentCycle) => void;
  recruitmentCycles: RecruitmentCycle[];
  setRecruitmentCycles: (cycles: RecruitmentCycle[]) => void;
  userId: string;
}) {
  const { isFetching, data: user, error } = useUser();
  const { setSelectedOrganization } = useOrganization();
  const [isArchiving, setIsArchiving] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<{
    cycle: RecruitmentCycle | null;
    archive: boolean;
  }>({ cycle: null, archive: false });

  // Check if user is Owner or Admin
  const isOwnerOrAdmin = currentOrg && (
    currentOrg.owner_id === user?.id || 
    currentOrg.role === "Owner" || 
    currentOrg.role === "Admin"
  );

  // Separate cycles into active and archived
  const activeCycles = recruitmentCycles.filter(cycle => !cycle.archived);
  const archivedCycles = recruitmentCycles.filter(cycle => cycle.archived);

  const handleOrgSelect = (org: Organization) => {
    setCurrentOrg(org);
    setSelectedOrganization(org); // Update the context
    localStorage.setItem(`lastUsedOrg_${userId}`, JSON.stringify(org));
  };

  const handleArchiveClick = (cycle: RecruitmentCycle, archive: boolean) => {
    setConfirmArchive({ cycle, archive });
  };

  const handleArchiveConfirm = async () => {
    const { cycle, archive } = confirmArchive;
    if (!cycle || !currentOrg || !user) return;

    setIsArchiving(cycle.id);
    setConfirmArchive({ cycle: null, archive: false });
    
    try {
      const response = await fetch("/api/recruitment_cycles/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cycle_id: cycle.id,
          user_id: user.id,
          organization_id: currentOrg.id,
          archived: archive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update cycle");
      }

      const updatedCycle = await response.json();
      
      // Update the cycles list
      const updatedCycles = recruitmentCycles.map(c => 
        c.id === cycle.id ? updatedCycle : c
      );
      setRecruitmentCycles(updatedCycles);

      // If archiving the current cycle, don't change selection
      // If unarchiving, user can manually select it
      
      toast.success(archive ? "Cycle archived successfully" : "Cycle unarchived successfully");
    } catch (error: any) {
      console.error("Error archiving cycle:", error);
      toast.error(error.message || "Failed to update cycle");
    } finally {
      setIsArchiving(null);
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <Link href="#" className="font-semibold">
        Recruitify
      </Link>
      <div className="flex items-center gap-4">
        {/* Organization Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={currentOrg ? "default" : "outline"} 
              size="sm"
              className={cn(
                currentOrg && "bg-primary text-primary-foreground"
              )}
            >
              {currentOrg ? currentOrg.name : "Select Organization"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Select Organization</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onSelect={() => handleOrgSelect(org)}
                className={cn(
                  "relative pl-8",
                  currentOrg?.id === org.id && "bg-accent font-semibold"
                )}
              >
                {currentOrg?.id === org.id && (
                  <Check className="absolute left-2 h-4 w-4" />
                )}
                {org.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <CreateOrganizationDialog
              user={user}
              organizations={organizations}
              setOrganizations={setOrganizations}
              setCurrentOrg={handleOrgSelect}
            />
            <ManageOrganizationDialog />
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Recruitment Cycle Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={currentCycle ? "default" : "outline"} 
              size="sm" 
              disabled={!currentOrg}
              className={cn(
                currentCycle && "bg-primary text-primary-foreground"
              )}
            >
              {currentOrg
                ? recruitmentCycles.length > 0
                  ? currentCycle?.name || "Create Recruitment Cycle"
                  : "Create Recruitment Cycle"
                : "Select Organization"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-[400px] overflow-y-auto">
            <DropdownMenuLabel>Select Cycle</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Active Cycles */}
            {activeCycles.length > 0 && (
              <>
                {activeCycles.map((cycle) => (
                  <DropdownMenuItem
                    key={cycle.id}
                    onSelect={() =>
                      setCurrentCycle({
                        id: cycle.id,
                        name: cycle.name,
                        created_at: cycle.created_at,
                        organization_id: cycle.organization_id,
                        archived: cycle.archived,
                      })
                    }
                    className={cn(
                      "flex items-center justify-between group relative pl-8",
                      currentCycle?.id === cycle.id && "bg-accent font-semibold"
                    )}
                  >
                    {currentCycle?.id === cycle.id && (
                      <Check className="absolute left-2 h-4 w-4" />
                    )}
                    <span>{cycle.name}</span>
                    {isOwnerOrAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveClick(cycle, true);
                        }}
                        disabled={isArchiving === cycle.id}
                        className="ml-2 opacity-0 group-hover:opacity-70 transition-all duration-200 hover:opacity-100 hover:scale-110 hover:text-muted-foreground active:scale-95"
                        title="Archive cycle"
                      >
                        <Archive className="h-3.5 w-3.5 transition-transform duration-200" />
                      </button>
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {/* Archived Cycles (only for Owners/Admins) */}
            {isOwnerOrAdmin && archivedCycles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-muted-foreground">
                  Archived
                </DropdownMenuLabel>
                {archivedCycles.map((cycle) => (
                  <DropdownMenuItem
                    key={cycle.id}
                    onSelect={() =>
                      setCurrentCycle({
                        id: cycle.id,
                        name: cycle.name,
                        created_at: cycle.created_at,
                        organization_id: cycle.organization_id,
                        archived: cycle.archived,
                      })
                    }
                    className={cn(
                      "text-muted-foreground italic flex items-center justify-between group relative pl-8",
                      currentCycle?.id === cycle.id && "bg-accent font-semibold not-italic"
                    )}
                  >
                    {currentCycle?.id === cycle.id && (
                      <Check className="absolute left-2 h-4 w-4" />
                    )}
                    <span>{cycle.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveClick(cycle, false);
                      }}
                      disabled={isArchiving === cycle.id}
                      className="ml-2 opacity-0 group-hover:opacity-70 transition-all duration-200 hover:opacity-100 hover:scale-110 hover:text-foreground active:scale-95"
                      title="Unarchive cycle"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5 transition-transform duration-200" />
                    </button>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            {isOwnerOrAdmin && currentOrg && (
              <CreateRecruitmentCycleDialog
                selectedOrganization={currentOrg}
                recruitmentCycles={recruitmentCycles}
                setRecruitmentCycles={setRecruitmentCycles}
                setCurrentCycle={setCurrentCycle}
              />
            )}
            {isOwnerOrAdmin && (
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Recruitment Cycle
                  </DropdownMenuItem>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Recruitment Cycle</DialogTitle>
                  <DialogDescription>
                    Edit the details of your recruitment cycle.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="cycleName">Cycle Name</Label>
                      <Input id="cycleName" defaultValue={currentCycle?.name} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logout Button */}
        <LogOutButton />
      </div>

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={confirmArchive.cycle !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmArchive({ cycle: null, archive: false });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmArchive.archive ? "Archive Recruitment Cycle?" : "Unarchive Recruitment Cycle?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmArchive.archive ? (
                <>
                  Are you sure you want to archive <strong>{confirmArchive.cycle?.name}</strong>?
                  <br />
                  <br />
                  Archived cycles will be hidden from members but remain accessible to owners and admins.
                  You can unarchive this cycle at any time.
                </>
              ) : (
                <>
                  Are you sure you want to unarchive <strong>{confirmArchive.cycle?.name}</strong>?
                  <br />
                  <br />
                  This will make the cycle visible to all members again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveConfirm}
              disabled={isArchiving === confirmArchive.cycle?.id}
              className={confirmArchive.archive ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isArchiving === confirmArchive.cycle?.id ? (
                "Processing..."
              ) : confirmArchive.archive ? (
                "Archive"
              ) : (
                "Unarchive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
