import React from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Loader2 } from "lucide-react";

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen, message = "Loading..." }) => {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <VisuallyHidden.Root>
          <DialogTitle>{message}</DialogTitle>
        </VisuallyHidden.Root>
        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-center text-lg font-medium">{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoadingModal;