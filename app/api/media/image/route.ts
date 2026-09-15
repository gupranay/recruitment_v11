import convert from "heic-convert";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_IMAGE_HOSTS = new Set(["storage.tally.so"]);
const MAX_REDIRECTS = 3;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function parseAllowedUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(url.hostname)
      ? url
      : null;
  } catch {
    return null;
  }
}

async function fetchImage(url: URL): Promise<Response> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      cache: "no-store",
      headers: { Accept: "image/heic,image/heif,image/*" },
      redirect: "manual",
    });

    if (response.status < 300 || response.status >= 400) return response;

    const location = response.headers.get("location");
    if (!location) return response;

    const redirectedUrl = parseAllowedUrl(new URL(location, currentUrl).toString());
    if (!redirectedUrl) throw new Error("Image redirect target is not allowed");
    currentUrl = redirectedUrl;
  }

  throw new Error("Too many image redirects");
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");
  const sourceUrl = source ? parseAllowedUrl(source) : null;

  if (!sourceUrl) {
    return NextResponse.json(
      { error: "Only HTTPS images hosted on storage.tally.so are supported." },
      { status: 400 },
    );
  }

  try {
    const response = await fetchImage(sourceUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "The image could not be loaded." },
        { status: response.status },
      );
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "The image is too large." }, { status: 413 });
    }

    const input = Buffer.from(await response.arrayBuffer());
    if (input.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "The image is too large." }, { status: 413 });
    }

    const output = await convert({
      buffer: input,
      format: "JPEG",
      quality: 0.9,
    });

    const outputArrayBuffer = output.buffer.slice(
      output.byteOffset,
      output.byteOffset + output.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(outputArrayBuffer, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type": "image/jpeg",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to proxy applicant image:", error);
    return NextResponse.json(
      { error: "The image could not be converted or loaded." },
      { status: 502 },
    );
  }
}
