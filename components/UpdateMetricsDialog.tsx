"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, X, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
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

type UpdateMetricsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recruitmentRoundId: string;
  roundName: string;
  cycleName: string;
  isReadOnly?: boolean;
};

interface Metric {
  id?: string;
  name: string;
  weight: number;
}

export default function UpdateMetricsDialog({
  open,
  onOpenChange,
  recruitmentRoundId,
  roundName,
  cycleName,
  isReadOnly = false,
}: UpdateMetricsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [hasScores, setHasScores] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingScores, setDeletingScores] = useState(false);

  // Metrics State
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [error, setError] = useState<string | null>(null);

  const validateWeights = useCallback(() => {
    if (metrics.length === 0) {
      setError(null);
      return;
    }
    const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.001) {
      setError(
        `Total weight must be 1. Current total: ${totalWeight.toFixed(3)}`
      );
    } else {
      setError(null);
    }
  }, [metrics]);

  useEffect(() => {
    validateWeights();
  }, [metrics, validateWeights]);

  // Load metrics and check for scores when dialog opens
  useEffect(() => {
    if (open && recruitmentRoundId) {
      loadMetricsAndCheckScores();
    } else {
      // Reset state when dialog closes
      setMetrics([]);
      setHasScores(false);
      setIsEditMode(false);
      setError(null);
    }
  }, [open, recruitmentRoundId]);

  const loadMetricsAndCheckScores = async () => {
    setLoadingMetrics(true);
    try {
      // Check if round has scores
      const scoresCheckResponse = await fetch("/api/scores/check-round", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recruitment_round_id: recruitmentRoundId }),
      });

      if (scoresCheckResponse.ok) {
        const scoresData = await scoresCheckResponse.json();
        setHasScores(scoresData.hasScores);
        // Only allow edit mode if not read-only
        setIsEditMode(!isReadOnly && !scoresData.hasScores);
      } else {
        const error = await scoresCheckResponse.json();
        toast.error(error.error || "Failed to check scores");
      }

      // Load existing metrics
      const metricsResponse = await fetch("/api/metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recruitment_round_id: recruitmentRoundId }),
      });

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        if (metricsData && metricsData.length > 0) {
          setMetrics(
            metricsData.map((m: { id: string; name: string; weight: number }) => ({
              id: m.id,
              name: m.name,
              weight: m.weight,
            }))
          );
        } else {
          setMetrics([{ name: "", weight: 0 }]);
        }
      } else {
        const error = await metricsResponse.json();
        toast.error(error.error || "Failed to load metrics");
        setMetrics([{ name: "", weight: 0 }]);
      }
    } catch (error) {
      console.error("Error loading metrics:", error);
      toast.error("Failed to load metrics");
      setMetrics([{ name: "", weight: 0 }]);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Add new metric
  const addMetric = () => {
    if (isEditMode) {
      setMetrics([...metrics, { name: "", weight: 0 }]);
    }
  };

  // Remove metric
  const removeMetric = (index: number) => {
    if (isEditMode) {
      setMetrics(metrics.filter((_, i) => i !== index));
    }
  };

  // Update metric value
  const updateMetric = (
    index: number,
    field: keyof Metric,
    value: string | number
  ) => {
    if (isEditMode) {
      setMetrics(
        metrics.map((metric, i) =>
          i === index ? { ...metric, [field]: value } : metric
        )
      );
    }
  };

  // Adjust weights to sum 1
  const adjustWeights = () => {
    if (!isEditMode || metrics.length === 0) return;
    const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
    if (totalWeight === 0) {
      const evenWeight = 1 / metrics.length;
      setMetrics(metrics.map((metric) => ({ ...metric, weight: evenWeight })));
    } else {
      const factor = 1 / totalWeight;
      setMetrics(
        metrics.map((metric) => ({
          ...metric,
          weight: Number((metric.weight * factor).toFixed(4)),
        }))
      );
    }
  };

  const handleDeleteScores = async () => {
    setDeletingScores(true);
    try {
      const response = await fetch("/api/scores/delete-round", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recruitment_round_id: recruitmentRoundId }),
      });

      if (response.ok) {
        toast.success("All scores deleted successfully");
        setHasScores(false);
        // Only allow edit mode if not read-only
        setIsEditMode(!isReadOnly);
        setShowDeleteConfirm(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete scores");
      }
    } catch (error) {
      console.error("Error deleting scores:", error);
      toast.error("Failed to delete scores");
    } finally {
      setDeletingScores(false);
    }
  };

  const handleUpdate = async () => {
    if (error) return toast.error("Fix metric weight errors first.");

    setLoading(true);
    try {
      const response = await fetch("/api/metrics/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recruitment_round_id: recruitmentRoundId,
          metrics: metrics
            .filter((m) => m.name.trim() !== "")
            .map(({ name, weight }) => ({ name, weight })),
        }),
      });

      if (response.ok) {
        toast.success("Metrics updated successfully!");
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update metrics");
      }
    } catch (error) {
      console.error("Error updating metrics:", error);
      toast.error("Failed to update metrics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isReadOnly ? "View Metrics" : isEditMode ? "Update Metrics" : "View Metrics"}
            </DialogTitle>
            <DialogDescription>
              {isReadOnly
                ? `View evaluation metrics for "${roundName}" in "${cycleName}".`
                : isEditMode
                ? `Update evaluation metrics for "${roundName}" in "${cycleName}"`
                : `View evaluation metrics for "${roundName}" in "${cycleName}". Delete all scores to enable editing.`}
            </DialogDescription>
          </DialogHeader>

          {loadingMetrics ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading metrics...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[45vh] px-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Evaluation Metrics</h3>
                  {metrics.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No metrics defined for this round.
                    </p>
                  ) : (
                    metrics.map((metric, index) => (
                      <div key={index} className="p-2 border rounded">
                        <div className="flex items-center justify-between">
                          <Label>Metric {index + 1}</Label>
                          {isEditMode && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMetric(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor={`name-${index}`}>Name</Label>
                            <Input
                              id={`name-${index}`}
                              value={metric.name}
                              onChange={(e) =>
                                updateMetric(index, "name", e.target.value)
                              }
                              placeholder="Enter metric name"
                              disabled={!isEditMode}
                              readOnly={!isEditMode}
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
                              onChange={(e) =>
                                updateMetric(
                                  index,
                                  "weight",
                                  Number(e.target.value)
                                )
                              }
                              disabled={!isEditMode}
                              readOnly={!isEditMode}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {isEditMode && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addMetric}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add Metric
                      </Button>
                      {metrics.length > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={adjustWeights}
                          className="w-full"
                        >
                          Adjust Weights to Sum 1
                        </Button>
                      )}
                    </>
                  )}
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  {!isEditMode && hasScores && !isReadOnly && (
                    <div className="p-4 border border-yellow-200 bg-yellow-50 rounded">
                      <p className="text-sm text-yellow-800 mb-2">
                        This round has existing scores. You must delete all scores
                        before you can update the metrics.
                      </p>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete All Scores
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            {isEditMode ? (
              <Button
                type="submit"
                onClick={handleUpdate}
                disabled={loading || !!error || loadingMetrics}
                className="w-full"
              >
                {loading ? "Updating..." : "Update Metrics"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Scores</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all scores for "{roundName}" in "{cycleName}"? This
              action is irreversible and will permanently delete all score data
              for this round. You will then be able to update the metrics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingScores}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScores}
              disabled={deletingScores}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingScores ? "Deleting..." : "Delete All Scores"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
