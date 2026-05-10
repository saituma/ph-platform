import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AnnouncementToast } from "@/components/AnnouncementToast";
import { BottomNav } from "@/components/BottomNav";
import { clearAuthToken, getAuthHeaders } from "@/lib/client-storage";
import { config } from "@/lib/config";
import {
	motion,
	AnimatePresence,
	StaggerList,
	StaggerItem,
} from "@/lib/motion";
import { hasActivePortalSubscription } from "@/lib/portal-access";
import { isPortalCoachLikeRole } from "@/lib/portal-roles";
import { PORTAL_UNAUTHORIZED_ERROR } from "@/portal/portal-errors";
import { PortalProvider, usePortal } from "@/portal/PortalContext";
import { PortalSocketProvider } from "@/portal/PortalSocketContext";

export const Route = createFileRoute("/portal")({
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow" }],
	}),
	component: PortalLayout,
});

function PortalLayout() {
	return (
		<PortalProvider>
			<PortalSocketProvider>
				<PortalInner />
			</PortalSocketProvider>
		</PortalProvider>
	);
}

function PortalInner() {
	const navigate = useNavigate();
	const { user, loading, error, refresh } = usePortal();

	// TODO: Add email verification enforcement before granting portal access (post-launch).
	// PortalContext loading=false + no user + no error means no auth cookie
	useEffect(() => {
		if (loading) return;
		if (!user && !error) {
			navigate({ to: "/login", replace: true });
		}
	}, [loading, user, error, navigate]);

	// 401 from server → token is bad → go to login
	useEffect(() => {
		if (error === PORTAL_UNAUTHORIZED_ERROR) {
			void clearAuthToken();
			navigate({ to: "/login", replace: true });
		}
	}, [error, navigate]);

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
					className="flex flex-col items-center gap-4"
				>
					<div className="relative w-10 h-10">
						<motion.div
							className="absolute inset-0 border-2 border-foreground/10 rounded-full"
							animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
							transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
						/>
						<div className="absolute inset-0 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
					</div>
					<motion.p
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.4, duration: 0.3 }}
						className="font-mono text-[10px] uppercase tracking-wider text-foreground/30"
					>
						Loading
					</motion.p>
				</motion.div>
			</div>
		);
	}

	if (error || !user) {
		return (
			<div className="flex h-screen items-center justify-center px-4">
				<motion.div
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
					className="text-center space-y-4"
				>
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
						className="w-12 h-12 mx-auto border border-destructive/20 flex items-center justify-center"
					>
						<span className="text-destructive text-lg">!</span>
					</motion.div>
					<p className="text-sm text-muted-foreground">
						{error || "Something went wrong loading your account."}
					</p>
					<motion.button
						type="button"
						onClick={() => void refresh()}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.97 }}
						className="bg-primary text-primary-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-colors"
					>
						Retry
					</motion.button>
				</motion.div>
			</div>
		);
	}

	// Onboarding / plan gate
	const isTeam = isPortalCoachLikeRole(user.role);
	const hasActivePlan = hasActivePortalSubscription(user);
	// Once a solo athlete has an active approved plan, do not hard-block portal access
	// behind onboarding flags that may be stale/incomplete from legacy flows.
	const onboardingIncomplete = isTeam
		? !user.team?.id
		: !hasActivePlan && !user.onboardingCompleted;
	const needsPlan = !hasActivePlan;

	if (onboardingIncomplete || needsPlan) {
		return (
			<OnboardingGate
				user={user}
				isTeam={isTeam}
				onboardingIncomplete={onboardingIncomplete}
				needsPlan={needsPlan}
			/>
		);
	}

	return (
		<BottomNav>
			<AnnouncementToast />
			<Outlet />
		</BottomNav>
	);
}

