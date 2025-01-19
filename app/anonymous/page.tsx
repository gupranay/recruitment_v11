"use client";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import useUser  from "../hook/useUser";

interface AnonApplicant {
  id: string; // The actual UUID of the applicant
  number: number; // Sequential number for display
}

export default function ReadingPage() {
    const user = useUser();
  const searchParams = useSearchParams();

  console.log("searchParams", searchParams);
  const slug = searchParams.get("id"); // Get the slug from the URL
  

  const [applicants, setApplicants] = useState<AnonApplicant[]>([]);
  const [readingDetails, setReadingDetails] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState<AnonApplicant | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      try {
        const response = await fetch("/api/anonymous/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }

        const { reading, applicants: fetchedApplicants } = await response.json();

        setReadingDetails(reading);
        setApplicants(
          fetchedApplicants.map((applicantId: string, index: number) => ({
            id: applicantId,
            number: index + 1,
          }))
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const openDialog = (applicant: AnonApplicant) => {
    setSelectedApplicant(applicant);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setSelectedApplicant(null);
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return <p className="text-center text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">
        Anonymous Applications for {slug}
      </h1>
      <Separator className="my-4" />

      {applicants.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {applicants.map((applicant) => (
            <button
              key={applicant.id}
              onClick={() => openDialog(applicant)}
              className="rounded-lg border border-muted bg-card shadow-sm p-4 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring transition"
            >
              <p className="text-lg font-semibold text-center">
                Applicant #{applicant.number}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">No applicants found.</p>
      )}

      {/* Dialog for Applicant Details */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Applicant #{selectedApplicant?.number}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Applicant ID: {selectedApplicant?.id || "No details available."}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={closeDialog} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
