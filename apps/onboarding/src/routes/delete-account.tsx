import { createFileRoute } from "@tanstack/react-router";
import { buildOgMeta } from "../lib/seo";
import { motion } from "framer-motion";
import { Trash2, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { publicApiUrl } from "@/lib/public-api";

export const Route = createFileRoute("/delete-account")({
	head: () => ({
		meta: buildOgMeta({
			title: "Delete Account — PH Performance",
			description: "Request deletion of your PH Performance account and all associated data.",
			url: "https://phperformance.uk/delete-account",
			imageAlt: "Delete Account — PH Performance",
		}),
		links: [{ rel: "canonical", href: "https://phperformance.uk/delete-account" }],
	}),
	component: DeleteAccountPage,
});

const DATA_DELETED = [
	"Your profile, name, and contact details",
	"Health and fitness logs (wellbeing, run data, workout history)",
	"Messages and media you have sent or received",
	"Progress photos and training videos",
	"Programme history and session completions",
	"Device tokens and push notification preferences",
];

const DATA_RETAINED = [
	"Anonymised aggregate statistics (no personal identifiers)",
	"Financial records required by law (billing receipts, up to 7 years)",
];

function DeleteAccountPage() {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			toast.error("Please enter a valid email address.");
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(publicApiUrl("/api/auth/request-deletion"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});
			if (!res.ok) throw new Error("Request failed");
			setSubmitted(true);
		} catch {
			toast.error("Something went wrong. Please try again or contact support.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="min-h-dvh bg-background text-foreground">
			<section className="pt-12 pb-6 max-w-3xl mx-auto px-5 sm:px-8">
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-destructive mb-4">
						Account Management
					</p>
					<h1 className="landing-section-heading text-foreground mb-4">
						Delete your <span className="text-destructive">account</span>
					</h1>
					<p className="text-[14px] text-muted-foreground leading-[1.7] max-w-xl">
						Submitting this form will send a confirmation email to your registered address with
						instructions to complete the deletion. This action is permanent and cannot be undone.
					</p>
				</motion.div>
			</section>

			<section className="max-w-3xl mx-auto px-5 sm:px-8 pb-6">
				<div className="grid gap-4 sm:grid-cols-2">
					<motion.div
						initial={{ opacity: 0, y: 12 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4 }}
						className="border border-destructive/20 bg-destructive/5 p-6"
					>
						<div className="flex items-center gap-2 mb-4">
							<Trash2 size={16} className="text-destructive" strokeWidth={2} />
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-destructive">
								Data deleted
							</p>
						</div>
						<ul className="space-y-2">
							{DATA_DELETED.map((item) => (
								<li key={item} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-[1.6]">
									<span className="mt-[3px] text-destructive/60">—</span>
									{item}
								</li>
							))}
						</ul>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 12 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: 0.08 }}
						className="border border-border bg-muted/30 p-6"
					>
						<div className="flex items-center gap-2 mb-4">
							<ShieldAlert size={16} className="text-muted-foreground" strokeWidth={2} />
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
								Data retained
							</p>
						</div>
						<ul className="space-y-2">
							{DATA_RETAINED.map((item) => (
								<li key={item} className="flex items-start gap-2 text-[12px] text-muted-foreground leading-[1.6]">
									<span className="mt-[3px]">—</span>
									{item}
								</li>
							))}
						</ul>
					</motion.div>
				</div>
			</section>

			<section className="max-w-3xl mx-auto px-5 sm:px-8 pb-20">
				{submitted ? (
					<motion.div
						initial={{ opacity: 0, scale: 0.97 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.4 }}
						className="border border-border p-10 flex flex-col items-center text-center gap-4"
					>
						<CheckCircle2 size={40} className="text-primary" strokeWidth={1.5} />
						<h2 className="text-xl font-black uppercase italic tracking-tight">Request received</h2>
						<p className="text-[13px] text-muted-foreground max-w-sm leading-[1.7]">
							If an account is associated with that email address, we have sent instructions to
							complete the deletion. Check your inbox — the email may take a few minutes to arrive.
						</p>
						<p className="text-[11px] text-muted-foreground/60">
							No email? Contact{" "}
							<a href="mailto:info@phperformance.co.uk" className="underline hover:text-foreground transition-colors">
								info@phperformance.co.uk
							</a>
						</p>
					</motion.div>
				) : (
					<motion.form
						initial={{ opacity: 0, y: 16 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
						onSubmit={handleSubmit}
						className="border border-border p-8 lg:p-10 space-y-6"
					>
						<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
							Request deletion
						</p>

						<div>
							<label htmlFor="deletion-email" className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
								Email address *
							</label>
							<input
								type="email"
								id="deletion-email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full bg-card border border-border rounded-none px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-destructive focus:outline-none transition-colors"
								placeholder="The email address on your PH Performance account"
								autoComplete="email"
								required
							/>
						</div>

						<p className="text-[12px] text-muted-foreground/70 leading-[1.6]">
							We will send a confirmation email to this address. You must follow the link in that
							email to complete deletion. If you no longer have access to this email, contact{" "}
							<a href="mailto:info@phperformance.co.uk" className="underline hover:text-foreground transition-colors">
								info@phperformance.co.uk
							</a>
							.
						</p>

						<button
							type="submit"
							disabled={loading || !email}
							className="inline-flex items-center gap-2.5 px-7 py-[13px] bg-destructive text-destructive-foreground text-[11px] font-bold uppercase tracking-[0.14em] hover:opacity-90 transition-opacity disabled:opacity-50"
						>
							{loading ? (
								<Loader2 size={13} className="animate-spin" />
							) : (
								<Trash2 size={13} strokeWidth={2.5} />
							)}
							{loading ? "SENDING..." : "SEND DELETION REQUEST"}
						</button>
					</motion.form>
				)}
			</section>
		</main>
	);
}
