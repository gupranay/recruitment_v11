import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";
import { Database } from "../types/supabase";

export function supabaseApi(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
