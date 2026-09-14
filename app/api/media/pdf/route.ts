import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PDF_HOSTS = new Set(["storage.tally.so"]);
const MAX_REDIRECTS = 3;

function parseAllowedUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_PDF_HOSTS.has(url.hostname)
      ? url
      : null;
  } catch {
    return null;
  }
}

async function fetchPdf(url: URL): Promise<Response> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      cache: "no-store",
      headers: { Accept: "application/pdf" },
      redirect: "manual",
    });

    if (response.status < 300 || response.status >= 400) return response;

    const location = response.headers.get("location");
    if (!location) return response;

    const redirectedUrl = parseAllowedUrl(new URL(location, currentUrl).toString());
    if (!redirectedUrl) {
      throw new Error("PDF redirect target is not allowed");
    }
    currentUrl = redirectedUrl;
  }

  throw new Error("Too many PDF redirects");
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");
  const sourceUrl = source ? parseAllowedUrl(source) : null;

  if (!sourceUrl) {
    return NextResponse.json(
      { error: "Only HTTPS PDFs hosted on storage.tally.so are supported." },
      { status: 400 },
    );
  }

  try {
    const response = await fetchPdf(sourceUrl);
    const contentType = response.headers.get("content-type")?.toLowerCase() || "";

    if (!response.ok) {
      return NextResponse.json(
        { error: "The PDF could not be loaded." },
        { status: response.status },
      );
    }

    if (!contentType.includes("application/pdf")) {
      return NextResponse.json(
        { error: "The requested attachment is not a PDF." },
        { status: 415 },
      );
    }

    return new NextResponse(response.body, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": "inline",
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to proxy applicant PDF:", error);
    return NextResponse.json(
      { error: "The PDF could not be loaded." },
      { status: 502 },
    );
  }
}
