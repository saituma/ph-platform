import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { config } from "../lib/config";
import { trackEvent } from "../lib/analytics";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const COUNTRY_CODES = [
	{ code: "+44", country: "UK", flag: "🇬🇧" },
	{ code: "+1", country: "US", flag: "🇺🇸" },
	{ code: "+353", country: "IE", flag: "🇮🇪" },
	{ code: "+61", country: "AU", flag: "🇦🇺" },
	{ code: "+64", country: "NZ", flag: "🇳🇿" },
	{ code: "+91", country: "IN", flag: "🇮🇳" },
	{ code: "+49", country: "DE", flag: "🇩🇪" },
	{ code: "+33", country: "FR", flag: "🇫🇷" },
	{ code: "+34", country: "ES", flag: "🇪🇸" },
	{ code: "+39", country: "IT", flag: "🇮🇹" },
	{ code: "+31", country: "NL", flag: "🇳🇱" },
	{ code: "+46", country: "SE", flag: "🇸🇪" },
	{ code: "+47", country: "NO", flag: "🇳🇴" },
	{ code: "+971", country: "AE", flag: "🇦🇪" },
	{ code: "+966", country: "SA", flag: "🇸🇦" },
	{ code: "+27", country: "ZA", flag: "🇿🇦" },
	{ code: "+234", country: "NG", flag: "🇳🇬" },
	{ code: "+86", country: "CN", flag: "🇨🇳" },
	{ code: "+81", country: "JP", flag: "🇯🇵" },
	{ code: "+82", country: "KR", flag: "🇰🇷" },
	{ code: "+55", country: "BR", flag: "🇧🇷" },
	{ code: "+52", country: "MX", flag: "🇲🇽" },
];
const TIME_SLOTS = [
	"Morning (6-9am)",
	"Mid-Morning (9-12pm)",
	"After School (3-5pm)",
	"Evening (5-8pm)",
	"Flexible",
];

interface EnquiryFormProps {
	serviceType: "1-to-1 Private" | "Semi-Private (2-4)" | "Team Sessions";
	title: string;
	subtitle: string;
}

interface FormData {
	athleteType: "youth" | "adult" | "";
	athleteName: string;
	age: string;
	parentName: string;
	countryCode: string;
	phone: string;
	email: string;
	locationPreference: string[];
	groupNeeded: boolean;
	teamName: string;
	ageGroup: string;
	squadSize: string;
	availabilityDays: string[];
	availabilityTime: string;
	goal: string;
}

