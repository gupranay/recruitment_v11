"use client";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { KeyRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { FcGoogle } from "react-icons/fc";

function LoginPageContent() {
  const params = useSearchParams();
  let next;
  if (!params) {
    next = "";
  } else {
    next = params.get("next") || "";
  }
  const HOSTNAME =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://recruitment-v3.vercel.app";


  const handleLoginwithGoogle = async () => {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${HOSTNAME}/auth/callback?next=` + next,
      },
    });
    if (error) {
      console.log(error);
    }
  };

  return (
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
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
