import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	CheckCircle2,
	Copy,
	Download,
	Loader2,
	Plus,
	ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { motion, PageTransition } from "@/lib/motion";
import { guardianService, type ChildCredentials } from "@/services/guardianService";

export const Route = createFileRoute("/portal/add-child-success")({
	component: AddChildSuccessPage,
});

function AddChildSuccessPage() {
	const [credentials, setCredentials] = useState<ChildCredentials | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const credentialsToken = params.get("credentials_token");

		if (!credentialsToken) {
			setError("Missing credentials token. Please contact support if your payment was processed.");
			setLoading(false);
			return;
		}

		guardianService
			.getChildCredentials(credentialsToken)
			.then((data) => {
				setCredentials(data);
			})
			.catch((err: any) => {
				setError(err.message || "Failed to load credentials. Please contact support.");
			})
			.finally(() => {
				setLoading(false);
			});
	}, []);

	const copyToClipboard = async (text: string, label: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(`${label} copied to clipboard`);
		} catch {
			toast.error("Failed to copy. Please select and copy manually.");
		}
	};

	if (loading) {
		return (
			<PageTransition className="mx-auto max-w-xl p-6 pb-24">
				<div className="flex flex-col items-center justify-center py-20 gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
						Loading credentials...
					</p>
				</div>
			</PageTransition>
		);
	}

	if (error) {
		return (
			<PageTransition className="mx-auto max-w-xl p-6 pb-24">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					className="space-y-6"
				>
					<Card className="border-2 border-destructive/30">
						<CardHeader>
							<CardTitle className="text-lg font-bold text-destructive">
								Something went wrong
							</CardTitle>
							<CardDescription>{error}</CardDescription>
						</CardHeader>
						<CardContent>
							<Link to="/portal/dashboard">
								<Button variant="outline" className="h-11 rounded-xl font-bold uppercase tracking-wider border-2">
									<ArrowLeft className="mr-2 h-4 w-4" />
									Back to Dashboard
								</Button>
							</Link>
						</CardContent>
					</Card>
				</motion.div>
			</PageTransition>
		);
	}

	return (
		<PageTransition className="mx-auto max-w-xl p-4 md:p-6 pb-24 space-y-6">
			{/* Success header */}
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
				className="text-center space-y-4 py-6"
			>
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 15 }}
					className="mx-auto h-16 w-16 flex items-center justify-center bg-primary/10 rounded-full"
				>
					<CheckCircle2 className="h-8 w-8 text-primary" />
				</motion.div>
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">
					Child Registered
				</h1>
				<p className="text-muted-foreground max-w-sm mx-auto">
					{credentials?.childName
						? `${credentials.childName} has been successfully registered.`
						: "Your child has been successfully registered."}{" "}
					Save the login credentials below.
				</p>
			</motion.div>

			{/* Credentials card */}
			{credentials && (
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3, duration: 0.4 }}
				>
					<Card className="border-2 border-primary/20">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg font-bold">
								<CheckCircle2 className="h-5 w-5 text-primary" />
								Login Credentials
							</CardTitle>
							<CardDescription>
								Save these credentials. Your child will need them to log in to the PH Performance app.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Child name */}
							<div className="rounded-xl border bg-muted/30 p-4">
								<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
									Child's Name
								</p>
								<p className="mt-1 font-bold text-lg">{credentials.childName}</p>
							</div>

							{/* Email */}
							<div className="rounded-xl border bg-muted/30 p-4">
								<div className="flex items-center justify-between gap-2">
									<div className="min-w-0 flex-1">
										<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
											Login Email
										</p>
										<p className="mt-1 font-mono text-sm font-bold break-all">
											{credentials.email}
										</p>
									</div>
									<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
										<Button
											variant="outline"
											size="sm"
											onClick={() => copyToClipboard(credentials.email, "Email")}
											className="shrink-0 rounded-lg border-2 font-bold"
										>
											<Copy className="h-3.5 w-3.5 mr-1.5" />
											Copy
										</Button>
									</motion.div>
								</div>
							</div>

							{/* Password */}
							<div className="rounded-xl border bg-muted/30 p-4">
								<div className="flex items-center justify-between gap-2">
									<div className="min-w-0 flex-1">
										<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
											Temporary Password
										</p>
										<p className="mt-1 font-mono text-sm font-bold break-all">
											{credentials.temporaryPassword}
										</p>
									</div>
									<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
										<Button
											variant="outline"
											size="sm"
											onClick={() => copyToClipboard(credentials.temporaryPassword, "Password")}
											className="shrink-0 rounded-lg border-2 font-bold"
										>
											<Copy className="h-3.5 w-3.5 mr-1.5" />
											Copy
										</Button>
									</motion.div>
								</div>
							</div>

							<p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider text-center">
								We recommend changing the password after first login.
							</p>
						</CardContent>
					</Card>
				</motion.div>
			)}

			{/* Download app prompt */}
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.45, duration: 0.4 }}
			>
				<Card className="border-2">
					<CardContent className="p-6 text-center space-y-4">
						<div className="h-10 w-10 mx-auto flex items-center justify-center bg-foreground/10">
							<Download className="h-5 w-5 text-foreground/60" />
						</div>
						<div>
							<p className="font-bold">Download PH Performance</p>
							<p className="text-sm text-muted-foreground mt-1">
								Get the mobile app for the best training experience. Your child can log in with the credentials above.
							</p>
						</div>
						<div className="flex gap-3 justify-center">
							<a
								href="https://apps.apple.com/app/ph-performance/id6737852498"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2 px-4 py-2.5 border-2 font-bold text-sm uppercase tracking-wider hover:bg-muted/60 transition-colors"
							>
								App Store
							</a>
							<a
								href="https://play.google.com/store/apps/details?id=com.phperformanceapp.app"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2 px-4 py-2.5 border-2 font-bold text-sm uppercase tracking-wider hover:bg-muted/60 transition-colors"
							>
								Google Play
							</a>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* Action buttons */}
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.55, duration: 0.4 }}
				className="flex flex-col sm:flex-row gap-3"
			>
				<Link to="/portal/add-child" className="flex-1">
					<motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
						<Button
							variant="outline"
							className="w-full h-12 rounded-xl font-bold uppercase tracking-wider border-2"
						>
							<Plus className="mr-2 h-4 w-4" />
							Add Another Child
						</Button>
					</motion.div>
				</Link>
				<Link to="/portal/dashboard" className="flex-1">
					<motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
						<Button className="w-full h-12 rounded-xl font-bold uppercase tracking-wider">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Dashboard
						</Button>
					</motion.div>
				</Link>
			</motion.div>
		</PageTransition>
	);
}
