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
	const response = await fetch(`/api/content/gallery`, {
		cache: "no-store",
		credentials: "include",
	});

	if (!response.ok) return [];

	const data = await response.json();
	return Array.isArray(data.items) ? data.items : [];
}
