import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	CheckCircle2,
	CreditCard,
	Loader2,
	ShieldCheck,
	User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
	motion,
	PageTransition,
	StaggerList,
	StaggerItem,
	Skeleton,
} from "@/lib/motion";
import { usePortal } from "@/portal/PortalContext";
import { guardianService } from "@/services/guardianService";
import {
	type BillingCycle,
	type BillingPlan,
	settingsService,
} from "@/services/settingsService";

export const Route = createFileRoute("/portal/add-child")({
	component: AddChildPage,
});

/* ─── Constants ─── */

const STEPS = ["Child Details", "Choose Plan", "Review & Pay"] as const;

const BILLING_CYCLES: { id: BillingCycle; label: string; hint: string }[] = [
	{ id: "monthly", label: "Monthly", hint: "Recurring" },
	{ id: "six_months", label: "6 Months", hint: "Upfront" },
	{ id: "yearly", label: "Yearly", hint: "Upfront" },
];

const CYCLE_LABELS: Record<string, string> = {
	weekly: "per week",
	monthly: "per month",
	six_months: "per 6 months",
	yearly: "per year",
};

const TIER_ORDER: Record<string, number> = {
	PHP: 1,
	PHP_Premium: 2,
	PHP_Premium_Plus: 3,
	PHP_Pro: 4,
};

const TIER_LABELS: Record<string, string> = {
	PHP: "PHP Program",
	PHP_Premium: "PHP Premium",
	PHP_Premium_Plus: "PHP Premium Plus",
	PHP_Pro: "PHP Pro",
};

function tierLabel(tier?: string | null) {
	if (!tier) return "Plan";
	return TIER_LABELS[tier] ?? tier.replace(/_/g, " ");
}

function planPrice(plan: BillingPlan) {
	return (
		plan.billingQuote?.amount ??
		plan.displayPrice ??
		plan.pricing?.badge ??
		"Contact team"
	);
}

function dedupePlansByTier(plans: BillingPlan[]) {
	const best = new Map<string, BillingPlan>();
	for (const plan of plans) {
		const key = plan.tier ? `tier:${plan.tier}` : `id:${plan.id}`;
		const current = best.get(key);
		if (!current || Number(plan.id) > Number(current.id)) best.set(key, plan);
	}
	return [...best.values()].sort((a, b) => {
		return (TIER_ORDER[a.tier ?? ""] ?? 99) - (TIER_ORDER[b.tier ?? ""] ?? 99);
	});
}

/* ─── Main Page ─── */

