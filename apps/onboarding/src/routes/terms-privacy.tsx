import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms-privacy")({
	head: () => ({
		meta: [
			{ title: "Terms & Privacy Policy — PH Performance" },
			{
				name: "description",
				content:
					"Read the PH Performance Terms of Service and Privacy Policy. We are committed to protecting your data and providing a transparent, fair service.",
			},
			{ name: "robots", content: "noindex, follow" },
		],
		links: [{ rel: "canonical", href: "https://ph-platform-onboarding.vercel.app/terms-privacy" }],
	}),
	component: TermsPrivacy,
});

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-6 py-10 border-b border-border/40 last:border-0">
			<h2 className="text-2xl font-bold text-foreground">{title}</h2>
			<div className="text-muted-foreground leading-relaxed space-y-6 text-lg">
				{children}
			</div>
		</div>
	);
}

function TermsPrivacy() {
	return (
		<main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
			<section className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-6 text-center max-w-3xl mx-auto">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
						Legal & Compliance
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl">
						Terms & <span className="text-primary">Privacy</span>
					</h1>
					<p className="text-xl text-muted-foreground leading-relaxed">
						We are committed to transparency, safety, and the protection of your
						data. Please review our comprehensive terms of service and privacy
						policies below.
					</p>
				</div>

				<div className="space-y-0 pt-12">
					<Section title="1. Acceptance of Terms">
						<p>
							By accessing or using the PH Platform, you agree to be bound by
							these Terms of Service. Our services are available to individuals
							of all ages; however, users under the age of 18 must have parental
							or guardian consent to participate in our training programs and
							use the platform's interactive features.
						</p>
						<p>
							We reserve the right to update these terms at any time. Your
							continued use of the platform following any changes constitutes
							your acceptance of the new terms.
						</p>
					</Section>

					<Section title="2. Health & Safety Warning">
						<p>
							<strong>Medical Clearance:</strong> Before starting any physical
							training program on the PH Platform, we strongly recommend that
							you consult with a qualified healthcare professional. This is
							especially critical for adults with pre-existing conditions or
							youth athletes returning from injury.
						</p>
						<p>
							<strong>Assumption of Risk:</strong> Participation in physical
							training involves inherent risks. By using the PH Platform, you
							voluntarily assume all risks associated with the training
							programs, including the risk of physical injury.
						</p>
					</Section>

					<Section title="3. Privacy & Personal Data">
						<p>
							We collect personal information to provide a personalized coaching
							experience. This includes contact details, physical metrics,
							training progress, and video uploads for feedback.
						</p>
						<p>
							<strong>Data Security:</strong> We employ industry-standard
							encryption and security protocols to protect your data. We do not
							sell your personal information to third parties. Your video
							submissions are only accessible to our certified coaching staff
							for the purpose of providing feedback.
						</p>
					</Section>

					<Section title="4. User Conduct & Community">
						<p>
							Our community is built on mutual respect. Any form of harassment,
							bullying, or inappropriate content in our messaging or community
							sections will result in immediate account termination.
						</p>
						<p>
							Users are responsible for maintaining the confidentiality of their
							account credentials and for all activities that occur under their
							account.
						</p>
					</Section>

					<Section title="5. Intellectual Property">
						<p>
							All content provided on the PH Platform, including training
							videos, nutrition guides, and software code, is the property of PH
							Platform and is protected by copyright and intellectual property
							laws. You are granted a limited, non-exclusive license to use the
							content for your personal, non-commercial training purposes only.
						</p>
					</Section>

					<Section title="6. Limitation of Liability">
						<p>
							PH Platform and its coaches shall not be liable for any indirect,
							incidental, or consequential damages resulting from the use or
							inability to use our services. Our total liability for any claim
							arising out of or relating to these terms shall not exceed the
							amount you paid us in the past twelve months.
						</p>
					</Section>
				</div>

				<div className="mt-12 p-8 rounded-3xl bg-muted border border-border text-center">
					<p className="text-sm text-muted-foreground mb-4">
						Last updated: April 17, 2026
					</p>
					<p className="text-sm text-muted-foreground">
						Questions about our terms? Email us at{" "}
						<a
							href="mailto:legal@phplatform.com"
							className="text-primary hover:underline font-medium"
						>
							legal@phplatform.com
						</a>
					</p>
				</div>
			</section>
		</main>
	);
}
