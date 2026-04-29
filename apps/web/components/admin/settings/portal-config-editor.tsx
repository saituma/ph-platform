"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { SectionHeader } from "../section-header";
import { ParentCourseMediaUpload } from "../../parent/config/parent-course-media-upload";
import {
  useGetPortalConfigQuery,
  useUpdatePortalConfigMutation,
} from "../../../lib/apiSlice";

type Link = { label: string; href: string };
type FeatureItem = { title: string; body: string };
type TestimonialItem = { quote: string; name: string; role: string };
type Stat = { value: string; label: string };

type PortalConfig = {
  nav: { brand: string; links: Link[]; loginLabel: string; getStartedLabel: string };
  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    stats: Stat[];
    emailPlaceholder: string;
    emailCtaLabel: string;
    mobileScreenshotUrl: string;
  };
  ceoIntro: {
    eyebrow: string;
    title: string;
    body: string;
    name: string;
    role: string;
    watchLabel: string;
    videoUrl: string;
    photoUrl: string;
  };
  features: { heading: string; subheading: string; description: string; items: FeatureItem[] };
  testimonials: { eyebrow: string; heading: string; items: TestimonialItem[] };
  cta: {
    eyebrow: string;
    heading: string;
    body: string;
    appStoreLabel: string;
    playStoreLabel: string;
  };
  footer: {
    brand: string;
    tagline: string;
    platformLinks: Link[];
    legalLinks: Link[];
    copyright: string;
  };
};

type SectionKey = keyof PortalConfig;

function SectionSaveButton({
  saving,
  status,
  onSave,
}: {
  saving: boolean;
  status: { type: "ok" | "err"; text: string } | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button type="button" onClick={onSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save section"
        )}
      </Button>
      {status ? (
        <span
          className={
            status.type === "ok"
              ? "text-xs text-emerald-700 dark:text-emerald-300"
              : "text-xs text-red-700 dark:text-red-300"
          }
        >
          {status.text}
        </span>
      ) : null}
    </div>
  );
}