function AddChildPage() {
	const { loading: portalLoading } = usePortal();
	const [step, setStep] = useState(0);

	// Step 1: child details
	const [childName, setChildName] = useState("");
	const [birthDate, setBirthDate] = useState("");
	const [password, setPassword] = useState("");
	const [sport, setSport] = useState("");
	const [injuries, setInjuries] = useState("");
	const [performanceGoals, setPerformanceGoals] = useState("");

	// Step 2: plan selection
	const [plans, setPlans] = useState<BillingPlan[]>([]);
	const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
	const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
	const [plansLoading, setPlansLoading] = useState(false);

	// Step 3: submit
	const [isSubmitting, setIsSubmitting] = useState(false);

	const activePlans = useMemo(
		() => dedupePlansByTier(plans.filter((p) => p.isActive !== false && p.tier !== "PHP_Premium_Plus")),
		[plans],
	);

	const selectedPlan = activePlans.find((p) => p.id === selectedPlanId) ?? null;

	const loadPlans = useCallback(async () => {
		setPlansLoading(true);
		try {
			const response = await settingsService.getBillingPlans(billingCycle);
			setPlans(response.plans ?? []);
		} catch (err: any) {
			toast.error(err.message || "Could not load plans");
		} finally {
			setPlansLoading(false);
		}
	}, [billingCycle]);

	useEffect(() => {
		if (step === 1) {
			void loadPlans();
		}
	}, [step, loadPlans]);

	// Auto-select first plan when plans load
	useEffect(() => {
		if (activePlans.length > 0 && !selectedPlanId) {
			const preferred = activePlans.find((p) => p.tier === "PHP_Premium") ?? activePlans[0];
			setSelectedPlanId(preferred.id);
		}
	}, [activePlans, selectedPlanId]);

	const canProceedStep1 = childName.trim().length > 0 && birthDate.trim().length > 0 && password.trim().length >= 6;
	const canProceedStep2 = selectedPlanId != null;

	const handleNext = () => {
		if (step === 0) {
			if (!canProceedStep1) {
				toast.error("Please fill in the required fields");
				return;
			}
			setStep(1);
		} else if (step === 1) {
			if (!canProceedStep2) {
				toast.error("Please select a plan");
				return;
			}
			setStep(2);
		}
	};

	const handleBack = () => {
		if (step > 0) setStep(step - 1);
	};

	const handleCheckout = async () => {
		if (!selectedPlan) return;
		setIsSubmitting(true);
		try {
			const result = await guardianService.addChildCheckout({
				childName: childName.trim(),
				birthDate,
				password: password.trim(),
				sport: sport.trim() || undefined,
				injuries: injuries.trim() || undefined,
				performanceGoals: performanceGoals.trim() || undefined,
				planId: selectedPlan.id,
				billingCycle,
			});
			if (result.checkoutUrl) {
				window.location.href = result.checkoutUrl;
			} else {
				throw new Error("Checkout URL not returned");
			}
		} catch (err: any) {
			toast.error(err.message || "Failed to start checkout");
			setIsSubmitting(false);
		}
	};

	if (portalLoading) {
		return (
			<PageTransition className="mx-auto max-w-3xl p-6 pb-24 space-y-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-96" />
				<Skeleton className="h-64 w-full" />
			</PageTransition>
		);
	}

	return (
		<PageTransition className="mx-auto max-w-3xl p-4 md:p-6 pb-24 space-y-6">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="space-y-2"
			>
				<Link
					to="/portal/dashboard"
					className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors mb-4"
				>
					<ArrowLeft className="h-3 w-3" />
					Back to Dashboard
				</Link>
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">
					Add Child
				</h1>
				<p className="text-muted-foreground">
					Register a new child athlete and choose their training plan.
				</p>
			</motion.div>

			{/* Step indicator */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1, duration: 0.4 }}
				className="flex items-center gap-2"
			>
				{STEPS.map((label, i) => (
					<div key={label} className="flex items-center gap-2 flex-1">
						<button
							type="button"
							onClick={() => {
								if (i < step) setStep(i);
							}}
							disabled={i > step}
							className={cn(
								"flex items-center gap-2 text-left transition-colors",
								i <= step ? "text-foreground" : "text-foreground/30",
								i < step && "cursor-pointer hover:text-primary",
							)}
						>
							<span
								className={cn(
									"flex h-6 w-6 items-center justify-center text-[10px] font-bold font-mono border transition-colors",
									i < step
										? "bg-primary border-primary text-primary-foreground"
										: i === step
											? "border-foreground text-foreground"
											: "border-foreground/20 text-foreground/30",
								)}
							>
								{i < step ? <Check className="h-3 w-3" /> : i + 1}
							</span>
							<span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider">
								{label}
							</span>
						</button>
						{i < STEPS.length - 1 && (
							<div
								className={cn(
									"flex-1 h-px transition-colors",
									i < step ? "bg-primary" : "bg-foreground/10",
								)}
							/>
						)}
					</div>
				))}
			</motion.div>

			{/* Step content */}
			{step === 0 && (
				<StepChildDetails
					childName={childName}
					setChildName={setChildName}
					birthDate={birthDate}
					setBirthDate={setBirthDate}
					password={password}
					setPassword={setPassword}
					sport={sport}
					setSport={setSport}
					injuries={injuries}
					setInjuries={setInjuries}
					performanceGoals={performanceGoals}
					setPerformanceGoals={setPerformanceGoals}
					onNext={handleNext}
					canProceed={canProceedStep1}
				/>
			)}

			{step === 1 && (
				<StepChoosePlan
					plans={activePlans}
					billingCycle={billingCycle}
					setBillingCycle={setBillingCycle}
					selectedPlanId={selectedPlanId}
					setSelectedPlanId={setSelectedPlanId}
					loading={plansLoading}
					onNext={handleNext}
					onBack={handleBack}
					canProceed={canProceedStep2}
				/>
			)}

			{step === 2 && (
				<StepReviewPay
					childName={childName}
					birthDate={birthDate}
					sport={sport}
					injuries={injuries}
					performanceGoals={performanceGoals}
					selectedPlan={selectedPlan}
					billingCycle={billingCycle}
					isSubmitting={isSubmitting}
					onCheckout={handleCheckout}
					onBack={handleBack}
				/>
			)}
		</PageTransition>
	);
}

