import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function checkDatabase() {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("recruitment_cycles")
    .select("id")
    .limit(1);

  return error;
}

export async function GET() {
  try {
    const error = await checkDatabase();

    if (error) {
      console.error("Database health check failed", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { status: "unhealthy", database: "unreachable" },
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    return NextResponse.json(
      { status: "ok", database: "reachable" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Database health check threw", error);

    return NextResponse.json(
      { status: "unhealthy", database: "unreachable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export const HEAD = GET;
