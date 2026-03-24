import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import type { Database } from "@/database.types";
import { getSupabaseUrl, getSupabaseAnonKey } from "./config";

export function supabaseApi(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        get(name: string) {
          return req.cookies[name];
        },
        set(name: string, value: string, options: CookieOptions) {
          const serialized = serialize(name, value, options);
          const existing = res.getHeader("Set-Cookie");
          if (existing) {
            if (Array.isArray(existing)) {
              res.setHeader("Set-Cookie", [...existing, serialized]);
            } else {
              res.setHeader("Set-Cookie", [existing as string, serialized]);
            }
          } else {
            res.setHeader("Set-Cookie", serialized);
          }
        },
        remove(name: string, options: CookieOptions) {
          const serialized = serialize(name, "", { ...options, maxAge: -1 });
          const existing = res.getHeader("Set-Cookie");
          if (existing) {
            if (Array.isArray(existing)) {
              res.setHeader("Set-Cookie", [...existing, serialized]);
            } else {
              res.setHeader("Set-Cookie", [existing as string, serialized]);
            }
          } else {
            res.setHeader("Set-Cookie", serialized);
          }
        },
      },
    }
  );
}