/* ─── Step 1: Child Details ─── */

function StepChildDetails({
	childName,
	setChildName,
	birthDate,
	setBirthDate,
	password,
	setPassword,
	sport,
	setSport,
	injuries,
	setInjuries,
	performanceGoals,
	setPerformanceGoals,
	onNext,
	canProceed,
}: {
	childName: string;
	setChildName: (v: string) => void;
	birthDate: string;
	setBirthDate: (v: string) => void;
	password: string;
	setPassword: (v: string) => void;
	sport: string;
	setSport: (v: string) => void;
	injuries: string;
	setInjuries: (v: string) => void;
	performanceGoals: string;
	setPerformanceGoals: (v: string) => void;
	onNext: () => void;
	canProceed: boolean;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.3 }}
		>
			<Card className="border-2">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg font-bold">
						<User className="h-5 w-5 text-primary" />
						Child Details
					</CardTitle>
					<CardDescription>
						Enter your child's information. Fields marked with * are required.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="childName" className="font-mono text-[10px] uppercase tracking-wider text-foreground/60">
							Child's Full Name *
						</Label>
						<Input
							id="childName"
							placeholder="Enter child's full name"
							value={childName}
							onChange={(e) => setChildName(e.target.value)}
							className="h-12 rounded-xl border-2 focus-visible:ring-primary"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="birthDate" className="font-mono text-[10px] uppercase tracking-wider text-foreground/60">
							Date of Birth *
						</Label>
						<Input
							id="birthDate"
							type="date"
							value={birthDate}
							onChange={(e) => setBirthDate(e.target.value)}
							className="h-12 rounded-xl border-2 focus-visible:ring-primary"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password" className="font-mono text-[10px] uppercase tracking-wider text-foreground/60">
							Login Password *
						</Label>
						<Input
							id="password"
							type="password"
							placeholder="Set a password for your child's account (min 6 characters)"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="h-12 rounded-xl border-2 focus-visible:ring-primary"
							required
							minLength={6}
						/>
						<p className="text-[10px] font-mono text-foreground/40">
							Your child will use this password to log in to the PH Performance app.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="sport" className="font-mono text-[10px] uppercase tracking-wider text-foreground/60">
							Sport (optional)
						</Label>
						<Input
							id="sport"
							placeholder="e.g. Football, Rugby, Athletics"
							value={sport}
							onChange={(e) => setSport(e.target.value)}
							className="h-12 rounded-xl border-2 focus-visible:ring-primary"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="injuries" className="font-mono text-[10px] uppercase tracking-wider text-foreground/60">
							Injuries / Medical Notes (optional)
						</Label>
						<Textarea
							id="injuries"
							placeholder="Any injuries or medical conditions the coaching team should know about"
							value={injuries}
							onChange={(e) => setInjuries(e.target.value)}
							className="min-h-[80px] rounded-xl border-2 focus-visible:ring-primary resize-none"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="performanceGoals" className="font-mono text-[10px] uppercase tracking-wider text-foreground/60">
							Performance Goals (optional)
						</Label>
						<Textarea
							id="performanceGoals"
							placeholder="What are your child's training or performance goals?"
							value={performanceGoals}
							onChange={(e) => setPerformanceGoals(e.target.value)}
							className="min-h-[80px] rounded-xl border-2 focus-visible:ring-primary resize-none"
						/>
					</div>

					<motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
						<Button
							onClick={onNext}
							disabled={!canProceed}
							className="w-full h-12 rounded-xl font-bold uppercase tracking-wider"
						>
							Continue to Plan Selection
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</motion.div>
				</CardContent>
			</Card>
		</motion.div>
	);
}

