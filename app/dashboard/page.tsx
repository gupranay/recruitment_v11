"use client";
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog'
import useUser from "@/app/hook/useUser";
import React, { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser';
import { OrgSelector } from '@/components/OrgSelector';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';

export default function Page() {
  
  const HOSTNAME =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://recruitment-v3.vercel.app";

  const { isFetching, data: user, error } = useUser();

  if (isFetching) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading user data.</div>;
  }

  const getHostname = () => {
    console.log( process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://recruitment-v3.vercel.app");
  }


  return (
    <OrganizationProvider>
      <div>Dashboard
      <CreateOrganizationDialog user={user}/>
      <OrgSelector user={user}/>
    </div>
    <Button onClick={getHostname}>Get Hostname</Button>
    </OrganizationProvider>
      
    
    
  )
}
