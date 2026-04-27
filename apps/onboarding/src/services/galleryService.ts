import { config } from "@/lib/config";

export type GalleryApiItem = {
	id: number;
	url: string;
	thumbnail: string | null;
	caption: string | null;
	mediaType: "photo" | "video";
	tag: string | null;
	createdAt: string;
};

export async function fetchGalleryItems(): Promise<GalleryApiItem[]> {
	const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
	const response = await fetch(`${baseUrl}/api/content/gallery`, {
		cache: "no-store",
	});

	if (!response.ok) return [];

	const data = await response.json();
	return Array.isArray(data.items) ? data.items : [];
}
