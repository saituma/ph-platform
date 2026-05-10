/**
 * Post-build script: generates static HTML shells for public marketing pages
 * so that search engine crawlers and AI bots get real meta tags without JS execution.
 *
 * Run after `vite build`: node scripts/prerender-seo.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");
const SITE_URL = "https://phperformance.uk";

const baseHtml = readFileSync(join(DIST, "index.html"), "utf-8");

function breadcrumb(...items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, url], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: url,
    })),
  };
}

const pages = [
  {
    path: "/",
    title: "PH Performance - Elite Athlete & Team Training Platform",
    description:
      "PH Performance is the professional platform for athletes and teams to track progress, optimize training, and achieve more.",
    ogDescription:
      "Professional performance tracking for athletes and teams. Deep analytics, video coaching, and real-time team sync.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "PH Performance",
        url: SITE_URL,
        logo: `${SITE_URL}/ph-logo.png`,
        description:
          "Elite training and performance coaching for athletes and teams.",
        foundingDate: "2024",
        knowsAbout: ["Athletic Training", "Youth Sports", "Team Management", "Performance Analytics", "Sports Nutrition"],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "PH Performance",
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "PH Performance",
        applicationCategory: "SportsApplication",
        operatingSystem: "iOS, Android, Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
        description:
          "Elite performance tracking for athletes and teams — analytics, video coaching, team sync, and scheduling.",
        featureList: "Training Programmes, Team Management, Nutrition Tracking, Performance Analytics, Real-Time Messaging, Session Scheduling, GPS Tracking, Video Coaching",
        screenshot: `${SITE_URL}/home.png`,
        url: SITE_URL,
      },
      {
        "@context": "https://schema.org",
        "@type": "SiteNavigationElement",
        name: "Main Navigation",
        hasPart: [
          { "@type": "WebPage", name: "Home", url: SITE_URL },
          { "@type": "WebPage", name: "About", url: `${SITE_URL}/about` },
          { "@type": "WebPage", name: "Services", url: `${SITE_URL}/services` },
          { "@type": "WebPage", name: "Features", url: `${SITE_URL}/features` },
          { "@type": "WebPage", name: "App Download", url: `${SITE_URL}/app-download` },
          { "@type": "WebPage", name: "Gallery", url: `${SITE_URL}/gallery` },
          { "@type": "WebPage", name: "Blog", url: `${SITE_URL}/blog` },
          { "@type": "WebPage", name: "Contact", url: `${SITE_URL}/contact` },
          { "@type": "WebPage", name: "FAQ", url: `${SITE_URL}/education-faq` },
        ],
      },
    ],
  },
  {
    path: "/features",
    title: "Platform Features — PH Performance",
    description:
      "Explore PH Performance's full feature set: deep analytics, video coaching with automated tagging, team sync, programme scheduling, and nutrition logging for athletes and coaches.",
    ogDescription:
      "Deep analytics, video coaching, team sync, and programme scheduling. Everything elite athletes and coaches need in one professional platform.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "PH Performance Platform Features",
        description: "Professional tools for elite athletes and coaches",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Deep Analytics", description: "Track metrics that matter. From HRV to max power output." },
          { "@type": "ListItem", position: 2, name: "Video Coaching", description: "Upload and analyze performance video with automated tagging." },
          { "@type": "ListItem", position: 3, name: "Team Sync", description: "Coordinate schedules, training loads, and availability across your roster." },
          { "@type": "ListItem", position: 4, name: "Nutrition Tracking", description: "Log meals, track macros, and follow coach-managed nutrition plans." },
          { "@type": "ListItem", position: 5, name: "Programme Management", description: "Build, assign, and track structured training programmes." },
          { "@type": "ListItem", position: 6, name: "Real-Time Messaging", description: "Chat, announcements, and team communication built in." },
        ],
      },
      breadcrumb(["Home", SITE_URL], ["Features", `${SITE_URL}/features`]),
    ],
  },
  {
    path: "/services",
    title: "Services — PH Performance",
    description:
      "Explore PH Performance's training services: 1-1 coaching, small group training, team programmes, and the PH Performance app.",
    ogDescription:
      "From personalised 1-1 coaching to full team performance solutions. See what PH Performance offers.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Service",
        provider: { "@type": "Organization", name: "PH Performance", url: SITE_URL },
        name: "Athletic Training Services",
        description:
          "Professional coaching services including 1-1 training, group sessions, and team programmes.",
        serviceType: "Athletic Training",
        areaServed: { "@type": "Country", name: "United Kingdom" },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Training Services",
          itemListElement: [
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "1-1 Coaching", description: "Personalised one-on-one athletic coaching" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Small Group Training", description: "Focused training in small group settings" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "Team Programmes", description: "Full team training and management programmes" } },
            { "@type": "Offer", itemOffered: { "@type": "Service", name: "PH Performance App", description: "Mobile app for programme delivery and tracking" } },
          ],
        },
      },
      breadcrumb(["Home", SITE_URL], ["Services", `${SITE_URL}/services`]),
    ],
  },
  {
    path: "/about",
    title: "About PH Performance — Our Mission & Vision",
    description:
      "Learn about PH Performance's mission to democratize elite athletic training. We build professional tools for athletes, coaches, and teams of every level.",
    ogDescription:
      "We're building the professional performance platform that makes elite training accessible to every athlete and team.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        mainEntity: {
          "@type": "Organization",
          name: "PH Performance",
          url: SITE_URL,
          logo: `${SITE_URL}/ph-logo.png`,
          description:
            "Elite training and performance coaching platform for athletes and teams.",
          foundingDate: "2024",
          knowsAbout: ["Athletic Training", "Youth Sports", "Team Management", "Performance Analytics", "Sports Nutrition"],
        },
      },
      breadcrumb(["Home", SITE_URL], ["About", `${SITE_URL}/about`]),
    ],
  },
  {
    path: "/gallery",
    title: "Gallery — PH Performance",
    description:
      "Photos and videos from the PH Performance team. Training sessions, events, and athlete highlights.",
    ogDescription:
      "See PH Performance in action — training sessions, events, and athlete highlights.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        name: "PH Performance Gallery",
        description: "Photos and videos from PH Performance training sessions, events, and athlete highlights.",
        url: `${SITE_URL}/gallery`,
        publisher: { "@type": "Organization", name: "PH Performance" },
      },
      breadcrumb(["Home", SITE_URL], ["Gallery", `${SITE_URL}/gallery`]),
    ],
  },
  {
    path: "/contact",
    title: "Contact — PH Performance",
    description:
      "Get in touch with PH Performance. Enquiries about coaching, team programmes, partnerships, and more.",
    ogDescription:
      "Reach out to the PH Performance team for coaching enquiries, team programmes, or general questions.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        mainEntity: {
          "@type": "Organization",
          name: "PH Performance",
          url: SITE_URL,
          email: "info@phperformance.co.uk",
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            email: "info@phperformance.co.uk",
            url: `${SITE_URL}/contact`,
            availableLanguage: "English",
          },
        },
      },
      breadcrumb(["Home", SITE_URL], ["Contact", `${SITE_URL}/contact`]),
    ],
  },
  {
    path: "/education-faq",
    title: "Athlete Education FAQ — PH Performance",
    description:
      "Answers to common questions about PH Performance: membership tiers, equipment requirements, youth safety, adult programming, and professional sports preparation.",
    ogDescription:
      "Everything you need to know about getting started with PH Performance — from choosing the right plan to training safely at any age.",
    jsonLd: [
      breadcrumb(["Home", SITE_URL], ["FAQ", `${SITE_URL}/education-faq`]),
    ],
  },
  {
    path: "/app-download",
    title: "PH Performance App — Download & Features",
    description:
      "Download the PH Performance app. Training programmes, nutrition tracking, GPS performance, session booking, and analytics — all in one place.",
    ogDescription:
      "Train smarter with the PH Performance app. Track everything, book sessions, and stay connected to your coach.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "MobileApplication",
        name: "PH Performance",
        operatingSystem: "iOS, Android",
        applicationCategory: "SportsApplication",
        offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
        description:
          "Training programmes, nutrition tracking, GPS performance, session booking, and analytics.",
        featureList: "Training Programmes, Nutrition Tracking, GPS Performance, Session Booking, Analytics, Real-Time Messaging",
        screenshot: `${SITE_URL}/home.png`,
        downloadUrl: `${SITE_URL}/app-download`,
      },
      breadcrumb(["Home", SITE_URL], ["App Download", `${SITE_URL}/app-download`]),
    ],
  },
  {
    path: "/blog",
    title: "Blog — PH Performance | Training, Coaching & Performance",
    description:
      "Training guides, coaching strategies, nutrition tips, and performance insights for athletes, coaches, and teams. Expert content from PH Performance.",
    ogDescription:
      "Expert training guides, coaching strategies, and performance insights for athletes and teams.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "PH Performance Blog",
        url: `${SITE_URL}/blog`,
        description:
          "Training guides, coaching strategies, and performance insights for athletes, coaches, and teams.",
        publisher: {
          "@type": "Organization",
          name: "PH Performance",
          url: SITE_URL,
          logo: { "@type": "ImageObject", url: `${SITE_URL}/ph-logo.png` },
        },
      },
      breadcrumb(["Home", SITE_URL], ["Blog", `${SITE_URL}/blog`]),
    ],
  },
];

const blogArticles = [
  {
    slug: "best-fitness-software-for-athletes-and-coaches",
    title: "Best Fitness Software for Athletes and Coaches in 2025",
    description: "Comparing the top fitness coaching platforms. What elite athletes and coaches actually need from their training software — and how to choose the right one.",
    ogDescription: "What elite athletes and coaches actually need from fitness software. A breakdown of the features that matter most in 2025.",
    date: "2025-05-01",
  },
  {
    slug: "youth-athlete-training-programs-guide",
    title: "How to Structure Training Programs for Youth Athletes",
    description: "A complete guide to building age-appropriate training programs for young athletes. Periodisation, safety, and long-term athletic development explained.",
    ogDescription: "Building age-appropriate training programs for young athletes. Periodisation, safety, and long-term development strategies.",
    date: "2025-04-20",
  },
  {
    slug: "team-management-software-for-sports-coaches",
    title: "Why Sports Coaches Need Dedicated Team Management Software",
    description: "Spreadsheets and WhatsApp groups aren't enough. Here's why dedicated team management software transforms coaching efficiency and athlete outcomes.",
    ogDescription: "Why spreadsheets and WhatsApp groups fail coaches. How dedicated team management software improves coaching efficiency.",
    date: "2025-04-10",
  },
  {
    slug: "nutrition-tracking-for-athletic-performance",
    title: "Nutrition Tracking for Athletes: What Coaches Need to Know",
    description: "How to implement nutrition tracking in your coaching practice. Practical strategies for monitoring athlete nutrition without creating unhealthy relationships with food.",
    ogDescription: "Practical nutrition tracking strategies for coaches. Monitor athlete fuelling without creating unhealthy food relationships.",
    date: "2025-03-28",
  },
  {
    slug: "how-to-track-athletic-performance-effectively",
    title: "How to Track Athletic Performance: A Coach's Guide",
    description: "Moving beyond basic workout logging. How to track the metrics that actually predict athletic improvement and make better coaching decisions.",
    ogDescription: "Track the metrics that actually predict athletic improvement. A practical guide for coaches on performance analytics.",
    date: "2025-03-15",
  },
  {
    slug: "fitness-app-for-teams-what-to-look-for",
    title: "Choosing a Fitness App for Teams: The Complete Buyer's Guide",
    description: "Not all fitness apps handle teams well. Here's what to evaluate when choosing a platform for team training — from role management to scheduling to pricing.",
    ogDescription: "What to evaluate when choosing a fitness app for team training. Role management, scheduling, pricing, and the features that matter.",
    date: "2025-03-05",
  },
];

for (const article of blogArticles) {
  pages.push({
    path: `/blog/${article.slug}`,
    title: `${article.title} — PH Performance`,
    description: article.description,
    ogDescription: article.ogDescription,
    ogType: "article",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.description,
        datePublished: article.date,
        dateModified: article.date,
        url: `${SITE_URL}/blog/${article.slug}`,
        image: `${SITE_URL}/home.png`,
        author: { "@type": "Organization", name: "PH Performance", url: SITE_URL },
        publisher: {
          "@type": "Organization",
          name: "PH Performance",
          url: SITE_URL,
          logo: { "@type": "ImageObject", url: `${SITE_URL}/ph-logo.png` },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${article.slug}` },
      },
      breadcrumb(
        ["Home", SITE_URL],
        ["Blog", `${SITE_URL}/blog`],
        [article.title, `${SITE_URL}/blog/${article.slug}`],
      ),
    ],
  });
}

function buildMetaTags(page) {
  const url = page.path === "/" ? SITE_URL : `${SITE_URL}${page.path}`;
  const image = page.ogImage || `${SITE_URL}/home.png`;
  const imageAlt = page.imageAlt || `${page.title} — PH Performance`;
  const description = page.ogDescription || page.description;
  const tags = [
    `<title>${page.title}</title>`,
    `<meta name="description" content="${page.description}" />`,
    // Open Graph — Facebook, WhatsApp, Telegram, iMessage, LinkedIn, Discord
    `<meta property="og:site_name" content="PH Performance" />`,
    `<meta property="og:type" content="${page.ogType || "website"}" />`,
    `<meta property="og:title" content="${page.title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:secure_url" content="${image}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${imageAlt}" />`,
    `<meta property="og:locale" content="en_GB" />`,
    // Twitter / X — also used by iMessage as fallback
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@phperformance" />`,
    `<meta name="twitter:creator" content="@phperformance" />`,
    `<meta name="twitter:title" content="${page.title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${imageAlt}" />`,
    `<link rel="canonical" href="${url}" />`,
  ];

  if (page.jsonLd) {
    for (const schema of page.jsonLd) {
      tags.push(
        `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
      );
    }
  }

  return tags.join("\n    ");
}

function generatePage(page) {
  const metaTags = buildMetaTags(page);

  let html = baseHtml
    .replace(/<title>.*?<\/title>/, "")
    .replace(/<meta\s+name="description"[^>]*>/g, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/g, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/g, "")
    .replace(/<link\s+rel="canonical"[^>]*>/, "");

  html = html.replace("</head>", `    ${metaTags}\n  </head>`);

  return html;
}

let count = 0;
for (const page of pages) {
  const html = generatePage(page);

  if (page.path === "/") {
    writeFileSync(join(DIST, "index.html"), html, "utf-8");
  } else {
    const dir = join(DIST, page.path.slice(1));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html, "utf-8");
  }
  count++;
}

console.log(`Prerendered ${count} pages with SEO meta tags.`);
