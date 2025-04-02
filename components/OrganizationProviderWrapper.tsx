"use client";

import { useEffect, useState } from "react";
import useUser from "@/app/hook/useUser";
import {
  Organization,
  OrganizationProvider,
} from "@/contexts/OrganizationContext";

export default function OrganizationProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: user } = useUser();
  const [initialOrganization, setInitialOrganization] =
    useState<Organization | null>(null);

  useEffect(() => {
    if (user?.id) {
      const lastUsedOrg = localStorage.getItem(`lastUsedOrg_${user.id}`);
      if (lastUsedOrg) {
        setInitialOrganization(JSON.parse(lastUsedOrg));
      }
    }
  }, [user?.id]);

  return (
    <OrganizationProvider initialOrganization={initialOrganization}>
      {children}
    </OrganizationProvider>
  );
}
