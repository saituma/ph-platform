import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { config } from "../lib/config";
import { buildOgMeta } from "../lib/seo";

export const Route = createFileRoute("/waitlist")({
	head: () => ({
		meta: buildOgMeta({
			title: "Join the Waitlist — PH Performance",
			description:
				"Be first in line for the PH Performance app. Track programmes, log nutrition, monitor GPS running data, book sessions, and review progress — all in one place.",
			url: "https://phperformance.uk/waitlist",
			imageAlt: "Join the PH Performance App Waitlist",
		}),
		links: [{ rel: "canonical", href: "https://phperformance.uk/waitlist" }],
	}),
	component: WaitlistPage,
});

function WaitlistPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [loading, setLoading] = useState(false);
	const [done, setDone] = useState(false);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !email.trim()) return;
		setLoading(true);
		try {
			const res = await fetch(`${config.api.baseUrl}/api/waitlist`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					phone: phone.trim() || undefined,
				}),
			});
			if (!res.ok) throw new Error("Failed to join waitlist");
			setDone(true);
		} catch {
			toast.error("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-dvh flex flex-col bg-[#0a0a0a] text-white">
			<Header />

			<main className="flex-1 flex items-center justify-center px-4 py-16">
				<div className="w-full max-w-[480px]">
					{done ? (
						<motion.div
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3 }}
							className="text-center"
						>
							<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#8aff00]/10">
								<Check size={28} className="text-[#8aff00]" />
							</div>
							<h1 className="text-2xl font-bold text-white mb-2">You're on the list!</h1>
							<p className="text-white/50 text-sm leading-relaxed mb-8">
								We'll reach out to <span className="text-white/80">{email}</span> when your access is ready.
							</p>
							<Link
								to="/"
								className="inline-flex items-center gap-2 text-[#8aff00] text-xs font-bold uppercase tracking-widest hover:opacity-80 transition"
							>
								<ArrowLeft size={14} />
								Back to home
							</Link>
						</motion.div>
					) : (
						<motion.div
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3 }}
						>
							<p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8aff00] mb-3">
								PH Performance App
							</p>
							<h1 className="text-3xl font-bold text-white mb-2">Join the Waiting List</h1>
							<p className="text-white/40 text-sm leading-relaxed mb-8">
								Track programmes, log nutrition, monitor GPS running data, book sessions, and review your progress — all in one place. Be first to know when it launches.
							</p>

							<form onSubmit={submit} className="space-y-4">
								<div>
									<label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5">
										Full Name <span className="text-[#8aff00]">*</span>
									</label>
									<input
										type="text"
										required
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Your name"
										className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#8aff00]/50 transition"
									/>
								</div>

								<div>
									<label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5">
										Email Address <span className="text-[#8aff00]">*</span>
									</label>
									<input
										type="email"
										required
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="you@example.com"
										className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#8aff00]/50 transition"
									/>
								</div>

								<div>
									<label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5">
										Phone Number{" "}
										<span className="text-white/20 normal-case tracking-normal font-normal">(optional)</span>
									</label>
									<input
										type="tel"
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										placeholder="+44 7700 000000"
										className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#8aff00]/50 transition"
									/>
								</div>

								<button
									type="submit"
									disabled={loading || !name.trim() || !email.trim()}
									className="w-full mt-2 flex items-center justify-center gap-2 bg-[#8aff00] text-black text-[11px] font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[#7aef00] transition disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading ? <Loader2 size={14} className="animate-spin" /> : null}
									{loading ? "Joining…" : "Join Waiting List"}
								</button>
							</form>

							<p className="mt-6 text-center text-[11px] text-white/20">
								Already have an account?{" "}
								<Link to="/login" className="text-white/40 hover:text-white transition underline underline-offset-2">
									Sign in
								</Link>
							</p>
						</motion.div>
					)}
				</div>
			</main>

			<Footer />
		</div>
	);
}
