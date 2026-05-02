import { config } from "@/lib/config";

/** React Query keys for `/api/content/home` (dashboard + coach info page). */
export const homeQueryKeys = {
	all: ["home"] as const,
	content: (token: string | null) =>
		[...homeQueryKeys.all, "content", token] as const,
};

export type HomeTestimonial = {
  id: string;
  name: string;
  role?: string | null;
  quote: string;
  rating?: number | null;
  photoUrl?: string | null;
  photo?: string | null;
  imageUrl?: string | null;
  image?: string | null;
};

export type HomeContentPayload = {
  headline?: string | null;
  description?: string | null;
  welcome?: string | null;
  introVideoUrl?: string | null;
  introVideos?: Array<{ url: string; roles: Array<"team" | "youth" | "adult"> }> | null;
  heroImageUrl?: string | null;
  testimonials?: HomeTestimonial[] | null;
  adminStory?: string | null;
  professionalPhoto?: string | null;
  professionalPhotos?: string[] | string | null;
};

export async function fetchHomeContent(_token?: string): Promise<HomeContentPayload | null> {
  const baseUrl = config.api.baseUrl;

  const response = await fetch(`${baseUrl}/api/content/home`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch home content: ${response.status}`);
  }

  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) return null;

  const parseBody = (raw: any): HomeContentPayload => {
    if (!raw) return {};
    if (typeof raw === "string" && raw.trim().length) {
      try {
        return JSON.parse(raw) as HomeContentPayload;
      } catch {
        return {};
      }
    }
    if (typeof raw === "object") {
      return raw as HomeContentPayload;
    }
    return {};
  };

  const normalizeIntroVideos = (body: HomeContentPayload) => {
    const rawRules = (body as any).introVideos;
    if (!Array.isArray(rawRules)) return null;
    const normalized = (rawRules as any[])
      .map((rule) => {
        const url = String(rule?.url ?? "").trim();
        const rolesRaw = rule?.roles;
        const rolesList = Array.isArray(rolesRaw)
          ? rolesRaw
          : typeof rolesRaw === "string"
            ? rolesRaw.split(/[,|\s]+/)
            : [];
        const roles = rolesList
          .map((r: any) => String(r).trim().toLowerCase())
          .filter((r: string) => r === "team" || r === "youth" || r === "adult");
        return {
          url,
          roles: Array.from(new Set(roles)).sort() as Array<"team" | "youth" | "adult">,
        };
      })
      .filter((rule) => rule.url.length > 0 && rule.roles.length > 0);
    return normalized.length ? normalized : null;
  };

  const parseTestimonials = (body: any): HomeTestimonial[] | null => {
    const raw = body?.testimonials;
    if (Array.isArray(raw)) return raw as HomeTestimonial[];
    if (typeof raw === "string" && raw.trim().length) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as HomeTestimonial[]) : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const resolveProfessionalPhoto = (body: HomeContentPayload): string | null => {
    const direct =
      typeof body.professionalPhoto === "string" && body.professionalPhoto.trim()
        ? body.professionalPhoto.trim()
        : null;
    if (direct) return direct;
    if (Array.isArray(body.professionalPhotos)) {
      return (body.professionalPhotos[0] as any) ?? null;
    }
    if (typeof body.professionalPhotos === "string") {
      return (
        body.professionalPhotos
          .split(/\r?\n|,/)
          .map((entry) => entry.trim())
          .filter(Boolean)[0] ?? null
      );
    }
    return null;
  };

  const merged: HomeContentPayload = {};
  for (const item of items) {
    const body = parseBody(item?.body);
    const headlineCandidate = body.headline ?? item?.content ?? item?.title ?? null;
    const professionalPhotoCandidate = resolveProfessionalPhoto(body);
    const testimonialsCandidate = parseTestimonials(body);
    const introVideosCandidate = normalizeIntroVideos(body);

    if (!merged.headline && typeof headlineCandidate === "string" && headlineCandidate.trim().length) {
      merged.headline = headlineCandidate.trim();
    }
    if (!merged.description && typeof body.description === "string" && body.description.trim().length) {
      merged.description = body.description.trim();
    }
    if (!merged.welcome && typeof body.welcome === "string" && body.welcome.trim().length) {
      merged.welcome = body.welcome.trim();
    }
    if (!merged.introVideoUrl && typeof body.introVideoUrl === "string" && body.introVideoUrl.trim().length) {
      merged.introVideoUrl = body.introVideoUrl.trim();
    }
    if (!merged.introVideos && introVideosCandidate && introVideosCandidate.length) {
      merged.introVideos = introVideosCandidate;
    }
    if (!merged.heroImageUrl && typeof body.heroImageUrl === "string" && body.heroImageUrl.trim().length) {
      merged.heroImageUrl = body.heroImageUrl.trim();
    }
    if (!merged.adminStory && typeof body.adminStory === "string" && body.adminStory.trim().length) {
      merged.adminStory = body.adminStory;
    }
    if (!merged.professionalPhoto && typeof professionalPhotoCandidate === "string" && professionalPhotoCandidate) {
      merged.professionalPhoto = professionalPhotoCandidate;
    }
    if (!merged.testimonials && testimonialsCandidate && testimonialsCandidate.length) {
      merged.testimonials = testimonialsCandidate as any;
    }
  }

  if (!merged.introVideoUrl && merged.introVideos && merged.introVideos.length) {
    merged.introVideoUrl = merged.introVideos[0]?.url ?? null;
  }

  return merged as HomeContentPayload;
}
