import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { settingsService } from "@/services/settingsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, Upload, Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal/testimonial")({
	component: TestimonialPage,
});

function TestimonialPage() {
	const [quote, setQuote] = useState("");
	const [rating, setRating] = useState(5);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [photo, setPhoto] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setPhoto(file);
			setPhotoPreview(URL.createObjectURL(file));
		}
	};

	const handleSubmit = async () => {
		if (!quote.trim()) return;
		setIsSubmitting(true);
		try {
			let photoUrl: string | undefined;
			if (photo) {
				const { uploadUrl, publicUrl } = await settingsService.presignUpload({
					folder: "testimonials",
					fileName: `testimonial-${Date.now()}-${photo.name}`,
					contentType: photo.type,
					sizeBytes: photo.size,
				});

				await fetch(uploadUrl, {
					method: "PUT",
					headers: { "Content-Type": photo.type },
					body: photo,
				});
				photoUrl = publicUrl;
			}

			await settingsService.submitTestimonial({
				quote: quote.trim(),
				rating,
				photoUrl,
			});
			setIsSubmitted(true);
			toast.success("Thank you for your testimonial!");
		} catch (error: any) {
			toast.error(error.message || "Failed to submit testimonial");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isSubmitted) {
		return (
			<div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
				<div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
					<CheckCircle2 className="h-10 w-10" />
				</div>
				<div className="space-y-2">
					<h1 className="text-4xl font-black uppercase italic tracking-tighter">Thank You!</h1>
					<p className="text-muted-foreground text-lg">Your testimonial has been submitted successfully and will be reviewed by our team.</p>
				</div>
				<Button 
					variant="outline" 
					className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest border-2"
					onClick={() => setIsSubmitted(false)}
				>
					Submit Another
				</Button>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-2xl mx-auto space-y-6">
			<div className="flex flex-col gap-2 text-center md:text-left">
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">Share Your Story</h1>
				<p className="text-muted-foreground">Help future athletes feel the value of the platform by sharing your progress story.</p>
			</div>

			<Card className="border-2 shadow-lg shadow-primary/5">
				<CardHeader>
					<CardTitle className="text-lg font-bold uppercase tracking-tight">Your Testimony</CardTitle>
					<CardDescription>Tell us about your results and your experience using PH Platform.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Textarea 
							placeholder="Your results, progress, and thoughts..."
							className="min-h-[200px] border-2 rounded-2xl resize-none focus-visible:ring-primary p-6 text-lg font-medium leading-relaxed"
							value={quote}
							onChange={(e) => setQuote(e.target.value)}
						/>
					</div>

					<div className="space-y-3">
						<Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Rating</Label>
						<div className="flex gap-2">
							{[1, 2, 3, 4, 5].map((i) => (
								<button
									key={i}
									onClick={() => setRating(i)}
									className="transition-transform hover:scale-110 active:scale-95"
								>
									<Star 
										className={cn(
											"h-10 w-10 transition-colors",
											i <= rating ? "fill-amber-400 text-amber-500" : "text-muted/30"
										)} 
									/>
								</button>
							))}
						</div>
					</div>

					<div className="space-y-3">
						<Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Photo (Optional)</Label>
						<div className="flex flex-wrap gap-4">
							<div className="relative group overflow-hidden h-32 w-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all">
								<Input 
									type="file" 
									accept="image/*" 
									className="absolute inset-0 opacity-0 cursor-pointer z-10"
									onChange={handleFileChange}
								/>
								<Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
								<span className="text-[10px] font-black uppercase tracking-tight mt-1 text-muted-foreground">Upload</span>
							</div>
							{photoPreview && (
								<div className="h-32 w-32 rounded-2xl border-2 overflow-hidden bg-muted relative">
									<img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
									<button 
										onClick={() => { setPhoto(null); setPhotoPreview(null); }}
										className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs"
									>✕</button>
								</div>
							)}
						</div>
					</div>

					<Button 
						onClick={handleSubmit} 
						disabled={isSubmitting || !quote.trim()}
						className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
					>
						{isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Send className="mr-2 h-6 w-6" />}
						{isSubmitting ? "Submitting..." : "Submit Testimonial"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
