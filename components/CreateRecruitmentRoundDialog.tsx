import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import toast from "react-hot-toast";
import { RecruitmentRound } from "@/lib/types/RecruitmentRound";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";

type CreateRecruitmentRoundDialogProps = {
  currentRecruitmentCycle: RecruitmentCycle;
  recruitmentRounds: RecruitmentRound[];
  setRecruitmentRounds: (rounds: RecruitmentRound[]) => void;
};

export default function CreateRecruitmentRoundDialog({
  currentRecruitmentCycle,
  recruitmentRounds,
  setRecruitmentRounds,
}: CreateRecruitmentRoundDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recruitment_rounds/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          recruitment_cycle_id: currentRecruitmentCycle?.id,
        }),
      });

      if (response.ok) {
        const resp = await response.json();
        const newRound: RecruitmentRound[] = resp;

        const updatedRounds = [...recruitmentRounds, newRound[0]];
        setRecruitmentRounds(updatedRounds); // Update recruitment rounds dynamically

        toast.success("Recruitment round created successfully!");
        setOpen(false);
        setName(""); // Reset the input field
      } else {
        const error = await response.json();
        toast.error(error.error);
      }
    } catch (error) {
      console.error("Error creating recruitment round:", error);
      toast.error("Failed to create recruitment round.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={loading}>
          <Plus className="h-4 w-4" />
          <span className="sr-only">Create Round</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Round</DialogTitle>
          <DialogDescription>
            Add a new round to the recruitment process.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="roundName">Round Name</Label>
              <Input
                id="roundName"
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
              {loading ? "Creating..." : "Create Round"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
