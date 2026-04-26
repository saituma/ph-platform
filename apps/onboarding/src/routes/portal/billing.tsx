import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
	ArrowDownCircle,
	CheckCircle2,
	CreditCard,
	ExternalLink,
	FileText,
	Loader2,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePortal } from "@/portal/PortalContext";
import {
	type BillingCycle,
	type BillingPlan,
	type BillingStatus,
	settingsService,
} from "@/services/settingsService";

export const Route = createFileRoute("/portal/billing")({
	component: BillingPage,
});

const BILLING_CYCLES: { id: BillingCycle; label: string; hint: string }[] = [
	{ id: "monthly", label: "Monthly", hint: "Recurring" },
	{ id: "six_months", label: "6 months", hint: "Upfront" },
	{ id: "yearly", label: "Yearly", hint: "Upfront" },
];

const TIER_ORDER: Record<string, number> = {
	PHP: 1,
	PHP_Premium: 2,
	PHP_Premium_Plus: 3,
	PHP_Pro: 4,
};

const TIER_LABELS: Record<string, string> = {
	PHP: "PHP Program",
	PHP_Premium: "PHP Premium",
	PHP_Premium_Plus: "PHP Plus",
	PHP_Pro: "PHP Pro",
};

function tierLabel(tier?: string | null) {
	if (!tier) return "No active plan";
	return TIER_LABELS[tier] ?? tier.replace(/_/g, " ");
}

