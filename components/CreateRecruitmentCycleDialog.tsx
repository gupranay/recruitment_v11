import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import toast from "react-hot-toast";
import { Organization } from "@/contexts/OrganizationContext";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";
import { useRecruitmentCycle } from "@/contexts/RecruitmentCycleContext";

type CreateRecruitmentCycleDialogProps = {
  selectedOrganization: Organization;
  recruitmentCycles: RecruitmentCycle[];
  setRecruitmentCycles: (cycles: RecruitmentCycle[]) => void;
  setCurrentCycle?: (cycle: RecruitmentCycle) => void;
  forceOpen?: boolean;
  onForceOpenChange?: (open: boolean) => void;
};

export default function CreateRecruitmentCycleDialog({
  selectedOrganization,
  recruitmentCycles,
  setRecruitmentCycles,
  setCurrentCycle,
  forceOpen,
  onForceOpenChange,
}: CreateRecruitmentCycleDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof forceOpen === "boolean";
  const open = isControlled ? (forceOpen as boolean) : internalOpen;
  const handleOpenChange = (next: boolean) => {
    if (isControlled) {
      onForceOpenChange?.(next);
      if (!next) {
        setInternalOpen(false);
      }
    } else {
      setInternalOpen(next);
    }
  };
  const { setSelectedRecruitmentCycle } = useRecruitmentCycle();

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recruitment_cycles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          organization_id: selectedOrganization?.id,
        }),
      });

      if (response.ok) {
        const resp = await response.json();
        const newCycle: RecruitmentCycle[] = resp;

        const updatedCycles = [...recruitmentCycles, newCycle[0]];
        setRecruitmentCycles(updatedCycles); // Update recruitment cycles dynamically
        setSelectedRecruitmentCycle(newCycle[0]); // Set the newly created cycle as selected
        if (setCurrentCycle) {
          setCurrentCycle(newCycle[0]); // Set the current cycle in the dashboard
        }

        toast.success("Recruitment cycle created successfully!");
        handleOpenChange(false);
        setName(""); // Reset the input field
      } else {
        const error = await response.json();
        toast.error(error.error);
      }
    } catch (error) {
      console.error("Error creating recruitment cycle:", error);
      toast.error("Failed to create recruitment cycle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* When controlled via forceOpen, caller decides how to open it, so omit trigger */}
      {!isControlled && (
        <DialogTrigger asChild>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Recruitment Cycle
          </DropdownMenuItem>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Recruitment Cycle</DialogTitle>
          <DialogDescription>
            Enter the details for the new recruitment cycle.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cycleName">Cycle Name</Label>
              <Input
                id="cycleName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading} // Disable input during loading
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleCreate}
              disabled={loading} // Disable button during loading
            >
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
