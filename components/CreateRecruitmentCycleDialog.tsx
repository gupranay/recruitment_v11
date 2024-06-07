import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "./ui/Toast";

export default function CreateRecruitmentCycleDialog() {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const { selectedOrganization } = useOrganization();

  const handleCreate = async () => {
    const response = await fetch("/api/recruitment_cycles/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, organization_id: selectedOrganization?.id }),
    });

    if (response.ok) {
      toast("Recruitment cycle created successfully!", "success");
      setOpen(false);
      setName(""); // reset the input field
      window.location.reload();
    } else {
      const error = await response.json();
      toast(error.error, "error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Recruitment Cycle</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Recruitment Cycle</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Recruitment cycle name"
            className="col-span-3"
          />
        </div>
        <Button onClick={handleCreate} className="mt-4">
          Create
        </Button>
      </DialogContent>
    </Dialog>
  );
}
