"use client";
import NavBar from "@/components/NavBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { KeyRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, Suspense } from "react";
import { FcGoogle } from "react-icons/fc";

function LoginPageContent() {
  const params = useSearchParams();
  const [next, setNext] = useState("");

  useEffect(() => {
    if (params) {
      const nextParam = params.get("next") || "";
      setNext(nextParam);
    }
  }, [params]);

  const handleLoginwithGoogle = async () => {
    // console.log("Login button clicked");
    const supabase = supabaseBrowser();
    const redirectTo = `${window.location.origin}/auth/callback?next=${next}`;
    console.log("Redirecting to:", redirectTo);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    if (error) {
      console.log("Error during sign-in:", error);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden aura-hero-surface">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 md:px-6">
        <NavBar />
      </div>

      <div className="relative flex items-center justify-center w-full flex-1 z-10 px-4 md:px-6 pb-16">
        <div className="pointer-events-none absolute inset-0 aura-hero-bg" />

        <div className="relative w-full max-w-md rounded-3xl glass-panel-dark space-y-8 p-8 md:p-10">
          <div className="flex items-center justify-center gap-3">
            <KeyRound className="text-white/85" />
            <h1 className="font-display text-4xl font-semibold tracking-tight text-white">
              Login
            </h1>
          </div>

          <p className="text-base text-white/75 text-center">
            Simplify your Org&apos;s Recruitment Today 👇
          </p>

          <Button
            className="w-full cta-primary-dark justify-center"
            onClick={handleLoginwithGoogle}
          >
            <FcGoogle className="text-2xl" /> Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <LoadingSpinner />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
