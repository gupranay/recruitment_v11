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
import React, { createContext, useState, useContext, useCallback } from 'react';

interface ApplicantsContextProps {
  applicants: Applicant[];
  setApplicants: React.Dispatch<React.SetStateAction<Applicant[]>>;
  clearApplicants: () => void;
}

const ApplicantsContext = createContext<ApplicantsContextProps | undefined>(undefined);

export const ApplicantsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  const clearApplicants = useCallback(() => {
    setApplicants([]);
  }, []);

  return (
    <ApplicantsContext.Provider value={{ applicants, setApplicants, clearApplicants }}>
      {children}
    </ApplicantsContext.Provider>
  );
};

export const useApplicants = () => {
  const context = useContext(ApplicantsContext);
  if (!context) {
    throw new Error('useApplicants must be used within a ApplicantsProvider');
  }
  return context;
};
