import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/invoice/$receiptId")({
	component: InvoicePage,
});

type StripeLineItem = {
	description: string | null;
	quantity: number | null;
	unitAmount: number | null;
	currency: string | null;
};

type StripeSummary = {
	amountTotalCents: number | null;
	amountSubtotalCents: number | null;
	currency: string | null;
	lineItems: StripeLineItem[];
} | null;

type Invoice = {
	kind: "athlete" | "team";
	invoiceNumber: number;
	receiptPublicId: string;
	status: string;
	paymentStatus: string | null;
	planBillingCycle: string | null;
	paymentAmountCents: number | null;
	paymentCurrency: string | null;
	createdAt: string;
	payerName: string | null;
	payerEmail: string;
	entityName: string | null;
	planName: string | null;
	planTier: string | null;
	stripeSummary: StripeSummary;
};

const GREEN = "#39d353";
const BLACK = "#000000";
const WHITE = "#ffffff";
const GRAY = "#a1a1aa";
const DARK_GRAY = "#18181b";

function formatCurrency(cents: number, currency: string) {
	return new Intl.NumberFormat("en-GB", {
		style: "currency",
		currency: currency.toUpperCase(),
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(cents / 100);
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function billingCycleLabel(cycle: string | null) {
	if (!cycle) return null;
	return (
		{ weekly: "Weekly", monthly: "Monthly", six_months: "6 months", yearly: "Yearly" }[cycle] ??
		cycle.replace(/_/g, " ")
	);
}

function tierLabel(tier: string | null) {
	if (!tier) return null;
	return (
		{
			PHP: "PHP Program",
			PHP_Premium: "PHP Premium",
			PHP_Premium_Plus: "PHP Plus",
			PHP_Pro: "PHP Pro",
		}[tier] ?? tier.replace(/_/g, " ")
	);
}

function PHLogo() {
	return (
		<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
			<rect width="40" height="40" rx="8" fill={GREEN} />
			<text
				x="20"
				y="28"
				textAnchor="middle"
				fill={BLACK}
				fontSize="18"
				fontWeight="900"
				fontFamily="system-ui, sans-serif"
			>
				PH
			</text>
		</svg>
	);
}

function LoadingState() {
	return (
		<div
			style={{
				minHeight: "100vh",
				background: BLACK,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<div
				style={{
					width: 40,
					height: 40,
					borderRadius: "50%",
					border: `3px solid ${DARK_GRAY}`,
					borderTopColor: GREEN,
					animation: "spin 0.8s linear infinite",
				}}
			/>
			<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
		</div>
	);
}

function ErrorState({ message }: { message: string }) {
	return (
		<div
			style={{
				minHeight: "100vh",
				background: BLACK,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: 12,
				padding: 24,
			}}
		>
			<span style={{ fontSize: 48 }}>⚠️</span>
			<p style={{ color: WHITE, fontSize: 18, fontWeight: 700, margin: 0 }}>Invoice not found</p>
			<p style={{ color: GRAY, fontSize: 14, margin: 0, textAlign: "center" }}>{message}</p>
		</div>
	);
}

export default function InvoicePage() {
	const { receiptId } = Route.useParams();
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetch(`/api/public/invoice/${receiptId}`)
			.then(async (res) => {
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error((body as any).error || `Error ${res.status}`);
				}
				return res.json() as Promise<{ invoice: Invoice }>;
			})
			.then((data) => setInvoice(data.invoice))
			.catch((err) => setError(err instanceof Error ? err.message : "Failed to load invoice"))
			.finally(() => setLoading(false));
	}, [receiptId]);

	if (loading) return <LoadingState />;
	if (error || !invoice) return <ErrorState message={error ?? "Invoice not found"} />;

	const s = invoice.stripeSummary;
	const currency = s?.currency ?? invoice.paymentCurrency ?? "gbp";
	const totalCents = s?.amountTotalCents ?? invoice.paymentAmountCents;
	const subtotalCents = s?.amountSubtotalCents ?? null;
	const taxCents =
		subtotalCents != null && totalCents != null && subtotalCents !== totalCents
			? totalCents - subtotalCents
			: null;

	const lineItems: StripeLineItem[] =
		s?.lineItems && s.lineItems.length > 0
			? s.lineItems
			: invoice.planName
				? [
						{
							description:
								invoice.planName +
								(tierLabel(invoice.planTier) ? ` · ${tierLabel(invoice.planTier)}` : "") +
								(billingCycleLabel(invoice.planBillingCycle)
									? ` (${billingCycleLabel(invoice.planBillingCycle)})`
									: ""),
							quantity: 1,
							unitAmount: invoice.paymentAmountCents,
							currency,
						},
					]
				: [];

	const isPaid =
		invoice.paymentStatus === "paid" ||
		invoice.status === "approved" ||
		invoice.status === "pending_approval";

	return (
		<div
			style={{
				minHeight: "100vh",
				background: BLACK,
				fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
				padding: "40px 16px 80px",
				color: WHITE,
			}}
		>
			<div style={{ maxWidth: 720, margin: "0 auto" }}>
				{/* Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						marginBottom: 48,
						flexWrap: "wrap",
						gap: 16,
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
						<h1
							style={{
								margin: 0,
								fontSize: "clamp(48px, 8vw, 72px)",
								fontWeight: 900,
								lineHeight: 1,
								letterSpacing: "-3px",
								color: WHITE,
							}}
						>
							Invoice
						</h1>
						<span
							style={{
								background: GREEN,
								color: BLACK,
								fontWeight: 900,
								fontSize: "clamp(14px, 3vw, 18px)",
								padding: "6px 14px",
								borderRadius: 6,
								letterSpacing: "-0.5px",
								alignSelf: "flex-start",
								marginTop: 8,
							}}
						>
							#{invoice.invoiceNumber}
						</span>
					</div>
					<div style={{ textAlign: "right", color: GRAY, fontSize: 14, lineHeight: 1.8 }}>
						<div>
							<span style={{ color: GRAY }}>Issued: </span>
							<span style={{ color: WHITE, fontWeight: 600 }}>{formatDate(invoice.createdAt)}</span>
						</div>
						<div>
							<span style={{ color: GRAY }}>Status: </span>
							<span
								style={{
									color: isPaid ? GREEN : "#f59e0b",
									fontWeight: 700,
									textTransform: "capitalize",
								}}
							>
								{isPaid ? "Paid" : invoice.status.replace(/_/g, " ")}
							</span>
						</div>
					</div>
				</div>

				{/* Billed To + Brand */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						marginBottom: 48,
						flexWrap: "wrap",
						gap: 24,
					}}
				>
					<div>
						<p
							style={{
								margin: "0 0 8px",
								fontSize: 12,
								fontWeight: 700,
								textTransform: "uppercase",
								letterSpacing: "0.12em",
								color: GRAY,
							}}
						>
							Billed To
						</p>
						<p
							style={{
								margin: "0 0 4px",
								fontSize: 18,
								fontWeight: 700,
								color: WHITE,
							}}
						>
							{invoice.payerName ?? invoice.payerEmail}
						</p>
						{invoice.payerName && (
							<p style={{ margin: "0 0 4px", fontSize: 14, color: GRAY }}>{invoice.payerEmail}</p>
						)}
						{invoice.entityName && invoice.entityName !== invoice.payerName && (
							<p style={{ margin: 0, fontSize: 14, color: GRAY }}>
								{invoice.kind === "team" ? "Team: " : "Athlete: "}
								{invoice.entityName}
							</p>
						)}
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
						<PHLogo />
						<div>
							<p
								style={{
									margin: 0,
									fontSize: "clamp(24px, 5vw, 36px)",
									fontWeight: 900,
									letterSpacing: "-1.5px",
									lineHeight: 1.1,
									color: WHITE,
								}}
							>
								PH
							</p>
							<p
								style={{
									margin: 0,
									fontSize: "clamp(24px, 5vw, 36px)",
									fontWeight: 900,
									letterSpacing: "-1.5px",
									lineHeight: 1.1,
									color: WHITE,
								}}
							>
								Performance
							</p>
						</div>
					</div>
				</div>

				{/* Line items table */}
				<div
					style={{
						borderRadius: 8,
						overflow: "hidden",
						marginBottom: 32,
					}}
				>
					{/* Table header */}
					<div
						style={{
							background: GREEN,
							display: "grid",
							gridTemplateColumns: "1fr auto auto auto",
							gap: "0 24px",
							padding: "14px 20px",
						}}
					>
						{["Description", "Price", "Qty", "Subtotal"].map((h, i) => (
							<span
								key={h}
								style={{
									color: BLACK,
									fontWeight: 900,
									fontSize: 13,
									textAlign: i > 0 ? "right" : "left",
								}}
							>
								{h}
							</span>
						))}
					</div>

					{/* Rows */}
					{lineItems.map((item, i) => {
						const rowSubtotal =
							item.unitAmount != null && item.quantity != null
								? item.unitAmount * item.quantity
								: item.unitAmount;
						const itemCur = item.currency ?? currency;
						return (
							<div
								key={i}
								style={{
									display: "grid",
									gridTemplateColumns: "1fr auto auto auto",
									gap: "0 24px",
									padding: "16px 20px",
									borderBottom: `1px solid ${DARK_GRAY}`,
									background: BLACK,
								}}
							>
								<span style={{ color: WHITE, fontSize: 14 }}>
									{item.description ?? `Item ${i + 1}`}
								</span>
								<span style={{ color: WHITE, fontSize: 14, textAlign: "right", whiteSpace: "nowrap" }}>
									{item.unitAmount != null ? formatCurrency(item.unitAmount, itemCur) : "—"}
								</span>
								<span style={{ color: WHITE, fontSize: 14, textAlign: "right" }}>
									{item.quantity ?? 1}
								</span>
								<span style={{ color: WHITE, fontSize: 14, textAlign: "right", whiteSpace: "nowrap" }}>
									{rowSubtotal != null ? formatCurrency(rowSubtotal, itemCur) : "—"}
								</span>
							</div>
						);
					})}
				</div>

				{/* Totals */}
				<div style={{ maxWidth: 360, marginLeft: "auto" }}>
					{subtotalCents != null && subtotalCents !== totalCents && (
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								padding: "12px 20px",
								color: GRAY,
								fontSize: 15,
							}}
						>
							<span style={{ fontWeight: 700 }}>Subtotal</span>
							<span>{formatCurrency(subtotalCents, currency)}</span>
						</div>
					)}
					{taxCents != null && (
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								padding: "12px 20px",
								color: GRAY,
								fontSize: 15,
							}}
						>
							<span style={{ fontWeight: 700 }}>Tax</span>
							<span>{formatCurrency(taxCents, currency)}</span>
						</div>
					)}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							padding: "16px 20px",
							background: GREEN,
							borderRadius: 6,
							marginTop: 4,
						}}
					>
						<span style={{ color: BLACK, fontWeight: 900, fontSize: 16 }}>Total</span>
						<span style={{ color: BLACK, fontWeight: 900, fontSize: 16 }}>
							{totalCents != null ? formatCurrency(totalCents, currency) : "—"}
						</span>
					</div>
				</div>

				{/* Footer */}
				<div
					style={{
						marginTop: 64,
						borderTop: `1px solid ${DARK_GRAY}`,
						paddingTop: 24,
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						flexWrap: "wrap",
						gap: 12,
					}}
				>
					<p style={{ margin: 0, color: GRAY, fontSize: 12 }}>
						Receipt ID: <span style={{ color: WHITE, fontFamily: "monospace" }}>{invoice.receiptPublicId}</span>
					</p>
					<p style={{ margin: 0, color: GRAY, fontSize: 12 }}>
						© {new Date().getFullYear()} PH Performance · Professional coaching & training
					</p>
				</div>
			</div>
		</div>
	);
}
