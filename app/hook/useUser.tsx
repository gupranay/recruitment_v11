"use client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/database.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

const initUser = {
  avatar_url: "",
  created_at: "",
  email: "",
  full_name: "",
  id: "",
};
export default function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const supabase = supabaseBrowser();
      // getSession() only reads from cookies without validation and can be spoofed
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();
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

        const row = user as UserRow;
        const meta = authUser.user_metadata as
          | { avatar_url?: string; picture?: string }
          | undefined;
        const fromMetadata =
          typeof meta?.avatar_url === "string" && meta.avatar_url.trim()
            ? meta.avatar_url.trim()
            : typeof meta?.picture === "string" && meta.picture.trim()
              ? meta.picture.trim()
              : "";
        const fromDb =
          typeof row.avatar_url === "string" && row.avatar_url.trim()
            ? row.avatar_url.trim()
            : "";

        return {
          ...row,
          avatar_url: fromDb || fromMetadata || "",
        };
      }
      return initUser;
    },
  });
}
