"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Organization } from "@/contexts/OrganizationContext";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";

export function OrgSelector({ user }: { user: any }) {
  const { selectedOrganization, setSelectedOrganization } = useOrganization();
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [recruitmentCycles, setRecruitmentCycles] = React.useState<RecruitmentCycle[]>([]);
  

  React.useEffect(() => {
    const savedOrg = localStorage.getItem("selectedOrganization");
    if (savedOrg) {
      setSelectedOrganization(JSON.parse(savedOrg));
    }
    setIsInitialLoad(false);
  }, [setSelectedOrganization]);

  // Debugging selectedOrganization updates
  /* useEffect(() => {
    console.log("Selected Organization Updated:", selectedOrganization);
  }, [selectedOrganization]); */

  // Save organization to local storage when it changes
  React.useEffect(() => {
    if (selectedOrganization) {
      //console.log("setting", selectedOrganization);
      localStorage.setItem(
        "selectedOrganization",
        JSON.stringify(selectedOrganization)
      );
    }
  }, [selectedOrganization]);

  React.useEffect(() => {
    const fetchOrganizations = async () => {
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

        const data: Organization[] = await response.json();
        setOrganizations(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [user]);

  React.useEffect(() => {
    if (selectedOrganization) {
      const fetchRecruitmentCycles = async () => {
        const response = await fetch("/api/recruitment_cycles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ organization_id: selectedOrganization.id }),
        });

        if (response.ok) {
          const data = await response.json();
          setRecruitmentCycles(data);
          //console.log(data);
        }
      };

      fetchRecruitmentCycles();
    }
  }, [selectedOrganization]);


  if (isInitialLoad) {
    return <div>Loading organization data...</div>;
  }
  if (loading) return <div>Loading...</div>;

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Select
      onValueChange={(value: string) => {
        const org = organizations.find((org) => org.id === value);
        if (org) {
          setSelectedOrganization(org);
        }
      }}
      key={selectedOrganization ? selectedOrganization.id : "no-org"}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue
          placeholder={
            selectedOrganization
              ? selectedOrganization.name
              : "Select organization..."
          }
        >
          {selectedOrganization
            ? selectedOrganization.name
            : "Select organization..."}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
