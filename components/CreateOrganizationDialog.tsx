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
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Organization, useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "./ui/Toast";

type CreateOrganizationDialogProps = {
  user: any; // Replace 'any' with the appropriate type for the user
};
export function CreateOrganizationDialog({
  user,
}: CreateOrganizationDialogProps) {
  const { selectedOrganization, setSelectedOrganization } = useOrganization();
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
        body: JSON.stringify({ name, user }),
      });

      const data = await response.json();

      if (!response.ok) {
        // if error.code === '23505' || error.message.includes('duplicate key value violates unique constraint')
        throw new Error(data.error || "An error occurred");
      }
      console.log("created org: ",data);

      setError("");
      setName("");
      setOpen(false);
      toast("Organization created successfully!", "success");

      // create var of type organization from OrganizationContext
      const newOrganization: Organization = {
        id: data[0].id,
        name: data[0].name,
        owner_id: data[0].owner_id,
        created_at: data[0].created_at,
      };


      setSelectedOrganization(newOrganization);
      router.refresh();
    } catch (err: any) {
      if (err.code === '23505' || err.message.includes('duplicate key value violates unique constraint "organizations_name_key"')) {
        setError("Organization name already exists. Please choose a different name.");
      } else {
        setError(err.message);
      }
      
    } finally {
      setLoading(false);
      router.refresh();
    }
  };

  // if dialog is closed, clear error and name
  useEffect(() => {
    if (!open) {
      setError("");
      setName("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Organization</Button>
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
