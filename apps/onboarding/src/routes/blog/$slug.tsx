import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, Tag } from "lucide-react";
import {
  blogPosts,
  formatDate,
  getPostBySlug,
  type BlogPost,
} from "../../lib/blog-data";
import { buildOgMeta } from "../../lib/seo";

const SITE_URL = "https://phperformance.uk";

function buildArticleSchema(post: BlogPost) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      url: `${SITE_URL}/blog/${post.slug}`,
      image: `${SITE_URL}${post.image}`,
      author: {
        "@type": "Organization",
        name: "PH Performance",
        url: SITE_URL,
      },
      publisher: {
        "@type": "Organization",
        name: "PH Performance",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: `${SITE_URL}/ph-logo.png` },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${SITE_URL}/blog/${post.slug}`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${SITE_URL}/blog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: post.title,
          item: `${SITE_URL}/blog/${post.slug}`,
        },
      ],
    },
  ];
}

function getRelatedPosts(post: BlogPost) {
  return blogPosts
    .filter((p) => p.slug !== post.slug)
    .filter((p) => p.category === post.category)
    .slice(0, 2);
}

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    const post = getPostBySlug(params.slug);
    if (!post) return {};
    return {
      meta: buildOgMeta({
        title: `${post.title} — PH Performance`,
        description: post.ogDescription || post.description,
        url: `${SITE_URL}/blog/${post.slug}`,
        image: `${SITE_URL}${post.image}`,
        imageAlt: post.title,
        type: "article",
        publishedTime: post.date,
        section: post.category,
      }),
      links: [
        {
          rel: "canonical",
          href: `${SITE_URL}/blog/${post.slug}`,
        },
      ],
      scripts: buildArticleSchema(post).map((schema) => ({
        type: "application/ld+json",
        children: JSON.stringify(schema),
      })),
    };
  },
  component: BlogArticle,
  loader: ({ params }) => {
    const post = getPostBySlug(params.slug);
    if (!post) throw notFound();
    return { post };
  },
});

function BlogArticle() {
  const { post } = Route.useLoaderData() as { post: BlogPost };

  const currentIndex = blogPosts.findIndex((p) => p.slug === post.slug);
  const prev = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const next =
    currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  return (
    <main className="pt-8 pb-24 min-h-dvh">
      <article className="max-w-3xl mx-auto px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors mb-10"
          >
            <ArrowLeft className="w-3 h-3" />
            All articles
          </Link>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60 mb-5">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-primary/60" />
              <span className="uppercase tracking-[0.2em] text-primary/70">
                {post.category}
              </span>
            </span>
            <span className="text-foreground/10">|</span>
            <span>{formatDate(post.date)}</span>
            <span className="text-foreground/10">|</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
          </div>

          <h1 className="landing-section-heading mb-8">{post.title}</h1>

          <p className="text-base text-muted-foreground leading-relaxed mb-12 border-l-2 border-primary/30 pl-5">
            {post.description}
          </p>
        </motion.div>

        <div className="space-y-10">
          {post.content.map((section, i) => (
            <motion.section
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              {section.heading && (
                <h2 className="text-lg font-bold italic tracking-tight mb-4">
                  {section.heading}
                </h2>
              )}
              {section.paragraphs.map((para, j) => (
                <p
                  key={j}
                  className="text-[14px] text-muted-foreground/80 leading-[1.8] mb-4 last:mb-0"
                >
                  {para}
                </p>
              ))}
            </motion.section>
          ))}
        </div>

        <div className="mt-16 pt-10 border-t border-foreground/[0.06]">
          <div className="flex items-center justify-between">
            {prev ? (
              <Link
                to="/blog/$slug"
                params={{ slug: prev.slug }}
                className="group flex flex-col gap-1 max-w-[45%]"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" />
                  Previous
                </span>
                <span className="text-[13px] font-medium group-hover:text-primary transition-colors line-clamp-1">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                to="/blog/$slug"
                params={{ slug: next.slug }}
                className="group flex flex-col gap-1 items-end max-w-[45%]"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1">
                  Next
                  <ArrowRight className="w-3 h-3" />
                </span>
                <span className="text-[13px] font-medium text-right group-hover:text-primary transition-colors line-clamp-1">
                  {next.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>

        {getRelatedPosts(post).length > 0 && (
          <div className="mt-16 pt-10 border-t border-foreground/[0.06]">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary mb-6">
              Related Articles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getRelatedPosts(post).map((related) => (
                <Link
                  key={related.slug}
                  to="/blog/$slug"
                  params={{ slug: related.slug }}
                  className="group block border border-foreground/[0.06] rounded-lg p-5 hover:border-foreground/[0.12] transition-all"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary/60 mb-2 block">
                    {related.category}
                  </span>
                  <span className="text-[14px] font-bold leading-snug group-hover:text-primary/90 transition-colors block mb-2">
                    {related.title}
                  </span>
                  <span className="text-[12px] text-muted-foreground/60 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {related.readTime}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 border border-foreground/[0.06] rounded-xl p-8 text-center"
        >
          <h3 className="text-lg font-bold italic tracking-tight mb-2">
            Ready to train smarter?
          </h3>
          <p className="text-[13px] text-muted-foreground mb-6 max-w-md mx-auto">
            PH Performance gives athletes, coaches, and teams everything they
            need in one platform.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-[13px] font-bold uppercase tracking-[0.1em] rounded-lg hover:opacity-90 transition-opacity"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </article>
    </main>
  );
}
