import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, CheckCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { api } from "#/lib/api-client";
import { queryKeys } from "#/lib/query-keys";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_app/billing")({
	component: BillingPage,
});

type BillingStatus = {
	plan?: { id: string; name: string; price: number; interval: string } | null;
	status: "active" | "past_due" | "cancelled" | "trialing" | null;
	currentPeriodEnd?: string | null;
	cancelAtPeriodEnd?: boolean;
};

type Invoice = {
	id: string;
	amount: number;
	currency: string;
	status: "paid" | "open" | "void" | "uncollectible";
	createdAt: string;
	invoiceUrl?: string | null;
};

type Plans = {
	plans: Array<{ id: string; name: string; price: number; interval: string; features: string[] }>;
};

function BillingPage() {
	const { data: billing, isLoading: billingLoading } = useQuery<BillingStatus>({
		queryKey: queryKeys.billing,
		queryFn: () => api.get<BillingStatus>("/api/billing/status"),
	});

	const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{ invoices: Invoice[] }>({
		queryKey: queryKeys.billingInvoices,
		queryFn: () => api.get<{ invoices: Invoice[] }>("/api/billing/invoices"),
	});

	const { data: plansData } = useQuery<Plans>({
		queryKey: queryKeys.billingPlans,
		queryFn: () => api.get<Plans>("/api/billing/plans"),
	});

	const statusConfig = {
		active:    { label: "Active",    icon: CheckCircle,  cls: "text-primary border-primary/30 bg-primary/5" },
		trialing:  { label: "Trial",     icon: Clock,        cls: "text-blue-600 border-blue-200 bg-blue-50" },
		past_due:  { label: "Past due",  icon: AlertCircle,  cls: "text-amber-600 border-amber-200 bg-amber-50" },
		cancelled: { label: "Cancelled", icon: AlertCircle,  cls: "text-red-600 border-red-200 bg-red-50" },
	};

	const currentStatus = billing?.status ? statusConfig[billing.status] : null;

	const handleCheckout = async (planId: string) => {
		try {
			const res = await api.post<{ url: string }>("/api/billing/checkout", { planId });
			if (res.url) window.location.href = res.url;
		} catch {
			// handled upstream
		}
	};

	return (
		<div className="p-6 max-w-2xl mx-auto space-y-8">
			<div className="space-y-1">
				<p className="label-mono">Account</p>
				<h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Billing</h1>
				<p className="text-muted-foreground text-sm">Manage your subscription and payment history</p>
			</div>

			{/* Current plan */}
			<div className="bento-card p-5">
				<div className="flex items-center justify-between mb-4">
					<h2 className="label-mono">Current Plan</h2>
					<CreditCard size={15} className="text-muted-foreground" />
				</div>

				{billingLoading ? (
					<div className="animate-pulse space-y-2">
						<div className="h-5 bg-muted w-1/3" />
						<div className="h-4 bg-muted w-1/4" />
					</div>
				) : billing?.plan ? (
					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<div>
								<div className="font-black text-foreground uppercase tracking-wide">{billing.plan.name}</div>
								<div className="text-sm text-muted-foreground font-mono">
									£{(billing.plan.price / 100).toFixed(2)}/{billing.plan.interval}
								</div>
							</div>
							{currentStatus && (
								<span className={cn(
									"ml-auto px-2.5 py-1 border text-xs font-mono uppercase tracking-wider flex items-center gap-1.5",
									currentStatus.cls,
								)}>
									<currentStatus.icon size={11} />
									{currentStatus.label}
								</span>
							)}
						</div>
						{billing.currentPeriodEnd && (
							<p className="text-xs text-muted-foreground font-mono">
								{billing.cancelAtPeriodEnd ? "Cancels" : "Renews"} on{" "}
								{format(new Date(billing.currentPeriodEnd), "MMMM d, yyyy")}
							</p>
						)}
					</div>
				) : (
					<div className="text-sm text-muted-foreground font-mono">No active plan</div>
				)}
			</div>

			{/* Available plans */}
			{plansData?.plans && plansData.plans.length > 0 && (
				<div className="space-y-3">
					<h2 className="label-mono">Available Plans</h2>
					<div className="grid gap-3 sm:grid-cols-2">
						{plansData.plans.map((plan) => {
							const isCurrent = billing?.plan?.id === plan.id;
							return (
								<div
									key={plan.id}
									className={cn(
										"bento-card p-4",
										isCurrent && "border-primary",
									)}
								>
									<div className="flex items-start justify-between gap-2 mb-3">
										<div>
											<div className="font-black text-sm text-foreground uppercase tracking-wide">{plan.name}</div>
											<div className="text-xs text-muted-foreground font-mono">
												£{(plan.price / 100).toFixed(2)}/{plan.interval}
											</div>
										</div>
										{isCurrent && (
											<span className="px-2 py-0.5 text-xs font-mono bg-primary/5 text-primary border border-primary/20">
												Current
											</span>
										)}
									</div>
									{plan.features?.length > 0 && (
										<ul className="space-y-1 mb-3">
											{plan.features.slice(0, 3).map((f) => (
												<li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
													<CheckCircle size={10} className="text-primary flex-shrink-0" />
													{f}
												</li>
											))}
										</ul>
									)}
									{!isCurrent && (
										<button
											type="button"
											onClick={() => handleCheckout(plan.id)}
											className="w-full py-2 px-3 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
										>
											Subscribe
										</button>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Payment history */}
			<div className="space-y-3">
				<h2 className="label-mono">Payment History</h2>
				{invoicesLoading ? (
					<div className="space-y-2">
						{[1, 2].map((i) => <div key={i} className="h-14 bg-muted animate-pulse" />)}
					</div>
				) : invoicesData?.invoices?.length ? (
					<div className="divide-y divide-border border border-border overflow-hidden">
						{invoicesData.invoices.map((invoice) => (
							<div key={invoice.id} className="flex items-center gap-3 px-4 py-3 bg-card">
								<div className="flex-1 min-w-0">
									<div className="text-sm font-bold text-foreground">
										{invoice.currency.toUpperCase()} {(invoice.amount / 100).toFixed(2)}
									</div>
									<div className="text-xs text-muted-foreground font-mono">
										{format(new Date(invoice.createdAt), "MMM d, yyyy")}
									</div>
								</div>
								<span className={cn(
									"px-2 py-0.5 text-xs font-mono border",
									invoice.status === "paid"
										? "bg-primary/5 text-primary border-primary/20"
										: "bg-amber-50 text-amber-700 border-amber-200",
								)}>
									{invoice.status}
								</span>
								{invoice.invoiceUrl && (
									<a
										href={invoice.invoiceUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-muted-foreground hover:text-foreground transition-colors"
									>
										<ExternalLink size={13} />
									</a>
								)}
							</div>
						))}
					</div>
				) : (
					<div className="bento-card p-6 text-center">
						<p className="text-sm text-muted-foreground font-mono">No payment history yet</p>
					</div>
				)}
			</div>
		</div>
	);
}
