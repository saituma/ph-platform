"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select } from "../../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { Textarea } from "../../ui/textarea";
import { ParentCourseMediaUpload } from "../../parent/config/parent-course-media-upload";

export type TestimonialEntry = {
  id?: string | number;
  name?: string;
  quote?: string;
  mediaType?: "text" | "image" | "video";
  photoUrl?: string;
  videoUrl?: string;
  aspectRatio?: "reel" | "landscape" | "square";
};

type TestimonialSubmission = {
  id: number;
  body?: string | null;
  title?: string | null;
  content?: string | null;
};

type SubmissionBody = {
  name?: string;
  quote?: string;
  photoUrl?: string | null;
};

type ContentTabsProps = {
  initialHome?: {
    introVideoUrl?: string;
    introVideos?: Array<{ url: string; roles: Array<"team" | "youth" | "adult"> }>;
    adminStory?: string;
    professionalPhoto?: string;
    testimonials?: TestimonialEntry[] | string;
  } | null;
  onSaveProfile: (data: { adminStory: string; professionalPhoto: string }) => void;
  onSaveTestimonials: (data: { testimonials: TestimonialEntry[] }) => void;
  onSaveIntroVideo: (data: {
    introVideoUrl: string;
    introVideos: Array<{ url: string; roles: Array<"team" | "youth" | "adult"> }>;
  }) => void;
  testimonialSubmissions?: TestimonialSubmission[];
  onApproveTestimonial?: (submissionId: number) => void;
  onRejectTestimonial?: (submissionId: number) => void;
};

type IntroAudience = "team" | "youth" | "adult";
type IntroVideoRule = { url: string; roles: IntroAudience[] };

