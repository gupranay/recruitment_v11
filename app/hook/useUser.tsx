"use client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useQuery } from "@tanstack/react-query";
import React from "react";


const initUser = {
    avatar_url: "",
    created_at: "",
    email: "",
    full_name: "",
    id: "",
}
export default function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const supabase = supabaseBrowser();
      // getSession() only reads from cookies without validation and can be spoofed
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (authUser && !error) {
        const { data: user, error: dbError } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();
        
        if (dbError) {
          console.error("Error fetching user from database:", dbError.message);
          return initUser;
        }
        
        if (!user) {
          console.warn("No user found in database for auth user:", authUser.id);
          return initUser;
        }
        
        return user;
      }
      return initUser;
    },
  });
}
