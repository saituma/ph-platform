import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Calendar, Layers, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { api } from "#/lib/api-client";
import { queryKeys } from "#/lib/query-keys";

export const Route = createFileRoute("/_app/billing")({
	component: BillingPage,
});

type ChildBilling = {
	id: number;
	name: string;
	currentProgramTier: string | null;
	planExpiresAt: string | null;
	plan: {
		id: number;
		name: string;
		tier: string | null;
		displayPrice: string;
		monthlyPrice: string | null;
		yearlyPrice: string | null;
		billingInterval: string;
		features: string[] | null;
	} | null;
};

type GuardianBilling = {
	children: ChildBilling[];
};

function BillingPage() {
	const { data, isLoading } = useQuery<GuardianBilling>({
		queryKey: queryKeys.billing,
		queryFn: () => api.get<GuardianBilling>("/api/portal/guardian/billing-status"),
		staleTime: 1000 * 60 * 5,
	});

	const children = data?.children ?? [];
	const activeChildren = children.filter((c) => c.plan || c.currentProgramTier);
	const inactiveChildren = children.filter((c) => !c.plan && !c.currentProgramTier);
	const hasActivePlan = activeChildren.length > 0;

	return (
		<div className="p-6 max-w-2xl mx-auto space-y-8">
			<div className="space-y-1">
				<p className="label-mono">Account</p>
				<h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Billing</h1>
				<p className="text-muted-foreground text-sm">Your child's current plan and subscription details</p>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{[1, 2].map((i) => (
						<div key={i} className="bento-card p-5 animate-pulse">
							<div className="h-4 bg-muted w-1/3 mb-2" />
							<div className="h-3 bg-muted w-1/4" />
						</div>
					))}
				</div>
			) : !hasActivePlan ? (
				<div className="bento-card p-8 text-center space-y-2">
					<CreditCard size={32} className="mx-auto text-muted-foreground/20 mb-3" />
					<p className="font-black text-foreground uppercase tracking-wide text-sm">No active plan</p>
					<p className="text-xs text-muted-foreground font-mono max-w-xs mx-auto">
						Your child's plan is managed by your coach or admin. Contact them to get started.
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{activeChildren.map((child) => (
						<div key={child.id} className="bento-card p-5 space-y-4">
							{/* Child header */}
							<div className="flex items-center gap-3">
								<div className="w-9 h-9 bg-primary/10 flex items-center justify-center flex-shrink-0">
									<span className="text-primary font-black text-sm">{child.name.charAt(0)}</span>
								</div>
								<div>
									<div className="font-black text-sm uppercase tracking-tight text-foreground">{child.name}</div>
									<span className="label-mono">Active subscription</span>
								</div>
								<span className="ml-auto px-2.5 py-1 bg-primary/5 text-primary border border-primary/20 text-xs font-mono uppercase tracking-wider">
									Active
								</span>
							</div>

							<div className="h-px bg-border" />

							{/* Plan details */}
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1">
									<div className="flex items-center gap-1.5">
										<CreditCard size={11} className="text-muted-foreground/50" />
										<span className="label-mono">Plan</span>
									</div>
									<div className="font-black text-foreground uppercase tracking-tight text-sm">
										{child.plan?.name ?? child.currentProgramTier ?? "—"}
									</div>
								</div>

								<div className="space-y-1">
									<div className="flex items-center gap-1.5">
										<Layers size={11} className="text-muted-foreground/50" />
										<span className="label-mono">Tier</span>
									</div>
									<div className="font-bold text-foreground text-sm">
										{child.currentProgramTier ?? child.plan?.tier ?? "—"}
									</div>
								</div>

								{child.plan && (
									<div className="space-y-1">
										<div className="flex items-center gap-1.5">
											<CreditCard size={11} className="text-muted-foreground/50" />
											<span className="label-mono">Price</span>
										</div>
										<div className="font-mono text-sm text-foreground">
											{child.plan.monthlyPrice ?? child.plan.displayPrice}
											{child.plan.billingInterval ? `/${child.plan.billingInterval}` : ""}
										</div>
									</div>
								)}

								{child.planExpiresAt && (
									<div className="space-y-1">
										<div className="flex items-center gap-1.5">
											<Calendar size={11} className="text-muted-foreground/50" />
											<span className="label-mono">Renews</span>
										</div>
										<div className="font-mono text-sm text-foreground">
											{format(new Date(child.planExpiresAt), "MMM d, yyyy")}
										</div>
									</div>
								)}
							</div>

							{/* Features */}
							{child.plan?.features && child.plan.features.length > 0 && (
								<>
									<div className="h-px bg-border" />
									<div className="space-y-1.5">
										<span className="label-mono">Includes</span>
										<div className="grid grid-cols-2 gap-1">
											{child.plan.features.map((f) => (
												<div key={f} className="flex items-center gap-1.5">
													<CheckCircle size={10} className="text-primary flex-shrink-0" />
													<span className="text-xs text-muted-foreground font-mono">{f}</span>
												</div>
											))}
										</div>
									</div>
								</>
							)}
						</div>
					))}
				</div>
			)}

			{/* Children without a plan */}
			{!isLoading && inactiveChildren.length > 0 && (
				<div className="space-y-2">
					<h2 className="label-mono">No plan assigned</h2>
					{inactiveChildren.map((child) => (
						<div key={child.id} className="bento-card p-4 flex items-center gap-3">
							<div className="w-8 h-8 bg-muted flex items-center justify-center flex-shrink-0">
								<span className="text-muted-foreground font-black text-xs">{child.name.charAt(0)}</span>
							</div>
							<div>
								<div className="text-sm font-bold text-foreground">{child.name}</div>
								<div className="label-mono">Contact your coach to assign a plan</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
