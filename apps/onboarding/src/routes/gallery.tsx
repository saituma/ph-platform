import { ArrowLeft, ArrowRight, Play, X } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryApiItem } from "#/services/galleryService";
import { fetchGalleryItems } from "#/services/galleryService";

export const Route = createFileRoute("/gallery")({
	head: () => ({
		meta: [
			{ title: "Gallery — PH Performance" },
			{ name: "description", content: "Photos and videos from the PH Performance team." },
		],
	}),
	component: GalleryPage,
});

/* ─── Lightbox ─── */
function Lightbox({
	items,
	index,
	onClose,
	onPrev,
	onNext,
}: {
	items: GalleryApiItem[];
	index: number;
	onClose: () => void;
	onPrev: () => void;
	onNext: () => void;
}) {
	const item = items[index];
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			if (e.key === "ArrowLeft") onPrev();
			if (e.key === "ArrowRight") onNext();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, onPrev, onNext]);

	useEffect(() => {
		videoRef.current?.load();
	}, [index]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
			style={{ background: "rgba(0,0,0,0.93)" }}
			onClick={onClose}
		>
			<button
				type="button"
				aria-label="Close"
				className="absolute top-5 right-5 flex items-center justify-center w-10 h-10 text-white/60 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
				style={{ transitionDuration: "150ms" }}
				onClick={(e) => { e.stopPropagation(); onClose(); }}
			>
				<X weight="bold" size={18} />
			</button>

			{items.length > 1 && (
				<button
					type="button"
					aria-label="Previous"
					className="absolute left-4 md:left-6 flex items-center justify-center w-10 h-10 text-white/60 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
					style={{ transitionDuration: "150ms" }}
					onClick={(e) => { e.stopPropagation(); onPrev(); }}
				>
					<ArrowLeft weight="bold" size={18} />
				</button>
			)}

			{items.length > 1 && (
				<button
					type="button"
					aria-label="Next"
					className="absolute right-4 md:right-16 flex items-center justify-center w-10 h-10 text-white/60 hover:text-white border border-white/10 hover:border-white/30 transition-colors"
					style={{ transitionDuration: "150ms" }}
					onClick={(e) => { e.stopPropagation(); onNext(); }}
				>
					<ArrowRight weight="bold" size={18} />
				</button>
			)}

			<div
				className="relative max-w-3xl w-full max-h-[85vh]"
				onClick={(e) => e.stopPropagation()}
			>
				{item.mediaType === "video" ? (
					<video
						ref={videoRef}
						src={item.url}
						poster={item.thumbnail ?? undefined}
						controls
						playsInline
						autoPlay
						className="w-full max-h-[80vh] object-contain bg-black"
					/>
				) : (
					<img
						src={item.url}
						alt={item.caption ?? "Gallery image"}
						className="w-full max-h-[80vh] object-contain"
					/>
				)}

				{item.caption && (
					<p
						className="mt-3 text-center text-white/50 font-bold uppercase"
						style={{ fontSize: "0.6rem", letterSpacing: "0.18em" }}
					>
						{item.caption}
					</p>
				)}

				<p
					className="absolute top-3 left-3 text-white/30 font-black uppercase"
					style={{ fontSize: "0.55rem", letterSpacing: "0.15em" }}
				>
					{index + 1} / {items.length}
				</p>
			</div>
		</div>
	);
}