export function PortalConfigEditor() {
  const { data, isLoading, isError, refetch } = useGetPortalConfigQuery();
  const [save] = useUpdatePortalConfigMutation();

  const [cfg, setCfg] = useState<PortalConfig | null>(null);
  const [savingKey, setSavingKey] = useState<SectionKey | null>(null);
  const [statusByKey, setStatusByKey] = useState<
    Partial<Record<SectionKey, { type: "ok" | "err"; text: string }>>
  >({});

  useEffect(() => {
    if (!data?.config) return;
    const raw = data.config as Partial<PortalConfig>;
    const s = (v: unknown) => (typeof v === "string" ? v : "");
    const normalized: PortalConfig = {
      nav: {
        brand: s(raw.nav?.brand),
        links: Array.isArray(raw.nav?.links)
          ? raw.nav!.links.map((l) => ({ label: s(l?.label), href: s(l?.href) }))
          : [],
        loginLabel: s(raw.nav?.loginLabel),
        getStartedLabel: s(raw.nav?.getStartedLabel),
      },
      hero: {
        eyebrow: s(raw.hero?.eyebrow),
        title: s(raw.hero?.title),
        titleAccent: s(raw.hero?.titleAccent),
        subtitle: s(raw.hero?.subtitle),
        stats: Array.isArray(raw.hero?.stats)
          ? raw.hero!.stats.map((st) => ({ value: s(st?.value), label: s(st?.label) }))
          : [],
        emailPlaceholder: s(raw.hero?.emailPlaceholder),
        emailCtaLabel: s(raw.hero?.emailCtaLabel),
        mobileScreenshotUrl: s(raw.hero?.mobileScreenshotUrl),
      },
      ceoIntro: {
        eyebrow: s(raw.ceoIntro?.eyebrow),
        title: s(raw.ceoIntro?.title),
        body: s(raw.ceoIntro?.body),
        name: s(raw.ceoIntro?.name),
        role: s(raw.ceoIntro?.role),
        watchLabel: s(raw.ceoIntro?.watchLabel),
        videoUrl: s(raw.ceoIntro?.videoUrl),
        photoUrl: s(raw.ceoIntro?.photoUrl),
      },
      features: {
        heading: s(raw.features?.heading),
        subheading: s(raw.features?.subheading),
        description: s(raw.features?.description),
        items: Array.isArray(raw.features?.items)
          ? raw.features!.items.map((it) => ({ title: s(it?.title), body: s(it?.body) }))
          : [],
      },
      testimonials: {
        eyebrow: s(raw.testimonials?.eyebrow),
        heading: s(raw.testimonials?.heading),
        items: Array.isArray(raw.testimonials?.items)
          ? raw.testimonials!.items.map((it) => ({
              quote: s(it?.quote),
              name: s(it?.name),
              role: s(it?.role),
            }))
          : [],
      },
      cta: {
        eyebrow: s(raw.cta?.eyebrow),
        heading: s(raw.cta?.heading),
        body: s(raw.cta?.body),
        appStoreLabel: s(raw.cta?.appStoreLabel),
        playStoreLabel: s(raw.cta?.playStoreLabel),
      },
      footer: {
        brand: s(raw.footer?.brand),
        tagline: s(raw.footer?.tagline),
        platformLinks: Array.isArray(raw.footer?.platformLinks)
          ? raw.footer!.platformLinks.map((l) => ({ label: s(l?.label), href: s(l?.href) }))
          : [],
        legalLinks: Array.isArray(raw.footer?.legalLinks)
          ? raw.footer!.legalLinks.map((l) => ({ label: s(l?.label), href: s(l?.href) }))
          : [],
        copyright: s(raw.footer?.copyright),
      },
    };
    setCfg(normalized);
  }, [data]);

  const saveSection = async <K extends SectionKey>(key: K, value: PortalConfig[K]) => {
    setSavingKey(key);
    setStatusByKey((s) => ({ ...s, [key]: undefined }));
    try {
      await save({ [key]: value } as Record<string, unknown>).unwrap();
      setStatusByKey((s) => ({ ...s, [key]: { type: "ok", text: "Saved." } }));
      void refetch();
    } catch (e: unknown) {
      const err = e && typeof e === "object" ? (e as Record<string, unknown>) : {};
      const errData = err.data && typeof err.data === "object" ? (err.data as Record<string, unknown>) : undefined;
      setStatusByKey((s) => ({
        ...s,
        [key]: {
          type: "err",
          text:
            (typeof errData?.error === "string" ? errData.error : null) ||
            (typeof err.message === "string" ? err.message : null) ||
            "Save failed.",
        },
      }));
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading || !cfg) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading portal config…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        Could not load portal config.{" "}
        <Button variant="outline" size="sm" className="ml-2" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* NAV */}
      <Card>
        <CardHeader>
          <SectionHeader title="Top navigation" description="Brand text, nav links, and the two header buttons." />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Brand</Label>
            <Input
              value={cfg.nav.brand}
              onChange={(e) => setCfg({ ...cfg, nav: { ...cfg.nav, brand: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Log In label</Label>
            <Input
              value={cfg.nav.loginLabel}
              onChange={(e) => setCfg({ ...cfg, nav: { ...cfg.nav, loginLabel: e.target.value } })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Get Started label</Label>
            <Input
              value={cfg.nav.getStartedLabel}
              onChange={(e) => setCfg({ ...cfg, nav: { ...cfg.nav, getStartedLabel: e.target.value } })}
            />
          </div>
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Nav links</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCfg({
                    ...cfg,
                    nav: { ...cfg.nav, links: [...cfg.nav.links, { label: "", href: "" }] },
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add link
              </Button>
            </div>
            {cfg.nav.links.map((link, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
                <div className="min-w-[150px] flex-1 space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={link.label}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        nav: {
                          ...cfg.nav,
                          links: cfg.nav.links.map((l, j) => (i === j ? { ...l, label: e.target.value } : l)),
                        },
                      })
                    }
                  />
                </div>
                <div className="min-w-[200px] flex-[2] space-y-1">
                  <Label className="text-xs">Href</Label>
                  <Input
                    value={link.href}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        nav: {
                          ...cfg.nav,
                          links: cfg.nav.links.map((l, j) => (i === j ? { ...l, href: e.target.value } : l)),
                        },
                      })
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() =>
                    setCfg({
                      ...cfg,
                      nav: { ...cfg.nav, links: cfg.nav.links.filter((_, j) => j !== i) },
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="md:col-span-2">
            <SectionSaveButton
              saving={savingKey === "nav"}
              status={statusByKey.nav ?? null}
              onSave={() => void saveSection("nav", cfg.nav)}
            />
          </div>
        </CardContent>
      </Card>

      {/* HERO */}
      <Card>
        <CardHeader>
          <SectionHeader title="Hero" description="Main headline, subtitle, stat cards, and the email-capture button." />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Eyebrow</Label>
            <Input
              value={cfg.hero.eyebrow}
              onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, eyebrow: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Title (line 1)</Label>
            <Input
              value={cfg.hero.title}
              onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, title: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Title accent (line 2)</Label>
            <Input
              value={cfg.hero.titleAccent}
              onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, titleAccent: e.target.value } })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Subtitle</Label>
            <Textarea
              rows={2}
              value={cfg.hero.subtitle}
              onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, subtitle: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Email placeholder</Label>
            <Input
              value={cfg.hero.emailPlaceholder}
              onChange={(e) =>
                setCfg({ ...cfg, hero: { ...cfg.hero, emailPlaceholder: e.target.value } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Email CTA label</Label>
            <Input
              value={cfg.hero.emailCtaLabel}
              onChange={(e) => setCfg({ ...cfg, hero: { ...cfg.hero, emailCtaLabel: e.target.value } })}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Mobile screenshot (shown in the hero phone mockup)</Label>
            <div className="flex flex-wrap items-start gap-4">
              {cfg.hero.mobileScreenshotUrl ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-secondary/40">
                  <img
                    src={cfg.hero.mobileScreenshotUrl}
                    alt="Mobile screenshot"
                    className="h-56 w-auto object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-56 w-32 items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                  No image
                </div>
              )}
              <div className="flex-1 min-w-[240px] space-y-2">
                <ParentCourseMediaUpload
                  label={cfg.hero.mobileScreenshotUrl ? "Replace screenshot" : "Upload screenshot"}
                  folder="portal/hero"
                  accept="image/*"
                  maxSizeMb={10}
                  onUploaded={(url) =>
                    setCfg({ ...cfg, hero: { ...cfg.hero, mobileScreenshotUrl: url } })
                  }
                />
                <Input
                  placeholder="Or paste a direct image URL"
                  value={cfg.hero.mobileScreenshotUrl ?? ""}
                  onChange={(e) =>
                    setCfg({ ...cfg, hero: { ...cfg.hero, mobileScreenshotUrl: e.target.value } })
                  }
                />
                {cfg.hero.mobileScreenshotUrl ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCfg({ ...cfg, hero: { ...cfg.hero, mobileScreenshotUrl: "" } })
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Recommended: a tall portrait screenshot of your mobile app (9:16 or 9:19 aspect). Falls back to /home.png when empty.
                </p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Stats</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setCfg({
                    ...cfg,
                    hero: { ...cfg.hero, stats: [...cfg.hero.stats, { value: "", label: "" }] },
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add stat
              </Button>
            </div>
            {cfg.hero.stats.map((stat, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
                <div className="min-w-[120px] flex-1 space-y-1">
                  <Label className="text-xs">Value</Label>
                  <Input
                    value={stat.value}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        hero: {
                          ...cfg.hero,
                          stats: cfg.hero.stats.map((s, j) => (i === j ? { ...s, value: e.target.value } : s)),
                        },
                      })
                    }
                  />
                </div>
                <div className="min-w-[160px] flex-[2] space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={stat.label}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        hero: {
                          ...cfg.hero,
                          stats: cfg.hero.stats.map((s, j) => (i === j ? { ...s, label: e.target.value } : s)),
                        },
                      })
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() =>
                    setCfg({
                      ...cfg,
                      hero: { ...cfg.hero, stats: cfg.hero.stats.filter((_, j) => j !== i) },
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="md:col-span-2">
            <SectionSaveButton
              saving={savingKey === "hero"}
              status={statusByKey.hero ?? null}
              onSave={() => void saveSection("hero", cfg.hero)}
            />
          </div>
        </CardContent>
      </Card>

      {/* CEO INTRO */}
      <Card>
        <CardHeader>
          <SectionHeader title="CEO intro" description="The 'Hear It Directly' section with a video and CEO bio." />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Eyebrow</Label>
            <Input
              value={cfg.ceoIntro.eyebrow}
              onChange={(e) => setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, eyebrow: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={cfg.ceoIntro.title}
              onChange={(e) => setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, title: e.target.value } })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Body</Label>
            <Textarea
              rows={3}
              value={cfg.ceoIntro.body}
              onChange={(e) => setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, body: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={cfg.ceoIntro.name}
              onChange={(e) => setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, name: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input
              value={cfg.ceoIntro.role}
              onChange={(e) => setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, role: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Watch button label</Label>
            <Input
              value={cfg.ceoIntro.watchLabel}
              onChange={(e) => setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, watchLabel: e.target.value } })}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>CEO photo (optional)</Label>
            <div className="flex flex-wrap items-start gap-4">
              {cfg.ceoIntro.photoUrl ? (
                <div className="overflow-hidden rounded-full border border-border bg-secondary/40">
                  <img
                    src={cfg.ceoIntro.photoUrl}
                    alt="CEO"
                    className="h-24 w-24 object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground">
                  No photo
                </div>
              )}
              <div className="flex-1 min-w-[240px] space-y-2">
                <ParentCourseMediaUpload
                  label={cfg.ceoIntro.photoUrl ? "Replace photo" : "Upload photo"}
                  folder="portal/ceo"
                  accept="image/*"
                  maxSizeMb={10}
                  onUploaded={(url) =>
                    setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, photoUrl: url } })
                  }
                />
                <Input
                  placeholder="Or paste a direct image URL"
                  value={cfg.ceoIntro.photoUrl ?? ""}
                  onChange={(e) =>
                    setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, photoUrl: e.target.value } })
                  }
                />
                {cfg.ceoIntro.photoUrl ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, photoUrl: "" } })
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>CEO intro video (optional)</Label>
            <div className="flex flex-wrap items-start gap-4">
              {cfg.ceoIntro.videoUrl ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-black">
                  <video
                    key={cfg.ceoIntro.videoUrl}
                    src={cfg.ceoIntro.videoUrl}
                    controls
                    className="h-40 w-auto"
                  />
                </div>
              ) : (
                <div className="flex h-40 w-28 items-center justify-center rounded-2xl border border-dashed border-border text-[10px] text-muted-foreground">
                  No video
                </div>
              )}
              <div className="flex-1 min-w-[240px] space-y-2">
                <ParentCourseMediaUpload
                  label={cfg.ceoIntro.videoUrl ? "Replace video" : "Upload video"}
                  folder="portal/ceo"
                  accept="video/*"
                  maxSizeMb={200}
                  onUploaded={(url) =>
                    setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, videoUrl: url } })
                  }
                />
                <Input
                  placeholder="Or paste a video URL (MP4, YouTube, Vimeo)"
                  value={cfg.ceoIntro.videoUrl ?? ""}
                  onChange={(e) =>
                    setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, videoUrl: e.target.value } })
                  }
                />
                {cfg.ceoIntro.videoUrl ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCfg({ ...cfg, ceoIntro: { ...cfg.ceoIntro, videoUrl: "" } })
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Upload an MP4 file directly, or paste a YouTube/Vimeo link. Falls back to /coach-intro.mp4 when empty.
                </p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <SectionSaveButton
              saving={savingKey === "ceoIntro"}
              status={statusByKey.ceoIntro ?? null}
              onSave={() => void saveSection("ceoIntro", cfg.ceoIntro)}
            />
          </div>
        </CardContent>
      </Card>

      {/* FEATURES */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeader title="What We Offer" description="Feature card grid." />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCfg({
                  ...cfg,
                  features: { ...cfg.features, items: [...cfg.features.items, { title: "", body: "" }] },
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add feature
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Section heading (eyebrow)</Label>
              <Input
                value={cfg.features.heading}
                onChange={(e) => setCfg({ ...cfg, features: { ...cfg.features, heading: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subheading</Label>
              <Input
                value={cfg.features.subheading}
                onChange={(e) =>
                  setCfg({ ...cfg, features: { ...cfg.features, subheading: e.target.value } })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={cfg.features.description}
                onChange={(e) =>
                  setCfg({ ...cfg, features: { ...cfg.features, description: e.target.value } })
                }
              />
            </div>
          </div>
          {cfg.features.items.map((it, i) => (
            <div key={i} className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() =>
                    setCfg({
                      ...cfg,
                      features: { ...cfg.features, items: cfg.features.items.filter((_, j) => j !== i) },
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Title</Label>
                <Input
                  value={it.title}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      features: {
                        ...cfg.features,
                        items: cfg.features.items.map((x, j) =>
                          i === j ? { ...x, title: e.target.value } : x,
                        ),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Body</Label>
                <Textarea
                  rows={3}
                  value={it.body}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      features: {
                        ...cfg.features,
                        items: cfg.features.items.map((x, j) =>
                          i === j ? { ...x, body: e.target.value } : x,
                        ),
                      },
                    })
                  }
                />
              </div>
            </div>
          ))}
          <SectionSaveButton
            saving={savingKey === "features"}
            status={statusByKey.features ?? null}
            onSave={() => void saveSection("features", cfg.features)}
          />
        </CardContent>
      </Card>

      {/* TESTIMONIALS */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeader title="Testimonials" description="Quotes shown in the social-proof section." />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCfg({
                  ...cfg,
                  testimonials: {
                    ...cfg.testimonials,
                    items: [...cfg.testimonials.items, { quote: "", name: "", role: "" }],
                  },
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add testimonial
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Eyebrow</Label>
              <Input
                value={cfg.testimonials.eyebrow}
                onChange={(e) =>
                  setCfg({ ...cfg, testimonials: { ...cfg.testimonials, eyebrow: e.target.value } })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Heading</Label>
              <Input
                value={cfg.testimonials.heading}
                onChange={(e) =>
                  setCfg({ ...cfg, testimonials: { ...cfg.testimonials, heading: e.target.value } })
                }
              />
            </div>
          </div>
          {cfg.testimonials.items.map((it, i) => (
            <div key={i} className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() =>
                    setCfg({
                      ...cfg,
                      testimonials: {
                        ...cfg.testimonials,
                        items: cfg.testimonials.items.filter((_, j) => j !== i),
                      },
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Quote</Label>
                <Textarea
                  rows={3}
                  value={it.quote}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      testimonials: {
                        ...cfg.testimonials,
                        items: cfg.testimonials.items.map((x, j) =>
                          i === j ? { ...x, quote: e.target.value } : x,
                        ),
                      },
                    })
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={it.name}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        testimonials: {
                          ...cfg.testimonials,
                          items: cfg.testimonials.items.map((x, j) =>
                            i === j ? { ...x, name: e.target.value } : x,
                          ),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Role</Label>
                  <Input
                    value={it.role}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        testimonials: {
                          ...cfg.testimonials,
                          items: cfg.testimonials.items.map((x, j) =>
                            i === j ? { ...x, role: e.target.value } : x,
                          ),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          <SectionSaveButton
            saving={savingKey === "testimonials"}
            status={statusByKey.testimonials ?? null}
            onSave={() => void saveSection("testimonials", cfg.testimonials)}
          />
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardHeader>
          <SectionHeader title="Call to action" description="Bottom CTA encouraging app download." />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Eyebrow</Label>
            <Input
              value={cfg.cta.eyebrow}
              onChange={(e) => setCfg({ ...cfg, cta: { ...cfg.cta, eyebrow: e.target.value } })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Heading</Label>
            <Input
              value={cfg.cta.heading}
              onChange={(e) => setCfg({ ...cfg, cta: { ...cfg.cta, heading: e.target.value } })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Body</Label>
            <Textarea
              rows={2}
              value={cfg.cta.body}
              onChange={(e) => setCfg({ ...cfg, cta: { ...cfg.cta, body: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>App Store label</Label>
            <Input
              value={cfg.cta.appStoreLabel}
              onChange={(e) => setCfg({ ...cfg, cta: { ...cfg.cta, appStoreLabel: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Play Store label</Label>
            <Input
              value={cfg.cta.playStoreLabel}
              onChange={(e) => setCfg({ ...cfg, cta: { ...cfg.cta, playStoreLabel: e.target.value } })}
            />
          </div>
          <div className="md:col-span-2">
            <SectionSaveButton
              saving={savingKey === "cta"}
              status={statusByKey.cta ?? null}
              onSave={() => void saveSection("cta", cfg.cta)}
            />
          </div>
        </CardContent>
      </Card>

      {/* FOOTER */}
      <Card>
        <CardHeader>
          <SectionHeader title="Footer" description="Brand, tagline, links, and copyright line." />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Brand</Label>
            <Input
              value={cfg.footer.brand}
              onChange={(e) => setCfg({ ...cfg, footer: { ...cfg.footer, brand: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Copyright</Label>
            <Input
              value={cfg.footer.copyright}
              onChange={(e) => setCfg({ ...cfg, footer: { ...cfg.footer, copyright: e.target.value } })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Tagline</Label>
            <Textarea
              rows={2}
              value={cfg.footer.tagline}
              onChange={(e) => setCfg({ ...cfg, footer: { ...cfg.footer, tagline: e.target.value } })}
            />
          </div>

          {(["platformLinks", "legalLinks"] as const).map((kind) => (
            <div key={kind} className="md:col-span-2 space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Label>{kind === "platformLinks" ? "Platform links" : "Legal links"}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCfg({
                      ...cfg,
                      footer: { ...cfg.footer, [kind]: [...cfg.footer[kind], { label: "", href: "" }] },
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add link
                </Button>
              </div>
              {cfg.footer[kind].map((link, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
                  <div className="min-w-[150px] flex-1 space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={link.label}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          footer: {
                            ...cfg.footer,
                            [kind]: cfg.footer[kind].map((l, j) =>
                              i === j ? { ...l, label: e.target.value } : l,
                            ),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="min-w-[200px] flex-[2] space-y-1">
                    <Label className="text-xs">Href</Label>
                    <Input
                      value={link.href}
                      onChange={(e) =>
                        setCfg({
                          ...cfg,
                          footer: {
                            ...cfg.footer,
                            [kind]: cfg.footer[kind].map((l, j) =>
                              i === j ? { ...l, href: e.target.value } : l,
                            ),
                          },
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      setCfg({
                        ...cfg,
                        footer: { ...cfg.footer, [kind]: cfg.footer[kind].filter((_, j) => j !== i) },
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ))}
          <div className="md:col-span-2">
            <SectionSaveButton
              saving={savingKey === "footer"}
              status={statusByKey.footer ?? null}
              onSave={() => void saveSection("footer", cfg.footer)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
