import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
	ArrowLeft,
	ArrowRight,
	CircleNotch,
	User,
	EnvelopeSimple,
	Phone,
	Calendar,
	Target,
	Wrench,
	Note,
	Warning,
	CheckCircle,
} from "@phosphor-icons/react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { toast } from "sonner";
import { env } from "#/env";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/onboarding/step-4")({
	component: OnboardingStep4,
});

function OnboardingStep4() {
	const [athlete, setAthlete] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const fetchStatus = async () => {
			const token = sessionStorage.getItem("auth_token");
			if (!token) {
				navigate({ to: "/" });
				return;
			}

			try {
				const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
				const response = await fetch(`${baseUrl}/api/onboarding`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (!response.ok) throw new Error("Failed to fetch profile");
				const data = await response.json();
				setAthlete(data.athlete);
			} catch (error) {
				toast.error("Error", { description: "Could not load your profile summary." });
			} finally {
				setIsLoading(false);
			}
		};

		fetchStatus();
	}, [navigate]);

	const handleConfirm = async () => {
		setIsSubmitting(true);
		// In a real flow, this might trigger the final onboarding completion or lead to payments
		setTimeout(() => {
			toast.success("Profile Confirmed!", {
				description: "Moving to plan selection and payment.",
			});
			setIsSubmitting(false);
			navigate({ to: "/onboarding/step-5" });
		}, 1500);
	};

	if (isLoading) {
		return (
			<div className="flex h-[60vh] items-center justify-center">
				<CircleNotch className="w-10 h-10 animate-spin text-primary" />
			</div>
		);
	}

	if (!athlete) return null;

	const isYouth = athlete.athleteType === "youth";

	return (
		<main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
			<section className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
				<div className="space-y-4 text-center">
					<p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
						Step 4 of 4
					</p>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl leading-[1.1]">
						Review & <span className="text-primary">Confirm</span>
					</h1>
					<p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
						Please review your information before proceeding to payment.
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					{/* Personal Information */}
					<Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-xl p-8 rounded-3xl ring-1 ring-border/50">
						<div className="space-y-6">
							<div className="flex items-center gap-3 border-b border-border/40 pb-4">
								<User size={24} weight="bold" className="text-primary" />
								<h2 className="text-xl font-bold">Personal Info</h2>
							</div>

							<div className="space-y-4">
								{isYouth ? (
									<>
										<SummaryItem 
											label="Guardian Name" 
											value={athlete.guardianName || "N/A"} 
											icon={User} 
										/>
										<SummaryItem 
											label="Athlete Name" 
											value={athlete.name} 
											icon={User} 
										/>
									</>
								) : (
									<SummaryItem 
										label="Full Name" 
										value={athlete.name} 
										icon={User} 
									/>
								)}
								<SummaryItem 
									label="Email Address" 
									value={sessionStorage.getItem("pending_email") || athlete.email || "N/A"} 
									icon={EnvelopeSimple} 
								/>
								<SummaryItem 
									label="Phone Number" 
									value={athlete.phoneNumber || athlete.extraResponses?.phone || "N/A"} 
									icon={Phone} 
								/>
								<SummaryItem 
									label="Birth Date" 
									value={athlete.birthDate} 
									icon={Calendar} 
								/>
								<SummaryItem 
									label="Age" 
									value={`${athlete.age} years old`} 
									icon={CheckCircle} 
								/>
							</div>
						</div>
					</Card>

					{/* Training & Goals */}
					<Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-xl p-8 rounded-3xl ring-1 ring-border/50">
						<div className="space-y-6">
							<div className="flex items-center gap-3 border-b border-border/40 pb-4">
								<Target size={24} weight="bold" className="text-primary" />
								<h2 className="text-xl font-bold">Training & Goals</h2>
							</div>

							<div className="space-y-4">
								<SummaryItem 
									label="Frequency" 
									value={`${athlete.trainingPerWeek} days / week`} 
									icon={Calendar} 
								/>
								<SummaryItem 
									label="Performance Goals" 
									value={athlete.performanceGoals} 
									icon={Target} 
								/>
								<SummaryItem 
									label="Equipment Access" 
									value={athlete.equipmentAccess} 
									icon={Wrench} 
								/>
								{athlete.growthNotes && (
									<SummaryItem 
										label="Growth Notes" 
										value={athlete.growthNotes} 
										icon={Note} 
									/>
								)}
								{athlete.injuries?.notes && (
									<SummaryItem 
										label="Injuries" 
										value={athlete.injuries.notes} 
										icon={Warning} 
										destructive
									/>
								)}
							</div>
						</div>
					</Card>
				</div>

				<div className="flex flex-col sm:flex-row gap-4 pt-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/onboarding/step-3" })}
						className="flex-1 h-14 rounded-2xl text-lg font-bold border-border/60 hover:bg-accent transition-all"
					>
						<ArrowLeft weight="bold" className="mr-2 w-5 h-5" />
						Edit Info
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={isSubmitting}
						className="flex-[2] h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
					>
						{isSubmitting ? (
							<CircleNotch className="w-6 h-6 animate-spin text-primary-foreground" />
						) : (
							<>
								Confirm & Pay
								<ArrowRight weight="bold" className="ml-2 w-5 h-5" />
							</>
						)}
					</Button>
				</div>
			</section>
		</main>
	);
}

function SummaryItem({ 
	label, 
	value, 
	icon: Icon, 
	destructive = false 
}: { 
	label: string; 
	value: string; 
	icon: any; 
	destructive?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
				{label}
			</span>
			<div className="flex items-center gap-2">
				<Icon size={16} className={cn(destructive ? "text-destructive" : "text-primary")} />
				<span className={cn("text-sm font-semibold", destructive && "text-destructive")}>
					{value}
				</span>
			</div>
		</div>
	);
}
