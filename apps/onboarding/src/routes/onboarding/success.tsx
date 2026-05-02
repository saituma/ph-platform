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
import { getTokenStatus } from "#/lib/client-storage";

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
	head: () => ({
		meta: [
			{ title: "Welcome to PH Performance" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: OnboardingSuccess,
});

function OnboardingSuccess() {
	const [receipt, setReceipt] = useState<CheckoutReceiptPayload | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const params = new URLSearchParams(window.location.search);
		const sessionId = params.get("session_id")?.trim();
		if (!sessionId) return;

		// React Strict Mode runs effects twice in dev; avoid duplicate POSTs.
		const storageKey = `ph_billing_confirm:${sessionId}`;
		const prev = sessionStorage.getItem(storageKey);
		if (prev === "ok") return;
		if (prev === "pending") return;
		sessionStorage.setItem(storageKey, "pending");

		const baseUrl = config.api.baseUrl;
		// Check auth status then choose endpoint
		void getTokenStatus().then((status) => {
			const url = status.authenticated ? `${baseUrl}/api/billing/confirm` : `${baseUrl}/api/public/billing/confirm`;
			return fetch(url, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ sessionId }),
			});
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
						<div className="relative bg-foreground/10 p-6 border border-foreground/[0.06]">
							<CheckCircle size={64} weight="fill" className="text-foreground/60" />
						</div>
					</div>

					<div className="space-y-3">
						<h1 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground leading-none">
							Payment Received
						</h1>
						<p className="text-lg text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
							Thank you for joining the PH Platform. Your elite performance
							journey begins now.
						</p>
					</div>
				</div>

				{receipt ? (
					<Card className="border border-foreground/[0.06] p-5 sm:p-8 text-left space-y-4">
						<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
							PH Performance · receipt
						</p>
						<h2 className="text-lg font-medium tracking-tight">
							Your payment details
						</h2>
						<dl className="grid gap-2 text-sm">
							<div className="flex justify-between gap-4 border-b border-foreground/[0.06] pb-2">
								<dt className="text-muted-foreground">Receipt ID</dt>
								<dd className="font-mono text-xs break-all text-right">
									{receipt.receiptPublicId}
								</dd>
							</div>
							<div className="flex justify-between gap-4 border-b border-foreground/[0.06] pb-2">
								<dt className="text-muted-foreground">Total paid</dt>
								<dd className="font-semibold text-right">
									{formatMoney(
										receipt.stripeCheckout.amountTotalCents,
										receipt.stripeCheckout.currency,
									)}
								</dd>
							</div>
							<div className="flex justify-between gap-4 border-b border-foreground/[0.06] pb-2">
								<dt className="text-muted-foreground">Billing</dt>
								<dd className="text-right capitalize">
									{receipt.planBillingCycle?.replace(/_/g, " ") ?? "—"}
								</dd>
							</div>
							{receipt.payer ? (
								<>
									<div className="flex justify-between gap-4 border-b border-foreground/[0.06] pb-2">
										<dt className="text-muted-foreground">Your role</dt>
										<dd className="text-right capitalize">
											{receipt.payer.role.replace(/_/g, " ")}
										</dd>
									</div>
									<div className="flex justify-between gap-4 border-b border-foreground/[0.06] pb-2">
										<dt className="text-muted-foreground">Account</dt>
										<dd className="text-right text-xs break-all">
											{receipt.payer.name ?? "—"} · {receipt.payer.email}
										</dd>
									</div>
								</>
							) : null}
							{receipt.team ? (
								<div className="flex justify-between gap-4 border-b border-foreground/[0.06] pb-2">
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
								<div className="flex justify-between gap-4 border-b border-foreground/[0.06] pb-2">
									<dt className="text-muted-foreground">Athlete</dt>
									<dd className="text-right">
										{receipt.athlete.name ?? "Athlete"} · #{receipt.athlete.id}
									</dd>
								</div>
							) : null}
							{receipt.plan ? (
								<div className="flex justify-between gap-4 border-b border-foreground/[0.06] pb-2">
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
								<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 mb-2">
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

				<Card className="border border-foreground/[0.06] p-6 sm:p-10 overflow-hidden relative">
					<div className="space-y-10 relative z-10">
						<div className="flex items-start gap-6">
							<div className="mt-1 shrink-0 text-foreground/40">
								<Clock size={24} weight="bold" />
							</div>
							<div className="space-y-2">
								<h2 className="text-sm font-medium tracking-tight">
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
							<div className="mt-1 shrink-0 text-foreground/40">
								<EnvelopeOpen
									size={24}
									weight="bold"
								/>
							</div>
							<div className="space-y-2">
								<h2 className="text-sm font-medium tracking-tight">
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
							<div className="mt-1 shrink-0 text-foreground/40">
								<ShieldCheck size={24} weight="bold" />
							</div>
							<div className="space-y-2">
								<h2 className="text-sm font-medium tracking-tight">
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
						<Button className="w-full h-10 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider transition-all hover:opacity-90 active:scale-[0.98]">
							Go to Homepage
							<ArrowRight weight="bold" className="ml-2 w-5 h-5" />
						</Button>
					</Link>

					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 text-center">
						Need help? Contact support@phplatform.com
					</p>
				</div>
			</section>
		</main>
	);
}
