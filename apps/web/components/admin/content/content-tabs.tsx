"use client";

import { useMemo, useRef, useState } from "react";

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
    adminStory?: string;
    professionalPhoto?: string;
    testimonials?: TestimonialEntry[] | string;
  } | null;
  onSaveProfile: (data: { adminStory: string; professionalPhoto: string }) => void;
  onSaveTestimonials: (data: { testimonials: TestimonialEntry[] }) => void;
  onSaveIntroVideo: (data: { introVideoUrl: string }) => void;
  testimonialSubmissions?: TestimonialSubmission[];
  onApproveTestimonial?: (submissionId: number) => void;
  onRejectTestimonial?: (submissionId: number) => void;
};

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
  const [homeIntroVideo, setHomeIntroVideo] = useState(() => initialHome?.introVideoUrl ?? "");
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
              <ParentCourseMediaUpload
                label={homeIntroVideo ? "Replace Video" : "Upload Video"}
                folder="home/intro-video"
                accept="video/*"
                maxSizeMb={200}
                onUploaded={(url) => setHomeIntroVideo(url)}
              />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Or paste a direct video file URL</Label>
                <Input
                  placeholder="https://…mp4 or https://youtube.com/watch?v=…"
                  value={homeIntroVideo}
                  onChange={(event) => {
                    setHomeIntroVideo(event.target.value);
                    setIntroVideoError(null);
                  }}
                />
              </div>
              {introVideoError ? (
                <p className="text-xs text-red-500">{introVideoError}</p>
              ) : null}
              {homeIntroVideo ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-secondary/30 px-3 py-2 text-xs">
                  <span className="break-all text-muted-foreground">{homeIntroVideo}</span>
                  <Button size="sm" variant="outline" onClick={() => {
                    setHomeIntroVideo("");
                    setIntroVideoError(null);
                  }}>
                    Remove
                  </Button>
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
                const normalized = homeIntroVideo.trim();
                if (normalized && isBlockedIntroVideoUrl(normalized)) {
                  setIntroVideoError("Vimeo URLs are not supported for intro video. Use an upload, a direct .mp4 URL, or YouTube.");
                  return;
                }
                onSaveIntroVideo({ introVideoUrl: normalized });
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
