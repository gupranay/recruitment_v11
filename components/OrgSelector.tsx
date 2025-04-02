// components/OrgSelector.tsx
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
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";
import { Skeleton } from "@/components/ui/skeleton";

export function OrgSelector({ user }: { user: any }) {
  const {
    selectedOrganization,
    setSelectedOrganization,
    organizations,
    loading,
    error,
  } = useOrganization();
  const [recruitmentCycles, setRecruitmentCycles] = React.useState<
    RecruitmentCycle[]
  >([]);

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
        }
      };

      fetchRecruitmentCycles();
    }
  }, [selectedOrganization]);

  if (loading) {
    return <div style={{ width: "100%", height: "100%" }}></div>;
  }

  if (error) {
    window.location.reload();
    return <div>Error: {error}</div>;
  }

  if (organizations.length === 0) {
    return <div>You have no organizations. Please create one.</div>;
  }

  return (
    <Select
      onValueChange={(value: string) => {
        const org = organizations.find((org) => org.id === value);
        if (org) {
          setSelectedOrganization(org);
        }
      }}
      defaultValue={selectedOrganization?.id}
      value={selectedOrganization?.id}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue>
          {selectedOrganization?.name || "Select organization..."}
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