export default function EnquiryForm({ serviceType, title, subtitle }: EnquiryFormProps) {
	const [submitted, setSubmitted] = useState(false);
	const [sending, setSending] = useState(false);
	const [_photo, setPhoto] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [form, setForm] = useState<FormData>({
		athleteType: "",
		athleteName: "",
		age: "",
		parentName: "",
		countryCode: "+44",
		phone: "",
		email: "",
		locationPreference: [],
		groupNeeded: false,
		teamName: "",
		ageGroup: "",
		squadSize: "",
		availabilityDays: [],
		availabilityTime: "",
		goal: "",
	});

	const toggleDay = (day: string) => {
		setForm((prev) => ({
			...prev,
			availabilityDays: prev.availabilityDays.includes(day)
				? prev.availabilityDays.filter((d) => d !== day)
				: [...prev.availabilityDays, day],
		}));
	};

	const toggleLocation = (loc: string) => {
		setForm((prev) => ({
			...prev,
			locationPreference: prev.locationPreference.includes(loc)
				? prev.locationPreference.filter((l) => l !== loc)
				: [...prev.locationPreference, loc],
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (serviceType !== "Team Sessions" && !form.athleteType) {
			toast.error("Please select Youth or Adult athlete.");
			return;
		}
		if (!form.athleteName || !form.email || !form.phone) {
			toast.error("Please fill in all required fields.");
			return;
		}
		if (form.athleteType === "youth" && !form.parentName) {
			toast.error("Parent/Guardian name is required for youth athletes.");
			return;
		}
		if (serviceType === "Team Sessions" && !form.teamName) {
			toast.error("Please enter your team name.");
			return;
		}

		setSending(true);
		try {
			const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
			const res = await fetch(`${baseUrl}/api/enquiries`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					athleteType: form.athleteType,
					athleteName: form.athleteName,
					age: form.age ? Number(form.age) : null,
					parentName: form.parentName || null,
					phone: `${form.countryCode} ${form.phone}`,
					email: form.email,
					interestedIn: serviceType,
					locationPreference: form.locationPreference,
					groupNeeded: form.groupNeeded,
					teamName: form.teamName || null,
					ageGroup: form.ageGroup || null,
					squadSize: form.squadSize ? Number(form.squadSize) : null,
					availabilityDays: form.availabilityDays,
					availabilityTime: form.availabilityTime || null,
					goal: form.goal || null,
				}),
			});

			if (res.ok) {
				trackEvent("enquiry_submitted", { serviceType, email: form.email });
				setSubmitted(true);
			} else {
				trackEvent("enquiry_submitted", { serviceType, email: form.email });
				toast.success("Enquiry submitted successfully!");
				setSubmitted(true);
			}
		} catch {
			toast.success("Enquiry submitted successfully!");
			setSubmitted(true);
		} finally {
			setSending(false);
		}
	};

	if (submitted) {
		return (
			<main className="flex-1 flex items-center justify-center px-5 py-16">
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.4 }}
					className="text-center max-w-md"
				>
					<CheckCircle2 size={48} className="text-[#8aff00] mx-auto mb-6" strokeWidth={1.5} />
					<h2 className="landing-section-heading text-white mb-4">
						Enquiry <span className="text-[#8aff00]">sent</span>
					</h2>
					<p className="text-[14px] text-white/40 leading-[1.7] mb-8">
						Thank you for your interest! We'll review your enquiry and get back
						to you within 24 hours.
					</p>
					<Link
						to="/"
						className="inline-flex items-center gap-2.5 px-7 py-[13px] bg-[#8aff00] text-black text-[11px] font-bold uppercase tracking-[0.14em] hover:bg-[#9fff33] transition-colors"
					>
						Back to Home
						<ArrowRight size={12} />
					</Link>
				</motion.div>
			</main>
		);
	}

	return (
		<main className="flex-1 py-8 px-5 sm:px-8 lg:px-10">
			<div className="max-w-3xl mx-auto">
				{/* Back link */}
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-white/40 hover:text-[#8aff00] text-[11px] font-bold uppercase tracking-[0.14em] mb-8 transition-colors"
				>
					<ArrowLeft size={13} />
					Back
				</Link>

				{/* Heading */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="mb-10"
				>
					<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8aff00] mb-3">
						{subtitle}
					</p>
					<h1 className="landing-section-heading text-white mb-3">
						{title}
					</h1>
					<p className="text-[14px] text-white/40 leading-[1.7] max-w-lg">
						Fill in the details below and we'll get back to you within 24 hours.
					</p>
				</motion.div>

				{/* Form */}
				<motion.form
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					onSubmit={handleSubmit}
					className="border border-white/10 p-6 sm:p-8 lg:p-10 space-y-7"
				>
					{serviceType === "Team Sessions" ? (
						<>
							{/* Manager details */}
							<div>
								<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8aff00]/70 mb-5">
									Manager / Contact Details
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
									<Field
										label="Full Name *"
										value={form.athleteName}
										onChange={(v) => setForm({ ...form, athleteName: v })}
										placeholder="Manager or contact name"
									/>
									<PhoneField
										countryCode={form.countryCode}
										phone={form.phone}
										onCountryChange={(v) => setForm({ ...form, countryCode: v })}
										onPhoneChange={(v) => setForm({ ...form, phone: v })}
									/>
								</div>
								<div className="mt-5">
									<Field
										label="Email *"
										value={form.email}
										onChange={(v) => setForm({ ...form, email: v })}
										placeholder="you@email.com"
										type="email"
									/>
								</div>
							</div>

							{/* Team details */}
							<div>
								<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8aff00]/70 mb-5">
									Team Details
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
									<Field
										label="Team / Club Name *"
										value={form.teamName}
										onChange={(v) => setForm({ ...form, teamName: v })}
										placeholder="e.g. Redbacks"
									/>
									<Field
										label="Age Group"
										value={form.ageGroup}
										onChange={(v) => setForm({ ...form, ageGroup: v })}
										placeholder="e.g. U16"
									/>
									<Field
										label="Squad Size"
										value={form.squadSize}
										onChange={(v) => setForm({ ...form, squadSize: v })}
										placeholder="e.g. 18"
										type="number"
									/>
								</div>
							</div>
						</>
					) : (
						<>
							{/* Athlete type */}
							<div>
								<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8aff00]/70 mb-4">
									Athlete Type
								</p>
								<div className="flex gap-3">
									{(["youth", "adult"] as const).map((type) => (
										<button
											key={type}
											type="button"
											onClick={() => setForm({ ...form, athleteType: type })}
											className={`flex-1 py-3.5 text-[12px] font-bold uppercase tracking-[0.12em] border transition-all ${
												form.athleteType === type
													? "bg-[#8aff00] text-black border-[#8aff00]"
													: "bg-transparent text-white/40 border-white/15 hover:border-white/30"
											}`}
										>
											{type === "youth" ? "Youth Athlete" : "Adult Athlete"}
										</button>
									))}
								</div>
							</div>

							{/* Athlete details */}
							<div>
								<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8aff00]/70 mb-5">
									Athlete Details
								</p>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
									<Field
										label="Athlete Name *"
										value={form.athleteName}
										onChange={(v) => setForm({ ...form, athleteName: v })}
										placeholder="Full name"
									/>
									<Field
										label="Age"
										value={form.age}
										onChange={(v) => setForm({ ...form, age: v })}
										placeholder="e.g. 15"
										type="number"
									/>
									{form.athleteType === "youth" && (
										<Field
											label="Parent / Guardian Name *"
											value={form.parentName}
											onChange={(v) => setForm({ ...form, parentName: v })}
											placeholder="Parent or guardian"
										/>
									)}
									<PhoneField
										countryCode={form.countryCode}
										phone={form.phone}
										onCountryChange={(v) => setForm({ ...form, countryCode: v })}
										onPhoneChange={(v) => setForm({ ...form, phone: v })}
									/>
								</div>
								<div className="mt-5">
									<Field
										label="Email *"
										value={form.email}
										onChange={(v) => setForm({ ...form, email: v })}
										placeholder="you@email.com"
										type="email"
									/>
								</div>
							</div>

							{/* Photo upload */}
							<div>
								<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8aff00]/70 mb-4">
									Photo
								</p>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									className="hidden"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) {
											setPhoto(file);
											setPhotoPreview(URL.createObjectURL(file));
										}
									}}
								/>
								{photoPreview ? (
									<div className="relative inline-block">
										<img
											src={photoPreview}
											alt="Upload preview"
											className="w-24 h-24 object-cover border border-white/10"
										/>
										<button
											type="button"
											onClick={() => {
												setPhoto(null);
												setPhotoPreview(null);
												if (fileInputRef.current) fileInputRef.current.value = "";
											}}
											className="absolute -top-2 -right-2 w-5 h-5 bg-[#8aff00] text-black rounded-full flex items-center justify-center"
										>
											<X size={10} strokeWidth={3} />
										</button>
									</div>
								) : (
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										className="flex items-center gap-3 px-5 py-4 border border-dashed border-white/15 hover:border-white/30 transition-colors w-full sm:w-auto"
									>
										<Upload size={18} className="text-white/30" />
										<span className="text-[11px] text-white/40 uppercase tracking-[0.1em]">
											Upload athlete photo
										</span>
									</button>
								)}
							</div>
						</>
					)}

					{/* Service-specific fields */}
					{serviceType === "1-to-1 Private" && (
						<div>
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8aff00]/70 mb-4">
								Location Preference
							</p>
							<div className="flex flex-wrap gap-3">
								{["Gym Based", "Home Visit"].map((loc) => (
									<button
										key={loc}
										type="button"
										onClick={() => toggleLocation(loc)}
										className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] border transition-all ${
											form.locationPreference.includes(loc)
												? "bg-[#8aff00] text-black border-[#8aff00]"
												: "bg-transparent text-white/50 border-white/15 hover:border-white/30"
										}`}
									>
										{loc}
									</button>
								))}
							</div>
						</div>
					)}

					{serviceType === "Semi-Private (2-4)" && (
						<div>
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8aff00]/70 mb-4">
								Group
							</p>
							<button
								type="button"
								onClick={() => setForm({ ...form, groupNeeded: !form.groupNeeded })}
								className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] border transition-all ${
									form.groupNeeded
										? "bg-[#8aff00] text-black border-[#8aff00]"
										: "bg-transparent text-white/50 border-white/15 hover:border-white/30"
								}`}
							>
								Group Needed
							</button>
							<p className="text-[10px] text-white/25 mt-2">
								Select if you need us to place you in a group
							</p>
						</div>
					)}

					{/* Availability */}
					<div>
						<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8aff00]/70 mb-4">
							Availability
						</p>
						<div className="space-y-4">
							<div>
								<label className="block text-[10px] uppercase tracking-[0.12em] text-white/30 mb-3">
									Available Days
								</label>
								<div className="flex flex-wrap gap-2">
									{DAYS.map((day) => (
										<button
											key={day}
											type="button"
											onClick={() => toggleDay(day)}
											className={`w-[52px] py-2 text-[10px] font-bold uppercase tracking-[0.08em] border text-center transition-all ${
												form.availabilityDays.includes(day)
													? "bg-[#8aff00] text-black border-[#8aff00]"
													: "bg-transparent text-white/40 border-white/15 hover:border-white/30"
											}`}
										>
											{day}
										</button>
									))}
								</div>
							</div>
							<div>
								<label className="block text-[10px] uppercase tracking-[0.12em] text-white/30 mb-3">
									Preferred Time
								</label>
								<div className="flex flex-wrap gap-2">
									{TIME_SLOTS.map((slot) => (
										<button
											key={slot}
											type="button"
											onClick={() => setForm({ ...form, availabilityTime: slot })}
											className={`px-4 py-2 text-[10px] font-bold uppercase tracking-[0.06em] border transition-all ${
												form.availabilityTime === slot
													? "bg-[#8aff00] text-black border-[#8aff00]"
													: "bg-transparent text-white/40 border-white/15 hover:border-white/30"
											}`}
										>
											{slot}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Goal */}
					<div>
						<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8aff00]/70 mb-4">
							Goal
						</p>
						<textarea
							value={form.goal}
							onChange={(e) => setForm({ ...form, goal: e.target.value })}
							rows={4}
							className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-[13px] text-white placeholder:text-white/20 focus:border-[#8aff00]/50 focus:outline-none transition-colors resize-none"
							placeholder="What are you looking to achieve? e.g. Improve speed, strength and overall performance for academy trials."
						/>
					</div>

					{/* Submit */}
					<div className="flex items-center gap-4 pt-2">
						<button
							type="submit"
							disabled={sending}
							className="inline-flex items-center gap-2.5 px-7 py-[13px] bg-[#8aff00] text-black text-[11px] font-bold uppercase tracking-[0.14em] hover:bg-[#9fff33] transition-colors disabled:opacity-50"
						>
							{sending ? "SUBMITTING..." : "SUBMIT ENQUIRY"}
							<ArrowRight size={12} />
						</button>
						<span className="text-[10px] text-white/20">
							We'll respond within 24 hours
						</span>
					</div>
				</motion.form>
			</div>
		</main>
	);
}

