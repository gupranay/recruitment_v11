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
import { Organization } from "@/contexts/OrganizationContext";
import toast from "react-hot-toast";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"; // Adjusted import for consistency
import { Plus } from "lucide-react";

type CreateOrganizationDialogProps = {
  user: any; // User object
  organizations: Organization[];
  setOrganizations: (orgs: Organization[]) => void;
  setCurrentOrg: (org: Organization) => void;
};

export function CreateOrganizationDialog({
  user,
  organizations,
  setOrganizations,
  setCurrentOrg,
}: CreateOrganizationDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

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

      setOrganizations([...organizations, newOrganization]);
      setCurrentOrg(newOrganization); // Set the newly created organization as the current organization
      toast.success("Organization created successfully!");

      setName("");
      setOpen(false);
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
        setError(err.message);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Plus className="mr-2 h-4 w-4" />
          <span>Create Organization</span>
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Enter the name of the new organization.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
            {error && <div className="col-span-4 text-red-500">{error}</div>}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleCreateOrganization}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
