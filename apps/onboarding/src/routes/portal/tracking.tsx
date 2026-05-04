import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	CircleStop,
	Flame,
	Footprints,
	Gauge,
	Loader2,
	MapPin,
	Pause,
	Play,
	Timer,
	Trophy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/lib/motion";
import {
	type RunCoordinate,
	formatDuration,
	formatPace,
	generateClientId,
	haversineDistance,
	sendLiveLocation,
	syncRuns,
} from "@/services/trackingService";
import { RunHistory } from "@/components/portal/RunHistory";

export const Route = createFileRoute("/portal/tracking")({
	component: TrackingPage,
});

type RunStatus = "idle" | "running" | "paused" | "finished";

function TrackingPage() {
	const [status, setStatus] = useState<RunStatus>("idle");
	const [coordinates, setCoordinates] = useState<RunCoordinate[]>([]);
	const [distance, setDistance] = useState(0);
	const [elapsed, setElapsed] = useState(0);
	const [gpsReady, setGpsReady] = useState(false);
	const [gpsError, setGpsError] = useState<string | null>(null);
	const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
	const [effortLevel, setEffortLevel] = useState<number | null>(null);
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [showHistory, setShowHistory] = useState(false);

	const watchIdRef = useRef<number | null>(null);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const clientIdRef = useRef<string>("");
	const startTimeRef = useRef<number>(0);
	const pausedAtRef = useRef<number>(0);
	const totalPausedRef = useRef<number>(0);
	const lastLocationSentRef = useRef<number>(0);

	const pace = elapsed > 0 && distance > 0 ? (elapsed / 60) / (distance / 1000) : 0;
	const speed = elapsed > 0 ? (distance / 1000) / (elapsed / 3600) : 0;
	const calories = Math.round((distance / 1000) * 60);

	useEffect(() => {
		if (!navigator.geolocation) {
			setGpsError("Geolocation not supported");
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
				setGpsReady(true);
			},
			(err) => setGpsError(err.message),
			{ enableHighAccuracy: true },
		);
	}, []);

	const startGpsWatch = useCallback(() => {
		if (watchIdRef.current !== null) return;
		watchIdRef.current = navigator.geolocation.watchPosition(
			(pos) => {
				const coord: RunCoordinate = {
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
					timestamp: Date.now(),
					altitude: pos.coords.altitude ?? undefined,
				};
				setCurrentPos({ lat: coord.latitude, lng: coord.longitude });

				setCoordinates((prev) => {
					if (prev.length === 0) return [coord];
					const last = prev[prev.length - 1];
					const d = haversineDistance(last.latitude, last.longitude, coord.latitude, coord.longitude);
					if (d < 3) return prev;
					setDistance((prevDist) => prevDist + d);
					return [...prev, coord];
				});

				const now = Date.now();
				if (now - lastLocationSentRef.current > 10000) {
					lastLocationSentRef.current = now;
					sendLiveLocation(coord.latitude, coord.longitude);
				}
			},
			() => {},
			{ enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
		);
	}, []);

	const stopGpsWatch = useCallback(() => {
		if (watchIdRef.current !== null) {
			navigator.geolocation.clearWatch(watchIdRef.current);
			watchIdRef.current = null;
		}
	}, []);

	const startTimer = useCallback(() => {
		if (timerRef.current) return;
		timerRef.current = setInterval(() => {
			const now = Date.now();
			const total = Math.floor((now - startTimeRef.current - totalPausedRef.current) / 1000);
			setElapsed(total);
		}, 1000);
	}, []);

	const stopTimer = useCallback(() => {
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const handleStart = () => {
		clientIdRef.current = generateClientId();
		startTimeRef.current = Date.now();
		totalPausedRef.current = 0;
		setStatus("running");
		setCoordinates([]);
		setDistance(0);
		setElapsed(0);
		startGpsWatch();
		startTimer();
	};

	const handlePause = () => {
		pausedAtRef.current = Date.now();
		setStatus("paused");
		stopTimer();
	};

	const handleResume = () => {
		totalPausedRef.current += Date.now() - pausedAtRef.current;
		setStatus("running");
		startTimer();
	};

	const handleStop = () => {
		setStatus("finished");
		stopTimer();
		stopGpsWatch();
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await syncRuns([
				{
					clientId: clientIdRef.current,
					date: new Date(startTimeRef.current).toISOString(),
					distanceMeters: distance,
					durationSeconds: elapsed,
					avgPace: pace > 0 ? pace : undefined,
					avgSpeed: speed > 0 ? speed : undefined,
					calories,
					coordinates,
					effortLevel: effortLevel ?? undefined,
					notes: notes.trim() || undefined,
				},
			]);
		} catch {}
		setSaving(false);
		setStatus("idle");
		setEffortLevel(null);
		setNotes("");
	};

	const handleDiscard = () => {
		setStatus("idle");
		setEffortLevel(null);
		setNotes("");
		setCoordinates([]);
		setDistance(0);
		setElapsed(0);
	};

	useEffect(() => {
		return () => {
			stopGpsWatch();
			stopTimer();
		};
	}, [stopGpsWatch, stopTimer]);

	if (status === "finished") {
		return (
			<PageTransition className="p-6 max-w-2xl mx-auto space-y-6">
				<RunSummary
					distance={distance}
					elapsed={elapsed}
					pace={pace}
					speed={speed}
					calories={calories}
					coordinates={coordinates}
					effortLevel={effortLevel}
					setEffortLevel={setEffortLevel}
					notes={notes}
					setNotes={setNotes}
					onSave={handleSave}
					onDiscard={handleDiscard}
					saving={saving}
				/>
			</PageTransition>
		);
	}

	return (
		<PageTransition className="p-6 max-w-2xl mx-auto space-y-6">
			<div className="space-y-2">
				<div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-primary">
					<Footprints className="h-3.5 w-3.5" />
					Run Tracker
				</div>
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">
					{status === "idle" ? "Ready to Run" : "Active Run"}
				</h1>
			</div>

			{/* Map */}
			<Card className="overflow-hidden border-2">
				<CardContent className="p-0 h-[300px] relative">
					{gpsReady && currentPos ? (
						<RunMap coordinates={coordinates} center={currentPos} isRunning={status === "running"} />
					) : gpsError ? (
						<div className="flex items-center justify-center h-full text-sm text-destructive gap-2">
							<MapPin className="h-4 w-4" />
							{gpsError}
						</div>
					) : (
						<div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							Acquiring GPS...
						</div>
					)}
				</CardContent>
			</Card>

			{/* Stats */}
			{status !== "idle" && (
				<div className="grid grid-cols-2 gap-3">
					<StatCard icon={<Footprints className="h-4 w-4" />} label="Distance" value={`${(distance / 1000).toFixed(2)} km`} />
					<StatCard icon={<Timer className="h-4 w-4" />} label="Duration" value={formatDuration(elapsed)} />
					<StatCard icon={<Gauge className="h-4 w-4" />} label="Pace" value={`${formatPace(pace)} /km`} />
					<StatCard icon={<Flame className="h-4 w-4" />} label="Calories" value={`${calories} kcal`} />
				</div>
			)}

			{/* Controls */}
			<div className="flex items-center justify-center gap-4 pt-2">
				{status === "idle" && (
					<button
						type="button"
						onClick={handleStart}
						disabled={!gpsReady}
						className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
					>
						<Play className="h-7 w-7 ml-0.5" />
					</button>
				)}
				{status === "running" && (
					<>
						<button
							type="button"
							onClick={handlePause}
							className="h-14 w-14 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white flex items-center justify-center shadow-lg transition-all"
						>
							<Pause className="h-6 w-6" />
						</button>
						<button
							type="button"
							onClick={handleStop}
							className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all"
						>
							<CircleStop className="h-7 w-7" />
						</button>
					</>
				)}
				{status === "paused" && (
					<>
						<button
							type="button"
							onClick={handleResume}
							className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg transition-all"
						>
							<Play className="h-6 w-6 ml-0.5" />
						</button>
						<button
							type="button"
							onClick={handleStop}
							className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all"
						>
							<CircleStop className="h-7 w-7" />
						</button>
					</>
				)}
			</div>

			{status === "idle" && (
				<div className="pt-4">
					<button
						type="button"
						onClick={() => setShowHistory(!showHistory)}
						className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
					>
						<Trophy className="h-3.5 w-3.5" />
						{showHistory ? "Hide" : "View"} Run History
					</button>
					{showHistory && <RunHistory />}
				</div>
			)}
		</PageTransition>
	);
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
	return (
		<Card className="border">
			<CardContent className="p-3 flex items-center gap-3">
				<div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
				<div>
					<p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
					<p className="text-lg font-black tracking-tight">{value}</p>
				</div>
			</CardContent>
		</Card>
	);
}

function RunSummary({
	distance,
	elapsed,
	pace,
	speed,
	calories,
	coordinates,
	effortLevel,
	setEffortLevel,
	notes,
	setNotes,
	onSave,
	onDiscard,
	saving,
}: {
	distance: number;
	elapsed: number;
	pace: number;
	speed: number;
	calories: number;
	coordinates: RunCoordinate[];
	effortLevel: number | null;
	setEffortLevel: (v: number | null) => void;
	notes: string;
	setNotes: (v: string) => void;
	onSave: () => void;
	onDiscard: () => void;
	saving: boolean;
}) {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-green-600">
					<Trophy className="h-3.5 w-3.5" />
					Run Complete
				</div>
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">Summary</h1>
			</div>

			{coordinates.length > 1 && (
				<Card className="overflow-hidden border-2">
					<CardContent className="p-0 h-[200px]">
						<RunMap coordinates={coordinates} center={{ lat: coordinates[coordinates.length - 1].latitude, lng: coordinates[coordinates.length - 1].longitude }} isRunning={false} />
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-2 gap-3">
				<StatCard icon={<Footprints className="h-4 w-4" />} label="Distance" value={`${(distance / 1000).toFixed(2)} km`} />
				<StatCard icon={<Timer className="h-4 w-4" />} label="Duration" value={formatDuration(elapsed)} />
				<StatCard icon={<Gauge className="h-4 w-4" />} label="Avg Pace" value={`${formatPace(pace)} /km`} />
				<StatCard icon={<Flame className="h-4 w-4" />} label="Calories" value={`${calories} kcal`} />
			</div>

			<Card className="border-2">
				<CardContent className="p-4 space-y-4">
					<div>
						<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
							Rate of Perceived Exertion
						</p>
						<div className="flex gap-1.5 flex-wrap">
							{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => setEffortLevel(n)}
									className={`h-9 w-9 rounded-lg text-sm font-bold transition-all ${
										effortLevel === n
											? "bg-primary text-primary-foreground scale-110"
											: "bg-muted hover:bg-muted/80 text-foreground"
									}`}
								>
									{n}
								</button>
							))}
						</div>
						<p className="text-[10px] text-muted-foreground mt-1">1 = very easy · 10 = maximal effort</p>
					</div>

					<div>
						<p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="How did it feel? Any observations..."
							maxLength={500}
							className="w-full h-20 rounded-xl border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</div>
				</CardContent>
			</Card>

			<div className="flex gap-3">
				<button
					type="button"
					onClick={onDiscard}
					disabled={saving}
					className="flex-1 h-12 rounded-xl border-2 font-bold text-sm hover:bg-muted/50 transition-colors disabled:opacity-40"
				>
					Discard
				</button>
				<button
					type="button"
					onClick={onSave}
					disabled={saving}
					className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
				>
					{saving && <Loader2 className="h-4 w-4 animate-spin" />}
					Save Run
				</button>
			</div>
		</div>
	);
}

