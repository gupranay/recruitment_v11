import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export function LoadingModal({ isOpen, message }: { isOpen: boolean; message: string }) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p>{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