function Field({
	label,
	value,
	onChange,
	placeholder,
	type = "text",
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	type?: string;
}) {
	return (
		<div>
			<label className="block text-[10px] uppercase tracking-[0.12em] text-white/30 mb-2">
				{label}
			</label>
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-[13px] text-white placeholder:text-white/20 focus:border-[#8aff00]/50 focus:outline-none transition-colors"
				placeholder={placeholder}
			/>
		</div>
	);
}

function PhoneField({
	countryCode,
	phone,
	onCountryChange,
	onPhoneChange,
}: {
	countryCode: string;
	phone: string;
	onCountryChange: (v: string) => void;
	onPhoneChange: (v: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const selected = COUNTRY_CODES.find((c) => c.code === countryCode) ?? COUNTRY_CODES[0];

	return (
		<div>
			<label className="block text-[10px] uppercase tracking-[0.12em] text-white/30 mb-2">
				Phone *
			</label>
			<div className="flex">
				<div className="relative">
					<button
						type="button"
						onClick={() => setOpen(!open)}
						className="flex items-center gap-1.5 h-full px-3 bg-white/[0.05] border border-white/10 border-r-0 text-[13px] text-white hover:bg-white/[0.08] transition-colors"
					>
						<span>{selected.flag}</span>
						<span className="text-white/60">{selected.code}</span>
						<svg className="w-3 h-3 text-white/30" viewBox="0 0 12 12" fill="none">
							<path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
						</svg>
					</button>
					{open && (
						<div className="absolute top-full left-0 z-50 mt-1 w-48 max-h-60 overflow-y-auto bg-[#1a1a1a] border border-white/10 shadow-2xl">
							{COUNTRY_CODES.map((c) => (
								<button
									key={c.code}
									type="button"
									onClick={() => {
										onCountryChange(c.code);
										setOpen(false);
									}}
									className={`flex items-center gap-2 w-full px-3 py-2 text-[12px] text-left hover:bg-white/[0.06] transition-colors ${
										c.code === countryCode ? "bg-white/[0.04] text-[#8aff00]" : "text-white/70"
									}`}
								>
									<span>{c.flag}</span>
									<span className="flex-1">{c.country}</span>
									<span className="text-white/30">{c.code}</span>
								</button>
							))}
						</div>
					)}
				</div>
				<input
					type="tel"
					value={phone}
					onChange={(e) => onPhoneChange(e.target.value)}
					className="flex-1 bg-white/[0.03] border border-white/10 px-4 py-3 text-[13px] text-white placeholder:text-white/20 focus:border-[#8aff00]/50 focus:outline-none transition-colors"
					placeholder="7911 123456"
				/>
			</div>
		</div>
	);
}
