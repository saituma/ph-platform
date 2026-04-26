import {
	ArrowRight,
	CheckCircle,
	Clock,
	EnvelopeOpen,
	ShieldCheck,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { config } from "#/lib/config";

type CheckoutReceiptPayload = {
	kind: "team" | "athlete";
	receiptPublicId: string;
	internalRequestId: number;
	status: string;
	paymentStatus: string | null;
	planBillingCycle: string | null;
	payer: { email: string; name: string | null; role: string } | null;
	team: { id: number; name: string; maxAthletes: number | null } | null;
	athlete: { id: number; name: string | null } | null;
	plan: { id: number; name: string; tier: string } | null;
	stripeCheckout: {
		sessionId: string;
		amountTotalCents: number | null;
		amountSubtotalCents: number | null;
		currency: string | null;
		paymentIntentId: string | null;
		customerEmail: string | null;
		lineItems: Array<{
			description: string | null;
			quantity: number | null;
			unitAmount: number | null;
			currency: string | null;
		}>;
	};
};

function formatMoney(
	cents: number | null | undefined,
	currency: string | null | undefined,
) {
	if (cents == null || !currency) return "—";
	try {
		return new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: currency.toUpperCase(),
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(cents / 100);
	} catch {
		return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
	}
}

export const Route = createFileRoute("/onboarding/success")({
	component: OnboardingSuccess,
});

function OnboardingSuccess() {
	const [receipt, setReceipt] = useState<CheckoutReceiptPayload | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		const sessionId = params.get("session_id")?.trim();
		if (!sessionId) return;

		const token = localStorage.getItem("auth_token");
		if (!token) return;

		// React Strict Mode runs effects twice in dev; avoid duplicate POSTs.
		const storageKey = `ph_billing_confirm:${sessionId}`;
		const prev = sessionStorage.getItem(storageKey);
		if (prev === "ok") return;
		if (prev === "pending") return;
		sessionStorage.setItem(storageKey, "pending");

		const baseUrl = config.api.baseUrl;
		void fetch(`${baseUrl}/api/billing/confirm`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ sessionId }),
		})
			.then(async (res) => {
				const payload = await res.json().catch(() => ({}));
				if (res.ok) {
					sessionStorage.setItem(storageKey, "ok");
					const body = payload as { receipt?: CheckoutReceiptPayload | null };
					if (body.receipt) {
						setReceipt(body.receipt);
						toast.success("Payment recorded", {
							description: `Receipt ID: ${body.receipt.receiptPublicId}. Save this for your records.`,
						});
					} else {
						toast.success("Payment recorded", {
							description:
								"If email is configured on the server, you will get a confirmation message shortly.",
						});
					}
					return;
				}
				sessionStorage.removeItem(storageKey);
				const detail = [payload?.error, payload?.hint]
					.filter(Boolean)
					.join(" ");
				throw new Error(detail || "Could not confirm payment.");
			})
			.catch((err: unknown) => {
				if (sessionStorage.getItem(storageKey) !== "ok") {
					sessionStorage.removeItem(storageKey);
				}
				const message =
					err instanceof Error
						? err.message
						: "Could not confirm payment. Please contact support.";
				toast.error("Payment confirmation", {
					description: message,
				});
			});
	}, []);

	return (
		<main className="mx-auto max-w-2xl px-4 py-10 sm:py-20 sm:px-6 lg:px-8">
			<section className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="flex flex-col items-center text-center space-y-6">
					<div className="relative">
						<div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
						<div className="relative bg-primary/10 p-6 rounded-full border border-primary/20">
							<CheckCircle size={64} weight="fill" className="text-primary" />
						</div>
					</div>

					<div className="space-y-3">
						<h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl uppercase italic leading-none">
							Payment <span className="text-primary">Received</span>
						</h1>
						<p className="text-lg text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
							Thank you for joining the PH Platform. Your elite performance
							journey begins now.
						</p>
					</div>
				</div>

				{receipt ? (
					<Card className="border-primary/30 bg-card/80 p-5 sm:p-8 rounded-3xl ring-1 ring-primary/20 text-left space-y-4">
						<p className="text-xs font-bold uppercase tracking-widest text-primary">
							PH Performance · receipt
						</p>
						<h2 className="text-2xl font-black uppercase italic">
							Your payment details
						</h2>
						<dl className="grid gap-2 text-sm">
							<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
								<dt className="text-muted-foreground">Receipt ID</dt>
								<dd className="font-mono text-xs break-all text-right">
									{receipt.receiptPublicId}
								</dd>
							</div>
							<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
								<dt className="text-muted-foreground">Total paid</dt>
								<dd className="font-semibold text-right">
									{formatMoney(
										receipt.stripeCheckout.amountTotalCents,
										receipt.stripeCheckout.currency,
									)}
								</dd>
							</div>
							<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
								<dt className="text-muted-foreground">Billing</dt>
								<dd className="text-right capitalize">
									{receipt.planBillingCycle?.replace(/_/g, " ") ?? "—"}
								</dd>
							</div>
							{receipt.payer ? (
								<>
									<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
										<dt className="text-muted-foreground">Your role</dt>
										<dd className="text-right capitalize">
											{receipt.payer.role.replace(/_/g, " ")}
										</dd>
									</div>
									<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
										<dt className="text-muted-foreground">Account</dt>
										<dd className="text-right text-xs break-all">
											{receipt.payer.name ?? "—"} · {receipt.payer.email}
										</dd>
									</div>
								</>
							) : null}
							{receipt.team ? (
								<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
									<dt className="text-muted-foreground">Team</dt>
									<dd className="text-right">
										{receipt.team.name} · #{receipt.team.id}
										{receipt.team.maxAthletes != null
											? ` · up to ${receipt.team.maxAthletes} athletes`
											: ""}
									</dd>
								</div>
							) : null}
							{receipt.athlete ? (
								<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
									<dt className="text-muted-foreground">Athlete</dt>
									<dd className="text-right">
										{receipt.athlete.name ?? "Athlete"} · #{receipt.athlete.id}
									</dd>
								</div>
							) : null}
							{receipt.plan ? (
								<div className="flex justify-between gap-4 border-b border-border/60 pb-2">
									<dt className="text-muted-foreground">Plan</dt>
									<dd className="text-right">
										{receipt.plan.name} ({receipt.plan.tier.replace(/_/g, " ")})
									</dd>
								</div>
							) : null}
							<div className="flex justify-between gap-4 pb-2">
								<dt className="text-muted-foreground">Stripe session</dt>
								<dd className="font-mono text-[10px] break-all text-right opacity-80">
									{receipt.stripeCheckout.sessionId}
								</dd>
							</div>
							{receipt.stripeCheckout.paymentIntentId ? (
								<div className="flex justify-between gap-4">
									<dt className="text-muted-foreground">PaymentIntent</dt>
									<dd className="font-mono text-[10px] break-all text-right opacity-80">
										{receipt.stripeCheckout.paymentIntentId}
									</dd>
								</div>
							) : null}
						</dl>
						{receipt.stripeCheckout.lineItems?.length ? (
							<div className="pt-2">
								<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
									Line items
								</p>
								<ul className="text-sm space-y-1 text-muted-foreground">
									{receipt.stripeCheckout.lineItems.map((li) => (
										<li
											key={`${li.description ?? ""}-${li.quantity ?? ""}-${li.unitAmount ?? ""}-${li.currency ?? ""}`}
										>
											{li.description ?? "Item"}
											{li.quantity != null ? ` × ${li.quantity}` : ""}
										</li>
									))}
								</ul>
							</div>
						) : null}
						<p className="text-xs text-muted-foreground pt-2">
							Use this receipt ID with support or in the app (signed in): GET{" "}
							<span className="font-mono">
								/api/billing/receipt/{receipt.receiptPublicId}
							</span>
						</p>
					</Card>
				) : null}

				<Card className="border-border/60 bg-card/50 backdrop-blur-md shadow-2xl p-6 sm:p-10 rounded-[2.5rem] ring-1 ring-border/50 overflow-hidden relative">
					{/* Decorative background accent */}
					<div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />

					<div className="space-y-10 relative z-10">
						<div className="flex items-start gap-6">
							<div className="mt-1 bg-primary/10 p-3 rounded-2xl shrink-0">
								<Clock size={24} weight="bold" className="text-primary" />
							</div>
							<div className="space-y-2">
								<h2 className="text-xl font-black uppercase italic">
									Under Review
								</h2>
								<p className="text-sm text-muted-foreground leading-relaxed font-medium">
									Our coaching team is currently reviewing your request and
									athletic profile to ensure the best possible start to your
									program.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-6">
							<div className="mt-1 bg-primary/10 p-3 rounded-2xl shrink-0">
								<EnvelopeOpen
									size={24}
									weight="bold"
									className="text-primary"
								/>
							</div>
							<div className="space-y-2">
								<h2 className="text-xl font-black uppercase italic">
									Email updates
								</h2>
								<p className="text-sm text-muted-foreground leading-relaxed font-medium">
									When the PH API has outbound email enabled (Resend or SMTP),
									you will get a billing confirmation for this payment, and
									coaches/admins get a review notice. If nothing arrives within
									a few minutes, check spam or ask your administrator to verify{" "}
									<span className="font-mono text-xs">RESEND_API_KEY</span> /
									SMTP settings on the server.
								</p>
							</div>
						</div>

						<div className="flex items-start gap-6">
							<div className="mt-1 bg-primary/10 p-3 rounded-2xl shrink-0">
								<ShieldCheck size={24} weight="bold" className="text-primary" />
							</div>
							<div className="space-y-2">
								<h2 className="text-xl font-black uppercase italic">
									Secure Access
								</h2>
								<p className="text-sm text-muted-foreground leading-relaxed font-medium">
									Once verified, you'll have full access to your personalized
									training protocols, analytics, and coach support.
								</p>
							</div>
						</div>
					</div>
				</Card>

				<div className="flex flex-col items-center space-y-6 pt-4">
					<Link to="/" className="w-full max-w-xs">
						<Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
							Go to Homepage
							<ArrowRight weight="bold" className="ml-2 w-5 h-5" />
						</Button>
					</Link>

					<p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest opacity-60">
						Need help? Contact support@phplatform.com
					</p>
				</div>
			</section>
		</main>
	);
}
