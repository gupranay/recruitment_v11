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
import { LogOut } from "lucide-react";

export default function LogOutButton() {
  const { isFetching, data } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  if (isFetching) {
    return <></>;
  }

  const handleLogout = async () => {
    console.log("Logging out...");
    try {
      const supabase = supabaseBrowser();
      queryClient.clear();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error.message);
        return;
      }
      router.refresh();
      if (protectedPaths.includes(pathname || "")) {
        router.replace("/auth?next=" + pathname);
      }
    } catch (error) {
      console.error("Unexpected error during logout:", error);
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleLogout}>
      <LogOut className="h-4 w-4" />
      <span className="sr-only">Logout</span>
    </Button>
  );
}