/* ─── Gallery card ─── */
function GalleryCard({
	item,
	index,
	onClick,
}: {
	item: GalleryApiItem;
	index: number;
	onClick: () => void;
}) {
	const [loaded, setLoaded] = useState(false);
	const isInstagram = item.mediaType === "instagram";
	const isLink = item.mediaType === "link";
	const isVideo = item.mediaType === "video";
	const thumb = isVideo ? (item.thumbnail ?? null) : (!isInstagram && !isLink ? item.url : null);

	// Instagram and external links open URL in new tab instead of lightbox
	if (isInstagram || isLink) {
		return (
			<a
				href={item.url}
				target="_blank"
				rel="noopener noreferrer"
				className="break-inside-avoid mb-3 block group relative overflow-hidden border border-border/30 hover:border-primary/40 bg-card/40"
				style={{
					aspectRatio: "1/1",
					transition: "border-color 0.25s cubic-bezier(0.25,0,0,1)",
				}}
				aria-label={item.caption ?? item.url}
			>
				{isInstagram && item.instagramId ? (
					<iframe
						src={`https://www.instagram.com/p/${item.instagramId}/embed/`}
						className="w-full h-full border-0"
						scrolling="no"
						allowTransparency={true}
						title={item.caption ?? "Instagram post"}
					/>
				) : (
					<div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
						<div
							className="flex items-center justify-center rounded-full border border-border/50"
							style={{ width: "48px", height: "48px" }}
						>
							<ArrowRight weight="bold" size={20} className="text-primary" />
						</div>
						<p
							className="text-foreground/60 font-black uppercase text-center line-clamp-3 break-all"
							style={{ fontSize: "0.6rem", letterSpacing: "0.12em" }}
						>
							{item.caption || item.url}
						</p>
					</div>
				)}

				{/* Badge */}
				<div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1">
					<span className="w-1.5 h-1.5 rounded-full" style={{ background: isInstagram ? "#e1306c" : "hsl(var(--primary))" }} />
					<span className="font-black uppercase text-white/70" style={{ fontSize: "0.5rem", letterSpacing: "0.15em" }}>
						{isInstagram ? "Instagram" : "Link"}
					</span>
				</div>

				{item.tag && (
					<div className="absolute bottom-2 right-2 bg-black/70 text-white/80 font-black uppercase px-2 py-0.5" style={{ fontSize: "0.5rem", letterSpacing: "0.14em" }}>
						{item.tag}
					</div>
				)}
			</a>
		);
	}

	return (
		<div
			className="break-inside-avoid mb-3 group relative overflow-hidden cursor-pointer border border-border/30 hover:border-primary/40"
			style={{ transition: "border-color 0.25s cubic-bezier(0.25,0,0,1)" }}
			onClick={onClick}
			role="button"
			tabIndex={0}
			aria-label={item.caption ?? `Gallery item ${index + 1}`}
			onKeyDown={(e) => e.key === "Enter" && onClick()}
		>
			{thumb ? (
				<img
					src={thumb}
					alt={item.caption ?? ""}
					loading="lazy"
					className="w-full h-auto block"
					style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.4s cubic-bezier(0.25,0,0,1)" }}
					onLoad={() => setLoaded(true)}
				/>
			) : (
				<div className="w-full bg-card/60 flex items-center justify-center" style={{ aspectRatio: index % 3 === 0 ? "4/3" : index % 3 === 1 ? "9/16" : "1/1" }}>
					<p className="text-muted-foreground/20 font-black uppercase" style={{ fontSize: "0.6rem", letterSpacing: "0.15em" }}>
						{isVideo ? "Video" : "Photo"}
					</p>
				</div>
			)}

			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center"
				style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 100%)", transition: "opacity 0.3s cubic-bezier(0.25,0,0,1)" }}
			>
				{isVideo && (
					<div className="flex items-center justify-center rounded-full bg-primary" style={{ width: "44px", height: "44px", boxShadow: "0 0 0 8px hsl(var(--primary) / 0.2)" }}>
						<Play weight="fill" size={18} className="text-primary-foreground ml-0.5" />
					</div>
				)}
			</div>

			{isVideo && (
				<div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1">
					<span className="w-1.5 h-1.5 rounded-full bg-primary" />
					<span className="font-black uppercase text-white/70" style={{ fontSize: "0.5rem", letterSpacing: "0.15em" }}>Video</span>
				</div>
			)}

			{item.tag && (
				<div
					className="absolute bottom-2 right-2 bg-black/70 text-white/80 font-black uppercase px-2 py-0.5"
					style={{ fontSize: "0.5rem", letterSpacing: "0.14em" }}
				>
					{item.tag}
				</div>
			)}
		</div>
	);
}

