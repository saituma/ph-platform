import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
	gsap.registerPlugin(ScrollTrigger);
}

const STYLES = `
.cinematic-footer-wrapper {
  -webkit-font-smoothing: antialiased;

  --pill-bg-1: rgba(255,255,255,0.03);
  --pill-bg-2: rgba(255,255,255,0.01);
  --pill-shadow: rgba(0,0,0,0.5);
  --pill-highlight: rgba(255,255,255,0.06);
  --pill-inset-shadow: rgba(0,0,0,0.4);
  --pill-border: rgba(255,255,255,0.06);

  --pill-bg-1-hover: rgba(138,255,0,0.08);
  --pill-bg-2-hover: rgba(138,255,0,0.02);
  --pill-border-hover: rgba(138,255,0,0.25);
  --pill-shadow-hover: rgba(0,0,0,0.7);
  --pill-highlight-hover: rgba(138,255,0,0.12);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  100% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.8; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(138,255,0,0.4)); }
  15%, 45% { transform: scale(1.25); filter: drop-shadow(0 0 10px rgba(138,255,0,0.7)); }
  30% { transform: scale(1); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 40s linear infinite;
}

.animate-footer-heartbeat {
  animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
}

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    rgba(138,255,0,0.08) 0%,
    rgba(138,255,0,0.03) 40%,
    transparent 70%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow:
      0 10px 30px -10px var(--pill-shadow),
      inset 0 1px 1px var(--pill-highlight),
      inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow:
      0 20px 40px -10px var(--pill-shadow-hover),
      inset 0 1px 1px var(--pill-highlight-hover);
  color: white;
}

.footer-giant-bg-text {
  font-size: 26vw;
  line-height: 0.75;
  font-weight: 900;
  font-style: italic;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(138,255,0,0.06);
  background: linear-gradient(180deg, rgba(138,255,0,0.08) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.4) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px rgba(138,255,0,0.12));
}
`;

type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
	React.AnchorHTMLAttributes<HTMLAnchorElement> & {
		as?: React.ElementType;
		[key: string]: any;
	};

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
	(
		{ className, children, as: Component = "button", ...props },
		forwardedRef,
	) => {
		const localRef = useRef<HTMLElement>(null);

		useEffect(() => {
			if (typeof window === "undefined") return;
			const element = localRef.current;
			if (!element) return;

			const ctx = gsap.context(() => {
				const handleMouseMove = (e: MouseEvent) => {
					const rect = element.getBoundingClientRect();
					const h = rect.width / 2;
					const w = rect.height / 2;
					const x = e.clientX - rect.left - h;
					const y = e.clientY - rect.top - w;

					gsap.to(element, {
						x: x * 0.4,
						y: y * 0.4,
						rotationX: -y * 0.15,
						rotationY: x * 0.15,
						scale: 1.05,
						ease: "power2.out",
						duration: 0.4,
					});
				};

				const handleMouseLeave = () => {
					gsap.to(element, {
						x: 0,
						y: 0,
						rotationX: 0,
						rotationY: 0,
						scale: 1,
						ease: "elastic.out(1, 0.3)",
						duration: 1.2,
					});
				};

				element.addEventListener(
					"mousemove",
					handleMouseMove as any,
				);
				element.addEventListener("mouseleave", handleMouseLeave);

				return () => {
					element.removeEventListener(
						"mousemove",
						handleMouseMove as any,
					);
					element.removeEventListener(
						"mouseleave",
						handleMouseLeave,
					);
				};
			}, element);

			return () => ctx.revert();
		}, []);

		return (
			<Component
				ref={(node: HTMLElement) => {
					(localRef as any).current = node;
					if (typeof forwardedRef === "function")
						forwardedRef(node);
					else if (forwardedRef)
						(forwardedRef as any).current = node;
				}}
				className={cn("cursor-pointer", className)}
				{...props}
			>
				{children}
			</Component>
		);
	},
);
MagneticButton.displayName = "MagneticButton";

