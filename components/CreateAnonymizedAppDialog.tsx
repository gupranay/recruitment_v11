import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function CreateAnonymizedAppDialog({
  recruitment_round_id,
  recruitment_round_name,
  applicant_id,
}: {
  recruitment_round_id: string;
  recruitment_round_name: string;
  applicant_id: string;
}) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch available fields for anonymization only when dialog is opened
  useEffect(() => {
    const fetchFields = async () => {
      if (!applicant_id || !isDialogOpen) return;

      setIsLoadingFields(true);
      try {
        const response = await fetch("/api/applicant/get-cols", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ applicant_id }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch available fields");
        }

        const fields = await response.json();
        setAvailableFields(fields.columns || []);
      } catch (error) {
        console.error("Error fetching fields:", error);
        setAvailableFields([]);
      } finally {
        setIsLoadingFields(false);
      }
    };

    fetchFields();
  }, [applicant_id, isDialogOpen]);

  // Fetch slug if it exists
  useEffect(() => {
    const fetchSlug = async () => {
      if (!recruitment_round_id) return;

      try {
        const response = await fetch("/api/anonymous/get-slug", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ recruitment_round_id }),
        });

        // 404 is expected when no anonymous app reading exists yet
        if (response.status === 404) {
          setSlug(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch slug");
        }

        const { slug: existingSlug } = await response.json();
        setSlug(existingSlug || null);
      } catch (error) {
        console.error("Error fetching slug:", error);
        setSlug(null);
      }
    };

    fetchSlug();
  }, [recruitment_round_id]);

  const handleCreate = async () => {
    if (!recruitment_round_id) return;

    try {
      const response = await fetch("/api/anonymous/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruitment_round_id,
          omitted_fields: selectedFields,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create anonymized app reading");
      }

      const result = await response.json();
      setSlug(result.id);
      toast.success("Successfully created Anonymized App Reading");

      window.open(
        `/anonymous?id=${result.id}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error("Error creating anonymized app:", error);
    } finally {
      setIsDialogOpen(false);
    }
  };

  if (slug) {
    return (
      <Button
        onClick={() =>
          window.open(`/anonymous?id=${slug}`, "_blank", "noopener,noreferrer")
        }
        variant="default"
      >
        Launch Anonymized App Reading
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Button onClick={() => setIsDialogOpen(true)} variant="default">
        Create Anonymized App Reading
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Anonymized App Reading</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Select fields to omit from the anonymized reading for{" "}
            {recruitment_round_name}
          </p>
          {isLoadingFields ? (
            <p>Loading available fields...</p>
          ) : (
            <MultiSelect
              options={availableFields}
              selectedOptions={selectedFields}
              onChange={setSelectedFields}
              placeholder="Select fields to omit..."
            />
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleCreate}>Create Reading</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