/* ─── Page ─── */
function GalleryPage() {
	const [items, setItems] = useState<GalleryApiItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [activeTag, setActiveTag] = useState<string>("All");
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	const [isVisible, setIsVisible] = useState(false);
	const gridRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fetchGalleryItems().then((data) => {
			setItems(data);
			setIsLoading(false);
		});
	}, []);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.05 },
		);
		if (gridRef.current) observer.observe(gridRef.current);
		return () => observer.disconnect();
	}, [isLoading]);

	const tags = ["All", ...Array.from(new Set(items.map((i) => i.tag).filter(Boolean))) as string[]];
	const filtered = activeTag === "All" ? items : items.filter((i) => i.tag === activeTag);
	// lightbox only operates on photo/video items within the filtered set
	const lightboxItems = filtered.filter((i) => i.mediaType === "photo" || i.mediaType === "video");

	const openLightbox = useCallback((item: GalleryApiItem) => {
		const idx = lightboxItems.findIndex((i) => i.id === item.id);
		if (idx !== -1) setLightboxIndex(idx);
	}, [lightboxItems]);
	const closeLightbox = useCallback(() => setLightboxIndex(null), []);
	const prev = useCallback(() =>
		setLightboxIndex((i) => (i === null ? null : (i - 1 + lightboxItems.length) % lightboxItems.length)), [lightboxItems.length]);
	const next = useCallback(() =>
		setLightboxIndex((i) => (i === null ? null : (i + 1) % lightboxItems.length)), [lightboxItems.length]);

	return (
		<div className="min-h-dvh flex flex-col bg-background text-foreground">
			<main className="flex-1 px-6 py-24 sm:py-32">
				<div className="max-w-6xl mx-auto">
					{/* Back link */}
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-bold uppercase text-xs tracking-widest mb-12 transition-colors"
						style={{ transitionDuration: "150ms" }}
					>
						<ArrowLeft weight="bold" size={14} />
						Back to Home
					</Link>

					{/* Header */}
					<div className="mb-10">
						<p
							className="text-primary font-black mb-5"
							style={{ fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
						>
							Behind the Platform
						</p>
						<h1
							className="font-black uppercase text-foreground"
							style={{
								fontFamily: "var(--font-display)",
								fontSize: "clamp(2.5rem, 7vw, 6rem)",
								letterSpacing: "-0.02em",
								lineHeight: 1,
							}}
						>
							In the&nbsp;
							<span className="text-primary">Field</span>
						</h1>
						{!isLoading && items.length > 0 && (
							<p
								className="mt-4 text-muted-foreground font-bold uppercase"
								style={{ fontSize: "0.65rem", letterSpacing: "0.18em" }}
							>
								{filtered.length}{activeTag !== "All" && ` of ${items.length}`} {filtered.length === 1 ? "item" : "items"}
							</p>
						)}
					</div>

					{/* Tag filter pills */}
					{!isLoading && tags.length > 1 && (
						<div className="flex flex-wrap gap-2 mb-10">
							{tags.map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setActiveTag(t)}
									className="font-black uppercase px-4 py-2 text-xs tracking-widest border transition-colors"
									style={{
										transitionDuration: "150ms",
										background: activeTag === t ? "hsl(var(--primary))" : "transparent",
										color: activeTag === t ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
										borderColor: activeTag === t ? "hsl(var(--primary))" : "hsl(var(--border) / 0.5)",
									}}
								>
									{t}
								</button>
							))}
						</div>
					)}

					{/* Grid */}
					<div ref={gridRef}>
						{isLoading ? (
							<div className="columns-2 md:columns-3 lg:columns-4 gap-3">
								{[...Array(8)].map((_, i) => (
									<div
										key={i}
										className="break-inside-avoid mb-3 border border-border/30 bg-card/20 animate-pulse"
										style={{ aspectRatio: i % 4 === 0 ? "4/3" : i % 4 === 1 ? "9/16" : i % 4 === 2 ? "1/1" : "16/9" }}
									/>
								))}
							</div>
						) : filtered.length === 0 ? (
							<div className="text-center py-24">
								<p
									className="text-muted-foreground/40 font-black uppercase"
									style={{ fontSize: "0.7rem", letterSpacing: "0.2em" }}
								>
									{items.length === 0 ? "No gallery items yet" : `No items in "${activeTag}"`}
								</p>
							</div>
						) : (
							<div
								className="columns-2 md:columns-3 lg:columns-4 gap-3"
								style={{
									opacity: isVisible ? 1 : 0,
									transform: isVisible ? "translateY(0)" : "translateY(24px)",
									transition: "opacity 0.6s cubic-bezier(0.25,0,0,1), transform 0.6s cubic-bezier(0.25,0,0,1)",
								}}
							>
								{filtered.map((item, i) => (
									<GalleryCard
										key={item.id}
										item={item}
										index={i}
										onClick={() => openLightbox(item)}
									/>
								))}
							</div>
						)}
					</div>
				</div>
			</main>

			{lightboxIndex !== null && (
				<Lightbox
					items={lightboxItems}
					index={lightboxIndex}
					onClose={closeLightbox}
					onPrev={prev}
					onNext={next}
				/>
			)}
		</div>
	);
}
