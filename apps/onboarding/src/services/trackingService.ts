export interface RunCoordinate {
	latitude: number;
	longitude: number;
	timestamp: number;
	altitude?: number;
}

export interface RunRecord {
	clientId: string;
	date: string;
	distanceMeters: number;
	durationSeconds: number;
	avgPace?: number;
	avgSpeed?: number;
	calories?: number;
	coordinates?: RunCoordinate[];
	effortLevel?: number;
	feelTags?: string[];
	notes?: string;
}

export async function syncRuns(runs: RunRecord[]): Promise<void> {
	const res = await fetch(`/api/runs/sync`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ runs }),
	});
	if (!res.ok) throw new Error("Failed to sync run");
}

export async function fetchRuns(after?: string): Promise<{ runs: RunRecord[] }> {
	const params = after ? `?after=${encodeURIComponent(after)}` : "";
	const res = await fetch(`/api/runs${params}`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error("Failed to fetch runs");
	return res.json();
}

export async function sendLiveLocation(lat: number, lng: number, routePoints?: { lat: number; lng: number }[]): Promise<void> {
	await fetch(`/api/location`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ latitude: lat, longitude: lng, routePoints }),
	}).catch(() => {});
}

export function generateClientId(): string {
	return crypto.randomUUID();
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371000;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatPace(paceMinPerKm: number): string {
	if (!Number.isFinite(paceMinPerKm) || paceMinPerKm <= 0) return "--:--";
	const mins = Math.floor(paceMinPerKm);
	const secs = Math.round((paceMinPerKm - mins) * 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
