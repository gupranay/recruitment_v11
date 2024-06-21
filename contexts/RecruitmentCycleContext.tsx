import React, { createContext, useContext, useState } from "react";

type RecruitmentCycle = {
  id: string;
  name: string;
  organization_id: string;
};

interface RecruitmentCycleContextProps {
  selectedRecruitmentCycle: RecruitmentCycle | null;
  setSelectedRecruitmentCycle: (cycle: RecruitmentCycle) => void;
}

const RecruitmentCycleContext = createContext<RecruitmentCycleContextProps | undefined>(undefined);

export const useRecruitmentCycle = () => {
  const context = useContext(RecruitmentCycleContext);
  if (!context) {
    throw new Error("useRecruitmentCycle must be used within a RecruitmentCycleProvider");
  }
  return context;
};

export const RecruitmentCycleProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedRecruitmentCycle, setSelectedRecruitmentCycle] = useState<RecruitmentCycle | null>(null);

  return (
    <RecruitmentCycleContext.Provider value={{ selectedRecruitmentCycle, setSelectedRecruitmentCycle }}>
      {children}
    </RecruitmentCycleContext.Provider>
  );
};