const MarqueeItem = () => (
	<div className="flex items-center space-x-12 px-6">
		<span>Elite Coaching</span>
		<span className="text-[#8aff00]/60">&#10022;</span>
		<span>Strength &amp; Conditioning</span>
		<span className="text-[#8aff00]/40">&#10022;</span>
		<span>Speed &amp; Acceleration</span>
		<span className="text-[#8aff00]/60">&#10022;</span>
		<span>Team Programmes</span>
		<span className="text-[#8aff00]/40">&#10022;</span>
		<span>Injury Prevention</span>
		<span className="text-[#8aff00]/60">&#10022;</span>
		<span>Performance Tracking</span>
		<span className="text-[#8aff00]/40">&#10022;</span>
	</div>
);

export function CinematicFooter() {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const giantTextRef = useRef<HTMLDivElement>(null);
	const headingRef = useRef<HTMLHeadingElement>(null);
	const linksRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!wrapperRef.current) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				giantTextRef.current,
				{ y: "10vh", scale: 0.8, opacity: 0 },
				{
					y: "0vh",
					scale: 1,
					opacity: 1,
					ease: "power1.out",
					scrollTrigger: {
						trigger: wrapperRef.current,
						start: "top 80%",
						end: "bottom bottom",
						scrub: 1,
					},
				},
			);

			gsap.fromTo(
				[headingRef.current, linksRef.current],
				{ y: 50, opacity: 0 },
				{
					y: 0,
					opacity: 1,
					stagger: 0.15,
					ease: "power3.out",
					scrollTrigger: {
						trigger: wrapperRef.current,
						start: "top 40%",
						end: "bottom bottom",
						scrub: 1,
					},
				},
			);
		}, wrapperRef);

		return () => ctx.revert();
	}, []);

	const scrollToTop = () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const year = new Date().getFullYear();

	return (
		<>
			<style dangerouslySetInnerHTML={{ __html: STYLES }} />

			<div
				ref={wrapperRef}
				className="relative h-screen w-full"
				style={{
					clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)",
				}}
			>
				<footer className="fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-[#0a0a0a] text-white cinematic-footer-wrapper">
					<div className="footer-aurora absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px] pointer-events-none z-0" />
					<div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

					<div
						ref={giantTextRef}
						className="footer-giant-bg-text absolute -bottom-[5vh] left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none"
					>
						PH
					</div>

					{/* Marquee */}
					<div className="absolute top-12 left-0 w-full overflow-hidden border-y border-white/[0.06] bg-[#0a0a0a]/60 backdrop-blur-md py-4 z-10 -rotate-2 scale-110 shadow-2xl">
						<div className="flex w-max animate-footer-scroll-marquee text-xs md:text-sm font-bold tracking-[0.3em] text-white/20 uppercase">
							<MarqueeItem />
							<MarqueeItem />
						</div>
					</div>

					{/* Center content */}
					<div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 mt-20 w-full max-w-5xl mx-auto">
						<h2
							ref={headingRef}
							className="text-5xl md:text-8xl font-black italic footer-text-glow tracking-tighter mb-12 text-center uppercase"
						>
							Ready to begin?
						</h2>

						<div
							ref={linksRef}
							className="flex flex-col items-center gap-6 w-full"
						>
							{/* Primary CTAs */}
							<div className="flex flex-wrap justify-center gap-4 w-full">
								<MagneticButton
									as={Link}
									to="/register"
									className="footer-glass-pill px-10 py-5 rounded-full text-white font-bold text-sm md:text-base flex items-center gap-3 group no-underline"
								>
									<svg
										className="w-5 h-5 text-[#8aff00] group-hover:text-[#8aff00]"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.56.04 2.87.67 3.55 1.76-3.13 1.77-2.62 5.92.35 7.14-.65 1.58-1.57 3.1-2.57 4.03zm-3.21-14.7c-.55 1.4-1.89 2.37-3.25 2.28.09-1.5 1.05-2.82 2.38-3.4 1.25-.57 2.66-.41 3.25.04-.15.35-.26.72-.38 1.08z" />
									</svg>
									Download iOS
								</MagneticButton>

								<MagneticButton
									as={Link}
									to="/register"
									className="footer-glass-pill px-10 py-5 rounded-full text-white font-bold text-sm md:text-base flex items-center gap-3 group no-underline"
								>
									<svg
										className="w-5 h-5 text-[#8aff00] group-hover:text-[#8aff00]"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0222 3.503C15.5902 8.242 13.8533 7.85 12 7.85c-1.8533 0-3.5902.392-5.1369 1.1004L4.841 5.4475a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3436-4.1021-2.6893-7.5743-6.1185-9.4396" />
									</svg>
									Download Android
								</MagneticButton>
							</div>

							{/* Secondary links */}
							<div className="flex flex-wrap justify-center gap-3 md:gap-4 w-full mt-2">
								<MagneticButton
									as={Link}
									to="/features"
									className="footer-glass-pill px-6 py-3 rounded-full text-white/40 font-medium text-xs md:text-sm hover:text-white no-underline"
								>
									Features
								</MagneticButton>
								<MagneticButton
									as={Link}
									to="/about"
									className="footer-glass-pill px-6 py-3 rounded-full text-white/40 font-medium text-xs md:text-sm hover:text-white no-underline"
								>
									About
								</MagneticButton>
								<MagneticButton
									as={Link}
									to="/contact"
									className="footer-glass-pill px-6 py-3 rounded-full text-white/40 font-medium text-xs md:text-sm hover:text-white no-underline"
								>
									Contact
								</MagneticButton>
								<MagneticButton
									as={Link}
									to="/terms-privacy"
									className="footer-glass-pill px-6 py-3 rounded-full text-white/40 font-medium text-xs md:text-sm hover:text-white no-underline"
								>
									Privacy &amp; Terms
								</MagneticButton>
							</div>
						</div>
					</div>

					{/* Bottom bar */}
					<div className="relative z-20 w-full pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
						<div className="text-white/25 text-[10px] md:text-xs font-semibold tracking-widest uppercase order-2 md:order-1">
							&copy; {year} PH Performance. All rights
							reserved.
						</div>

						<a
							href="https://clientreach.ai"
							target="_blank"
							rel="noreferrer"
							className="footer-glass-pill px-6 py-3 rounded-full flex items-center gap-2 order-1 md:order-2 border-white/[0.04] no-underline hover:border-[#8aff00]/20 transition-colors"
						>
							<img
								src="/ph.jpg"
								alt="PH Performance"
								className="w-5 h-5 rounded object-cover"
							/>
							<span className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest">
								<span className="font-black italic text-white">
									P
								</span>
								<span className="font-black italic text-[#8aff00]">
									H
								</span>
								<span className="ml-1 font-light tracking-[0.18em] text-[10px]">
									PERFORMANCE
								</span>
							</span>
							<span className="animate-footer-heartbeat text-sm text-[#8aff00] ml-1">
								&#9829;
							</span>
							<span className="text-white/20 text-[10px] mx-1">
								|
							</span>
							<span className="text-white/40 text-[10px] md:text-xs font-medium tracking-wider">
								Made in
							</span>
							<span className="text-white font-bold text-[10px] md:text-xs tracking-wide">
								Client Reach AI
							</span>
						</a>

						<MagneticButton
							as="button"
							onClick={scrollToTop}
							className="w-12 h-12 rounded-full footer-glass-pill flex items-center justify-center text-white/30 hover:text-[#8aff00] group order-3"
						>
							<svg
								className="w-5 h-5 transform group-hover:-translate-y-1.5 transition-transform duration-300"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M5 10l7-7m0 0l7 7m-7-7v18"
								/>
							</svg>
						</MagneticButton>
					</div>
				</footer>
			</div>
		</>
	);
}
