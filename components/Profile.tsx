"use client";
import React from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import useUser from "@/app/hook/useUser";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { protectedPaths } from "@/lib/constant/inedx";

export default function Profile() {
  const { isFetching, data } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  

  if (isFetching) {
    return <></>;
  }

  const handleLogout = async () => {
    const supabase = supabaseBrowser();
    queryClient.clear();
    await supabase.auth.signOut();
    router.refresh();
    if(protectedPaths.includes(pathname || "")){
      router.replace("/auth?next="+pathname);
    } 
  };

  return (
    <div className="flex items-center gap-4">
      {!data?.id ? (
        <Link href="/auth" className="animate-fade">
          <Button variant="outline">Sign In</Button>
        </Link>
      ) : (
        <>
          {/* {data?.avatar_url ? (
            <Image
              src={data.avatar_url || ""}
              alt={data.full_name || ""}
              width={40}
              height={40}
              className="rounded-full animate-fade ring-2"
            />
          ) : (
            <div className="h-[50px] w-[50px] flex items-center justify-center ring-2 rounded-full">
              <h1>{data?.full_name ? data?.full_name[0] : ""}</h1>
            </div>
          )} */}
          {/* <Avatar onClick={handleLogout} className='cursor-pointer animate-fade'>
            <AvatarImage
              src={data?.avatar_url || undefined}
              alt={data?.full_name || undefined}
            />
            <AvatarFallback>
              {data?.full_name ? data?.full_name[0] : ""}
            </AvatarFallback>
          </Avatar> */}
          <Button asChild>
            <Link href={"/dashboard"}> Go to Dashboard</Link>
          </Button>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </>
      )}
    </div>
  );
}
