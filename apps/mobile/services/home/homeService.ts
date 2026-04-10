import { apiRequest } from "@/lib/api";

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
  heroImageUrl?: string | null;
  testimonials?: HomeTestimonial[] | null;
  adminStory?: string | null;
  professionalPhoto?: string | null;
  professionalPhotos?: string[] | string | null;
};

export async function fetchHomeContent(token: string, forceRefresh = false) {
  const data = await apiRequest<{ items?: any[] }>("/content/home", {
    token,
    forceRefresh,
  });
  const item = (data.items ?? [])[0];
  if (!item) return null;

  let body: HomeContentPayload = {};
  if (item.body) {
    if (typeof item.body === "string" && item.body.trim().length) {
      try {
        body = JSON.parse(item.body) as HomeContentPayload;
      } catch {
        body = {};
      }
    } else if (typeof item.body === "object") {
      body = item.body as HomeContentPayload;
    }
  }

  const parsedTestimonials =
    typeof body.testimonials === "string" &&
    (body.testimonials as string).trim().length
      ? (() => {
          try {
            const parsed = JSON.parse(body.testimonials);
            return Array.isArray(parsed) ? parsed : null;
          } catch {
            return null;
          }
        })()
      : null;

  const professionalPhoto =
    typeof body.professionalPhoto === "string" && body.professionalPhoto.trim()
      ? body.professionalPhoto.trim()
      : Array.isArray(body.professionalPhotos)
        ? body.professionalPhotos[0] ?? null
        : typeof body.professionalPhotos === "string"
          ? body.professionalPhotos
              .split(/\r?\n|,/)
              .map((entry) => entry.trim())
              .filter(Boolean)[0] ?? null
          : null;

  return {
    headline: body.headline ?? item.content ?? item.title ?? null,
    description: body.description ?? null,
    welcome: body.welcome ?? null,
    introVideoUrl: body.introVideoUrl ?? null,
    heroImageUrl: body.heroImageUrl ?? null,
    testimonials:
      parsedTestimonials ??
      (Array.isArray(body.testimonials) ? body.testimonials : null),
    adminStory: body.adminStory ?? null,
    professionalPhoto,
  } as HomeContentPayload;
}
