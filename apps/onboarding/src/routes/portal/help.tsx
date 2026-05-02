import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ChevronDown, ChevronUp, HelpCircle, MessageCircle, Zap, Shield, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, PageTransition, StaggerList, StaggerItem, AnimatePresence } from "@/lib/motion";

export const Route = createFileRoute("/portal/help")({
	component: HelpPage,
});

const faqs = [
	{
		id: "1",
		question: "How do I change my training plan?",
		answer: "You can update your training focus through the Dashboard or by contacting your coach directly via the Messages tab.",
	},
	{
		id: "2",
		question: "Where can I log my daily nutrition?",
		answer: "Use the 'Nutrition Tracking' section in the sidebar to log your meals, water intake, and daily wellbeing metrics.",
	},
	{
		id: "3",
		question: "How does the progress tracking work?",
		answer: "The platform aggregates your training logs, nutrition data, and performance metrics to provide a comprehensive overview of your development.",
	},
	{
		id: "4",
		question: "I'm having technical issues with the app.",
		answer: "Please use the 'Send Feedback' option in the sidebar or email our support team at support@phperformance.uk.",
	},
];

function HelpPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

	const filteredFaqs = faqs.filter(
		(faq) => 
			faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
			faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<PageTransition className="p-6 max-w-4xl mx-auto space-y-8">
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="flex flex-col gap-2 text-center md:text-left"
			>
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">Help Center</h1>
				<p className="text-muted-foreground">Search answers and find support to optimize your experience.</p>
			</motion.div>

			<div className="relative group max-w-2xl mx-auto md:mx-0">
				<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
				<Input 
					placeholder="Search for answers..."
					className="h-14 pl-12 rounded-2xl border-2 text-lg focus-visible:ring-primary shadow-sm"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</div>

			<StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{[
					{ icon: Zap, label: "Quick Start" },
					{ icon: Shield, label: "Account Safety" },
					{ icon: Headphones, label: "Contact Support" },
				].map((card) => (
					<StaggerItem key={card.label}>
						<motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
							<Card className="border-2 hover:border-primary/40 transition-colors cursor-pointer group">
								<CardHeader className="items-center text-center space-y-2">
									<motion.div
										whileHover={{ rotate: 5, scale: 1.1 }}
										transition={{ type: "spring", stiffness: 300 }}
										className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all"
									>
										<card.icon className="h-6 w-6" />
									</motion.div>
									<CardTitle className="text-sm font-bold uppercase tracking-tight">{card.label}</CardTitle>
								</CardHeader>
							</Card>
						</motion.div>
					</StaggerItem>
				))}
			</StaggerList>

			<div className="space-y-4">
				<h2 className="text-xl font-bold uppercase italic tracking-tight px-1 flex items-center gap-2">
					<HelpCircle className="h-5 w-5 text-primary" />
					Frequently Asked Questions
				</h2>
				<div className="space-y-3">
					{filteredFaqs.length > 0 ? (
						filteredFaqs.map((faq) => (
							<Card 
								key={faq.id} 
								className={cn(
									"border-2 transition-all cursor-pointer",
									expandedFaq === faq.id ? "bg-primary/5 border-primary/40 shadow-md" : "hover:border-primary/20"
								)}
								onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
							>
								<CardHeader className="p-4 flex flex-row items-center justify-between">
									<p className="font-bold text-sm md:text-base pr-4">{faq.question}</p>
									{expandedFaq === faq.id ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
								</CardHeader>
								<AnimatePresence>
									{expandedFaq === faq.id && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: "auto", opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.25, ease: "easeOut" }}
											className="overflow-hidden"
										>
											<CardContent className="p-4 pt-0 text-sm md:text-base text-muted-foreground leading-relaxed">
												{faq.answer}
											</CardContent>
										</motion.div>
									)}
								</AnimatePresence>
							</Card>
						))
					) : (
						<div className="text-center py-12 text-muted-foreground">
							No matches found for "{searchQuery}"
						</div>
					)}
				</div>
			</div>

			<div className="bg-primary/5 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-primary/10">
				<div className="space-y-2 text-center md:text-left">
					<h3 className="text-2xl font-black uppercase italic tracking-tighter">Still need help?</h3>
					<p className="text-muted-foreground">Our support team is available 24/7 to assist you.</p>
				</div>
				<div className="flex gap-3 shrink-0">
					<Button className="h-12 rounded-xl font-bold uppercase tracking-wider px-6">
						<MessageCircle className="mr-2 h-4 w-4" />
						Chat Now
					</Button>
					<Button variant="outline" className="h-12 rounded-xl font-bold uppercase tracking-wider px-6 border-2">
						Email Support
					</Button>
				</div>
			</div>
		</PageTransition>
	);
}
