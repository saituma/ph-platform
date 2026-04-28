"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "../../../components/admin/shell";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { ParentCourseMediaUpload } from "../../../components/parent/config/parent-course-media-upload";
import { useHomeContent } from "../_shared/use-home-content";
import { useGetHomeContentQuery } from "../../../lib/apiSlice";

type IntroAudience = "team" | "youth" | "adult";
type IntroVideoRule = { url: string; roles: IntroAudience[] };

const ALL_INTRO_AUDIENCES: IntroAudience[] = ["team", "youth", "adult"];

const getYoutubeEmbedUrl = (raw: string): string | null => {
  try {
    const input = raw.trim();
    if (!input) return null;
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname;
    const isYoutube =
      host === "youtu.be" ||
      host.endsWith("youtube.com") ||
      host.endsWith("youtube-nocookie.com");
    if (!isYoutube) return null;

    const extractId = () => {
      if (host === "youtu.be") {
        return pathname.replace(/^\/+/, "").split("/")[0] || null;
      }
      if (pathname.startsWith("/watch")) {
        return url.searchParams.get("v");
      }
      if (pathname.startsWith("/shorts/")) {
        return pathname.split("/")[2] || null;
      }
      if (pathname.startsWith("/embed/")) {
        return pathname.split("/")[2] || null;
      }
      return url.searchParams.get("v");
    };

    const id = extractId();
    if (!id) return null;
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeId) return null;
    return `https://www.youtube.com/embed/${safeId}`;
  } catch {
    return null;
  }
};

const getLoomEmbedUrl = (raw: string): string | null => {
  try {
    const input = raw.trim();
    if (!input) return null;
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    if (!host.endsWith("loom.com")) return null;
    const path = url.pathname.replace(/^\/+/, "");
    const parts = path.split("/");
    const kind = parts[0];
    const id = parts[1] || "";
    if (!id) return null;
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeId) return null;
    if (kind === "embed") return `https://www.loom.com/embed/${safeId}`;
    if (kind === "share") return `https://www.loom.com/embed/${safeId}`;
    return null;
  } catch {
    return null;
  }
};

const isDirectVideoUrl = (raw: string): boolean => {
  try {
    const input = raw.trim();
    if (!input) return false;
    const url = new URL(input);
    const path = url.pathname.toLowerCase();
    return (
      path.endsWith(".mp4") ||
      path.endsWith(".webm") ||
      path.endsWith(".mov") ||
      path.endsWith(".m4v") ||
      path.endsWith(".mkv") ||
      path.endsWith(".ogg") ||
      path.endsWith(".ogv")
    );
  } catch {
    return false;
  }
};

const normalizeIntroRules = (rules: IntroVideoRule[]): IntroVideoRule[] => {
  const normalized = rules
    .map((rule) => ({
      url: String(rule?.url ?? "").trim(),
      roles: Array.isArray(rule?.roles) ? rule.roles : [],
    }))
    .map((rule) => ({
      url: rule.url,
      roles: Array.from(
        new Set(rule.roles.map((r) => String(r).trim().toLowerCase() as IntroAudience)),
      ).filter((r) => r === "team" || r === "youth" || r === "adult"),
    }))
    .filter((rule) => rule.url.length > 0 && rule.roles.length > 0);

  // Enforce: one role can only be assigned once (last wins).
  const lastIndexByRole = new Map<IntroAudience, number>();
  normalized.forEach((rule, index) => {
    rule.roles.forEach((role) => lastIndexByRole.set(role, index));
  });

  return normalized
    .map((rule, index) => ({
      ...rule,
      roles: rule.roles.filter((role) => lastIndexByRole.get(role) === index),
    }))
    .filter((rule) => rule.roles.length > 0);
};

const deriveIntroVideos = (home: {
  introVideoUrl?: string;
  introVideos?: Array<{ url: string; roles: Array<"team" | "youth" | "adult"> }>;
} | null): IntroVideoRule[] => {
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
  if (rules.length) return normalizeIntroRules(rules);
  const legacy = String(home.introVideoUrl ?? "").trim();
  return legacy ? normalizeIntroRules([{ url: legacy, roles: ["adult", "team", "youth"] }]) : [];
};

const introRoleStateFromList = (roles: IntroAudience[]) => ({
  team: roles.includes("team"),
  youth: roles.includes("youth"),
  adult: roles.includes("adult"),
});

const isBlockedIntroVideoUrl = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized.includes("vimeo.com");
};

