import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/portal/terms")({
	component: TermsPage,
});

function TermsPage() {
	const sections = [
		{
			title: "1. Acceptance of Terms",
			content: "By accessing and using PH Platform, you agree to be bound by these Terms of Service and all applicable laws and regulations."
		},
		{
			title: "2. Coaching & Advice",
			content: "Information provided through the platform is for performance tracking and general guidance. Always consult with a qualified medical professional before starting any new exercise or nutrition program."
		},
		{
			title: "3. User Conduct",
			content: "You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account."
		},
		{
			title: "4. Data Accuracy",
			content: "Users are expected to provide accurate data for logs and tracking to ensure the best possible coaching outcomes."
		}
	];

	return (
		<div className="p-6 max-w-4xl mx-auto space-y-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">Terms of Service</h1>
				<p className="text-muted-foreground">Last updated: April 21, 2026</p>
			</div>

			<Card className="border-2">
				<CardHeader className="flex flex-row items-center gap-4 bg-muted/30">
					<div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
						<FileText className="h-6 w-6" />
					</div>
					<div>
						<CardTitle className="text-xl font-bold uppercase tracking-tight">Legal Agreement</CardTitle>
						<p className="text-sm text-muted-foreground font-medium">Please read these terms carefully before using the platform.</p>
					</div>
				</CardHeader>
				<CardContent className="p-8 space-y-8">
					{sections.map((section) => (
						<div key={section.title} className="space-y-3">
							<h3 className="text-lg font-black uppercase italic tracking-tight text-primary flex items-center gap-2">
								<ChevronRight className="h-4 w-4" />
								{section.title}
							</h3>
							<p className="text-foreground/80 leading-relaxed font-medium">
								{section.content}
							</p>
						</div>
					))}
					
					<div className="pt-8 border-t border-muted-foreground/10 text-center">
						<p className="text-sm text-muted-foreground italic">
							For full terms and conditions, please contact legal@phperformance.uk
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
