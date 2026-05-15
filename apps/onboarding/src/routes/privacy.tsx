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
						Last updated: 15 May 2026
					</p>
				</div>

				<div className="space-y-0 pt-4">
					<Section title="1. Who We Are">
						<p>
							PH Performance ("we", "us", "our") is a fitness coaching platform
							for youth and adult athletes, teams, and coaches. Our mobile
							application and website are operated by PH Performance, based in
							the United Kingdom.
						</p>
						<p>
							PH Performance is the data controller for personal data collected
							through this platform. We are subject to the UK General Data
							Protection Regulation (UK GDPR) and the Data Protection Act 2018.
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
									Name, email address, password (stored as a secure hash — never in
									plain text), date of birth, role (athlete, coach, team manager,
									guardian), and profile photo.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Physical & Health Data</p>
								<p>
									Height, weight, fitness goals, training history, nutrition logs,
									injury records, and performance metrics — provided voluntarily by
									you or your coach to enable coaching features.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Location Data</p>
								<p>
									GPS location is collected during run-tracking sessions only, to
									record your route, pace, and distance. Background location is only
									active when you explicitly start a run session and is never
									collected passively or without your knowledge. You can disable
									location access in your device settings at any time.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Camera, Photos & Video</p>
								<p>
									We access your camera and photo library only when you choose to
									upload a profile photo, send media in messages, or record training
									videos. We do not access your camera or media without your
									explicit action.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Microphone & Audio</p>
								<p>
									Microphone access is used only when recording training videos with
									audio. We do not record audio passively or in the background.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">User-Generated Content</p>
								<p>
									Messages sent through the app, testimonials, stories, and any
									other content you post or upload. This content is visible to your
									coach, team members, or other authorised users depending on context.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Usage & Crash Data</p>
								<p>
									We collect anonymised crash reports and error logs via Sentry to
									diagnose and fix technical issues. This data does not include
									personal health or location information.
								</p>
							</div>

							<div>
								<p className="font-semibold text-foreground">Device & Notification Data</p>
								<p>
									Device type, operating system, and push notification tokens to
									send you training reminders and app notifications. You can disable
									notifications at any time in your device settings.
								</p>
							</div>
						</div>
					</Section>

					<Section title="3. Legal Basis for Processing">
						<p>
							Under UK GDPR, we process your personal data on the following legal
							bases:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>
								<strong>Contract</strong> — processing necessary to provide the
								coaching and training services you have registered for.
							</li>
							<li>
								<strong>Consent</strong> — for location tracking during run sessions,
								push notifications, and optional health data. You may withdraw
								consent at any time.
							</li>
							<li>
								<strong>Legitimate interests</strong> — for crash reporting, security
								monitoring, and improving app performance, where these do not
								override your rights.
							</li>
							<li>
								<strong>Legal obligation</strong> — where we are required to retain
								certain records (e.g. financial records under UK law).
							</li>
							<li>
								<strong>Vital interests / parental consent</strong> — for accounts
								created on behalf of children under 13, with verifiable guardian
								consent.
							</li>
						</ul>
					</Section>

					<Section title="4. How We Use Your Information">
						<p>We use your information to:</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Provide and personalise your coaching and training experience</li>
							<li>Track your athletic performance, progress, and goals</li>
							<li>Enable communication between athletes, coaches, and team managers</li>
							<li>Record and display your run routes, pace, and workout history</li>
							<li>Send push notifications for training reminders and announcements</li>
							<li>Moderate user-generated content and maintain platform safety</li>
							<li>Diagnose technical issues and improve app performance</li>
							<li>Comply with legal obligations</li>
						</ul>
						<p>
							We do not use your data for advertising, profiling for commercial
							purposes, or selling to any third party.
						</p>
					</Section>

					<Section title="5. User-Generated Content & Community Standards">
						<p>
							PH Performance is a private coaching platform. All users must agree
							to our Terms of Use before accessing the app. Our Terms make clear
							that objectionable content, abusive behaviour, harassment, and
							inappropriate material are not tolerated.
						</p>
						<p>
							If you encounter content or behaviour that violates our standards,
							you can:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Use the <strong>Report</strong> option on any message or post within the app</li>
							<li>Use the <strong>Block</strong> option to immediately stop receiving content from another user</li>
							<li>Contact us directly at{" "}
								<a href="mailto:support@phperformance.uk" className="text-primary hover:underline">
									support@phperformance.uk
								</a>
							</li>
						</ul>
						<p>
							We review all reports and act on objectionable content within 24
							hours, including removing content and suspending users where
							necessary.
						</p>
					</Section>

					<Section title="6. Data Sharing">
						<p>
							We share your data only with the following trusted service providers,
							strictly to operate our platform:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>
								<strong>Firebase (Google)</strong> — push notifications
							</li>
							<li>
								<strong>Sentry</strong> — crash and error reporting
							</li>
							<li>
								<strong>Neon / PostgreSQL</strong> — encrypted database hosting
							</li>
							<li>
								<strong>Secure object storage</strong> — media file storage
							</li>
						</ul>
						<p>
							Your coaches and team managers within the platform can see your
							training data, progress, and messages as part of the coaching
							relationship. They cannot share this data outside the platform.
						</p>
						<p>
							We do not sell, rent, or trade your personal data to any third party.
						</p>
					</Section>

					<Section title="7. International Data Transfers">
						<p>
							Some of our service providers (including Firebase/Google and Sentry)
							are based outside the United Kingdom. Where data is transferred
							internationally, we ensure adequate protections are in place through
							one or more of the following:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>UK adequacy regulations for approved countries</li>
							<li>UK International Data Transfer Agreements (IDTAs)</li>
							<li>Standard Contractual Clauses approved by the ICO</li>
						</ul>
						<p>
							You can request details of the safeguards in place for any specific
							transfer by contacting us at{" "}
							<a href="mailto:privacy@phperformance.uk" className="text-primary hover:underline">
								privacy@phperformance.uk
							</a>.
						</p>
					</Section>

					<Section title="8. Data Retention">
						<p>
							We retain your account data for as long as your account is active.
							If you delete your account — either through the app (Settings →
							Privacy & Security → Delete Account) or by contacting us — we will
							erase your personal data immediately. Your name and email are
							replaced with anonymised placeholders, and all associated tokens,
							location data, and device identifiers are permanently deleted.
						</p>
						<p>
							We may retain anonymised, non-identifiable training records and
							financial records for up to 7 years where required by UK law.
						</p>
					</Section>

					<Section title="9. Your Rights">
						<p>
							Under UK GDPR and the Data Protection Act 2018, you have the right
							to:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Access the personal data we hold about you</li>
							<li>Correct inaccurate or incomplete data</li>
							<li>Request deletion of your data ("right to be forgotten")</li>
							<li>Object to or restrict how we process your data</li>
							<li>Export your data in a portable format</li>
							<li>Withdraw consent at any time (e.g. location tracking, notifications)</li>
							<li>Not be subject to solely automated decision-making</li>
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

					<Section title="10. Children's Privacy & the UK Age Appropriate Design Code">
						<p>
							PH Performance serves youth athletes and takes children's privacy
							seriously. We comply with the UK Children's Code (Age Appropriate
							Design Code) issued by the ICO.
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>Accounts for users under 13 are created by a parent or guardian — children cannot self-register</li>
							<li>We do not profile children for commercial purposes</li>
							<li>Location data for children is only active during coach-supervised run sessions explicitly started by the user or guardian</li>
							<li>Privacy settings are set to the highest level by default for all users</li>
							<li>We do not use nudge techniques or dark patterns</li>
						</ul>
						<p>
							Parents and guardians may request access to, correction of, or
							deletion of their child's data at any time by contacting us at{" "}
							<a href="mailto:privacy@phperformance.uk" className="text-primary hover:underline">
								privacy@phperformance.uk
							</a>.
						</p>
					</Section>

					<Section title="11. Security">
						<p>
							We use industry-standard security measures including:
						</p>
						<ul className="list-disc list-inside space-y-2 ml-2">
							<li>TLS encryption for all data in transit</li>
							<li>Passwords stored as secure cryptographic hashes (never plain text)</li>
							<li>JWT-based authentication with version control to invalidate compromised tokens</li>
							<li>Role-based access controls limiting data access to authorised users only</li>
							<li>SSL certificate pinning in the mobile app to prevent network interception</li>
							<li>Rate limiting on all authentication endpoints to prevent brute-force attacks</li>
						</ul>
						<p>
							In the event of a data breach that affects your rights and freedoms,
							we will notify you and the Information Commissioner's Office (ICO)
							within 72 hours as required by UK GDPR.
						</p>
					</Section>

					<Section title="12. Cookies">
						<p>
							Our website uses essential cookies for authentication sessions only.
							We do not use advertising, analytics, or tracking cookies. You can
							manage cookie preferences through your browser settings.
						</p>
					</Section>

					<Section title="13. Changes to This Policy">
						<p>
							We may update this policy from time to time. We will notify you of
							significant changes via the app or email. The date at the top of
							this page always reflects when the policy was last revised. Your
							continued use of the platform after any update constitutes
							acceptance of the revised policy.
						</p>
					</Section>

					<Section title="14. Contact & Complaints">
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
							Office (ICO):
						</p>
						<ul className="list-disc list-inside space-y-1 ml-2">
							<li>
								Website:{" "}
								<a
									href="https://ico.org.uk"
									target="_blank"
									rel="noreferrer"
									className="text-primary hover:underline"
								>
									ico.org.uk
								</a>
							</li>
							<li>Telephone: 0303 123 1113</li>
							<li>Address: Information Commissioner's Office, Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF</li>
						</ul>
					</Section>
				</div>

				<div className="mt-12 p-8 rounded-3xl bg-muted border border-border text-center space-y-3">
					<p className="text-sm text-muted-foreground">
						Last updated: 15 May 2026
					</p>
					<p className="text-sm text-muted-foreground">
						Questions?{" "}
						<a
							href="mailto:privacy@phperformance.uk"
							className="font-medium text-primary hover:underline"
						>
							privacy@phperformance.uk
						</a>
					</p>
				</div>
			</section>
		</main>
	);
}
