import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export const LAUNCH_DATE = new Date("2026-05-25T07:00:00Z");

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

interface Remaining {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	done: boolean;
}

function getRemaining(): Remaining {
	const diff = LAUNCH_DATE.getTime() - Date.now();
	if (diff <= 0)
		return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
	const totalSeconds = Math.floor(diff / 1000);
	return {
		days: Math.floor(totalSeconds / 86400),
		hours: Math.floor((totalSeconds % 86400) / 3600),
		minutes: Math.floor((totalSeconds % 3600) / 60),
		seconds: totalSeconds % 60,
		done: false,
	};
}

function pad(n: number) {
	return String(n).padStart(2, "0");
}

interface UnitProps {
	value: string;
	label: string;
	isLast?: boolean;
}

function Unit({ value, label, isLast }: UnitProps) {
	return (
		<div className="flex items-stretch">
			<div className="flex flex-col items-center min-w-[56px] sm:min-w-[64px]">
				<div className="relative overflow-hidden h-[52px] sm:h-[60px] flex items-center justify-center">
					<AnimatePresence mode="popLayout" initial={false}>
						<motion.span
							key={value}
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -12 }}
							transition={{ duration: 0.25, ease: EASE }}
							className="font-mono tabular-nums text-[44px] sm:text-[52px] font-bold text-white leading-none select-none"
						>
							{value}
						</motion.span>
					</AnimatePresence>
				</div>
				<span className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] text-white/35 mt-1 font-semibold">
					{label}
				</span>
			</div>
			{!isLast && (
				<div className="flex flex-col items-center justify-center pb-5 px-1 sm:px-2">
					<span className="text-[#8aff00]/60 text-2xl font-light select-none leading-none">
						:
					</span>
				</div>
			)}
		</div>
	);
}

export function CountdownTimer() {
	const [mounted, setMounted] = useState(false);
	const [remaining, setRemaining] = useState<Remaining>({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
		done: false,
	});
	const [celebrating, setCelebrating] = useState(false);
	const [hidden, setHidden] = useState(false);
	const firedRef = useRef(false);

	useEffect(() => {
		const initial = getRemaining();
		setMounted(true);

		if (initial.done) {
			setHidden(true);
			return;
		}

		setRemaining(initial);

		const id = setInterval(() => {
			const r = getRemaining();
			setRemaining(r);
			if (r.done && !firedRef.current) {
				firedRef.current = true;
				const reducedMotion = window.matchMedia(
					"(prefers-reduced-motion: reduce)",
				).matches;
				if (!reducedMotion) {
					const burst = (origin: { x: number; y: number }) => {
						confetti({
							particleCount: 60,
							spread: 80,
							origin,
							colors: ["#8aff00", "#ffffff", "#b8ff66", "#ccff99"],
							gravity: 1.2,
						});
					};
					burst({ x: 0.3, y: 0.4 });
					setTimeout(() => burst({ x: 0.5, y: 0.35 }), 180);
					setTimeout(() => burst({ x: 0.7, y: 0.4 }), 350);
				}
				setCelebrating(true);
				setTimeout(() => {
					setHidden(true);
					clearInterval(id);
				}, 6000);
			}
		}, 1000);

		return () => clearInterval(id);
	}, []);

	if (hidden) return null;

	const ariaLabel =
		mounted && !remaining.done
			? `Launching in ${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes`
			: "Launching soon";

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
			className="mb-7"
		>
			<AnimatePresence mode="wait">
				{celebrating ? (
					<motion.div
						key="live"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.4, ease: EASE }}
						className="inline-flex items-center gap-2 px-4 py-2 border border-[#8aff00]/40 bg-[#8aff00]/10"
					>
						<span className="w-1.5 h-1.5 rounded-full bg-[#8aff00] animate-pulse" />
						<span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#8aff00]">
							We&apos;re Live
						</span>
					</motion.div>
				) : (
					<motion.div
						key="timer"
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
					>
						<p className="text-white/30 text-[9px] uppercase tracking-[0.25em] mb-3 font-semibold">
							Launching in
						</p>
						<div
							role="timer"
							aria-live="polite"
							aria-label={ariaLabel}
							className="flex items-stretch"
						>
							<Unit value={mounted ? pad(remaining.days) : "--"} label="Days" />
							<Unit value={mounted ? pad(remaining.hours) : "--"} label="Hrs" />
							<Unit
								value={mounted ? pad(remaining.minutes) : "--"}
								label="Min"
							/>
							<Unit
								value={mounted ? pad(remaining.seconds) : "--"}
								label="Sec"
								isLast
							/>
						</div>
						<div className="mt-3 h-px w-full bg-gradient-to-r from-[#8aff00]/30 via-white/10 to-transparent" />
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
