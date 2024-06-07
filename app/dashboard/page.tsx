"use client";
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog'
import useUser from "@/app/hook/useUser";
import React, { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser';
import { OrgSelector } from '@/components/OrgSelector';
import { OrganizationProvider, useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { ToastProvider } from "@/components/ui/Toast";
import Sidebar from '@/components/ui/Sidebar';

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
        <ToastProvider/>
      {/* <div>Dashboard
      <CreateOrganizationDialog user={user}/>
      <OrgSelector user={user}/>
      
    </div> */}

    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-center p-4 bg-white shadow-md">
          <OrgSelector user={user}/>
          <CreateOrganizationDialog user={user}/>
        </div>
        <main className="flex-1 p-4 overflow-auto">{"something"}</main>
      </div>
    </div>
    </OrganizationProvider>
    
      
    
    
  )
}
