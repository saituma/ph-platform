import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { SignInPage, type Testimonial } from "#/components/ui/sign-in";
import { config } from "#/lib/config";
import { csrfFetch } from "#/lib/csrf";
import { isTokenExpired } from "#/lib/token-expiry";
import { setAuthToken } from "#/lib/client-storage";
import { trackEvent } from "#/lib/analytics";

export const Route = createFileRoute("/login")({
	head: () => ({
		meta: [
			{ title: "Sign In — PH Performance" },
			{
				name: "description",
				content:
					"Sign in to your PH Performance account to access your training dashboard, coaching feedback, schedule, and team management.",
			},
			{ name: "robots", content: "noindex, follow" },
		],
		links: [
			{
				rel: "canonical",
				href: "https://phperformance.uk/login",
			},
		],
	}),
	component: Login,
});

const loginSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

const testimonials: Testimonial[] = [
	{
		avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
		name: "Sarah Chen",
		handle: "@sarahdigital",
		text: "PH Performance transformed my training. The coaching feedback is top-notch!",
	},
	{
		avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
		name: "Marcus Johnson",
		handle: "@marcustech",
		text: "My team's performance improved dramatically since we started using this platform.",
	},
	{
		avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
		name: "David Martinez",
		handle: "@davidcreates",
		text: "Best athletic management tool I've used. Clean design and powerful features.",
	},
];

function Login() {
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();

	const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isLoading) return;

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		const result = loginSchema.safeParse({ email, password });
		if (!result.success) {
			for (const issue of result.error.issues) {
				toast.error(issue.message);
			}
			return;
		}

		setIsLoading(true);
		const apiUrl = `${config.api.baseUrl}/api/auth/login`;
		try {
			const tokenResponse = await csrfFetch(apiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await tokenResponse.json().catch(() => ({}));
			if (!tokenResponse.ok) {
				throw new Error(data.error || "Login failed");
			}
			if (!data?.accessToken || typeof data.accessToken !== "string") {
				throw new Error("Login succeeded but no access token was returned");
			}
			if (isTokenExpired(data.accessToken)) {
				throw new Error(
					"Login token is already expired. Please check server JWT settings.",
				);
			}

			trackEvent("login_success", { email });
			await setAuthToken(data.accessToken);
			localStorage.setItem("pending_email", email);
			navigate({ to: "/portal/dashboard", replace: true });
		} catch (error: any) {
			trackEvent("login_failure", { email });
			toast.error("Login failed", {
				description: error.message || "Invalid email or password.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleResetPassword = () => {
		navigate({ to: "/forgot" });
	};

	const handleCreateAccount = () => {
		navigate({ to: "/register" });
	};

	return (
		<div className="relative">
			<SignInPage
				title={
					<span className="font-light text-foreground tracking-tighter">
						Welcome Back
					</span>
				}
				description="Sign in to access your PH Performance dashboard, training programs, and coaching tools."
				heroImageSrc="/landing/piers.png"
				testimonials={testimonials}
				onSignIn={handleSignIn}
				onResetPassword={handleResetPassword}
				onCreateAccount={handleCreateAccount}
			/>
		</div>
	);
}
