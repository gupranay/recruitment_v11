import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function ApplicationDialog({
    applicantId,
    isOpen,
    onClose,
  }: {
    applicantId: string;
    isOpen: boolean;
    onClose: () => void;
  }) {
    const [applicantData, setApplicantData] = useState<{
      name: string;
      headshot_url: string;
      data: Record<string, string>;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
  
    useEffect(() => {
      const fetchApplicantDetails = async () => {
        setIsLoading(true);
        try {
          const response = await fetch("/api/applicant", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ applicant_id: applicantId }),
          });
  
          if (!response.ok) {
            throw new Error("Failed to fetch applicant details");
          }
          const data = await response.json();
          setApplicantData(data);
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
  
      if (isOpen) {
        fetchApplicantDetails();
      }
    }, [isOpen, applicantId]);
  
    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-screen overflow-y-auto p-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            applicantData && (
              <>
                {/* Name and Headshot */}
                <div className="flex flex-col items-center mb-8">
                  <Image
                    src={
                      applicantData.headshot_url ||
                      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                    }
                    alt={`Headshot of ${applicantData.name}`}
                    width={192} // Replace with appropriate width
                    height={192} // Replace with appropriate height
                    className="w-48 h-48 rounded-full object-cover mb-4 shadow-md"
                  />
                  <h2 className="text-2xl font-bold text-gray-800">
                    {applicantData.name}
                  </h2>
                </div>
  
                {/* Dynamic Data Fields */}
                <div className="grid grid-cols-1 gap-y-6">
                  {Object.entries(applicantData.data || {}).map(
                    ([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <h3 className="text-sm font-bold text-black">{key}</h3>
                        {isValidUrl(value) ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            View {key}
                          </a>
                        ) : (
                          <p className="text-gray-700 mt-1">{value}</p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    );
  }