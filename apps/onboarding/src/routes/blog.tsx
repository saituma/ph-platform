import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import { useState } from "react";
import {
  blogPosts,
  BLOG_CATEGORIES,
  formatDate,
} from "../lib/blog-data";
import { buildOgMeta } from "../lib/seo";

const SITE_URL = "https://phperformance.uk";

const blogListSchema = {
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
  blogPost: blogPosts.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    url: `${SITE_URL}/blog/${post.slug}`,
    author: {
      "@type": "Organization",
      name: "PH Performance",
    },
  })),
};

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: buildOgMeta({
      title: "Blog — PH Performance | Training, Coaching & Performance",
      description: "Training guides, coaching strategies, nutrition tips, and performance insights for athletes, coaches, and teams. Expert content from PH Performance.",
      url: `${SITE_URL}/blog`,
      imageAlt: "PH Performance Blog — Training & Coaching Insights",
    }),
    links: [{ rel: "canonical", href: `${SITE_URL}/blog` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(blogListSchema),
      },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All"
      ? blogPosts
      : blogPosts.filter((p) => p.category === activeCategory);

  return (
    <main className="pt-8 pb-24 min-h-dvh">
      <section className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary mb-4 block">
            Blog
          </span>
          <h1 className="landing-section-heading mb-4">
            Training, coaching
            <br />
            &amp; performance
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
            Guides, strategies, and insights for athletes, coaches, and teams
            who take performance seriously.
          </p>
        </motion.div>

        <div className="flex gap-2 flex-wrap mb-12">
          {BLOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`text-[11px] font-medium uppercase tracking-[0.16em] px-4 py-2 rounded-full border transition-all ${
                activeCategory === cat
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-foreground/[0.06] text-muted-foreground hover:border-foreground/[0.12] hover:text-foreground/70"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Link
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="group block border border-foreground/[0.06] rounded-xl overflow-hidden hover:border-foreground/[0.12] transition-all"
              >
                <div className="relative h-44 overflow-hidden bg-foreground/[0.03]">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                  <span className="absolute bottom-3 left-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                    {post.category}
                  </span>
                </div>

                <div className="p-5">
                  <h2 className="text-[15px] font-bold leading-snug mb-2 group-hover:text-primary/90 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                    {post.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
                      <span>{formatDate(post.date)}</span>
                      <span className="text-foreground/10">|</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-primary/70 group-hover:gap-2 transition-all">
                      Read
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-20">
            No articles in this category yet.
          </p>
        )}
      </section>
    </main>
  );
}
