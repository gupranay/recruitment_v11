import { useMemo, useState } from "react";
import { ApplicantCardType } from "@/lib/types/ApplicantCardType";
import {
  DEFAULT_EXPORT_COLUMNS,
  exportToCSV,
  getAvailableExportColumns,
} from "@/lib/utils/exportAppsToCSV";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MultiSelect } from "@/components/ui/MultiSelect";

type ExportApplicantsDialogProps = {
  applicants: ApplicantCardType[];
  roundName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ExportApplicantsDialog({
  applicants,
  roundName,
  open,
  onOpenChange,
}: ExportApplicantsDialogProps) {
  const availableColumns = useMemo(
    () => getAvailableExportColumns(applicants),
    [applicants],
  );
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    ...DEFAULT_EXPORT_COLUMNS,
  ]);

  const handleExport = () => {
    exportToCSV(applicants, roundName, selectedColumns);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export applicants</DialogTitle>
          <DialogDescription>
            Choose the columns to include in the downloaded CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <div className="text-sm font-medium">Columns</div>
          <MultiSelect
            options={availableColumns}
            selectedOptions={selectedColumns}
            onChange={setSelectedColumns}
            placeholder="Select columns..."
          />
          <p className="text-xs text-muted-foreground">
            {selectedColumns.length} of {availableColumns.length} columns selected
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedColumns([...DEFAULT_EXPORT_COLUMNS])}
          >
            Reset defaults
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={selectedColumns.length === 0}
          >
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
