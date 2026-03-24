"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Organization, useOrganization } from "@/contexts/OrganizationContext";
import toast from "react-hot-toast";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"; // Adjusted import for consistency
import { Plus } from "lucide-react";

type CreateOrganizationDialogProps = {
  user: any; // User object
  organizations: Organization[];
  setOrganizations: (orgs: Organization[]) => void;
  setCurrentOrg: (org: Organization) => void;
  useMenuItemTrigger?: boolean;
  forceOpen?: boolean;
  onForceOpenChange?: (open: boolean) => void;
};

export function CreateOrganizationDialog({
  user,
  organizations,
  setOrganizations,
  setCurrentOrg,
  useMenuItemTrigger = true,
  forceOpen,
  onForceOpenChange,
}: CreateOrganizationDialogProps) {
  const { organizations: contextOrgs, setOrganizations: setContextOrganizations, setSelectedOrganization } =
    useOrganization();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);
  const router = useRouter();

  const isControlled = typeof forceOpen === "boolean";
  const open = isControlled ? (forceOpen as boolean) : internalOpen;
  const handleOpenChange = (next: boolean) => {
    if (isControlled) {
      onForceOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  const handleCreateOrganization = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/organizations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An error occurred");
      }

      // Add the new organization to the list
      const newOrganization: Organization = {
        id: data.id,
        name: data.name,
        owner_id: data.owner_id,
        created_at: data.created_at,
        role: "Owner", // Add the role property since the creator is always the owner
      };

      const nextOrgs = [...organizations, newOrganization];
      setOrganizations(nextOrgs);
      // Keep context in sync and ensure global selection updates
      const nextContextOrgs =
        contextOrgs.length > 0 ? [...contextOrgs, newOrganization] : [newOrganization];
      setContextOrganizations(nextContextOrgs);
      setSelectedOrganization(newOrganization);
      setCurrentOrg(newOrganization); // Set the newly created organization as the current organization
      toast.success("Organization created successfully!");

      setName("");
      handleOpenChange(false);
      router.refresh(); // Refresh the page to reflect changes
    } catch (err: any) {
      if (
        err.code === "23505" ||
        err.message.includes(
          'duplicate key value violates unique constraint "organizations_name_key"'
        )
      ) {
        setError(
          "Organization name already exists. Please choose a different name."
        );
      } else {
        setError(err.message || "Something went wrong while creating the organization.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear error and name when dialog is closed
  useEffect(() => {
    if (!open) {
      setError("");
      setName("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* When forceOpen is used (controlled mode), caller handles how to open it,
          so we omit the trigger entirely to avoid stray buttons. */}
      {!isControlled && (
        <DialogTrigger asChild>
          {useMenuItemTrigger !== false ? (
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create Organization</span>
            </DropdownMenuItem>
          ) : (
            <Button type="button" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              <span>Create Organization</span>
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Give your organization a clear, recognizable name. You can change this later in settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Recruiting"
              autoFocus
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleCreateOrganization}
            disabled={loading || !name.trim()}
          >
            {loading ? "Creating..." : "Create organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
