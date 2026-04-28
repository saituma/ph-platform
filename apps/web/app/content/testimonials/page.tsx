"use client";

import { useEffect, useState } from "react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "../../../components/ui/select";
import { Skeleton } from "../../../components/ui/skeleton";
import { Textarea } from "../../../components/ui/textarea";
import { ParentCourseMediaUpload } from "../../../components/parent/config/parent-course-media-upload";
import { useHomeContent } from "../_shared/use-home-content";
import {
  useGetHomeContentQuery,
  useGetTestimonialSubmissionsQuery,
  useApproveTestimonialSubmissionMutation,
  useRejectTestimonialSubmissionMutation,
} from "../../../lib/apiSlice";

export type TestimonialEntry = {
  id?: string | number;
  name?: string;
  quote?: string;
  mediaType?: "text" | "image" | "video";
  photoUrl?: string;
  videoUrl?: string;
  aspectRatio?: "reel" | "landscape" | "square";
};

type SubmissionBody = {
  name?: string;
  quote?: string;
  photoUrl?: string | null;
};

export default function ContentTestimonialsPage() {
  const { homeBody, saveHome } = useHomeContent();
  const { isLoading } = useGetHomeContentQuery();
  const { data: testimonialSubmissionsData, refetch: refetchSubmissions } =
    useGetTestimonialSubmissionsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [approveSubmission] = useApproveTestimonialSubmissionMutation();
  const [rejectSubmission] = useRejectTestimonialSubmissionMutation();

  const [homeTestimonials, setHomeTestimonials] = useState<TestimonialEntry[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [testimonialName, setTestimonialName] = useState("");
  const [testimonialQuote, setTestimonialQuote] = useState("");
  const [testimonialPhoto, setTestimonialPhoto] = useState("");
  const [testimonialMediaType, setTestimonialMediaType] = useState<"text" | "image" | "video">("text");
  const [testimonialVideoUrl, setTestimonialVideoUrl] = useState("");
  const [testimonialVideoAspect, setTestimonialVideoAspect] = useState<"reel" | "landscape" | "square">("reel");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!initialized && homeBody.testimonials !== undefined) {
      const value = homeBody.testimonials;
      if (Array.isArray(value)) {
        setHomeTestimonials(value as TestimonialEntry[]);
      } else if (typeof value === "string" && value.trim().length) {
        try {
          const parsed = JSON.parse(value) as unknown;
          setHomeTestimonials(Array.isArray(parsed) ? (parsed as TestimonialEntry[]) : []);
        } catch {
          setHomeTestimonials([]);
        }
      }
      setInitialized(true);
    }
  }, [homeBody, initialized]);

  const testimonialSubmissions = testimonialSubmissionsData?.items ?? [];

  return (
    <AdminShell title="Content — Testimonials" subtitle="Mobile app content">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      ) : (
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
              {(() => {
                const formatItems = [
                  { label: "Text quote", value: "text" },
                  { label: "Photo + optional quote", value: "image" },
                  { label: "Video (link or Shorts / Reel URL)", value: "video" },
                ];
                return (
                  <Select
                    items={formatItems}
                    value={testimonialMediaType}
                    onValueChange={(val) => setTestimonialMediaType((val ?? "text") as "text" | "image" | "video")}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectPopup>
                      {formatItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                );
              })()}
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
                  {(() => {
                    const aspectItems = [
                      { label: "Vertical (9:16 — Reels / Shorts)", value: "reel" },
                      { label: "Landscape (16:9)", value: "landscape" },
                      { label: "Square (1:1)", value: "square" },
                    ];
                    return (
                      <Select
                        items={aspectItems}
                        value={testimonialVideoAspect}
                        onValueChange={(val) =>
                          setTestimonialVideoAspect((val ?? "reel") as "reel" | "landscape" | "square")
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectPopup>
                          {aspectItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                    );
                  })()}
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
                setHomeTestimonials((prev) => [...prev, entry as TestimonialEntry]);
              }}
            >
              Add Testimonial
            </Button>
            <Button
              className="w-full"
              variant="outline"
              disabled={isSaving}
              onClick={async () => {
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
                try {
                  setIsSaving(true);
                  await saveHome({ ...homeBody, testimonials: cleaned });
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {isSaving ? "Saving..." : "Save Testimonials"}
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
                {testimonialSubmissions.map((submission: { id: number; body?: string | null; title?: string | null; content?: string | null }) => {
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
                            onClick={async () => {
                              try {
                                await rejectSubmission({ submissionId: submission.id }).unwrap();
                                refetchSubmissions();
                              } catch {
                                // silent
                              }
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await approveSubmission({ submissionId: submission.id }).unwrap();
                                refetchSubmissions();
                              } catch {
                                // silent
                              }
                            }}
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
      )}
    </AdminShell>
  );
}
