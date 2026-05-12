const SITE_URL = "https://phperformance.uk";
const DEFAULT_IMAGE = `${SITE_URL}/og-preview.png`;
const SITE_NAME = "PH Performance";
const TWITTER_HANDLE = "@ph.perform";

interface OgMetaOptions {
  title: string;
  description: string;
  url: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article" | "profile";
  /** article:published_time */
  publishedTime?: string;
  /** article:section */
  section?: string;
}

export function buildOgMeta(opts: OgMetaOptions) {
  const image = opts.image || DEFAULT_IMAGE;
  const imageAlt = opts.imageAlt || `${opts.title} — ${SITE_NAME}`;

  return [
    { title: opts.title },
    { name: "description", content: opts.description },

    // Open Graph — Facebook, WhatsApp, Telegram, iMessage, LinkedIn, Discord
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: opts.type || "website" },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:url", content: opts.url },
    { property: "og:image", content: image },
    { property: "og:image:secure_url", content: image },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: imageAlt },
    { property: "og:locale", content: "en_GB" },

    // Twitter / X
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: TWITTER_HANDLE },
    { name: "twitter:creator", content: TWITTER_HANDLE },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: imageAlt },

    // Article-specific
    ...(opts.publishedTime
      ? [{ property: "article:published_time", content: opts.publishedTime }]
      : []),
    ...(opts.section
      ? [{ property: "article:section", content: opts.section }]
      : []),
  ];
}
