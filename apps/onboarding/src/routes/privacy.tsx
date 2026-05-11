import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
	head: () => ({
		meta: [
			{ title: "Privacy Policy — PH Performance" },
			{
				name: "description",
				content:
					"PH Performance Privacy Policy. Learn how we collect, use, and protect your personal data in our fitness coaching app.",
			},
			{ name: "robots", content: "index, follow" },
		],
		links: [{ rel: "canonical", href: "https://phperformance.uk/privacy" }],
	}),
	component: PrivacyPolicy,
});

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-4 py-10 border-b border-border/40 last:border-0">
			<h2 className="text-2xl font-bold text-foreground">{title}</h2>
			<div className="text-muted-foreground leading-relaxed space-y-4 text-base">
				{children}
			</div>
		</div>
	);
}

function PrivacyPolicy() {
	return (
		<main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
			<section className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-6 text-center max-w-3xl mx-auto">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
						Legal
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
						Privacy <span className="text-primary">Policy</span>
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed">
						This policy explains how PH Performance collects, uses, and protects
						your personal information when you use our mobile app and website.
					</p>
					<p className="text-sm text-muted-foreground">
						Last updated: 11 May 2026
					</p>
				</div>

				<div className="space-y-0 pt-4">
					<Section title="1. Who We Are">
						<p>
							PH Performance ("we", "us", "our") is a fitness coaching platform
							for youth and adult athletes, teams, and coaches. Our mobile
							application and website are operated by PH Performance (UK).
						</p>
						<p>
							For any privacy-related questions, contact us at:{" "}
							<a
								href="mailto:privacy@phperformance.uk"
								className="text-primary hover:underline"
							>
								privacy@phperformance.uk
							</a>
						</p>
					</Section>

					<Section title="2. Information We Collect">
						<p>We collect the following categories of information:</p>

						<div className="space-y-3">
							<div>
								<p className="font-semibold text-foreground">Account Information</p>
								<p>
									Name, email address, password (hashed), date of birth, role
									(athlete, coach, team manager, parent), and profile photo.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Physical & Health Data</p>
								<p>
									Height, weight, fitness goals, training history, nutrition
									logs, injury records, and performance metrics — provided
									voluntarily to enable coaching features.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Location Data</p>
								<p>
									GPS location is collected during run-tracking sessions to
									record your route, pace, and distance. Background location
									is only active when you explicitly start a run session and
									is never collected passively. You can disable this in your
									device settings at any time.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Camera, Photos & Video</p>
								<p>
									We access your camera and photo library only when you choose
									to upload a profile photo, send media in messages, or record
									training videos. We do not access your camera or media
									without your explicit action.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Microphone & Audio</p>
								<p>
									Microphone access is used when recording training videos with
									audio. We do not record audio passively or in the background.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Usage & Crash Data</p>
								<p>
									We collect anonymised crash reports and error logs via Sentry
									to diagnose and fix technical issues. This data does not
									include personal health or location information.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Device & Notification Data</p>
								<p>
									Device type, operating system, and push notification tokens
									(via Firebase Cloud Messaging) to send you training reminders
									and app notifications. You can disable notifications at any
									time in your device settings.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Payment Information</p>
								<p>
									Subscription payments are processed by Stripe. We do not
									store your card details — Stripe handles all payment data
									under their own PCI-DSS compliant privacy policy.
								</p>
							</div>
						</div>
					</Section>

					<Section title="3. How We Use Your Information">
						<p>We use your information to:</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Provide and personalise your coaching and training experience</li>
							<li>Track your athletic performance, progress, and goals</li>
							<li>Enable communication between athletes, coaches, and team managers</li>
							<li>Record and display your run routes, pace, and workout history</li>
							<li>Send push notifications for training reminders and announcements</li>
							<li>Process subscription payments</li>
							<li>Diagnose technical issues and improve app performance</li>
							<li>Comply with legal obligations</li>
						</ul>
						<p>
							We do not use your data for advertising, and we do not sell your
							personal information to any third party.
						</p>
					</Section>

					<Section title="4. Data Sharing">
						<p>
							We share your data only with the following trusted service providers,
							strictly to operate our platform:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>
								<strong>Stripe</strong> — payment processing
							</li>
							<li>
								<strong>Firebase (Google)</strong> — push notifications
							</li>
							<li>
								<strong>Sentry</strong> — crash and error reporting
							</li>
							<li>
								<strong>MinIO / S3-compatible storage</strong> — secure media
								file storage
							</li>
							<li>
								<strong>Neon / PostgreSQL</strong> — encrypted database hosting
							</li>
						</ul>
						<p>
							Your coaches and team managers within the platform can see your
							training data, progress, and messages as part of the coaching
							relationship. They cannot share this data outside the platform.
						</p>
					</Section>

					<Section title="5. Data Retention">
						<p>
							We retain your account data for as long as your account is active.
							If you delete your account, we will delete your personal data within
							30 days, except where we are required to retain it for legal or
							financial compliance purposes (e.g. billing records for up to 7
							years under UK law).
						</p>
					</Section>

					<Section title="6. Your Rights">
						<p>
							Under UK GDPR and applicable data protection law, you have the right
							to:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Access the personal data we hold about you</li>
							<li>Correct inaccurate data</li>
							<li>Request deletion of your data ("right to be forgotten")</li>
							<li>Object to or restrict how we process your data</li>
							<li>Export your data in a portable format</li>
							<li>Withdraw consent at any time (e.g. location tracking)</li>
						</ul>
						<p>
							To exercise any of these rights, email us at{" "}
							<a
								href="mailto:privacy@phperformance.uk"
								className="text-primary hover:underline"
							>
								privacy@phperformance.uk
							</a>
							. We will respond within 30 days.
						</p>
					</Section>

					<Section title="7. Children's Privacy">
						<p>
							Our platform is used by youth athletes (under 18) under the
							supervision of coaches, team managers, and parents. For users under
							13, we require verifiable parental consent before account creation.
							Parents and guardians may request access to, correction of, or
							deletion of their child's data at any time by contacting us.
						</p>
						<p>
							We do not knowingly collect data from children under 13 without
							parental consent.
						</p>
					</Section>

					<Section title="8. Security">
						<p>
							We use industry-standard security measures including TLS encryption
							in transit, encrypted storage, JWT-based authentication, and
							role-based access controls. We regularly review our security
							practices and conduct vulnerability assessments.
						</p>
						<p>
							In the event of a data breach that affects your rights and freedoms,
							we will notify you and the relevant supervisory authority within 72
							hours as required by UK GDPR.
						</p>
					</Section>

					<Section title="9. Cookies">
						<p>
							Our website uses essential cookies for authentication sessions. We
							do not use advertising or tracking cookies. You can manage cookie
							preferences through your browser settings.
						</p>
					</Section>

					<Section title="10. Changes to This Policy">
						<p>
							We may update this policy from time to time. We will notify you of
							significant changes via the app or email. Your continued use of
							the platform after any update constitutes acceptance of the revised
							policy.
						</p>
					</Section>

					<Section title="11. Contact & Complaints">
						<p>
							For any privacy questions or to exercise your rights, contact us
							at{" "}
							<a
								href="mailto:privacy@phperformance.uk"
								className="text-primary hover:underline"
							>
								privacy@phperformance.uk
							</a>
							.
						</p>
						<p>
							If you are unsatisfied with how we handle your data, you have the
							right to lodge a complaint with the UK Information Commissioner's
							Office (ICO) at{" "}
							<a
								href="https://ico.org.uk"
								target="_blank"
								rel="noreferrer"
								className="text-primary hover:underline"
							>
								ico.org.uk
							</a>
							.
						</p>
					</Section>
				</div>

				<div className="mt-12 p-8 rounded-3xl bg-muted border border-border text-center space-y-3">
					<p className="text-sm text-muted-foreground">
						Last updated: 11 May 2026
					</p>
					<p className="text-sm text-muted-foreground">
						Questions?{" "}
						<a
							href="mailto:privacy@phperformance.uk"
							className="text-primary hover:underline font-medium"
						>
							privacy@phperformance.uk
						</a>
					</p>
				</div>
			</section>
		</main>
	);
}