export default function ContentIntroVideoPage() {
  const { homeBody, saveHome } = useHomeContent();
  const { isLoading } = useGetHomeContentQuery();

  const [introVideos, setIntroVideos] = useState<IntroVideoRule[]>([]);
  const [isAddingIntroVideo, setIsAddingIntroVideo] = useState(true);
  const [newIntroUrl, setNewIntroUrl] = useState("");
  const [newIntroRoles, setNewIntroRoles] = useState<Record<IntroAudience, boolean>>({
    team: true,
    youth: true,
    adult: true,
  });
  const [introVideoError, setIntroVideoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && (homeBody.introVideos !== undefined || homeBody.introVideoUrl !== undefined)) {
      const derived = deriveIntroVideos({
        introVideoUrl: homeBody.introVideoUrl,
        introVideos: homeBody.introVideos,
      });
      setIntroVideos(derived);
      setIsAddingIntroVideo(derived.length === 0);
      setInitialized(true);
    }
  }, [homeBody, initialized]);

  const assignedIntroRoles = useMemo(() => {
    const set = new Set<IntroAudience>();
    introVideos.forEach((rule) => rule.roles.forEach((role) => set.add(role)));
    return set;
  }, [introVideos]);

  const missingIntroRoles = useMemo(() => {
    return ALL_INTRO_AUDIENCES.filter((role) => !assignedIntroRoles.has(role));
  }, [assignedIntroRoles]);

  useEffect(() => {
    if (missingIntroRoles.length === 0) {
      setIsAddingIntroVideo(false);
    } else if (introVideos.length === 0) {
      setIsAddingIntroVideo(true);
      setNewIntroRoles(introRoleStateFromList(missingIntroRoles));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingIntroRoles.length, introVideos.length]);

  useEffect(() => {
    if (!isAddingIntroVideo) return;
    setNewIntroRoles((prev) => ({
      team: assignedIntroRoles.has("team") ? false : prev.team,
      youth: assignedIntroRoles.has("youth") ? false : prev.youth,
      adult: assignedIntroRoles.has("adult") ? false : prev.adult,
    }));
  }, [assignedIntroRoles, isAddingIntroVideo]);

  return (
    <AdminShell title="Content — Intro Video" subtitle="Mobile app content">
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
              <Label>Intro Video</Label>
              {introVideoError ? (
                <p className="text-xs text-red-500">{introVideoError}</p>
              ) : null}

              {introVideos.length > 0 ? (
                <div className="space-y-3">
                  {introVideos.map((rule, index) => {
                    const isRoleUsedElsewhere = (role: IntroAudience) =>
                      introVideos.some((other, otherIndex) => otherIndex !== index && other.roles.includes(role));

                    return (
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
                                  normalizeIntroRules(
                                    prev.map((item, idx) => (idx === index ? { ...item, url: nextUrl } : item)),
                                  ),
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
                              setIntroVideos((prev) => normalizeIntroRules(prev.filter((_, idx) => idx !== index)));
                            }}
                          >
                            Delete
                          </Button>
                        </div>

                        {(() => {
                          const youtube = getYoutubeEmbedUrl(rule.url);
                          const loom = getLoomEmbedUrl(rule.url);
                          if (youtube || loom) {
                            const src = youtube ?? loom!;
                            return (
                              <div className="overflow-hidden rounded-2xl border border-border bg-secondary/10 aspect-video">
                                <iframe
                                  src={src}
                                  className="h-full w-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title="Intro video preview"
                                />
                              </div>
                            );
                          }
                          if (isDirectVideoUrl(rule.url)) {
                            return (
                              <div className="overflow-hidden rounded-2xl border border-border bg-secondary/10">
                                <video
                                  src={rule.url}
                                  controls
                                  className="h-56 w-full object-cover"
                                  preload="metadata"
                                />
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Roles
                          </span>
                          {ALL_INTRO_AUDIENCES.map((role) => {
                            const checked = rule.roles.includes(role);
                            const disabled = !checked && isRoleUsedElsewhere(role);
                            return (
                              <label
                                key={`intro-video-${index}-role-${role}`}
                                className={`flex items-center gap-2 text-sm ${disabled ? "opacity-50" : ""}`}
                                title={disabled ? `${role} already has an intro video. Remove it there first.` : undefined}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={(e) => {
                                    setIntroVideos((prev) =>
                                      normalizeIntroRules(
                                        prev.map((item, idx) => {
                                          if (idx !== index) return item;
                                          const nextRoles = new Set(item.roles);
                                          if (e.target.checked) nextRoles.add(role);
                                          else nextRoles.delete(role);
                                          return { ...item, roles: Array.from(nextRoles) as IntroAudience[] };
                                        }),
                                      ),
                                    );
                                  }}
                                />
                                <span className="capitalize">{role}</span>
                              </label>
                            );
                          })}
                        </div>

                        {rule.roles.length === 0 ? (
                          <p className="text-xs text-red-500">Pick at least one role or delete this entry.</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No intro videos set yet. Add one below (each role can only have one intro video).
                </p>
              )}

              {missingIntroRoles.length > 0 && !isAddingIntroVideo ? (
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIntroVideoError(null);
                      setNewIntroUrl("");
                      setNewIntroRoles(introRoleStateFromList(missingIntroRoles));
                      setIsAddingIntroVideo(true);
                    }}
                  >
                    Add an intro video
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Missing roles:{" "}
                    {missingIntroRoles.map((role) => role[0].toUpperCase() + role.slice(1)).join(", ")}
                  </p>
                </div>
              ) : null}

              {isAddingIntroVideo ? (
                <div className="rounded-2xl border border-border bg-secondary/10 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Add intro video</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingIntroVideo(false);
                        setIntroVideoError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Show for
                    </span>
                    {ALL_INTRO_AUDIENCES.map((role) => {
                      const isAlreadyAssigned = assignedIntroRoles.has(role);
                      const checked = isAlreadyAssigned ? false : newIntroRoles[role];
                      const disabled = isAlreadyAssigned;
                      return (
                        <label
                          key={`new-intro-role-${role}`}
                          className={`flex items-center gap-2 text-sm ${disabled ? "opacity-50" : ""}`}
                          title={disabled ? `${role} already has an intro video.` : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={(e) => {
                              setNewIntroRoles((prev) => ({ ...prev, [role]: e.target.checked }));
                            }}
                          />
                          <span className="capitalize">{role}</span>
                        </label>
                      );
                    })}
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
                        .filter((role) => !assignedIntroRoles.has(role))
                        .sort();
                      if (roles.length === 0) {
                        setIntroVideoError("Select at least one missing role for this video.");
                        return;
                      }
                      setIntroVideos((prev) => normalizeIntroRules([...prev, { url, roles }]));
                      setIsAddingIntroVideo(false);
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
                            .filter((role) => !assignedIntroRoles.has(role))
                            .sort();
                          if (roles.length === 0) {
                            setIntroVideoError("Select at least one missing role for this video.");
                            return;
                          }
                          setIntroVideos((prev) => normalizeIntroRules([...prev, { url: normalized, roles }]));
                          setNewIntroUrl("");
                          setIsAddingIntroVideo(false);
                        }}
                        disabled={!newIntroUrl.trim().length}
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {newIntroUrl.trim() ? (
                    (() => {
                      const youtube = getYoutubeEmbedUrl(newIntroUrl);
                      const loom = getLoomEmbedUrl(newIntroUrl);
                      if (youtube || loom) {
                        const src = youtube ?? loom!;
                        return (
                          <div className="overflow-hidden rounded-2xl border border-border bg-secondary/10 aspect-video">
                            <iframe
                              src={src}
                              className="h-full w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="New intro video preview"
                            />
                          </div>
                        );
                      }
                      if (isDirectVideoUrl(newIntroUrl)) {
                        return (
                          <div className="overflow-hidden rounded-2xl border border-border bg-secondary/10">
                            <video
                              src={newIntroUrl.trim()}
                              controls
                              className="h-56 w-full object-cover"
                              preload="metadata"
                            />
                          </div>
                        );
                      }
                      return null;
                    })()
                  ) : null}

                  <p className="text-xs text-muted-foreground">
                    Each role can only have one intro video. One video can be used for multiple roles by selecting
                    multiple checkboxes.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-4">
            <Button
              className="w-full"
              disabled={isSaving}
              onClick={async () => {
                const normalizedRules = normalizeIntroRules(introVideos);

                const bad = normalizedRules.find((rule) => isBlockedIntroVideoUrl(rule.url));
                if (bad) {
                  setIntroVideoError(
                    "Vimeo URLs are not supported for intro video. Use an upload, a direct .mp4 URL, or YouTube.",
                  );
                  return;
                }
                const seen = new Map<IntroAudience, string>();
                for (const rule of normalizedRules) {
                  for (const role of rule.roles) {
                    if (seen.has(role)) {
                      setIntroVideoError(`${role[0].toUpperCase() + role.slice(1)} already has an intro video.`);
                      return;
                    }
                    seen.set(role, rule.url);
                  }
                }

                const fallbackUrl = normalizedRules[0]?.url ?? "";
                try {
                  setIsSaving(true);
                  await saveHome({ ...homeBody, introVideoUrl: fallbackUrl, introVideos: normalizedRules });
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {isSaving ? "Saving..." : "Save Intro Video"}
            </Button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
