import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { SignUpPage, type Testimonial } from "#/components/ui/sign-up";
import { Turnstile } from "#/components/Turnstile";
import { config } from "#/lib/config";
import { csrfFetch } from "#/lib/csrf";
import { env } from "#/env";
import { trackEvent } from "#/lib/analytics";

export const Route = createFileRoute("/register")({
	head: () => ({
		meta: [
			{ title: "Get Started — PH Performance" },
			{
				name: "description",
				content:
					"Create your PH Performance account. Start your free 14-day trial — no credit card required.",
			},
			{ name: "robots", content: "noindex, follow" },
		],
		links: [
			{
				rel: "canonical",
				href: "https://ph-platform-onboarding.vercel.app/register",
			},
		],
	}),
	component: Register,
});

const registrationSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
});

const testimonials: Testimonial[] = [
	{
		avatarSrc: "https://randomuser.me/api/portraits/women/44.jpg",
		name: "Emily Rodriguez",
		handle: "@emilyfit",
		text: "Signing up took seconds. Within a day I had my full training plan ready to go!",
	},
	{
		avatarSrc: "https://randomuser.me/api/portraits/men/22.jpg",
		name: "James Wright",
		handle: "@jamescoach",
		text: "Managing my youth team has never been easier. The onboarding flow is seamless.",
	},
	{
		avatarSrc: "https://randomuser.me/api/portraits/women/68.jpg",
		name: "Lisa Park",
		handle: "@lisatrains",
		text: "Finally a platform that understands athlete development. Highly recommend!",
	},
];

function Register() {
	const [isLoading, setIsLoading] = useState(false);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [turnstileReady, setTurnstileReady] = useState(false);
	const [turnstileFailed, setTurnstileFailed] = useState(false);
	const [turnstileResetKey, setTurnstileResetKey] = useState(0);
	const navigate = useNavigate();
	const turnstileSiteKey = env.VITE_TURNSTILE_SITE_KEY;

	const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isLoading) return;

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;

		const result = registrationSchema.safeParse({ email });
		if (!result.success) {
			toast.error(result.error.issues[0].message);
			return;
		}

		if (turnstileSiteKey && !turnstileFailed && turnstileReady && !turnstileToken) {
			toast.error("Please complete the verification challenge");
			return;
		}

		setIsLoading(true);
		trackEvent("sign_up_start", { email });
		try {
			const response = await csrfFetch(
				`${config.api.baseUrl}/api/auth/register/start`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, turnstileToken }),
				},
			);
			const data = await response.json();

			if (!response.ok) {
				setTurnstileToken(null);
				setTurnstileResetKey((k) => k + 1);
				if (response.status === 409) {
					toast.error("Account already exists", {
						description:
							"This email is already registered. Would you like to sign in instead?",
						action: {
							label: "Sign In",
							onClick: () => navigate({ to: "/login" }),
						},
					});
					setIsLoading(false);
					return;
				}
				throw new Error(data.error || "Failed to start registration");
			}

			trackEvent("sign_up_complete", { email });
			localStorage.setItem("pending_email", email);
			toast.success("Verification code sent!", {
				description: `We've sent a 6-digit code to ${email}`,
			});
			navigate({ to: "/verification" });
		} catch (err: any) {
			toast.error("Registration failed", {
				description:
					err.message || "An unexpected error occurred. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignUp = () => {
		window.location.href = `${config.api.baseUrl}/api/auth/google`;
	};

	const handleSignIn = () => {
		navigate({ to: "/login" });
	};

	return (
		<div className="relative">
			<SignUpPage
				title={<span className="font-light text-foreground tracking-tighter">Get Started</span>}
				description="Create your PH Performance account. Start your free 14-day trial — no credit card required."
				heroImageSrc="/landing/piers.png"
				testimonials={testimonials}
				onSignUp={handleSignUp}
				onGoogleSignUp={handleGoogleSignUp}
				onSignIn={handleSignIn}
			>
				{turnstileSiteKey && (
					<div className="animate-element animate-delay-400">
						<Turnstile
							siteKey={turnstileSiteKey}
							action="register"
							resetKey={turnstileResetKey}
							onVerify={(token) => {
								setTurnstileToken(token);
								setTurnstileFailed(false);
							}}
							onReady={() => setTurnstileReady(true)}
							onExpire={() => setTurnstileToken(null)}
							onError={() => {
								setTurnstileToken(null);
								setTurnstileFailed(true);
							}}
							className="flex justify-center"
						/>
					</div>
				)}
			</SignUpPage>
		</div>
	);
}
