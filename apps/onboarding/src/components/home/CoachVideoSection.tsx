import {
	ArrowsOut,
	Pause,
	Play,
	SpeakerHigh,
	SpeakerSlash,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

function formatTime(seconds: number): string {
	if (!seconds || Number.isNaN(seconds)) return "0:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

type CoachVideoSectionProps = {
	eyebrow?: string;
	titleLine1?: string;
	titleLine2?: string;
	body?: string;
	name?: string;
	role?: string;
	watchLabel?: string;
	photoUrl?: string;
	videoUrl?: string;
};

export function CoachVideoSection({
	eyebrow = "From the CEO",
	titleLine1 = "Hear It",
	titleLine2 = "Directly",
	body = "Get a personal introduction to the platform and philosophy behind PH Performance — straight from the CEO who built it.",
	name = "Piers Hatcliff",
	role = "CEO · PH Performance",
	watchLabel = "Watch Intro",
	photoUrl = "/ph.jpg",
	videoUrl = "/coach-intro.mp4",
}: CoachVideoSectionProps = {}) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isMuted, setIsMuted] = useState(false);
	const [hasStarted, setHasStarted] = useState(false);

	const sectionRef = useRef<HTMLElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [videoReady, setVideoReady] = useState(false);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
					setVideoReady(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.12, rootMargin: "200px 0px 0px 0px" },
		);
		if (sectionRef.current) observer.observe(sectionRef.current);
		return () => observer.disconnect();
	}, []);

	const togglePlay = () => {
		if (!videoRef.current) return;
		if (videoRef.current.paused) {
			videoRef.current.play();
			setIsPlaying(true);
			setHasStarted(true);
		} else {
			videoRef.current.pause();
			setIsPlaying(false);
		}
	};

	const toggleMute = () => {
		if (!videoRef.current) return;
		videoRef.current.muted = !videoRef.current.muted;
		setIsMuted(videoRef.current.muted);
	};

	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!videoRef.current) return;
		const time = Number(e.target.value);
		videoRef.current.currentTime = time;
		setCurrentTime(time);
	};

	const handleFullscreen = () => {
		if (!videoRef.current) return;
		if (videoRef.current.requestFullscreen) {
			videoRef.current.requestFullscreen();
		}
	};

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	return (
		<section
			ref={sectionRef}
			className="border-t border-border/40 py-24 sm:py-32 px-6 overflow-hidden"
		>
			<div className="max-w-6xl mx-auto">
				<div
					className="flex flex-col lg:flex-row items-start gap-16 lg:gap-24"
					style={{
						opacity: isVisible ? 1 : 0,
						transform: isVisible ? "translateY(0)" : "translateY(28px)",
						transition: "opacity 0.7s cubic-bezier(0.25,0,0,1), transform 0.7s cubic-bezier(0.25,0,0,1)",
					}}
				>
					{/* Left — text */}
					<div className="flex-1 min-w-0 lg:max-w-[340px] lg:pt-4">
						<p
							className="text-primary font-black mb-5"
							style={{ fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
						>
							{eyebrow}
						</p>
						<h2
							className="font-black uppercase text-foreground"
							style={{
								fontFamily: "var(--font-display)",
								fontSize: "clamp(2rem, 4vw, 3.5rem)",
								letterSpacing: "-0.02em",
								lineHeight: 1,
							}}
						>
							{titleLine1}
							<br />
							<span className="text-primary">{titleLine2}</span>
						</h2>
						<p
							className="mt-6 text-muted-foreground leading-relaxed"
							style={{ fontSize: "0.95rem", lineHeight: 1.7 }}
						>
							{body}
						</p>

						{/* Coach attribution */}
						<div className="mt-10 flex items-center gap-4 border-t border-border/40 pt-8">
							<div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-primary/20 shrink-0">
								<img
									src={photoUrl}
									alt={name}
									className="w-full h-full object-cover"
								/>
							</div>
							<div>
								<p
									className="font-black uppercase text-foreground"
									style={{ fontFamily: "var(--font-display)", fontSize: "0.85rem", letterSpacing: "0.06em" }}
								>
									{name}
								</p>
								<p
									className="text-primary/70 font-bold uppercase"
									style={{ fontSize: "0.6rem", letterSpacing: "0.18em" }}
								>
									{role}
								</p>
							</div>
						</div>
					</div>

					{/* Right — video player */}
					<div className="w-full lg:flex-1 flex justify-center lg:justify-start">
						<div
							className="relative p-[3px] border border-border/50 w-full max-w-[340px]"
							style={{
								background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
								boxShadow: "0 32px 64px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)",
							}}
						>
							{/* Video */}
							<div
								className="relative overflow-hidden bg-black"
								style={{ aspectRatio: "9 / 16" }}
							>
								<video
									ref={videoRef}
									src={videoReady ? videoUrl : undefined}
									className="w-full h-full object-cover cursor-pointer"
									playsInline
									preload="none"
									onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
									onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
									onEnded={() => { setIsPlaying(false); setHasStarted(false); }}
									onClick={togglePlay}
								/>

								{/* Initial play overlay — shown before first play */}
								{!hasStarted && (
									<div
										className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none"
										style={{
											background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
										}}
									>
										<button
											type="button"
											onClick={(e) => { e.stopPropagation(); togglePlay(); }}
											aria-label="Play coach intro video"
											className="pointer-events-auto group flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 active:scale-95"
											style={{
												width: "72px",
												height: "72px",
												boxShadow: "0 0 0 12px hsl(var(--primary) / 0.18), 0 0 40px hsl(var(--primary) / 0.4)",
												transition: "transform 0.2s cubic-bezier(0.25,0,0,1), background-color 0.2s cubic-bezier(0.25,0,0,1)",
											}}
										>
											<Play weight="fill" size={28} className="text-primary-foreground ml-1" />
										</button>
										<p
											className="text-white/60 font-black uppercase pointer-events-none"
											style={{ fontSize: "0.6rem", letterSpacing: "0.2em" }}
										>
											{watchLabel}
										</p>
									</div>
								)}

								{/* Green corner accent */}
								<div
									className="absolute top-0 left-0 w-8 h-8 pointer-events-none"
									style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.5) 0%, transparent 60%)" }}
								/>
							</div>

							{/* ── Controls bar ── */}
							<div
								className="px-3 pt-3 pb-3 space-y-2.5"
								style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "none" }}
							>
								{/* Progress scrubber */}
								<div className="relative flex items-center group/scrubber">
									{/* Track background */}
									<div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
										<div className="w-full h-[3px] bg-white/10 relative overflow-hidden">
											<div
												className="h-full bg-primary"
												style={{ width: `${progress}%`, transition: "width 0.1s linear" }}
											/>
										</div>
									</div>
									<input
										type="range"
										min={0}
										max={duration || 100}
										step={0.1}
										value={currentTime}
										onChange={handleSeek}
										className="relative w-full h-3 opacity-0 cursor-pointer"
										aria-label="Video progress"
									/>
								</div>

								{/* Buttons row */}
								<div className="flex items-center justify-between">
									{/* Left: play/pause + time */}
									<div className="flex items-center gap-3">
										<button
											type="button"
											onClick={togglePlay}
											aria-label={isPlaying ? "Pause" : "Play"}
											className="flex items-center justify-center text-white/80 hover:text-primary active:scale-95"
											style={{ transition: "color 0.15s cubic-bezier(0.25,0,0,1), transform 0.15s cubic-bezier(0.25,0,0,1)" }}
										>
											{isPlaying
												? <Pause weight="fill" size={18} />
												: <Play weight="fill" size={18} />
											}
										</button>

										<span
											className="font-black text-white/50 tabular-nums"
											style={{ fontSize: "0.6rem", letterSpacing: "0.08em" }}
										>
											{formatTime(currentTime)}{" "}
											<span className="text-white/25">/</span>{" "}
											{formatTime(duration)}
										</span>
									</div>

									{/* Right: mute + fullscreen */}
									<div className="flex items-center gap-3">
										<button
											type="button"
											onClick={toggleMute}
											aria-label={isMuted ? "Unmute" : "Mute"}
											className="flex items-center justify-center text-white/80 hover:text-primary active:scale-95"
											style={{ transition: "color 0.15s cubic-bezier(0.25,0,0,1), transform 0.15s cubic-bezier(0.25,0,0,1)" }}
										>
											{isMuted
												? <SpeakerSlash weight="fill" size={18} />
												: <SpeakerHigh weight="fill" size={18} />
											}
										</button>
										<button
											type="button"
											onClick={handleFullscreen}
											aria-label="Fullscreen"
											className="flex items-center justify-center text-white/80 hover:text-primary active:scale-95"
											style={{ transition: "color 0.15s cubic-bezier(0.25,0,0,1), transform 0.15s cubic-bezier(0.25,0,0,1)" }}
										>
											<ArrowsOut weight="bold" size={16} />
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
