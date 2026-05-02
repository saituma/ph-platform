import { type ImgHTMLAttributes } from "react";
import { cn } from "#/lib/utils";

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Original image path (e.g., "/hero.png") */
  src: string;
  /** Alt text (required for a11y) */
  alt: string;
  /** Width for layout hint */
  width?: number;
  /** Height for layout hint */
  height?: number;
  /** Priority loading (above the fold) */
  priority?: boolean;
  /** Sizes attribute for responsive images */
  sizes?: string;
};

/**
 * Optimized image component.
 * In production on Vercel, uses /_vercel/image for automatic WebP/AVIF conversion and resizing.
 * In dev, falls back to the raw src.
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  sizes = "100vw",
  className,
  ...props
}: ImageProps) {
  const isExternal = src.startsWith("http");
  const isProd = typeof window !== "undefined" && window.location.hostname !== "localhost";

  // Generate srcset with different widths
  const widths = [320, 640, 960, 1280, 1920];

  function getOptimizedUrl(w: number, quality = 75): string {
    if (!isProd || isExternal) return src;
    return `/_vercel/image?url=${encodeURIComponent(src)}&w=${w}&q=${quality}`;
  }

  const srcSet = isProd && !isExternal
    ? widths.map((w) => `${getOptimizedUrl(w)} ${w}w`).join(", ")
    : undefined;

  return (
    <img
      src={isProd && !isExternal ? getOptimizedUrl(width || 960) : src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
      className={cn("", className)}
      {...props}
    />
  );
}
