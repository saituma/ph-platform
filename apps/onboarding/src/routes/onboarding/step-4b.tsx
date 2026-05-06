import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle, CircleNotch, Users, User, ShieldCheck } from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "#/lib/utils";
import { config } from "#/lib/config";
import { getAuthHeaders, getTokenStatus } from "#/lib/client-storage";

export const Route = createFileRoute("/onboarding/step-4b")({
	head: () => ({
		meta: [
			{ title: "Payment Mode — PH Performance" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: OnboardingStep4b,
});

type PaymentMode = "coach_pays_all" | "per_player_all" | "per_player_selected";
type PlayerPayer = { id: number; name: string; email: string; selected: boolean };

function paymentConfigScopeKey(maxAthletes: number) {
	const coachEmail = (localStorage.getItem("pending_email") || "").trim().toLowerCase();
	return `${coachEmail}::${maxAthletes}`;
}

function OnboardingStep4b() {
	const navigate = useNavigate();
	const termsContentRef = useRef<HTMLDivElement | null>(null);
	
	const [isLoading, setIsLoading] = useState(true);
	const [termsAccepted, setTermsAccepted] = useState(false);
	const [termsModalOpen, setTermsModalOpen] = useState(false);
	const [termsReadChecked, setTermsReadChecked] = useState(false);
	const [paymentModalOpen, setPaymentModalOpen] = useState(false);
	const [paymentModeConfirmed, setPaymentModeConfirmed] = useState(false);
	const [paymentMode, setPaymentMode] = useState<PaymentMode>("coach_pays_all");
	const [maxAthletes, setMaxAthletes] = useState(1);
	const [teamId, setTeamId] = useState<number | null>(null);
	
	const [playerPayers, setPlayerPayers] = useState<PlayerPayer[]>([]);

	useEffect(() => {
		const type = localStorage.getItem("user_type");
		if (type !== "team") {
			navigate({ to: "/onboarding/step-4" });
			return;
		}

		const raw = localStorage.getItem("team_onboarding_basic");
		let athletesCount = 1;
		let resolvedTeamId: number | null = null;
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				if (Number.isFinite(Number(parsed.maxAthletes))) {
					athletesCount = Number(parsed.maxAthletes);
				}
				if (Number.isFinite(Number(parsed.teamId))) {
					resolvedTeamId = Number(parsed.teamId);
				}
			} catch {}
		}
		setMaxAthletes(athletesCount);
		setTeamId(resolvedTeamId);

		const scopeKey = paymentConfigScopeKey(athletesCount);
		// Load existing config if available for the same onboarding scope.
		(async () => {
			let loaded = false;
			if (resolvedTeamId) {
				try {
					const status = await getTokenStatus();
					if (status.authenticated) {
						const res = await fetch(`${config.api.baseUrl}/api/billing/team/payment-config-draft/${resolvedTeamId}`, {
							credentials: "include",
							headers: getAuthHeaders(),
						});
						const data = await res.json().catch(() => ({}));
						const draft = (data as any)?.draft;
						if (res.ok && draft && String(draft?.scopeKey ?? "") === scopeKey) {
							if (draft.termsAcceptedAt) setTermsAccepted(true);
							if (draft.paymentMode) {
								setPaymentMode(draft.paymentMode);
								setPaymentModeConfirmed(true);
							}
							if (Array.isArray(draft.playerPayers) && draft.playerPayers.length > 0) {
								setPlayerPayers(
									draft.playerPayers.map((p: any, idx: number) => ({
										id: Number.isFinite(Number(p?.id)) ? Number(p.id) : idx,
										name: typeof p?.name === "string" ? p.name : "",
										email: typeof p?.email === "string" ? p.email : "",
										selected: p?.selected !== false,
									})),
								);
							} else {
								initPlayerPayers(athletesCount);
							}
							loaded = true;
						}
					}
				} catch {
					// fall back to local storage
				}
			}

			if (!loaded) {
				const savedConfigStr = localStorage.getItem("team_payment_config");
				if (savedConfigStr) {
					try {
						const savedConfig = JSON.parse(savedConfigStr);
						if (String(savedConfig?.scopeKey ?? "") !== scopeKey) {
							localStorage.removeItem("team_payment_config");
							initPlayerPayers(athletesCount);
							setIsLoading(false);
							return;
						}
						if (savedConfig.termsAcceptedAt) setTermsAccepted(true);
						if (savedConfig.paymentMode) {
							setPaymentMode(savedConfig.paymentMode);
							setPaymentModeConfirmed(true);
						}
						if (savedConfig.playerPayers && Array.isArray(savedConfig.playerPayers)) {
							setPlayerPayers(savedConfig.playerPayers);
						} else if (savedConfig.playerEmails && Array.isArray(savedConfig.playerEmails)) {
							setPlayerPayers(
								savedConfig.playerEmails.map((p: any, idx: number) => ({
									id: Number.isFinite(Number(p?.id)) ? Number(p.id) : idx,
									name: typeof p?.name === "string" ? p.name : "",
									email: typeof p?.email === "string" ? p.email : "",
									selected: p?.selected !== false,
								})),
							);
						} else {
							initPlayerPayers(athletesCount);
						}
					} catch {
						initPlayerPayers(athletesCount);
					}
				} else {
					initPlayerPayers(athletesCount);
				}
			}
			setIsLoading(false);
		})();
	}, [navigate]);

	const initPlayerPayers = (count: number) => {
		const arr = Array.from({ length: count }).map((_, i) => ({
			id: i,
			name: "",
			email: "",
			selected: true,
		}));
		setPlayerPayers(arr);
	};

	const handleUpdateEmail = (id: number, val: string) => {
		setPlayerPayers((prev) => prev.map((p) => (p.id === id ? { ...p, email: val } : p)));
	};

	const handleUpdateName = (id: number, val: string) => {
		setPlayerPayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: val } : p)));
	};

	const handleToggleSelected = (id: number) => {
		setPlayerPayers((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
	};

	const handleSelectAllPlayers = () => {
		setPlayerPayers((prev) => prev.map((p) => ({ ...p, selected: true })));
	};

	const handleUnselectAllPlayers = () => {
		setPlayerPayers((prev) => prev.map((p) => ({ ...p, selected: false })));
	};

	const paymentModeLabel =
		paymentMode === "coach_pays_all"
			? "Coach Pays All"
			: paymentMode === "per_player_all"
				? "All Players Pay"
				: "Selected Players Pay";

	const handleContinue = async () => {
		if (!termsAccepted) {
			toast.error("Terms & Conditions Required", {
				description: "You must accept the terms before continuing.",
			});
			return;
		}
		if (!paymentModeConfirmed) {
			toast.error("Payment Mode Required", {
				description: "Please open payment mode setup and confirm one option.",
			});
			return;
		}

		const coachEmail = (localStorage.getItem("pending_email") || "").trim().toLowerCase();

		if (paymentMode === "per_player_all") {
			const missing = playerPayers.some((p) => !p.name.trim() || !p.email.trim());
			if (missing) {
				toast.error("Player Details Required", {
					description: "Please enter player name and payment email for every player.",
				});
				return;
			}
			const hasCoachEmail = playerPayers.some((p) => p.email.trim().toLowerCase() === coachEmail);
			if (hasCoachEmail) {
				toast.error("Invalid Payment Email", {
					description: "Player payment email cannot be the coach account email.",
				});
				return;
			}
		}

		if (paymentMode === "per_player_selected") {
			const activePlayers = playerPayers.filter((p) => p.selected);
			if (activePlayers.length === 0) {
				toast.error("Selection Required", {
					description: "Please select at least one player to pay for themselves.",
				});
				return;
			}
			const missing = activePlayers.some((p) => !p.name.trim() || !p.email.trim());
			if (missing) {
				toast.error("Player Details Required", {
					description: "Please enter player name and payment email for every selected player.",
				});
				return;
			}
			const hasCoachEmail = activePlayers.some((p) => p.email.trim().toLowerCase() === coachEmail);
			if (hasCoachEmail) {
				toast.error("Invalid Payment Email", {
					description: "Player payment email cannot be the coach account email.",
				});
				return;
			}
		}

		// Calculate coach seats
		let coachPaysSeats = maxAthletes;
		if (paymentMode === "per_player_all") {
			coachPaysSeats = 0;
		} else if (paymentMode === "per_player_selected") {
			const activePlayers = playerPayers.filter((p) => p.selected);
			coachPaysSeats = Math.max(0, maxAthletes - activePlayers.length);
		}

		const paymentConfigDraft = {
			scopeKey: paymentConfigScopeKey(maxAthletes),
			termsAcceptedAt: new Date().toISOString(),
			termsVersion: "1.0",
			paymentMode,
			coachPaysSeats,
			playerPayers: playerPayers.filter((p) => {
				if (paymentMode === "per_player_all") return true;
				if (paymentMode === "per_player_selected") return p.selected;
				return false;
			}).map((p) => ({ id: p.id, name: p.name.trim(), email: p.email.trim(), selected: p.selected })),
		};

		localStorage.setItem("team_payment_config", JSON.stringify(paymentConfigDraft));
		if (teamId) {
			try {
				await fetch(`${config.api.baseUrl}/api/billing/team/payment-config-draft/${teamId}`, {
					method: "PUT",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
						...getAuthHeaders(),
					},
					body: JSON.stringify(paymentConfigDraft),
				});
			} catch {
				// local fallback already stored
			}
		}
		navigate({ to: "/onboarding/step-5" });
	};

	const handleScrollTermsToBottom = () => {
		const el = termsContentRef.current;
		if (!el) return;
		el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
	};

	if (isLoading) {
		return (
			<div className="flex h-[60vh] items-center justify-center">
				<CircleNotch className="w-10 h-10 animate-spin text-foreground/40" />
			</div>
		);
	}

	return (
		<main className="mx-auto max-w-3xl px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
			<section className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-4 text-center">
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
						Step 4 of 4
					</p>
					<h1 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground">
						Payment Mode & Terms
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
						Choose how your team's subscription will be paid.
					</p>
				</div>

				<div className="space-y-8">
					<Card className="border border-primary/20 bg-primary/5 p-6 sm:p-8">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="space-y-1">
								<h2 className="text-sm font-semibold text-foreground">Terms & Conditions</h2>
								<p className="text-xs text-muted-foreground">
									Open the terms modal, read it, and accept before continuing.
								</p>
								<p className="text-xs font-medium text-foreground/70">
									Status: {termsAccepted ? "Accepted" : "Pending"}
								</p>
							</div>
							<Button type="button" variant="outline" onClick={() => setTermsModalOpen(true)} className="h-9 px-4 text-xs uppercase tracking-wider">
								<ShieldCheck className="mr-2 h-4 w-4" weight="fill" />
								Open Terms
							</Button>
						</div>
					</Card>

					{/* Payment Mode Selection */}
					<div className="space-y-4">
						<h2 className="font-mono text-xs uppercase tracking-wider text-foreground/60 mb-2">Payment Mode</h2>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-foreground/[0.06] bg-card p-4">
							<div>
								<p className="text-sm font-medium text-foreground">{paymentModeLabel}</p>
								<p className="text-xs text-muted-foreground">
									Status: {paymentModeConfirmed ? "Configured" : "Not confirmed"}
								</p>
							</div>
							<Button type="button" variant="outline" onClick={() => setPaymentModalOpen(true)} className="h-9 px-4 text-xs uppercase tracking-wider">
								Configure Payment Mode
							</Button>
						</div>
					</div>

					{/* Dynamic Inputs */}
					{paymentMode !== "coach_pays_all" && (
						<div className="space-y-6 animate-in fade-in slide-in-from-top-4">
							<div className="border-t border-border pt-6">
								<div className="flex items-center justify-between mb-4">
									<h2 className="font-mono text-xs uppercase tracking-wider text-foreground/60">
										Player Details ({maxAthletes} Slots)
									</h2>
								</div>
								
								{paymentMode === "per_player_selected" && (
									<div className="mb-4 space-y-3">
										<p className="text-xs text-muted-foreground">
											Select which players should receive a payment link. You will be billed for the remaining unselected seats.
										</p>
										<div className="flex flex-wrap items-center gap-2">
											<Button
												type="button"
												variant="outline"
												onClick={handleSelectAllPlayers}
												className="h-8 px-3 text-[10px] uppercase tracking-wider"
											>
												Select All
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={handleUnselectAllPlayers}
												className="h-8 px-3 text-[10px] uppercase tracking-wider"
											>
												Unselect All
											</Button>
										</div>
									</div>
								)}

								<div className="space-y-3">
									{playerPayers.map((player) => (
										<div key={player.id} className="flex items-center gap-3">
											{paymentMode === "per_player_selected" && (
												<button
													type="button"
													onClick={() => handleToggleSelected(player.id)}
													className={cn(
														"flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
														player.selected
															? "border-primary bg-primary text-primary-foreground"
															: "border-input bg-transparent"
													)}
												>
													{player.selected && <Check className="h-3 w-3" weight="bold" />}
												</button>
											)}
											
											<div className="grid flex-1 gap-2 sm:grid-cols-2">
												<Input
													type="text"
													placeholder={`Player ${player.id + 1} Name`}
													value={player.name}
													onChange={(e) => handleUpdateName(player.id, e.target.value)}
													disabled={paymentMode === "per_player_selected" && !player.selected}
													className={cn(
														"h-11",
														paymentMode === "per_player_selected" && !player.selected && "opacity-50"
													)}
												/>
												<Input
													type="email"
													placeholder={`Player ${player.id + 1} Payment Email`}
													value={player.email}
													onChange={(e) => handleUpdateEmail(player.id, e.target.value)}
													disabled={paymentMode === "per_player_selected" && !player.selected}
													className={cn(
														"h-11",
														paymentMode === "per_player_selected" && !player.selected && "opacity-50"
													)}
												/>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				<div className="flex flex-col sm:flex-row gap-4 pt-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/onboarding/step-4" })}
						className="flex-1 h-10 border border-foreground/[0.06] font-mono text-xs uppercase tracking-wider text-foreground/60 transition-all"
					>
						<ArrowLeft weight="bold" className="mr-2 w-5 h-5" />
						Back
					</Button>
					<Button
						type="button"
						onClick={handleContinue}
						className={cn(
							"flex-[2] h-10 font-mono text-xs uppercase tracking-wider transition-all active:scale-[0.98]",
							termsAccepted && paymentModeConfirmed ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground"
						)}
					>
						Continue to Plan
						<ArrowRight weight="bold" className="ml-2 w-5 h-5" />
					</Button>
				</div>

				<AlertDialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
					<AlertDialogContent className="max-w-2xl rounded-2xl">
						<AlertDialogHeader>
							<AlertDialogTitle>Terms of Service and Privacy Policy</AlertDialogTitle>
							<AlertDialogDescription>
								Read these terms before accepting payment responsibilities.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div
							ref={termsContentRef}
							className="max-h-[55vh] space-y-4 overflow-y-auto rounded-lg border border-foreground/[0.08] p-4 text-sm text-foreground/80"
						>
							<p>You agree to provide accurate player information and lawful contact data for payment links.</p>
							<p>You are responsible for fees assigned to coach-paid seats and for resolving failed player payments.</p>
							<p>By continuing, you authorize PH Performance to process payments based on your selected payment mode.</p>
						</div>
						<div className="flex justify-end">
							<Button type="button" variant="outline" onClick={handleScrollTermsToBottom} className="h-8 px-3 text-[10px] uppercase tracking-wider">
								Scroll to Bottom
							</Button>
						</div>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={termsReadChecked}
								onChange={(e) => setTermsReadChecked(e.target.checked)}
							/>
							I have read and understand the terms.
						</label>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setTermsReadChecked(false)}>Cancel</AlertDialogCancel>
							<AlertDialogAction
								disabled={!termsReadChecked}
								onClick={() => {
									setTermsAccepted(true);
									setTermsReadChecked(false);
									setTermsModalOpen(false);
								}}
							>
								Accept Terms
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<AlertDialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
					<AlertDialogContent className="max-w-3xl rounded-2xl">
						<AlertDialogHeader>
							<AlertDialogTitle>Select Payment Mode</AlertDialogTitle>
							<AlertDialogDescription>
								Choose how subscription charges are distributed.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="grid gap-4 sm:grid-cols-3">
							<ModeCard
								title="Coach Pays All"
								description="You pay the full team fee in one checkout."
								icon={User}
								selected={paymentMode === "coach_pays_all"}
								onClick={() => setPaymentMode("coach_pays_all")}
							/>
							<ModeCard
								title="All Players Pay"
								description="Every player receives a payment link."
								icon={Users}
								selected={paymentMode === "per_player_all"}
								onClick={() => setPaymentMode("per_player_all")}
							/>
							<ModeCard
								title="Selected Players Pay"
								description="Some players pay, you cover the rest."
								icon={CheckCircle}
								selected={paymentMode === "per_player_selected"}
								onClick={() => setPaymentMode("per_player_selected")}
							/>
						</div>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									setPaymentModeConfirmed(true);
									setPaymentModalOpen(false);
								}}
							>
								Use This Mode
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</section>
		</main>
	);
}

function ModeCard({ title, description, icon: Icon, selected, onClick }: any) {
	return (
		<Card
			onClick={onClick}
			className={cn(
				"cursor-pointer border p-5 transition-all hover:border-primary/50",
				selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-foreground/[0.06] bg-card"
			)}
		>
			<div className="flex flex-col items-center text-center gap-3">
				<div className={cn("p-3 rounded-full", selected ? "bg-primary/20 text-primary" : "bg-muted text-foreground/40")}>
					<Icon size={24} weight={selected ? "fill" : "regular"} />
				</div>
				<div>
					<h3 className="text-sm font-semibold">{title}</h3>
					<p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
				</div>
			</div>
		</Card>
	);
}
