import { config } from "@/lib/config";
import { getClientAuthToken } from "@/lib/client-storage";

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

  const token = getClientAuthToken();
  const response = await fetch(`${baseUrl}/api/content/home`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    const toPhoto = (item: any): string | null => {
      const candidates = [item?.photoUrl, item?.photo, item?.imageUrl, item?.image];
      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          return candidate.trim();
        }
      }
      return null;
    };
    const normalize = (items: any[]): HomeTestimonial[] =>
      items.map((item, index) => ({
        id: String(item?.id ?? `testimonial-${index + 1}`),
        name: String(item?.name ?? item?.adminName ?? item?.coachName ?? "Anonymous"),
        role: typeof item?.role === "string" ? item.role : null,
        quote: String(item?.quote ?? ""),
        rating: typeof item?.rating === "number" ? item.rating : null,
        photoUrl: toPhoto(item),
        photo: typeof item?.photo === "string" ? item.photo : null,
        imageUrl: typeof item?.imageUrl === "string" ? item.imageUrl : null,
        image: typeof item?.image === "string" ? item.image : null,
      }));
    if (Array.isArray(raw)) return normalize(raw);
    if (typeof raw === "string" && raw.trim().length) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? normalize(parsed) : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const resolveProfessionalPhoto = (body: HomeContentPayload): string | null => {
    const isLikelyImageUrl = (value: string): boolean =>
      /^(https?:\/\/|\/|data:image\/|blob:)/i.test(value) ||
      /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(value);

    const direct =
      typeof body.professionalPhoto === "string" && body.professionalPhoto.trim()
        ? body.professionalPhoto.trim()
        : null;
    if (direct && isLikelyImageUrl(direct)) return direct;

    const selectCandidate = (entries: string[]): string | null => {
      const normalized = entries.map((entry) => entry.trim()).filter(Boolean);
      if (!normalized.length) return null;
      return normalized.find((entry) => isLikelyImageUrl(entry)) ?? normalized[0] ?? null;
    };

    if (Array.isArray(body.professionalPhotos)) {
      return selectCandidate(body.professionalPhotos.map((entry) => String(entry)));
    }
    if (typeof body.professionalPhotos === "string") {
      return selectCandidate(body.professionalPhotos.split(/\r?\n|,/));
    }
    return direct;
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
