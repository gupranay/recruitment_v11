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
  setOrganizations: (organizations: Organization[]) => void;
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

  const applySelectionRules = (
    nextOrganizations: Organization[],
    options?: { deletedOrgId?: string }
  ) => {
    setOrganizations(nextOrganizations);

    const hasOrgs = nextOrganizations.length > 0;

    // When there are no organizations left, clear selection and localStorage
    if (!hasOrgs) {
      setSelectedOrganization(null);
      if (user?.id) {
        localStorage.removeItem(`lastUsedOrg_${user.id}`);
      }
      return;
    }

    // If current selection is missing or was just deleted, select the first org
    const currentId = selectedOrganization?.id;
    const selectionInvalid =
      !currentId ||
      !!options?.deletedOrgId ||
      !nextOrganizations.find((o) => o.id === currentId);

    if (selectionInvalid) {
      const firstOrg = nextOrganizations[0];
      setSelectedOrganization(firstOrg);
      if (user?.id) {
        localStorage.setItem(
          `lastUsedOrg_${user.id}`,
          JSON.stringify(firstOrg)
        );
      }
    }
  };

  // Fetch organizations when user changes
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch("/api/organizations", {
          method: "POST",
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
            const firstOrg = fetchedOrganizations[0];
            setSelectedOrganization(firstOrg);
            localStorage.setItem(
              `lastUsedOrg_${user.id}`,
              JSON.stringify(firstOrg)
            );
          }
        } else if (fetchedOrganizations.length > 0) {
          const firstOrg = fetchedOrganizations[0];
          setSelectedOrganization(firstOrg);
          localStorage.setItem(
            `lastUsedOrg_${user.id}`,
            JSON.stringify(firstOrg)
          );
        } else {
          // No organizations at all: clear any stale persisted selection
          localStorage.removeItem(`lastUsedOrg_${user.id}`);
          setSelectedOrganization(null);
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
        setOrganizations: (nextOrgs: Organization[]) =>
          applySelectionRules(nextOrgs),
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
