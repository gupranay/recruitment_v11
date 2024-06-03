"use client";
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog'
import useUser from "@/app/hook/useUser";
import React, { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser';
import { OrgSelector } from '@/components/OrgSelector';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';

export default function Page() {

  const { isFetching, data: user, error } = useUser();

  if (isFetching) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading user data.</div>;
  }

  


  return (
    <OrganizationProvider>
      <div>Dashboard
      <CreateOrganizationDialog user={user}/>
      <OrgSelector user={user}/>
    </div>
    </OrganizationProvider>
      
    
    
  )
}
