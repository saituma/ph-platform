import { Play, X, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import type { GalleryApiItem } from "#/services/galleryService";

export type GalleryItem = {
	id?: number;
	type: "photo" | "video" | "instagram" | "link";
	src: string;
	thumbnail?: string;
	caption?: string;
	tag?: string;
	instagramId?: string;
};

function apiItemToGalleryItem(item: GalleryApiItem): GalleryItem {
	return {
		id: item.id,
		type: item.mediaType as GalleryItem["type"],
		src: item.url,
		thumbnail: item.thumbnail ?? undefined,
		caption: item.caption ?? undefined,
		tag: item.tag ?? undefined,
		instagramId: item.instagramId ?? undefined,
	};
}

/* ─── Lightbox ─── */
function Lightbox({
	items,
	index,
	onClose,
	onPrev,
	onNext,
}: {
	items: GalleryItem[];
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
			style={{ background: "rgba(0,0,0,0.92)" }}
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
				{item.type === "video" ? (
					<video
						ref={videoRef}
						src={item.src}
						poster={item.thumbnail}
						controls
						playsInline
						autoPlay
						className="w-full max-h-[80vh] object-contain bg-black"
					/>
				) : (
					<img
						src={item.src}
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
	item: GalleryItem;
	index: number;
	onClick: () => void;
}) {
	const [loaded, setLoaded] = useState(false);
	const { tag } = item;
	const isInstagram = item.type === "instagram";
	const isLink = item.type === "link";
	const isVideo = item.type === "video";
	const thumb = isVideo ? item.thumbnail : (!isInstagram && !isLink ? item.src : null);

	// Instagram & link cards open in new tab, not lightbox
	if (isInstagram || isLink) {
		return (
			<a
				href={item.src}
				target="_blank"
				rel="noopener noreferrer"
				className="break-inside-avoid mb-3 block group relative overflow-hidden border border-border/30 hover:border-primary/40 bg-card/40"
				style={{ aspectRatio: "1/1", transition: "border-color 0.25s cubic-bezier(0.25,0,0,1)" }}
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
						<div className="flex items-center justify-center rounded-full border border-border/50" style={{ width: "44px", height: "44px" }}>
							<ArrowRight weight="bold" size={18} className="text-primary" />
						</div>
						<p className="text-foreground/50 font-black uppercase text-center line-clamp-3 break-all" style={{ fontSize: "0.58rem", letterSpacing: "0.1em" }}>
							{item.caption || item.src}
						</p>
					</div>
				)}
				<div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1">
					<span className="w-1.5 h-1.5 rounded-full" style={{ background: isInstagram ? "#e1306c" : "hsl(var(--primary))" }} />
					<span className="font-black uppercase text-white/70" style={{ fontSize: "0.5rem", letterSpacing: "0.15em" }}>
						{isInstagram ? "Instagram" : "Link"}
					</span>
				</div>
				{tag && (
					<div className="absolute bottom-2 right-2 bg-black/70 text-white/80 font-black uppercase px-2 py-0.5" style={{ fontSize: "0.5rem", letterSpacing: "0.14em" }}>
						{tag}
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

			<div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 100%)", transition: "opacity 0.3s cubic-bezier(0.25,0,0,1)" }}>
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

			{tag && (
				<div className="absolute bottom-2 right-2 bg-black/70 text-white/80 font-black uppercase px-2 py-0.5" style={{ fontSize: "0.5rem", letterSpacing: "0.14em" }}>
					{tag}
				</div>
			)}
		</div>
	);
}

/* ─── Skeleton grid ─── */
function SkeletonGrid({ count = 3 }: { count?: number }) {
	return (
		<div className="columns-2 md:columns-3 gap-3">
			{[...Array(count)].map((_, i) => (
				<div
					key={i}
					className="break-inside-avoid mb-3 border border-border/30 bg-card/20 animate-pulse"
					style={{ aspectRatio: i % 3 === 0 ? "4/3" : i % 3 === 1 ? "9/16" : "1/1" }}
				/>
			))}
		</div>
	);
}

/* ─── Section (home preview — shows 3 items) ─── */
export function GallerySection({
	apiItems,
	isLoading = false,
}: {
	apiItems?: GalleryApiItem[];
	isLoading?: boolean;
}) {
	const items: GalleryItem[] = apiItems?.map(apiItemToGalleryItem) ?? [];
	const preview = items.slice(0, 3);
	const hasMore = items.length > 3;

	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	const [isVisible, setIsVisible] = useState(false);
	const sectionRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.08 },
		);
		if (sectionRef.current) observer.observe(sectionRef.current);
		return () => observer.disconnect();
	}, []);

	const openLightbox = useCallback((i: number) => setLightboxIndex(i), []);
	const closeLightbox = useCallback(() => setLightboxIndex(null), []);
	const prev = useCallback(() =>
		setLightboxIndex((i) => (i === null ? null : (i - 1 + preview.length) % preview.length)), [preview.length]);
	const next = useCallback(() =>
		setLightboxIndex((i) => (i === null ? null : (i + 1) % preview.length)), [preview.length]);

	return (
		<>
			<section
				ref={sectionRef}
				className="border-t border-border/40 py-24 sm:py-32 px-6"
			>
				<div className="max-w-6xl mx-auto">
					{/* Header */}
					<div
						className="mb-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
						style={{
							opacity: isVisible ? 1 : 0,
							transform: isVisible ? "translateY(0)" : "translateY(24px)",
							transition: "opacity 0.6s cubic-bezier(0.25,0,0,1), transform 0.6s cubic-bezier(0.25,0,0,1)",
						}}
					>
						<div>
							<p
								className="text-primary font-black mb-5"
								style={{ fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
							>
								Behind the Platform
							</p>
							<h2
								className="font-black uppercase text-foreground"
								style={{
									fontFamily: "var(--font-display)",
									fontSize: "clamp(2rem, 5vw, 4.5rem)",
									letterSpacing: "-0.02em",
									lineHeight: 1,
								}}
							>
								In the&nbsp;
								<span className="text-primary">Field</span>
							</h2>
						</div>

						{hasMore && (
							<Link
								to="/gallery"
								className="inline-flex items-center gap-2 font-black uppercase text-foreground border border-border/60 hover:border-primary/60 hover:text-primary px-5 py-3 text-xs tracking-widest transition-colors"
								style={{ transitionDuration: "200ms" }}
							>
								See All ({items.length})
								<ArrowRight weight="bold" size={14} />
							</Link>
						)}
					</div>

					{/* Grid */}
					<div
						style={{
							opacity: isVisible ? 1 : 0,
							transform: isVisible ? "translateY(0)" : "translateY(32px)",
							transition: "opacity 0.7s 0.1s cubic-bezier(0.25,0,0,1), transform 0.7s 0.1s cubic-bezier(0.25,0,0,1)",
						}}
					>
						{isLoading ? (
							<SkeletonGrid count={3} />
						) : preview.length > 0 ? (
							<div className="columns-2 md:columns-3 gap-3">
								{preview.map((item, i) => (
									<GalleryCard
										key={item.id ?? i}
										item={item}
										index={i}
										onClick={() => openLightbox(i)}
									/>
								))}
							</div>
						) : (
							<p
								className="text-center text-muted-foreground/30 font-bold uppercase"
								style={{ fontSize: "0.6rem", letterSpacing: "0.18em" }}
							>
								No gallery items yet
							</p>
						)}
					</div>

					{hasMore && (
						<div
							className="mt-10 text-center"
							style={{
								opacity: isVisible ? 1 : 0,
								transition: "opacity 0.7s 0.2s cubic-bezier(0.25,0,0,1)",
							}}
						>
							<Link
								to="/gallery"
								className="inline-flex items-center gap-2 font-black uppercase bg-primary text-primary-foreground px-8 py-4 text-xs tracking-widest hover:bg-primary/90 transition-colors"
								style={{ transitionDuration: "200ms" }}
							>
								See More
								<ArrowRight weight="bold" size={14} />
							</Link>
						</div>
					)}
				</div>
			</section>

			{lightboxIndex !== null && (
				<Lightbox
					items={preview}
					index={lightboxIndex}
					onClose={closeLightbox}
					onPrev={prev}
					onNext={next}
				/>
			)}
		</>
	);
}
