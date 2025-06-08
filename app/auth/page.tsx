"use client";
import NavBar from "@/components/NavBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { HOSTNAME } from "@/pages/api/_app";
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
    <div className="relative min-h-screen flex flex-col bg-[#030303] overflow-x-hidden">
      <NavBar />
      {/* Animated background shapes for immersive vibe */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[-10vw] top-[10vh] w-[40vw] h-[12vw] rounded-full bg-gradient-to-r from-green-500/20 via-blue-500/10 to-transparent blur-3xl" />
        <div className="absolute right-[-8vw] top-[60vh] w-[30vw] h-[10vw] rounded-full bg-gradient-to-l from-blue-500/20 via-green-500/10 to-transparent blur-3xl" />
        <div className="absolute left-[20vw] bottom-[-8vw] w-[30vw] h-[10vw] rounded-full bg-gradient-to-r from-green-400/20 via-blue-400/10 to-transparent blur-3xl" />
      </div>
      <div className="flex items-center justify-center w-full flex-1 z-10">
        <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-white/10 via-blue-500/10 to-green-500/10 shadow-2xl border border-blue-500/20 backdrop-blur-xl p-8 space-y-8 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-2">
            <KeyRound className="text-green-400" />
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-blue-400 to-white">
              Login
            </h1>
          </div>
          <p className="text-base text-white/80 text-center mb-4">
            Simplify your Org&apos;s Recruitment Today 👇
          </p>
          <Button
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-green-400 via-blue-500 to-white text-lg font-semibold text-[#030303] shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 border-0"
            variant="outline"
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
