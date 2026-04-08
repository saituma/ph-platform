"use client";

import { ExternalLink } from "lucide-react";

import { useGetOpenGraphQuery } from "../../../lib/apiSlice";

function extractHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export function OpenGraphPreview({ url }: { url: string }) {
  const { data } = useGetOpenGraphQuery({ url }, { skip: !url });
  const og = data?.data as
    | {
        url?: string | null;
        title?: string | null;
        description?: string | null;
        image?: string | null;
        siteName?: string | null;
      }
    | undefined;

  const title = String(og?.title ?? "").trim();
  const description = String(og?.description ?? "").trim();
  const image = og?.image ? String(og.image) : "";
  const siteName = String(og?.siteName ?? "").trim() || extractHost(url);
  const href = String(og?.url ?? url).trim() || url;

  if (!title && !description && !image) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-2 block overflow-hidden rounded-xl border border-border bg-secondary/20 transition hover:border-primary/40"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={title || siteName || "Link preview"}
          className="h-40 w-full object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="space-y-1 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {siteName}
          </p>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
        {title ? (
          <p className="line-clamp-2 text-sm font-semibold text-foreground">
            {title}
          </p>
        ) : null}
        {description ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </a>
  );
}