/* ─── Step 2: Choose Plan ─── */

function StepChoosePlan({
	plans,
	billingCycle,
	setBillingCycle,
	selectedPlanId,
	setSelectedPlanId,
	loading,
	onNext,
	onBack,
	canProceed,
}: {
	plans: BillingPlan[];
	billingCycle: BillingCycle;
	setBillingCycle: (v: BillingCycle) => void;
	selectedPlanId: number | null;
	setSelectedPlanId: (v: number) => void;
	loading: boolean;
	onNext: () => void;
	onBack: () => void;
	canProceed: boolean;
}) {
	if (loading && plans.length === 0) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-12 w-full" />
				<div className="grid gap-4 md:grid-cols-2">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-48 w-full" />
					))}
				</div>
			</div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.3 }}
			className="space-y-6"
		>
			{/* Billing cycle selector */}
			<Card className="border-2">
				<CardHeader>
					<CardTitle className="text-lg font-bold">Billing Cycle</CardTitle>
					<CardDescription>Choose how you'd like to pay for your child's plan.</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-2 sm:grid-cols-3">
					{BILLING_CYCLES.map((cycle) => (
						<motion.button
							key={cycle.id}
							whileHover={{ scale: 1.01 }}
							whileTap={{ scale: 0.99 }}
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
						</motion.button>
					))}
				</CardContent>
			</Card>

			{/* Plan cards */}
			<StaggerList className="grid gap-4 md:grid-cols-2">
				{plans.map((plan) => {
					const isSelected = selectedPlanId === plan.id;
					const isPopular = plan.tier === "PHP_Premium";
					return (
						<StaggerItem key={plan.id}>
							<motion.div
								whileHover={isSelected ? {} : { y: -4 }}
								transition={{ duration: 0.2 }}
							>
								<Card
									role="radio"
									aria-checked={isSelected}
									tabIndex={0}
									onClick={() => setSelectedPlanId(plan.id)}
									onKeyDown={(e) => {
										if (e.key === " " || e.key === "Enter") {
											e.preventDefault();
											setSelectedPlanId(plan.id);
										}
									}}
									className={cn(
										"relative cursor-pointer border-2 h-full transition-shadow p-5",
										isSelected
											? "border-primary bg-primary/5 shadow-lg shadow-primary/5"
											: "border-border hover:shadow-md",
									)}
								>
									{isPopular && (
										<div className="absolute -top-3 left-1/2 -translate-x-1/2">
											<Badge variant="default" className="font-mono text-[9px] uppercase tracking-wider px-3 py-1">
												Most Popular
											</Badge>
										</div>
									)}

									<div className="flex items-start justify-between gap-3 mb-4">
										<div>
											<h3 className="text-lg font-black">{tierLabel(plan.tier)}</h3>
											<p className="text-sm text-muted-foreground">{plan.name}</p>
										</div>
										<div
											className={cn(
												"flex items-center justify-center w-6 h-6 border-2 transition-all shrink-0",
												isSelected
													? "bg-primary border-primary text-primary-foreground"
													: "border-foreground/20 text-transparent",
											)}
										>
											<Check className="h-3 w-3" />
										</div>
									</div>

									<div className="mb-4">
										<motion.p
											key={`${plan.id}-${billingCycle}`}
											initial={{ opacity: 0, y: 5 }}
											animate={{ opacity: 1, y: 0 }}
											className="text-2xl font-black tracking-tight"
										>
											{planPrice(plan)}
										</motion.p>
										<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
											{plan.billingQuote?.mode === "subscription"
												? `${CYCLE_LABELS[billingCycle] ?? "per month"} · subscription`
												: "one-time payment"}
										</p>
									</div>

									{isSelected && (
										<motion.div
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="flex items-center gap-1.5 text-xs font-bold text-primary"
										>
											<CheckCircle2 className="h-3.5 w-3.5" />
											Selected
										</motion.div>
									)}
								</Card>
							</motion.div>
						</StaggerItem>
					);
				})}
			</StaggerList>

			{plans.length === 0 && !loading && (
				<div className="border-2 border-dashed rounded-xl py-10 text-center">
					<p className="text-sm text-muted-foreground">No plans available for this billing cycle.</p>
				</div>
			)}

			{/* Navigation */}
			<div className="flex gap-3">
				<motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="flex-1">
					<Button
						variant="outline"
						onClick={onBack}
						className="w-full h-12 rounded-xl font-bold uppercase tracking-wider border-2"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back
					</Button>
				</motion.div>
				<motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="flex-[2]">
					<Button
						onClick={onNext}
						disabled={!canProceed}
						className="w-full h-12 rounded-xl font-bold uppercase tracking-wider"
					>
						Review & Pay
						<ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				</motion.div>
			</div>
		</motion.div>
	);
}

