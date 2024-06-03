"use client";

import * as React from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/contexts/OrganizationContext";

type Org = {
  id: string;
  name: string;
  created_at: string;
  owner_id: string;
};

export function OrgSelector({ user }: { user: any }) {
  const { selectedOrganization, setSelectedOrganization } = useOrganization();
  const [organizations, setOrganizations] = React.useState<Org[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await fetch("/api/organizations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(user), // Ensure the user object is correctly passed
        });

        if (!response.ok) {
          throw new Error("Failed to fetch organizations");
        }

        const data: Org[] = await response.json();
        console.log("Fetched organizations:", data);
        setOrganizations(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [user]); // Assuming dependency on 'user'

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Select onValueChange={(value: string) => {
      const org = organizations.find(org => org.id === value);
      if (org) setSelectedOrganization(org);
    }}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select organization..." />
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
