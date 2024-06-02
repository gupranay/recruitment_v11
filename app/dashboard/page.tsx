"use client";
import { CreateOrganizationDialog } from '@/components/CreateOrganizationDialog'
import useUser from "@/app/hook/useUser";
import React from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function page() {
  const { isFetching, data: user, error } = useUser();

  if (isFetching) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading user data.</div>;
  }


  return (
    <div>Dashboard
      <CreateOrganizationDialog user={user}/>
    </div>
  )
}
