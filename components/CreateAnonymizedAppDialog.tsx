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

export default function CreateAnonymizedAppDialog({
  isOpen,
  onClose,
  recruitment_round_id,
  recruitment_round_name,
  applicant_id,
}: {
  isOpen: boolean;
  onClose: () => void;
  recruitment_round_id: string;
  recruitment_round_name: string;
  applicant_id: string;
}) {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available fields for anonymization
  useEffect(() => {
    const fetchFields = async () => {
      if (!recruitment_round_id) return;

      setIsLoading(true);
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

        // Ensure the response is an array of strings
        const fields = await response.json();
        
        // Check if the response is an array; fallback to an empty array if not
        setAvailableFields(fields.columns);
      } catch (error) {
        console.error("Error fetching fields:", error);
        setAvailableFields([]); // Fallback to an empty array in case of error
      } finally {
        setIsLoading(false);
      }
    };

    fetchFields();
  }, [recruitment_round_id, applicant_id]);

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
      console.log("Anonymized app created:", result);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Create Anonymized App for{" "}
            {recruitment_round_name || "Unknown Round"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <p>Loading fields...</p>
          ) : (
            <>
              <p>Select the fields you want to include:</p>
              <MultiSelect
                options={availableFields} // Ensure this is an array of strings
                selectedOptions={selectedFields}
                onChange={setSelectedFields}
              />
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={selectedFields.length === 0}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
