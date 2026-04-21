import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { settingsService } from "@/services/settingsService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2, Bug, Lightbulb, Heart, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal/feedback")({
	component: FeedbackPage,
});

function FeedbackPage() {
	const [feedback, setFeedback] = useState("");
	const [category, setCategory] = useState("General Feedback");
	const [isSending, setIsSending] = useState(false);

	const categories = [
		{ label: "Bug Report", icon: Bug },
		{ label: "Feature Request", icon: Lightbulb },
		{ label: "General Feedback", icon: Heart },
		{ label: "Other", icon: HelpCircle },
	];

	const handleSend = async () => {
		if (!feedback.trim()) return;
		setIsSending(true);
		try {
			await settingsService.submitFeedback({
				category,
				message: feedback.trim(),
			});
			toast.success("Feedback sent! Thank you for your input.");
			setFeedback("");
		} catch (error: any) {
			toast.error(error.message || "Failed to send feedback");
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="p-6 max-w-2xl mx-auto space-y-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">We Value Your Input</h1>
				<p className="text-muted-foreground">Help us improve the platform by sharing your thoughts or reporting issues.</p>
			</div>

			<div className="grid grid-cols-2 gap-3">
				{categories.map((cat) => {
					const Icon = cat.icon;
					const active = category === cat.label;
					return (
						<button
							key={cat.label}
							onClick={() => setCategory(cat.label)}
							className={cn(
								"flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95",
								active 
									? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
									: "bg-card border-muted-foreground/10 hover:border-primary/40"
							)}
						>
							<Icon className={cn("h-6 w-6 mb-2", active ? "text-primary-foreground" : "text-primary")} />
							<span className="text-[10px] font-black uppercase tracking-widest leading-none text-center">{cat.label}</span>
						</button>
					);
				})}
			</div>

			<Card className="border-2">
				<CardHeader>
					<CardTitle className="text-lg font-bold uppercase tracking-tight">Your Message</CardTitle>
					<CardDescription>Tell us what feels great, what feels broken, and what you want next.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Textarea 
							placeholder="Type your message here..."
							className="min-h-[180px] border-2 rounded-2xl resize-none focus-visible:ring-primary p-4 text-base"
							value={feedback}
							onChange={(e) => setFeedback(e.target.value)}
						/>
					</div>

					<Button 
						onClick={handleSend} 
						disabled={isSending || !feedback.trim()}
						className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
					>
						{isSending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
						{isSending ? "Sending..." : "Send Feedback"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