function RunMap({
	coordinates,
	center,
	isRunning,
}: {
	coordinates: RunCoordinate[];
	center: { lat: number; lng: number };
	isRunning: boolean;
}) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<L.Map | null>(null);
	const polylineRef = useRef<L.Polyline | null>(null);
	const markerRef = useRef<L.CircleMarker | null>(null);

	useEffect(() => {
		if (!mapContainerRef.current || mapRef.current) return;

		import("leaflet").then((L) => {
			if (!mapContainerRef.current) return;

			const map = L.map(mapContainerRef.current, {
				zoomControl: false,
				attributionControl: false,
			}).setView([center.lat, center.lng], 16);

			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				maxZoom: 19,
			}).addTo(map);

			mapRef.current = map;

			markerRef.current = L.circleMarker([center.lat, center.lng], {
				radius: 8,
				fillColor: "#3b82f6",
				fillOpacity: 1,
				color: "#ffffff",
				weight: 3,
			}).addTo(map);

			polylineRef.current = L.polyline([], {
				color: "#3b82f6",
				weight: 4,
				opacity: 0.8,
			}).addTo(map);
		});

		return () => {
			mapRef.current?.remove();
			mapRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (!mapRef.current || !markerRef.current) return;
		markerRef.current.setLatLng([center.lat, center.lng]);
		if (isRunning) {
			mapRef.current.panTo([center.lat, center.lng]);
		}
	}, [center, isRunning]);

	useEffect(() => {
		if (!polylineRef.current) return;
		const latlngs = coordinates.map((c) => [c.latitude, c.longitude] as [number, number]);
		polylineRef.current.setLatLngs(latlngs);
	}, [coordinates]);

	return <div ref={mapContainerRef} className="w-full h-full" />;
}
