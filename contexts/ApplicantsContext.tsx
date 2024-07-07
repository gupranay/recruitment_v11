import React, { createContext, useContext, useState } from "react";
import { Json } from "@/lib/types/supabase";
 export type Applicant = {
  created_at: string | null
  data: Json
  email: string | null
  headshot_url: string | null
  id: string
  name: string
  recruitment_cycle_id: string | null
};

interface ApplicantsContextProps {
  applicants: Applicant[];
  setApplicants: (applicants: Applicant[]) => void;
}

const ApplicantsContext = createContext<ApplicantsContextProps | undefined>(undefined);

export const useApplicants = () => {
  const context = useContext(ApplicantsContext);
  if (!context) {
    throw new Error("useApplicants must be used within an ApplicantsProvider");
  }
  return context;
};

export const ApplicantsProvider = ({ children }: { children: React.ReactNode }) => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  return (
    <ApplicantsContext.Provider value={{ applicants, setApplicants }}>
      {children}
    </ApplicantsContext.Provider>
  );
};