function OnboardingGate({
	user,
	isTeam,
	onboardingIncomplete,
	needsPlan,
}: {
	user: NonNullable<ReturnType<typeof usePortal>["user"]>;
	isTeam: boolean;
	onboardingIncomplete: boolean;
	needsPlan: boolean;
}) {
	const navigate = useNavigate();
	const [latestRequestStatus, setLatestRequestStatus] = useState<string | null>(
		null,
	);

	useEffect(() => {
		let cancelled = false;
		async function loadBillingStatus() {
			try {
				const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
				const res = await fetch(`${baseUrl}/api/billing/status`, {
					credentials: "include",
					headers: getAuthHeaders(),
					cache: "no-store",
				});
				if (!res.ok) return;
				const data = await res.json().catch(() => ({}));
				if (cancelled) return;
				setLatestRequestStatus(
					String((data as any)?.latestRequest?.status ?? "")
						.trim()
						.toLowerCase() || null,
				);
			} catch {
				// best effort only
			}
		}
		void loadBillingStatus();
		return () => {
			cancelled = true;
		};
	}, []);

	const missing: string[] = [];
	if (isTeam) {
		if (!user.team?.name?.trim()) missing.push("Team / club name");
		if (!Number.isFinite(Number(user.team?.minAge))) missing.push("Min age");
		if (!Number.isFinite(Number(user.team?.maxAge))) missing.push("Max age");
		if (!Number.isFinite(Number(user.team?.maxAthletes)))
			missing.push("Expected athletes");
	} else {
		if (!user.birthDate) missing.push("Birth date");
		if (!Number(user.trainingPerWeek ?? 0)) missing.push("Training frequency");
		if (!String(user.performanceGoals ?? "").trim())
			missing.push("Performance goals");
		if (!String(user.phoneNumber ?? "").trim()) missing.push("Phone number");
		if (!String(user.equipmentAccess ?? "").trim())
			missing.push("Equipment access");
	}
	const inReview = latestRequestStatus === "pending_approval";
	const nextStep = useMemo(() => {
		if (!onboardingIncomplete) return 5;
		if (isTeam) return 2;
		if (!user.birthDate) return 2;
		if (
			!Number(user.trainingPerWeek ?? 0) ||
			!String(user.performanceGoals ?? "").trim() ||
			!String(user.phoneNumber ?? "").trim() ||
			!String(user.equipmentAccess ?? "").trim()
		) {
			return 3;
		}
		return 4;
	}, [
		onboardingIncomplete,
		isTeam,
		user.birthDate,
		user.trainingPerWeek,
		user.performanceGoals,
		user.phoneNumber,
		user.equipmentAccess,
	]);

	const ensureSoloOnboardingSession = (): boolean => {
		const pendingEmail =
			(user.email ?? "").trim() ||
			(localStorage.getItem("pending_email") ?? "").trim();
		if (!pendingEmail) {
			toast.error("Cannot continue onboarding", {
				description:
					"We could not read your account email. Try logging out and signing in again.",
			});
			return false;
		}
		localStorage.setItem("pending_email", pendingEmail);
		const athleteKind =
			user.athleteType === "adult" || user.athleteType === "youth"
				? user.athleteType
				: "youth";
		localStorage.setItem("user_type", athleteKind);
		return true;
	};

	const primaryAction = () => {
		if (inReview) {
			toast.message("Your payment is under review.", {
				description: "Your coach/admin will approve access shortly.",
			});
			return;
		}
		if (onboardingIncomplete) {
			if (isTeam) {
				localStorage.setItem("user_type", "team");
				const pendingEmail =
					(user.email ?? "").trim() ||
					(localStorage.getItem("pending_email") ?? "").trim();
				if (!pendingEmail) {
					toast.error("Cannot continue team setup", {
						description:
							"We could not read your account email. Try logging out and signing in again.",
					});
					return;
				}
				localStorage.setItem("pending_email", pendingEmail);
				if (user.team?.id) {
					localStorage.setItem(
						"team_onboarding_basic",
						JSON.stringify({
							teamId: user.team.id,
							teamName: user.team.name,
							minAge: user.team.minAge,
							maxAge: user.team.maxAge,
							maxAthletes: user.team.maxAthletes,
						}),
					);
				}
				navigate({ to: "/onboarding/step-2" });
				return;
			}
			if (!user.birthDate) {
				if (!ensureSoloOnboardingSession()) return;
				navigate({ to: "/onboarding/step-2" });
				return;
			}
			if (
				!Number(user.trainingPerWeek ?? 0) ||
				!String(user.performanceGoals ?? "").trim() ||
				!String(user.phoneNumber ?? "").trim() ||
				!String(user.equipmentAccess ?? "").trim()
			) {
				if (!ensureSoloOnboardingSession()) return;
				navigate({ to: "/onboarding/step-3" });
				return;
			}
			if (!ensureSoloOnboardingSession()) return;
			navigate({ to: "/onboarding/step-4" });
			return;
		}
		if (isTeam && user.team?.id) {
			localStorage.setItem("user_type", "team");
			const pendingEmail =
				(user.email ?? "").trim() ||
				(localStorage.getItem("pending_email") ?? "").trim();
			if (pendingEmail) localStorage.setItem("pending_email", pendingEmail);
			localStorage.setItem(
				"team_onboarding_basic",
				JSON.stringify({
					teamId: user.team.id,
					teamName: user.team.name,
					minAge: user.team.minAge,
					maxAge: user.team.maxAge,
					maxAthletes: user.team.maxAthletes,
				}),
			);
		}
		navigate({ to: "/onboarding/step-5" });
	};

	return (
		<div className="min-h-screen flex items-center justify-center px-4 py-12">
			<motion.div
				initial={{ opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
				className="w-full max-w-xl border border-foreground/[0.06] p-8 overflow-hidden"
			>
				<motion.p
					initial={{ opacity: 0, x: -12 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.15, duration: 0.35 }}
					className="font-mono text-[10px] uppercase tracking-wider text-foreground/40"
				>
					Action Required
				</motion.p>
				<motion.h1
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.25, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
					className="mt-3 text-2xl md:text-3xl font-medium tracking-tight text-foreground"
				>
					{inReview ? "You Are In Review" : "Finish Onboarding"}
				</motion.h1>
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.35, duration: 0.4 }}
					className="mt-2 text-sm text-muted-foreground leading-relaxed"
				>
					{inReview
						? "Your payment is confirmed and awaiting coach/admin approval. You will get access as soon as review is complete."
						: isTeam
							? "Add your team details and choose a plan to unlock Programs, Schedule, and Messages."
							: "Complete onboarding and choose a plan to unlock Programs, Schedule, and Messages."}
				</motion.p>

				<AnimatePresence mode="wait">
					{onboardingIncomplete && missing.length > 0 && (
						<motion.div
							key="missing"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
							className="mt-6 space-y-2"
						>
							<motion.p
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.45 }}
								className="font-mono text-[10px] uppercase tracking-wider text-foreground/40"
							>
								Missing
							</motion.p>
							<StaggerList className="grid grid-cols-1 gap-2 sm:grid-cols-2">
								{missing.map((item) => (
									<StaggerItem key={item}>
										<motion.div
											whileHover={{ x: 4, backgroundColor: "rgba(var(--foreground-rgb, 0 0 0) / 0.04)" }}
											transition={{ duration: 0.2 }}
											className="border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3 text-sm font-medium text-foreground cursor-default"
										>
											{item}
										</motion.div>
									</StaggerItem>
								))}
							</StaggerList>
						</motion.div>
					)}

					{!onboardingIncomplete && needsPlan && (
						<motion.div
							key="plan"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ delay: 0.4, duration: 0.35 }}
							className="mt-6 border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3 text-sm text-muted-foreground"
						>
							{inReview
								? "Payment received. Approval pending."
								: "No active subscription found. Choose a plan to continue."}
						</motion.div>
					)}
				</AnimatePresence>

				{inReview && (
					<motion.div
						initial={{ scaleX: 0 }}
						animate={{ scaleX: 1 }}
						transition={{ delay: 0.5, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
						className="mt-6 h-px bg-foreground/10 origin-left"
					/>
				)}

				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5, duration: 0.4 }}
					className="mt-8 flex flex-col sm:flex-row gap-3"
				>
					<motion.button
						type="button"
						onClick={primaryAction}
						whileHover={inReview ? {} : { scale: 1.02 }}
						whileTap={inReview ? {} : { scale: 0.97 }}
						className="flex-1 inline-flex items-center justify-center bg-primary text-primary-foreground px-5 py-2.5 font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-colors"
						disabled={inReview}
					>
						{inReview
							? "Awaiting Approval"
							: onboardingIncomplete
								? `Continue Step ${nextStep}`
								: "Choose a Plan"}
					</motion.button>
					<motion.button
						type="button"
						onClick={() => {
							void clearAuthToken();
							localStorage.removeItem("user_type");
							localStorage.removeItem("pending_email");
							navigate({ to: "/login" });
						}}
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.97 }}
						className="flex-1 inline-flex items-center justify-center border border-foreground/[0.06] px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-foreground/60 hover:text-foreground hover:bg-foreground/[0.02] transition-colors"
					>
						Log Out
					</motion.button>
				</motion.div>
			</motion.div>
		</div>
	);
}
