"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Skeleton } from "../../../components/ui/skeleton";
import { ParentCourseMediaUpload } from "../../../components/parent/config/parent-course-media-upload";
import { useHomeContent } from "../_shared/use-home-content";
import { useGetHomeContentQuery } from "../../../lib/apiSlice";

export default function ContentProfilePage() {
  const { homeBody, saveHome } = useHomeContent();
  const { isLoading } = useGetHomeContentQuery();

  const adminStoryRef = useRef<HTMLTextAreaElement | null>(null);
  const [showAdminStoryPreview, setShowAdminStoryPreview] = useState(false);
  const [adminStory, setAdminStory] = useState("");
  const [homeProfessionalPhoto, setHomeProfessionalPhoto] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && (homeBody.adminStory !== undefined || homeBody.professionalPhoto !== undefined)) {
      setAdminStory(homeBody.adminStory ?? "");
      const photo =
        homeBody.professionalPhoto ??
        (Array.isArray(homeBody.professionalPhotos)
          ? homeBody.professionalPhotos[0] ?? ""
          : typeof homeBody.professionalPhotos === "string"
          ? homeBody.professionalPhotos
              .split(/\r?\n|,/)
              .map((item: string) => item.trim())
              .filter(Boolean)[0] ?? ""
          : "");
      setHomeProfessionalPhoto(photo);
      setInitialized(true);
    }
  }, [homeBody, initialized]);

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
    <AdminShell title="Content — Profile" subtitle="Mobile app content">
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
                disabled={isSaving}
                onClick={async () => {
                  try {
                    setIsSaving(true);
                    await saveHome({ ...homeBody, adminStory, professionalPhoto: homeProfessionalPhoto });
                  } finally {
                    setIsSaving(false);
                  }
                }}
              >
                {isSaving ? "Saving..." : "Save Updates"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
