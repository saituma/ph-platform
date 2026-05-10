import { useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	motion,
	useMotionValue,
	useSpring,
	useTransform,
	AnimatePresence,
} from "framer-motion";
import { Home, Dumbbell, CalendarDays, MessageCircle } from "lucide-react";

const DOCK_ITEMS = [
	{ icon: Home, label: "Home", to: "/portal/dashboard" as const },
	{ icon: Dumbbell, label: "Programs", to: "/portal/programs" as const },
	{ icon: CalendarDays, label: "Schedule", to: "/portal/schedule" as const },
	{ icon: MessageCircle, label: "Messages", to: "/portal/messages" as const },
] as const;

const BASE = 48;
const MAX = 72;
const SPREAD = 110;

function DockItem({
	item,
	mouseX,
}: {
	item: (typeof DOCK_ITEMS)[number];
	mouseX: ReturnType<typeof useMotionValue<number>>;
}) {
	const ref = useRef<HTMLDivElement>(null);

	const distance = useTransform(mouseX, (val) => {
		const el = ref.current;
		if (!el) return SPREAD * 2;
		const { left, width } = el.getBoundingClientRect();
		return val - (left + width / 2);
	});

	const scale = useTransform(distance, [-SPREAD, 0, SPREAD], [1, MAX / BASE, 1]);
	const size = useTransform(distance, [-SPREAD, 0, SPREAD], [BASE, MAX, BASE]);

	const smoothScale = useSpring(scale, { mass: 0.08, stiffness: 200, damping: 14 });
	const smoothSize = useSpring(size, { mass: 0.08, stiffness: 200, damping: 14 });

	const routerState = useRouterState();
	const pathname = routerState.location.pathname;
	const isActive =
		item.to === "/portal/dashboard"
			? pathname === "/portal/dashboard" || pathname === "/portal"
			: pathname.startsWith(item.to);

	const Icon = item.icon;

	return (
		<div className="flex flex-col items-center gap-1.5 relative">
			<motion.div
				ref={ref}
				style={{ scale: smoothScale, width: smoothSize, height: smoothSize }}
				className="flex items-center justify-center"
			>
				<Link
					to={item.to}
					aria-label={item.label}
					className={[
						"flex items-center justify-center w-full h-full rounded-2xl transition-colors duration-150",
						isActive
							? "bg-white/[0.15] text-white shadow-inner"
							: "bg-white/[0.07] text-white/60 hover:bg-white/[0.12] hover:text-white",
					].join(" ")}
				>
					<Icon
						strokeWidth={isActive ? 2.2 : 1.7}
						style={{ width: "44%", height: "44%" }}
					/>
				</Link>
			</motion.div>

			{/* active dot */}
			<AnimatePresence>
				{isActive && (
					<motion.div
						key="dot"
						initial={{ opacity: 0, scale: 0 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0 }}
						transition={{ type: "spring", stiffness: 400, damping: 22 }}
						className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-[#8aff00]"
					/>
				)}
			</AnimatePresence>
		</div>
	);
}

export function PortalDock() {
	const mouseX = useMotionValue(Infinity);

	return (
		<motion.div
			initial={{ y: 80, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.15 }}
			className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
		>
			<motion.nav
				onMouseMove={(e) => mouseX.set(e.clientX)}
				onMouseLeave={() => mouseX.set(Infinity)}
				className="pointer-events-auto flex items-end gap-3 px-5 pb-4 pt-3 rounded-3xl"
				style={{
					background: "rgba(18, 18, 18, 0.72)",
					backdropFilter: "blur(24px) saturate(160%)",
					WebkitBackdropFilter: "blur(24px) saturate(160%)",
					boxShadow:
						"0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
				}}
				aria-label="Portal dock navigation"
			>
				{DOCK_ITEMS.map((item) => (
					<DockItem key={item.to} item={item} mouseX={mouseX} />
				))}
			</motion.nav>
		</motion.div>
	);
}
