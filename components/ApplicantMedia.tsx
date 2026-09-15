import Image, { type ImageProps } from "next/image";
import { ExternalLink, FileText } from "lucide-react";

import { cn } from "@/lib/utils";

type ApplicantMediaProps = Omit<ImageProps, "alt" | "src"> & {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  pdfMode?: "tile" | "preview" | "embed";
  pdfClassName?: string;
};

export function isPdfUrl(value?: string | null): boolean {
  const url = value?.trim();

  if (!url) return false;
  if (/^data:application\/pdf(?:;|,)/i.test(url)) return true;

  try {
    const parsedUrl = new URL(url, "https://local.invalid");
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const contentType =
      parsedUrl.searchParams.get("contentType") ||
      parsedUrl.searchParams.get("content-type") ||
      parsedUrl.searchParams.get("type");
    const namedFile =
      parsedUrl.searchParams.get("filename") ||
      parsedUrl.searchParams.get("file") ||
      parsedUrl.searchParams.get("name");

    return (
      /\.pdf$/i.test(pathname) ||
      /\.pdf$/i.test(namedFile || "") ||
      contentType?.toLowerCase() === "application/pdf"
    );
  } catch {
    return /\.pdf(?:$|[?#])/i.test(url);
  }
}

export function isHeicUrl(value?: string | null): boolean {
  const url = value?.trim();

  if (!url) return false;

  try {
    const parsedUrl = new URL(url, "https://local.invalid");
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const contentType =
      parsedUrl.searchParams.get("contentType") ||
      parsedUrl.searchParams.get("content-type") ||
      parsedUrl.searchParams.get("type");
    const namedFile =
      parsedUrl.searchParams.get("filename") ||
      parsedUrl.searchParams.get("file") ||
      parsedUrl.searchParams.get("name");

    return (
      /\.(?:heic|heif)$/i.test(pathname) ||
      /\.(?:heic|heif)$/i.test(namedFile || "") ||
      /image\/(?:heic|heif)/i.test(contentType || "")
    );
  } catch {
    return /\.(?:heic|heif)(?:$|[?#])/i.test(url);
  }
}

function imageViewerUrl(url: string): string {
  try {
    if (new URL(url).hostname === "storage.tally.so") {
      return `/api/media/image?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // Relative image URLs can be displayed directly by the browser.
  }

  return url;
}

function pdfViewerUrl(url: string): string {
  const viewerOptions = "toolbar=0&navpanes=0&view=FitH";

  try {
    if (new URL(url).hostname === "storage.tally.so") {
      const proxyUrl = `/api/media/pdf?url=${encodeURIComponent(url)}`;
      return `${proxyUrl}#page=1&${viewerOptions}`;
    }
  } catch {
    // Relative PDF URLs can be displayed directly by the browser.
  }

  return url.includes("#")
    ? `${url}&page=1&${viewerOptions}`
    : `${url}#page=1&${viewerOptions}`;
}

export default function ApplicantMedia({
  src,
  alt,
  fallbackSrc,
  pdfMode = "tile",
  pdfClassName,
  className,
  fill,
  width,
  height,
  ...imageProps
}: ApplicantMediaProps) {
  const resolvedSrc = src?.trim() || fallbackSrc;

  if (!resolvedSrc) return null;

  if (!isPdfUrl(resolvedSrc)) {
    return (
      <Image
        src={isHeicUrl(resolvedSrc) ? imageViewerUrl(resolvedSrc) : resolvedSrc}
        alt={alt}
        className={className}
        fill={fill}
        width={width}
        height={height}
        {...imageProps}
      />
    );
  }

  if (pdfMode !== "tile") {
    return (
      <div
        className={cn(
          "relative flex min-h-72 w-full overflow-hidden bg-muted",
          pdfClassName,
        )}
      >
        <iframe
          src={pdfViewerUrl(resolvedSrc)}
          title={`${alt} PDF preview`}
          className="min-h-0 flex-1 border-0 bg-background"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {pdfMode === "embed" ? (
          <a
            href={resolvedSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-background/95 px-3 py-2 text-xs font-medium text-foreground shadow-md ring-1 ring-border hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open PDF
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${alt} (PDF document)`}
      className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground",
        fill ? "absolute inset-0 h-full w-full" : "h-full w-full",
        className,
        pdfClassName,
      )}
      style={
        !fill && width && height
          ? { aspectRatio: `${String(width)} / ${String(height)}` }
          : undefined
      }
    >
      <span className="flex flex-col items-center gap-1.5 px-2 text-center">
        <FileText className="h-7 w-7" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide">PDF</span>
      </span>
    </div>
  );
}
