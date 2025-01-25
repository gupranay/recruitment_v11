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
    <div>
      <NavBar />
      <div className="flex items-center justify-center w-full h-screen">
        <div className="w-96 h-min rounded-md border p-5 space-y-5">
          <div className="flex items-center gap-2">
            <KeyRound />
            <h1 className="text-2xl font-bold">Login</h1>
          </div>
          <p className="text-sm text-gray-300">
            Simplify your Org&apos;s Recruitment Today 👇
          </p>
          <div className="flex flex-col gap-5">
            <Button
              className="w-full flex items-center gap-2"
              variant="outline"
              onClick={handleLoginwithGoogle}
            >
              <FcGoogle /> Google
            </Button>
          </div>
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
