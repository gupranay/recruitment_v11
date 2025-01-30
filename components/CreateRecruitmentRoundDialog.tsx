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
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { RecruitmentRound } from "@/lib/types/RecruitmentRound";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";
import { ScrollArea } from "@/components/ui/scroll-area"; // Ensure ScrollArea is imported

type CreateRecruitmentRoundDialogProps = {
  currentRecruitmentCycle: RecruitmentCycle;
  recruitmentRounds: RecruitmentRound[];
  setRecruitmentRounds: (rounds: RecruitmentRound[]) => void;
};

interface Metric {
  name: string;
  weight: number;
}

export default function CreateRecruitmentRoundDialog({
  currentRecruitmentCycle,
  recruitmentRounds,
  setRecruitmentRounds,
}: CreateRecruitmentRoundDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Metrics State
  const [metrics, setMetrics] = useState<Metric[]>([{ name: "", weight: 0 }]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateWeights();
  }, [metrics]);

  // Add new metric
  const addMetric = () => {
    setMetrics([...metrics, { name: "", weight: 0 }]);
  };

  // Remove metric
  const removeMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  // Update metric value
  const updateMetric = (index: number, field: keyof Metric, value: string | number) => {
    setMetrics(metrics.map((metric, i) => (i === index ? { ...metric, [field]: value } : metric)));
  };

  // Validate total weights = 1
  const validateWeights = () => {
    const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.001) {
      setError(`Total weight must be 1. Current total: ${totalWeight.toFixed(3)}`);
    } else {
      setError(null);
    }
  };

  // Adjust weights to sum 1
  const adjustWeights = () => {
    const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
    if (totalWeight === 0) {
      const evenWeight = 1 / metrics.length;
      setMetrics(metrics.map((metric) => ({ ...metric, weight: evenWeight })));
    } else {
      const factor = 1 / totalWeight;
      setMetrics(metrics.map((metric) => ({ ...metric, weight: Number((metric.weight * factor).toFixed(4)) })));
    }
  };

  const handleCreate = async () => {
    if (error) return toast.error("Fix metric weight errors first.");

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
          metrics: metrics.map(({ name, weight }) => ({ name, weight })), // Send only name & weight
        }),
      });

      if (response.ok) {
        const resp = await response.json();
        const updatedRounds = [...recruitmentRounds, resp.data];
        setRecruitmentRounds(updatedRounds);

        toast.success("Recruitment round created successfully!");
        setOpen(false);
        setName("");
        setMetrics([{ name: "", weight: 0 }]); // Reset metrics
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
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Round</DialogTitle>
          <DialogDescription>
            Add a new round to the recruitment process and define evaluation metrics.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {/* Scrollable Content */}
          <ScrollArea className="h-[45vh] px-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="roundName">Round Name</Label>
                <Input
                  id="roundName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Metrics Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Evaluation Metrics</h3>
              {metrics.map((metric, index) => (
                <div key={index} className="p-2 border rounded">
                  <div className="flex items-center justify-between">
                    <Label>Metric {index + 1}</Label>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMetric(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor={`name-${index}`}>Name</Label>
                      <Input
                        id={`name-${index}`}
                        value={metric.name}
                        onChange={(e) => updateMetric(index, "name", e.target.value)}
                        placeholder="Enter metric name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`weight-${index}`}>Weight</Label>
                      <Input
                        id={`weight-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={metric.weight}
                        onChange={(e) => updateMetric(index, "weight", Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addMetric} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Metric
              </Button>
              <Button type="button" variant="secondary" onClick={adjustWeights} className="w-full">
                Adjust Weights to Sum 1
              </Button>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button type="submit" onClick={handleCreate} disabled={loading || !!error} className="w-full">
            {loading ? "Creating..." : "Create Round"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