function formatDate(value?: string | null) {
	if (!value) return "Not set";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Not set";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

function planPrice(plan: BillingPlan) {
	return (
		plan.billingQuote?.amount ??
		plan.pricing?.monthly?.discounted ??
		plan.pricing?.badge ??
		plan.displayPrice ??
		"Contact team"
	);
}

function dedupePlansByTier(plans: BillingPlan[]) {
	const best = new Map<string, BillingPlan>();
	for (const plan of plans) {
		const current = best.get(plan.tier);
		if (!current || Number(plan.id) > Number(current.id)) best.set(plan.tier, plan);
	}
	return [...best.values()].sort((a, b) => {
		return (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99);
	});
}

function BillingPage() {
	const { user, refreshUser } = usePortal();
	const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
	const [plans, setPlans] = useState<BillingPlan[]>([]);
	const [status, setStatus] = useState<BillingStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [busyPlanId, setBusyPlanId] = useState<number | null>(null);
	const [invoices, setInvoices] = useState<any[]>([]);
	const [invoicesLoading, setInvoicesLoading] = useState(true);

	const isTeamBilling = Boolean(user?.team?.id && String(user?.role ?? "").toLowerCase().includes("coach"));
	const currentTier = isTeamBilling
		? plans.find((plan) => plan.id === user?.team?.planId)?.tier
		: user?.programTier ?? status?.currentProgramTier ?? null;

	const activePlans = useMemo(
		() => dedupePlansByTier(plans.filter((plan) => plan.isActive !== false)),
		[plans],
	);

	const loadBilling = async () => {
		setLoading(true);
		try {
			const [planResponse, statusResponse] = await Promise.all([
				settingsService.getBillingPlans(billingCycle),
				settingsService.getBillingStatus().catch(() => null),
			]);
			setPlans(planResponse.plans ?? []);
			setStatus(statusResponse);
		} catch (error: any) {
			toast.error(error.message || "Could not load billing details");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadBilling();
	}, [billingCycle]);

	useEffect(() => {
		setInvoicesLoading(true);
		settingsService
			.getInvoices()
			.then((res) => setInvoices(res.invoices ?? []))
			.catch(() => {})
			.finally(() => setInvoicesLoading(false));
	}, []);

	const handlePlanAction = async (plan: BillingPlan) => {
		if (!plan.id) return;
		setBusyPlanId(plan.id);
		try {
			const currentRank = currentTier ? (TIER_ORDER[currentTier] ?? 0) : 0;
			const targetRank = TIER_ORDER[plan.tier] ?? 0;
			const isDowngrade = !isTeamBilling && currentRank > 0 && targetRank < currentRank;

			if (isDowngrade) {
				await settingsService.downgradePlan(plan.tier);
				await Promise.all([refreshUser(), loadBilling()]);
				toast.success(`Plan changed to ${tierLabel(plan.tier)}`);
				return;
			}

			const checkout = isTeamBilling
				? await settingsService.createTeamCheckout({
						teamId: Number(user?.team?.id),
						planId: plan.id,
						billingCycle,
					})
				: await settingsService.createCheckout({
						planId: plan.id,
						billingCycle,
					});

			if (!checkout.checkoutUrl) {
				throw new Error("Checkout link was not returned");
			}
			window.location.href = checkout.checkoutUrl;
		} catch (error: any) {
			toast.error(error.message || "Could not start plan change");
			setBusyPlanId(null);
		}
	};

	const latestStatus = status?.latestRequest?.status
		? String(status.latestRequest.status).replace(/_/g, " ")
		: null;

	return (
		<div className="mx-auto max-w-6xl space-y-6 p-6 pb-24">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="space-y-2">
					<div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-primary">
						<CreditCard className="h-3.5 w-3.5" />
						Self-service portal
					</div>
					<h1 className="text-3xl font-black uppercase italic tracking-tighter">
						Billing & Plan
					</h1>
					<p className="max-w-2xl text-muted-foreground">
						Manage portal access, change plans, review renewal dates, and keep payments on the web where account owners control them.
					</p>
				</div>
				<Button
					variant="outline"
					className="h-11 rounded-xl border-2 font-bold uppercase tracking-wider"
					onClick={() => void loadBilling()}
					disabled={loading}
				>
					{loading ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="mr-2 h-4 w-4" />
					)}
					Refresh
				</Button>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="border-2 lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg font-bold">
							<ShieldCheck className="h-5 w-5 text-primary" />
							Current access
						</CardTitle>
						<CardDescription>
							{isTeamBilling
								? "Your team subscription controls manager and athlete access."
								: "Your athlete subscription controls portal and mobile feature access."}
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 sm:grid-cols-3">
						<div className="rounded-2xl border bg-muted/30 p-4">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
								Plan
							</p>
							<p className="mt-1 font-black">{tierLabel(currentTier)}</p>
						</div>
						<div className="rounded-2xl border bg-muted/30 p-4">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
								Renews / expires
							</p>
							<p className="mt-1 font-black">
								{formatDate(isTeamBilling ? user?.team?.planExpiresAt : user?.planExpiresAt)}
							</p>
						</div>
						<div className="rounded-2xl border bg-muted/30 p-4">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
								Status
							</p>
							<p className="mt-1 font-black capitalize">
								{isTeamBilling
									? user?.team?.subscriptionStatus?.replace(/_/g, " ") || "Pending"
									: latestStatus || "Active"}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card className="border-2">
					<CardHeader>
						<CardTitle className="text-lg font-bold">Billing cycle</CardTitle>
						<CardDescription>Choose how checkout prices are shown.</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-2">
						{BILLING_CYCLES.map((cycle) => (
							<button
								key={cycle.id}
								type="button"
								onClick={() => setBillingCycle(cycle.id)}
								className={cn(
									"flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition",
									billingCycle === cycle.id
										? "border-primary bg-primary/10 text-primary"
										: "border-border hover:bg-muted/60",
								)}
							>
								<span className="font-black">{cycle.label}</span>
								<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
									{cycle.hint}
								</span>
							</button>
						))}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{loading && activePlans.length === 0 ? (
					<div className="col-span-full flex min-h-52 items-center justify-center rounded-2xl border-2 border-dashed">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				) : null}

				{activePlans.map((plan) => {
					const isCurrent = currentTier === plan.tier;
					const currentRank = currentTier ? (TIER_ORDER[currentTier] ?? 0) : 0;
					const targetRank = TIER_ORDER[plan.tier] ?? 0;
					const isDowngrade = !isTeamBilling && currentRank > 0 && targetRank < currentRank;
					const isBusy = busyPlanId === plan.id;

					return (
						<Card
							key={`${plan.tier}-${plan.id}`}
							className={cn(
								"border-2",
								isCurrent ? "border-primary bg-primary/5" : "border-border",
							)}
						>
							<CardHeader className="space-y-3">
								<div className="flex items-start justify-between gap-3">
									<div>
										<CardTitle className="text-lg font-black">
											{tierLabel(plan.tier)}
										</CardTitle>
										<CardDescription>{plan.name}</CardDescription>
									</div>
									{isCurrent ? (
										<Badge className="rounded-full font-black uppercase">
											Current
										</Badge>
									) : null}
								</div>
								<div>
									<p className="text-2xl font-black tracking-tight">
										{planPrice(plan)}
									</p>
									<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
										{billingCycle === "monthly"
											? "per month"
											: billingCycle === "six_months"
												? "for 6 months"
												: "per year"}
									</p>
								</div>
							</CardHeader>
							<CardContent>
								<Button
									className="h-12 w-full rounded-xl font-bold uppercase tracking-wider"
									variant={isCurrent ? "outline" : "default"}
									disabled={isCurrent || isBusy}
									onClick={() => void handlePlanAction(plan)}
								>
									{isBusy ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : isDowngrade ? (
										<ArrowDownCircle className="mr-2 h-4 w-4" />
									) : isCurrent ? (
										<CheckCircle2 className="mr-2 h-4 w-4" />
									) : (
										<ExternalLink className="mr-2 h-4 w-4" />
									)}
									{isCurrent
										? "Active"
										: isDowngrade
											? "Downgrade"
											: "Checkout"}
								</Button>
							</CardContent>
						</Card>
					);
				})}
			</div>
			{/* Invoice History */}
			<div className="space-y-4">
				<div className="flex items-center gap-2">
					<FileText className="h-5 w-5 text-primary" />
					<h2 className="text-xl font-black uppercase italic tracking-tight">
						Invoice History
					</h2>
				</div>

				{invoicesLoading ? (
					<div className="flex items-center justify-center rounded-2xl border-2 border-dashed py-10">
						<Loader2 className="h-6 w-6 animate-spin text-primary" />
					</div>
				) : invoices.length === 0 ? (
					<div className="rounded-2xl border-2 border-dashed py-10 text-center">
						<p className="text-sm text-muted-foreground">No invoices yet.</p>
					</div>
				) : (
					<div className="rounded-2xl border-2 overflow-hidden">
						<div className="hidden md:grid grid-cols-5 gap-4 px-5 py-3 bg-muted/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
							<span>Date</span>
							<span className="col-span-2">Plan</span>
							<span>Amount</span>
							<span>Status</span>
						</div>
						<div className="divide-y">
							{invoices.map((inv) => (
								<div
									key={inv.id}
									className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors"
								>
									<span className="text-sm text-muted-foreground">
										{new Date(inv.date).toLocaleDateString(undefined, {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</span>
									<span className="text-sm font-bold md:col-span-2">
										{inv.plan}
										{inv.billingCycle && (
											<span className="ml-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
												{inv.billingCycle.replace(/_/g, " ")}
											</span>
										)}
									</span>
									<span className="text-sm font-black">
										{inv.amount ?? "—"}
									</span>
									<div className="flex items-center justify-between gap-2">
										<span
											className={cn(
												"text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
												inv.status === "approved"
													? "bg-green-500/10 text-green-600"
													: inv.status === "pending_payment"
														? "bg-yellow-500/10 text-yellow-600"
														: "bg-muted text-muted-foreground",
											)}
										>
											{inv.status?.replace(/_/g, " ")}
										</span>
										{inv.receiptPublicId && (
											<a
												href={`/portal/billing/receipt/${inv.receiptPublicId}`}
												className="text-xs text-primary hover:underline font-semibold"
											>
												Receipt
											</a>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