/* ─── Step 3: Review & Pay ─── */

function StepReviewPay({
	childName,
	birthDate,
	sport,
	injuries,
	performanceGoals,
	selectedPlan,
	billingCycle,
	isSubmitting,
	onCheckout,
	onBack,
}: {
	childName: string;
	birthDate: string;
	sport: string;
	injuries: string;
	performanceGoals: string;
	selectedPlan: BillingPlan | null;
	billingCycle: BillingCycle;
	isSubmitting: boolean;
	onCheckout: () => void;
	onBack: () => void;
}) {
	const formatDate = (dateStr: string) => {
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
	};

	return (
		<motion.div
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.3 }}
			className="space-y-6"
		>
			{/* Child summary */}
			<Card className="border-2">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg font-bold">
						<User className="h-5 w-5 text-primary" />
						Child Information
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div className="rounded-xl border bg-muted/30 p-4">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name</p>
							<p className="mt-1 font-bold">{childName}</p>
						</div>
						<div className="rounded-xl border bg-muted/30 p-4">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date of Birth</p>
							<p className="mt-1 font-bold">{formatDate(birthDate)}</p>
						</div>
					</div>
					{sport && (
						<div className="rounded-xl border bg-muted/30 p-4">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sport</p>
							<p className="mt-1 font-bold">{sport}</p>
						</div>
					)}
					{injuries && (
						<div className="rounded-xl border bg-muted/30 p-4">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Medical Notes</p>
							<p className="mt-1 text-sm">{injuries}</p>
						</div>
					)}
					{performanceGoals && (
						<div className="rounded-xl border bg-muted/30 p-4">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Performance Goals</p>
							<p className="mt-1 text-sm">{performanceGoals}</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Plan summary */}
			{selectedPlan && (
				<Card className="border-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-lg font-bold">
							<CreditCard className="h-5 w-5 text-primary" />
							Selected Plan
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-3">
							<div className="rounded-xl border bg-muted/30 p-4">
								<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plan</p>
								<p className="mt-1 font-bold">{tierLabel(selectedPlan.tier)}</p>
							</div>
							<div className="rounded-xl border bg-muted/30 p-4">
								<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price</p>
								<p className="mt-1 font-bold">{planPrice(selectedPlan)}</p>
								<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
									{CYCLE_LABELS[billingCycle] ?? billingCycle}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Actions */}
			<div className="flex gap-3">
				<motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="flex-1">
					<Button
						variant="outline"
						onClick={onBack}
						disabled={isSubmitting}
						className="w-full h-12 rounded-xl font-bold uppercase tracking-wider border-2"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back
					</Button>
				</motion.div>
				<motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="flex-[2]">
					<Button
						onClick={onCheckout}
						disabled={isSubmitting || !selectedPlan}
						className="w-full h-12 rounded-xl font-bold uppercase tracking-wider"
					>
						{isSubmitting ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<ShieldCheck className="mr-2 h-4 w-4" />
						)}
						{isSubmitting ? "Redirecting to Stripe..." : "Proceed to Payment"}
					</Button>
				</motion.div>
			</div>

			<div className="flex items-center justify-center gap-4 text-muted-foreground">
				<div className="flex items-center gap-1.5">
					<ShieldCheck className="h-4 w-4 text-foreground/40" />
					<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Secure Checkout</span>
				</div>
				<div className="flex items-center gap-1.5">
					<CreditCard className="h-4 w-4 text-foreground/40" />
					<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Powered by Stripe</span>
				</div>
			</div>
		</motion.div>
	);
}
