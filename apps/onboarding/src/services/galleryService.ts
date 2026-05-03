import { config } from "@/lib/config";
import { getClientAuthToken } from "@/lib/client-storage";

export type GalleryApiItem = {
	id: number;
	url: string;
	thumbnail: string | null;
	caption: string | null;
	mediaType: "photo" | "video" | "instagram" | "link";
	postType: "upload" | "link" | "instagram";
	instagramId: string | null;
	tag: string | null;
	createdAt: string;
};

export async function fetchGalleryItems(): Promise<GalleryApiItem[]> {
	const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
	const token = getClientAuthToken();
	const response = await fetch(`${baseUrl}/api/content/gallery`, {
		cache: "no-store",
		headers: {
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	});

	if (!response.ok) return [];

	const data = await response.json();
	return Array.isArray(data.items) ? data.items : [];
}
