import React, { createContext, useContext, useState, ReactNode } from "react";

export type Organization = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};

type OrganizationContextType = {
  selectedOrganization: Organization | null;
  setSelectedOrganization: (organization: Organization | null) => void;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  
  return (
    <OrganizationContext.Provider value={{ selectedOrganization, setSelectedOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
};


export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
};
