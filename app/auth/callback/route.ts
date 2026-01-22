// app/auth/callback/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { HOSTNAME } from "@/lib/constant/inedx";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      // Process any pending invites
      // The API endpoint will use getUser() to verify the session, not trust request body
      try {
        // Get all cookies to forward to the API request
        const allCookies = cookieStore.getAll();
        const cookieHeader = allCookies
          .map((c) => `${c.name}=${c.value}`)
          .join("; ");

        await fetch(`${HOSTNAME}/api/auth/handle-invites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookieHeader,
          },
          body: JSON.stringify({}), // No longer sending user data - API gets it from session
        });
      } catch (error) {
        console.error("Error processing invites:", error);
        // Continue with redirect even if invite processing fails
      }

      return NextResponse.redirect(`${HOSTNAME}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${HOSTNAME}/auth/auth-code-error`);
}
