import useUser from "@/app/hook/useUser";
import { Organization } from "@/contexts/OrganizationContext";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";
import { useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/contexts/OrganizationContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ChevronDown, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
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

  const handleOrgSelect = (org: Organization) => {
    setCurrentOrg(org);
    setSelectedOrganization(org); // Update the context
    localStorage.setItem(`lastUsedOrg_${userId}`, JSON.stringify(org));
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
            <Button variant="outline" size="sm">
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
              >
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
            <Button variant="outline" size="sm" disabled={!currentOrg}>
              {currentOrg
                ? recruitmentCycles.length > 0
                  ? currentCycle?.name || "Create Recruitment Cycle"
                  : "Create Recruitment Cycle"
                : "Select Organization"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Select Cycle</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recruitmentCycles.map((cycle) => (
              <DropdownMenuItem
                key={cycle.id}
                onSelect={() =>
                  setCurrentCycle({
                    id: cycle.id,
                    name: cycle.name,
                    created_at: cycle.created_at,
                    organization_id: cycle.organization_id,
                  })
                }
              >
                {cycle.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {currentOrg && (
              <CreateRecruitmentCycleDialog
                selectedOrganization={currentOrg}
                recruitmentCycles={recruitmentCycles}
                setRecruitmentCycles={setRecruitmentCycles}
              />
            )}
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
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logout Button */}
        <LogOutButton />
      </div>
    </header>
  );
}
