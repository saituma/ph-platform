import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { 
	EnvelopeSimple, 
	LockKey, 
	ArrowRight, 
	CircleNotch,
	Eye,
	EyeSlash,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { toast } from "sonner";
import { env } from "#/env";

export const Route = createFileRoute("/login")({
	component: Login,
});

function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const navigate = useNavigate();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isLoading) return;

		setIsLoading(true);
		try {
			const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
			const response = await fetch(`${baseUrl}/api/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Login failed");
			}

			// Store token and user data
			sessionStorage.setItem("auth_token", data.accessToken);
			sessionStorage.setItem("pending_email", email);
			
			toast.success("Welcome back!", {
				description: "Redirecting to your dashboard...",
			});

			navigate({ to: "/onboarding/dashboard" });
		} catch (error: any) {
			toast.error("Login failed", {
				description: error.message || "Invalid email or password.",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="relative min-h-[80vh] flex flex-col items-center justify-center p-4">
			<section className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-black uppercase italic tracking-tight">
						Welcome <span className="text-primary">Back</span>
					</h1>
					<p className="text-muted-foreground text-sm font-medium">
						Log in to access your PH Platform dashboard.
					</p>
				</div>

				<Card className="p-8 rounded-[2.5rem] border-border/60 bg-card/50 backdrop-blur-sm shadow-2xl">
					<form onSubmit={handleLogin} className="space-y-6">
						<div className="space-y-4">
							<div className="space-y-2">
								<label className="text-sm font-bold flex items-center gap-2">
									<EnvelopeSimple weight="bold" className="text-primary" />
									Email Address
								</label>
								<Input
									type="email"
									placeholder="name@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="h-14 rounded-2xl bg-background/50 border-border/60"
								/>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-bold flex items-center gap-2">
									<LockKey weight="bold" className="text-primary" />
									Password
								</label>
								<div className="relative">
									<Input
										type={showPassword ? "text" : "password"}
										placeholder="••••••••"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										className="h-14 rounded-2xl bg-background/50 border-border/60 pr-12"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
									>
										{showPassword ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
									</button>
								</div>
							</div>
						</div>

						<Button
							type="submit"
							disabled={isLoading}
							className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
						>
							{isLoading ? (
								<CircleNotch className="w-6 h-6 animate-spin" />
							) : (
								<>
									Sign In
									<ArrowRight weight="bold" className="ml-2 w-5 h-5" />
								</>
							)}
						</Button>
					</form>
				</Card>

				<div className="text-center">
					<p className="text-xs text-muted-foreground">
						Don't have an account?{" "}
						<Link to="/" className="font-bold text-primary hover:underline">
							Create one now
						</Link>
					</p>
				</div>
			</section>
		</main>
	);
}
