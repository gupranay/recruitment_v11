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

  // Fetch available fields for anonymization
  useEffect(() => {
    const fetchFields = async () => {
      if (!applicant_id) return;

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
  }, [applicant_id]);

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

      window.open(`/anonymous?id=${result.id}`, "_blank", "noopener,noreferrer");
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
    <>
      <Button onClick={() => setIsDialogOpen(true)} variant="outline">
        Create Anonymized App Reading
      </Button>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create Anonymized App for {recruitment_round_name || "Unknown Round"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingFields ? (
              <p>Loading fields...</p>
            ) : (
              <>
                <p>Select the fields you want to include:</p>
                <MultiSelect
                  options={availableFields}
                  selectedOptions={selectedFields}
                  onChange={setSelectedFields}
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={selectedFields.length === 0}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
