"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import useUser from "@/app/hook/useUser";

export type Organization = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  role: string;
};

type OrganizationContextType = {
  selectedOrganization: Organization | null;
  setSelectedOrganization: (organization: Organization | null) => void;
  organizations: Organization[];
  loading: boolean;
  error: string | null;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { data: user } = useUser();
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch organizations when user changes
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch("/api/organizations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(user),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch organizations");
        }

        const fetchedOrganizations: Organization[] = await response.json();
        setOrganizations(fetchedOrganizations);

        // Try to get the last used organization from localStorage
        const lastUsedOrg = localStorage.getItem(`lastUsedOrg_${user.id}`);
        if (lastUsedOrg) {
          const parsedOrg = JSON.parse(lastUsedOrg);
          const org = fetchedOrganizations.find((o) => o.id === parsedOrg.id);
          if (org) {
            setSelectedOrganization(org);
          } else if (fetchedOrganizations.length > 0) {
            setSelectedOrganization(fetchedOrganizations[0]);
            localStorage.setItem(
              `lastUsedOrg_${user.id}`,
              JSON.stringify(fetchedOrganizations[0])
            );
          }
        } else if (fetchedOrganizations.length > 0) {
          setSelectedOrganization(fetchedOrganizations[0]);
          localStorage.setItem(
            `lastUsedOrg_${user.id}`,
            JSON.stringify(fetchedOrganizations[0])
          );
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch organizations"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [user?.id]);

  // Update localStorage when selected organization changes
  useEffect(() => {
    if (selectedOrganization && user?.id) {
      localStorage.setItem(
        `lastUsedOrg_${user.id}`,
        JSON.stringify(selectedOrganization)
      );
    }
  }, [selectedOrganization, user?.id]);

  const handleSetSelectedOrganization = (organization: Organization | null) => {
    setSelectedOrganization(organization);
  };

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        setSelectedOrganization: handleSetSelectedOrganization,
        organizations,
        loading,
        error,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
};