export function ContentTabs({
  initialHome,
  onSaveProfile,
  onSaveTestimonials,
  onSaveIntroVideo,
  testimonialSubmissions = [],
  onApproveTestimonial,
  onRejectTestimonial,
}: ContentTabsProps) {
  const adminStoryRef = useRef<HTMLTextAreaElement | null>(null);
  const [showAdminStoryPreview, setShowAdminStoryPreview] = useState(false);
  const deriveIntroVideos = (home: ContentTabsProps["initialHome"]): IntroVideoRule[] => {
    if (!home) return [];
    const rulesRaw = Array.isArray(home.introVideos) ? home.introVideos : [];
    const rules = rulesRaw
      .map((rule) => ({
        url: String(rule?.url ?? "").trim(),
        roles: Array.isArray(rule?.roles)
          ? (rule.roles as unknown[]).map((r) => String(r).trim().toLowerCase() as IntroAudience)
          : [],
      }))
      .map((rule) => ({
        url: rule.url,
        roles: Array.from(new Set(rule.roles.filter((r) => r === "team" || r === "youth" || r === "adult"))).sort(),
      }))
      .filter((rule) => rule.url.length > 0 && rule.roles.length > 0);
    if (rules.length) return rules;
    const legacy = String(home.introVideoUrl ?? "").trim();
    return legacy ? [{ url: legacy, roles: ["adult", "team", "youth"] }] : [];
  };

  const [introVideos, setIntroVideos] = useState<IntroVideoRule[]>(() =>
    deriveIntroVideos(initialHome ?? null),
  );
  const [newIntroUrl, setNewIntroUrl] = useState("");
  const [newIntroRoles, setNewIntroRoles] = useState<Record<IntroAudience, boolean>>({
    team: true,
    youth: true,
    adult: true,
  });
  const [homeProfessionalPhoto, setHomeProfessionalPhoto] = useState(() => initialHome?.professionalPhoto ?? "");
  const [adminStory, setAdminStory] = useState(() => initialHome?.adminStory ?? "");
  const [homeTestimonials, setHomeTestimonials] = useState<TestimonialEntry[]>(() => {
    const value = initialHome?.testimonials;
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim().length) {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? (parsed as TestimonialEntry[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [testimonialName, setTestimonialName] = useState("");
  const [testimonialQuote, setTestimonialQuote] = useState("");
  const [testimonialPhoto, setTestimonialPhoto] = useState("");
  const [testimonialMediaType, setTestimonialMediaType] = useState<"text" | "image" | "video">("text");
  const [testimonialVideoUrl, setTestimonialVideoUrl] = useState("");
  const [testimonialVideoAspect, setTestimonialVideoAspect] = useState<"reel" | "landscape" | "square">("reel");
  const [introVideoError, setIntroVideoError] = useState<string | null>(null);

  const lastInitialRef = useRef<ContentTabsProps["initialHome"]>(initialHome ?? null);
  useEffect(() => {
    const prev = lastInitialRef.current;
    const next = initialHome ?? null;
    lastInitialRef.current = next;
    if (!next) return;

    setHomeProfessionalPhoto((current) => {
      const prevValue = prev?.professionalPhoto ?? "";
      const nextValue = next.professionalPhoto ?? "";
      if (current === prevValue) return nextValue;
      if (!current && nextValue) return nextValue;
      return current;
    });
    setAdminStory((current) => {
      const prevValue = prev?.adminStory ?? "";
      const nextValue = next.adminStory ?? "";
      if (current === prevValue) return nextValue;
      if (!current && nextValue) return nextValue;
      return current;
    });
    setIntroVideos((current) => {
      const prevDerived = deriveIntroVideos(prev ?? null);
      const nextDerived = deriveIntroVideos(next);
      const currentSerialized = JSON.stringify(current);
      const prevSerialized = JSON.stringify(prevDerived);
      if (currentSerialized === prevSerialized) return nextDerived;
      if (current.length === 0 && nextDerived.length > 0) return nextDerived;
      return current;
    });
  }, [initialHome]);

  const isBlockedIntroVideoUrl = (value: string) => {
    const normalized = value.trim().toLowerCase();
    return normalized.includes("vimeo.com");
  };
  const wrapSelection = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    prefix: string,
    suffix: string,
    placeholder = ""
  ) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const text = el.value;
    const selected = text.slice(start, end) || placeholder;
    const next = text.slice(0, start) + prefix + selected + suffix + text.slice(end);
    el.value = next;
    const cursorStart = start + prefix.length;
    const cursorEnd = cursorStart + selected.length;
    el.focus();
    el.setSelectionRange(cursorStart, cursorEnd);
    if (ref === adminStoryRef) {
      setAdminStory(el.value);
    }
  };

  const prefixLines = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    prefix: string,
    placeholder = ""
  ) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const text = el.value;
    const selected = text.slice(start, end) || placeholder;
    const lines = selected.split("\n").map((line) => `${prefix}${line}`);
    const next = text.slice(0, start) + lines.join("\n") + text.slice(end);
    el.value = next;
    el.focus();
    el.setSelectionRange(start, start + lines.join("\n").length);
    if (ref === adminStoryRef) {
      setAdminStory(el.value);
    }
  };

  const renderMarkdown = (text: string) => {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^\- (.*)$/gm, "<li>$1</li>")
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, "<br />");
  };

  const adminStoryPreview = useMemo(
    () => renderMarkdown(adminStory),
    [adminStory]
  );

  const toolbar = [
    { label: "B", type: "wrap", prefix: "**", suffix: "**", placeholder: "bold" },
    { label: "I", type: "wrap", prefix: "_", suffix: "_", placeholder: "italic" },
    { label: "H1", type: "line", prefix: "# ", placeholder: "Heading 1" },
    { label: "H2", type: "line", prefix: "## ", placeholder: "Heading 2" },
    { label: "Link", type: "wrap", prefix: "[", suffix: "](https://)", placeholder: "label" },
    { label: "List", type: "line", prefix: "- ", placeholder: "Item" },
    { label: "Quote", type: "line", prefix: "> ", placeholder: "Quote" },
    { label: "Code", type: "wrap", prefix: "`", suffix: "`", placeholder: "code" },
  ] as const;

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
        <TabsTrigger value="intro">Intro Video</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Admin Story</Label>
              <div className="flex flex-wrap gap-2">
                {toolbar.map((item) => (
                  <Button
                    key={`admin-story-${item.label}`}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (item.type === "wrap") {
                        wrapSelection(adminStoryRef, item.prefix, item.suffix, item.placeholder);
                      } else {
                        prefixLines(adminStoryRef, item.prefix, item.placeholder);
                      }
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdminStoryPreview((prev) => !prev)}
                >
                  {showAdminStoryPreview ? "Edit" : "Preview"}
                </Button>
              </div>
              {showAdminStoryPreview ? (
                <div
                  className="min-h-[200px] rounded-2xl border border-border bg-secondary/30 p-4 text-sm"
                  dangerouslySetInnerHTML={{ __html: adminStoryPreview }}
                />
              ) : (
                <Textarea
                  ref={adminStoryRef}
                  placeholder="Share the admin story..."
                  value={adminStory}
                  onChange={(event) => setAdminStory(event.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Professional Photos</Label>
              <ParentCourseMediaUpload
                label={homeProfessionalPhoto ? "Replace Photo" : "Upload Photo"}
                folder="home/professional-photo"
                accept="image/*"
                maxSizeMb={10}
                onUploaded={(url) => {
                  setHomeProfessionalPhoto(url);
                }}
              />
              {homeProfessionalPhoto ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-secondary/30 px-3 py-2 text-xs">
                    <span className="break-all text-muted-foreground">{homeProfessionalPhoto}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setHomeProfessionalPhoto("");
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-secondary/10">
                    <img
                      src={homeProfessionalPhoto}
                      alt="Professional photo preview"
                      className="h-56 w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Upload professional photos to appear on the home dashboard.
                </p>
              )}
            </div>
          </div>
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-border bg-secondary/10 p-4 space-y-4">
              <Button
                className="w-full"
                onClick={() => {
                  onSaveProfile({
                    adminStory,
                    professionalPhoto: homeProfessionalPhoto,
                  });
                }}
              >
                Save Updates
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="testimonials">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Jordan Smith"
                value={testimonialName}
                onChange={(e) => setTestimonialName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={testimonialMediaType}
                onChange={(e) => setTestimonialMediaType(e.target.value as "text" | "image" | "video")}
              >
                <option value="text">Text quote</option>
                <option value="image">Photo + optional quote</option>
                <option value="video">Video (link or Shorts / Reel URL)</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quote {testimonialMediaType === "text" ? "" : "(optional)"}</Label>
              <Textarea
                placeholder="Share the testimonial..."
                value={testimonialQuote}
                onChange={(e) => setTestimonialQuote(e.target.value)}
              />
            </div>
            {testimonialMediaType === "image" ? (
              <div className="space-y-2">
                <Label>Photo</Label>
                <ParentCourseMediaUpload
                  label={testimonialPhoto ? "Replace Photo" : "Upload Photo"}
                  folder="home/testimonials"
                  accept="image/*"
                  maxSizeMb={10}
                  onUploaded={(url) => setTestimonialPhoto(url)}
                />
                {testimonialPhoto ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-secondary/30 px-3 py-2 text-xs">
                    <span className="break-all text-muted-foreground">{testimonialPhoto}</span>
                    <Button size="sm" variant="outline" onClick={() => setTestimonialPhoto("")}>
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {testimonialMediaType === "video" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <Input
                    placeholder="https://… (MP4, Vimeo, YouTube, Shorts)"
                    value={testimonialVideoUrl}
                    onChange={(e) => setTestimonialVideoUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Video shape</Label>
                  <Select
                    value={testimonialVideoAspect}
                    onChange={(e) =>
                      setTestimonialVideoAspect(e.target.value as "reel" | "landscape" | "square")
                    }
                  >
                    <option value="reel">Vertical (9:16 — Reels / Shorts)</option>
                    <option value="landscape">Landscape (16:9)</option>
                    <option value="square">Square (1:1)</option>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste a direct file URL or a YouTube / Vimeo link. The app uses the same player as exercise videos.
                </p>
              </div>
            ) : null}
          </div>
          <div className="space-y-4">
            <Button
              className="w-full"
              onClick={() => {
                if (!testimonialName.trim()) return;
                const quote = testimonialQuote.trim();
                const video = testimonialVideoUrl.trim();
                const photo = testimonialPhoto.trim();
                if (testimonialMediaType === "text" && !quote) return;
                if (testimonialMediaType === "image" && !photo && !quote) return;
                if (testimonialMediaType === "video" && !video) return;
                const entry: Record<string, unknown> = {
                  id: `t_${Date.now()}`,
                  name: testimonialName.trim(),
                  quote: quote || "",
                  mediaType: testimonialMediaType,
                };
                if (testimonialMediaType === "image" && photo) entry.photoUrl = photo;
                if (testimonialMediaType === "video") {
                  entry.videoUrl = video;
                  entry.aspectRatio = testimonialVideoAspect;
                }
                setTestimonialName("");
                setTestimonialQuote("");
                setTestimonialPhoto("");
                setTestimonialVideoUrl("");
                setTestimonialMediaType("text");
                setTestimonialVideoAspect("reel");
                setHomeTestimonials((prev) => [...prev, entry]);
              }}
            >
              Add Testimonial
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                const cleaned = homeTestimonials.filter((item) => {
                  if (!item?.name?.trim?.()) return false;
                  const q = String(item?.quote ?? "").trim();
                  const photo = String(item?.photoUrl ?? "").trim();
                  const video = String(item?.videoUrl ?? "").trim();
                  const mt = item?.mediaType ?? (video ? "video" : photo ? "image" : "text");
                  if (mt === "text") return q.length > 0;
                  if (mt === "image") return q.length > 0 || photo.length > 0;
                  if (mt === "video") return video.length > 0;
                  return q.length > 0;
                });
                onSaveTestimonials({ testimonials: cleaned });
              }}
            >
              Save Testimonials
            </Button>
            {homeTestimonials.length ? (
              <div className="space-y-3">
                {homeTestimonials.map((item, index: number) => (
                  <div
                    key={item?.id ?? `testimonial-${index}`}
                    className="rounded-2xl border border-border bg-secondary/30 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {item?.name ?? "Unnamed"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item?.mediaType === "video"
                            ? item?.videoUrl ?? "Video"
                            : item?.quote ?? ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setHomeTestimonials((prev) =>
                            prev.filter((_, i: number) => i !== index)
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                    {item?.photoUrl ? (
                      <div className="mt-3 h-16 w-16 overflow-hidden rounded-xl border border-border bg-secondary/40">
                        <img
                          src={item.photoUrl}
                          alt={`Testimonial ${item?.name ?? ""}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    {item?.mediaType === "video" && item?.videoUrl ? (
                      <p className="mt-2 text-[10px] text-muted-foreground break-all">{item.videoUrl}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {testimonialSubmissions.length ? (
              <div className="space-y-3 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Pending Submissions
                </p>
                {testimonialSubmissions.map((submission) => {
                  let body: SubmissionBody = {};
                  if (submission?.body && typeof submission.body === "string") {
                    try {
                      body = JSON.parse(submission.body) as SubmissionBody;
                    } catch {
                      body = {};
                    }
                  }
                  const name = body.name ?? submission.title ?? "Submission";
                  const quote = body.quote ?? submission.content ?? "";
                  const photoUrl = body.photoUrl ?? null;
                  return (
                    <div
                      key={`submission-${submission.id}`}
                      className="rounded-2xl border border-border bg-secondary/30 p-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground">{quote}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRejectTestimonial?.(submission.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onApproveTestimonial?.(submission.id)}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                      {photoUrl ? (
                        <div className="mt-3 h-16 w-16 overflow-hidden rounded-xl border border-border bg-secondary/40">
                          <img
                            src={photoUrl}
                            alt={`Submission ${name}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="intro">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Intro Video</Label>
              <div className="rounded-2xl border border-border bg-secondary/10 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Show for
                  </span>
                  {(["team", "youth", "adult"] as const).map((role) => (
                    <label key={`intro-role-${role}`} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newIntroRoles[role]}
                        onChange={(e) => {
                          setNewIntroRoles((prev) => ({ ...prev, [role]: e.target.checked }));
                        }}
                      />
                      <span className="capitalize">{role}</span>
                    </label>
                  ))}
                </div>
                <ParentCourseMediaUpload
                  label="Upload Video"
                  folder="home/intro-video"
                  accept="video/*"
                  maxSizeMb={200}
                  onUploaded={(url) => {
                    setIntroVideoError(null);
                    const roles = (Object.entries(newIntroRoles) as Array<[IntroAudience, boolean]>)
                      .filter(([, enabled]) => enabled)
                      .map(([role]) => role)
                      .sort();
                    if (roles.length === 0) {
                      setIntroVideoError("Select at least one role for this video.");
                      return;
                    }
                    setIntroVideos((prev) => [...prev, { url, roles }]);
                  }}
                />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Or paste a direct video file URL</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="https://…mp4 or https://youtube.com/watch?v=…"
                      value={newIntroUrl}
                      onChange={(event) => {
                        setNewIntroUrl(event.target.value);
                        setIntroVideoError(null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const normalized = newIntroUrl.trim();
                        if (!normalized) return;
                        if (isBlockedIntroVideoUrl(normalized)) {
                          setIntroVideoError(
                            "Vimeo URLs are not supported for intro video. Use an upload, a direct .mp4 URL, or YouTube.",
                          );
                          return;
                        }
                        const roles = (Object.entries(newIntroRoles) as Array<[IntroAudience, boolean]>)
                          .filter(([, enabled]) => enabled)
                          .map(([role]) => role)
                          .sort();
                        if (roles.length === 0) {
                          setIntroVideoError("Select at least one role for this video.");
                          return;
                        }
                        setIntroVideos((prev) => [...prev, { url: normalized, roles }]);
                        setNewIntroUrl("");
                      }}
                      disabled={!newIntroUrl.trim().length}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              {introVideoError ? (
                <p className="text-xs text-red-500">{introVideoError}</p>
              ) : null}
              {introVideos.length > 0 ? (
                <div className="space-y-3">
                  {introVideos.map((rule, index) => (
                    <div
                      key={`intro-video-${index}-${rule.url}`}
                      className="rounded-2xl border border-border bg-secondary/10 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <Label className="text-xs text-muted-foreground">Video URL</Label>
                          <Input
                            value={rule.url}
                            onChange={(event) => {
                              const nextUrl = event.target.value;
                              setIntroVideos((prev) =>
                                prev.map((item, idx) => (idx === index ? { ...item, url: nextUrl } : item)),
                              );
                              setIntroVideoError(null);
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIntroVideos((prev) => prev.filter((_, idx) => idx !== index));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Roles
                        </span>
                        {(["team", "youth", "adult"] as const).map((role) => (
                          <label
                            key={`intro-video-${index}-role-${role}`}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={rule.roles.includes(role)}
                              onChange={(e) => {
                                setIntroVideos((prev) =>
                                  prev.map((item, idx) => {
                                    if (idx !== index) return item;
                                    const nextRoles = new Set(item.roles);
                                    if (e.target.checked) nextRoles.add(role);
                                    else nextRoles.delete(role);
                                    return { ...item, roles: Array.from(nextRoles).sort() as IntroAudience[] };
                                  }),
                                );
                              }}
                            />
                            <span className="capitalize">{role}</span>
                          </label>
                        ))}
                      </div>
                      {rule.roles.length === 0 ? (
                        <p className="text-xs text-red-500">Pick at least one role or remove this entry.</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Upload an intro video, paste a direct <code className="rounded bg-muted px-1">.mp4</code> URL, or a{" "}
                  <strong>YouTube</strong> link (plays in the mobile app). Vimeo links are not supported for intro yet.
                </p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <Button
              className="w-full"
              onClick={() => {
                const normalizedRules: IntroVideoRule[] = introVideos
                  .map((rule) => ({
                    url: String(rule.url ?? "").trim(),
                    roles: Array.from(
                      new Set((rule.roles ?? []).filter((r) => r === "team" || r === "youth" || r === "adult")),
                    ).sort(),
                  }))
                  .filter((rule) => rule.url.length > 0);

                const bad = normalizedRules.find((rule) => isBlockedIntroVideoUrl(rule.url));
                if (bad) {
                  setIntroVideoError(
                    "Vimeo URLs are not supported for intro video. Use an upload, a direct .mp4 URL, or YouTube.",
                  );
                  return;
                }
                const emptyRoles = normalizedRules.find((rule) => rule.roles.length === 0);
                if (emptyRoles) {
                  setIntroVideoError("Each intro video must have at least one role selected.");
                  return;
                }

                const fallbackUrl = normalizedRules[0]?.url ?? "";
                onSaveIntroVideo({ introVideoUrl: fallbackUrl, introVideos: normalizedRules });
              }}
            >
              Save Intro Video
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
