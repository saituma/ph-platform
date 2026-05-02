import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Instagram, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
	head: () => ({
		meta: [
			{ title: "Contact — PH Performance" },
			{
				name: "description",
				content:
					"Get in touch with PH Performance. Enquiries about coaching, team programmes, partnerships, and more.",
			},
			{ property: "og:title", content: "Contact — PH Performance" },
			{
				property: "og:description",
				content:
					"Reach out to the PH Performance team for coaching enquiries, team programmes, or general questions.",
			},
		],
	}),
	component: ContactPage,
});

const CONTACT_INFO = [
	{
		icon: Mail,
		label: "Email",
		value: "info@phperformance.co.uk",
		href: "mailto:info@phperformance.co.uk",
	},
	{
		icon: Phone,
		label: "Phone",
		value: "+44 7000 000000",
		href: "tel:+447000000000",
	},
	{
		icon: MapPin,
		label: "Location",
		value: "United Kingdom",
		href: null,
	},
	{
		icon: Instagram,
		label: "Instagram",
		value: "@phperformance",
		href: "https://instagram.com/phperformance",
	},
];

function ContactPage() {
	const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
	const [sending, setSending] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name || !form.email || !form.message) {
			toast.error("Please fill in all required fields.");
			return;
		}
		setSending(true);
		await new Promise((r) => setTimeout(r, 1200));
		toast.success("Message sent! We'll get back to you soon.");
		setForm({ name: "", email: "", subject: "", message: "" });
		setSending(false);
	};

	return (
		<main className="min-h-dvh bg-background text-foreground">
			{/* Hero */}
			<section className="pt-8 pb-8 max-w-6xl mx-auto px-5 sm:px-8 lg:px-10">
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="max-w-2xl"
				>
					<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary mb-4">
						Contact Us
					</p>
					<h1 className="landing-section-heading text-foreground mb-4">
						Let's <span className="text-primary">talk</span>
					</h1>
					<p className="text-[14px] text-muted-foreground leading-[1.7] max-w-lg">
						Whether you're an athlete looking for coaching, a team needing a
						performance programme, or a partner — we'd love to hear from you.
					</p>
				</motion.div>
			</section>

			{/* Contact info strip */}
			<section className="border-y border-border">
				<div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10">
					<div className="grid grid-cols-2 lg:grid-cols-4">
						{CONTACT_INFO.map((item, i) => (
							<motion.div
								key={item.label}
								initial={{ opacity: 0, y: 12 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.4, delay: i * 0.08 }}
								className={`flex flex-col items-center gap-2 py-6 text-center ${
									i < CONTACT_INFO.length - 1 ? "border-r border-border" : ""
								}`}
							>
								<item.icon size={20} className="text-primary/60" strokeWidth={1.5} />
								<span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
									{item.label}
								</span>
								{item.href ? (
									<a
										href={item.href}
										target={item.href.startsWith("http") ? "_blank" : undefined}
										rel={item.href.startsWith("http") ? "noreferrer" : undefined}
										className="text-[12px] text-foreground/70 hover:text-primary transition-colors"
									>
										{item.value}
									</a>
								) : (
									<span className="text-[12px] text-foreground/70">{item.value}</span>
								)}
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Contact form */}
			<section className="py-16 max-w-3xl mx-auto px-5 sm:px-8 lg:px-10">
				<motion.form
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					onSubmit={handleSubmit}
					className="border border-border p-8 lg:p-10 space-y-6"
				>
					<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary mb-2">
						Send a Message
					</p>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
						<div>
							<label htmlFor="contact-name" className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
								Name *
							</label>
							<input
								type="text"
								id="contact-name"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								className="w-full bg-card border border-border rounded-none px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-colors"
								placeholder="Your name"
							/>
						</div>
						<div>
							<label htmlFor="contact-email" className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
								Email *
							</label>
							<input
								type="email"
								id="contact-email"
								value={form.email}
								onChange={(e) => setForm({ ...form, email: e.target.value })}
								className="w-full bg-card border border-border rounded-none px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-colors"
								placeholder="you@email.com"
							/>
						</div>
					</div>

					<div>
						<label htmlFor="contact-subject" className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
							Subject
						</label>
						<input
							type="text"
							id="contact-subject"
							value={form.subject}
							onChange={(e) => setForm({ ...form, subject: e.target.value })}
							className="w-full bg-card border border-border rounded-none px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-colors"
							placeholder="What's this about?"
						/>
					</div>

					<div>
						<label htmlFor="contact-message" className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground mb-2">
							Message *
						</label>
						<textarea
							id="contact-message"
							value={form.message}
							onChange={(e) => setForm({ ...form, message: e.target.value })}
							rows={5}
							className="w-full bg-card border border-border rounded-none px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none transition-colors resize-none"
							placeholder="Tell us what you're looking for..."
						/>
					</div>

					<button
						type="submit"
						disabled={sending}
						className="inline-flex items-center gap-2.5 px-7 py-[13px] bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-[0.14em] hover:opacity-90 transition-opacity disabled:opacity-50"
					>
						<Send size={13} strokeWidth={2.5} />
						{sending ? "SENDING..." : "SEND MESSAGE"}
					</button>
				</motion.form>
			</section>
		</main>
	);
}
