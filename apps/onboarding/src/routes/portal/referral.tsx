import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	Check,
	Copy,
	Gift,
	Loader2,
	Share2,
	UserCheck,
	Users,
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
import { usePortal } from "@/portal/PortalContext";
import { settingsService } from "@/services/settingsService";

export const Route = createFileRoute("/portal/referral")({
	component: ReferralPage,
});

type ReferralStats = {
	code: string | null;
	total: number;
	referrals: Array<{ id: number; claimedAt: string; displayName: string }>;
};

function ReferralPage() {
	const { user } = usePortal();
	const [stats, setStats] = useState<ReferralStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		settingsService
			.getMyReferrals()
			.then(setStats)
			.catch(() => toast.error("Could not load referral data"))
			.finally(() => setLoading(false));
	}, []);

	const referralCode = stats?.code ?? null;
	const referralLink = referralCode
		? `${window.location.origin}/register?ref=${referralCode}`
		: null;

	const handleCopyCode = async () => {
		if (!referralCode) return;
		await navigator.clipboard.writeText(referralCode);
		setCopied(true);
		toast.success("Referral code copied!");
		setTimeout(() => setCopied(false), 2000);
	};

	const handleCopyLink = async () => {
		if (!referralLink) return;
		await navigator.clipboard.writeText(referralLink);
		toast.success("Referral link copied!");
	};

	const handleShare = async () => {
		if (!referralLink) return;
		if (navigator.share) {
			await navigator.share({
				title: "Join me on PH App",
				text: `Use my referral code ${referralCode} to sign up!`,
				url: referralLink,
			});
		} else {
			await handleCopyLink();
		}
	};

	return (
		<div className="p-6 max-w-3xl mx-auto space-y-6">
			<div className="space-y-2">
				<div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-primary">
					<Gift className="h-3.5 w-3.5" />
					Referral Program
				</div>
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">
					Invite & Grow
				</h1>
				<p className="text-muted-foreground max-w-lg">
					Share your unique code with friends and fellow athletes. Every athlete who joins using your code is tracked here.
				</p>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-16">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : (
				<>
					{/* Code Card */}
					<Card className="border-2">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg font-bold">
								<Share2 className="h-5 w-5 text-primary" />
								Your Referral Code
							</CardTitle>
							<CardDescription>
								Share this code or link — anyone who signs up with it gets counted under your account.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{referralCode ? (
								<>
									<div className="flex items-center gap-3">
										<div className="flex-1 rounded-xl border-2 bg-muted/40 px-5 py-3">
											<p className="text-2xl font-black tracking-widest text-foreground">
												{referralCode}
											</p>
										</div>
										<Button
											variant="outline"
											className="h-12 rounded-xl border-2 font-bold px-4"
											onClick={() => void handleCopyCode()}
										>
											{copied ? (
												<Check className="h-4 w-4 text-green-600" />
											) : (
												<Copy className="h-4 w-4" />
											)}
										</Button>
									</div>

									<div className="flex flex-col sm:flex-row gap-2">
										<Button
											className="flex-1 h-11 rounded-xl font-bold uppercase tracking-wider"
											onClick={() => void handleShare()}
										>
											<Share2 className="mr-2 h-4 w-4" />
											Share Link
										</Button>
										<Button
											variant="outline"
											className="flex-1 h-11 rounded-xl border-2 font-bold uppercase tracking-wider"
											onClick={() => void handleCopyLink()}
										>
											<Copy className="mr-2 h-4 w-4" />
											Copy Link
										</Button>
									</div>

									<div className="rounded-xl bg-muted/30 border p-3">
										<p className="text-xs text-muted-foreground break-all font-mono">
											{referralLink}
										</p>
									</div>
								</>
							) : (
								<p className="text-sm text-muted-foreground">
									Loading your referral code...
								</p>
							)}
						</CardContent>
					</Card>

					{/* Stats */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Card className="border-2">
							<CardContent className="pt-6 flex items-center gap-4">
								<div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
									<Users className="h-6 w-6" />
								</div>
								<div>
									<p className="text-3xl font-black">{stats?.total ?? 0}</p>
									<p className="text-sm text-muted-foreground font-medium">
										Athletes referred
									</p>
								</div>
							</CardContent>
						</Card>
						<Card className="border-2">
							<CardContent className="pt-6 flex items-center gap-4">
								<div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
									<UserCheck className="h-6 w-6" />
								</div>
								<div>
									<p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
										Your account
									</p>
									<p className="text-sm font-bold truncate max-w-[150px]">
										{user?.name || user?.email}
									</p>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Referral List */}
					{stats && stats.referrals.length > 0 && (
						<Card className="border-2">
							<CardHeader>
								<CardTitle className="text-base font-bold uppercase tracking-tight">
									Athletes You Referred
								</CardTitle>
							</CardHeader>
							<CardContent className="p-0">
								<div className="divide-y">
									{stats.referrals.map((r) => (
										<div
											key={r.id}
											className="flex items-center justify-between px-5 py-3"
										>
											<div className="flex items-center gap-3">
												<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black">
													{r.displayName.slice(0, 1).toUpperCase()}
												</div>
												<span className="text-sm font-bold">{r.displayName}</span>
											</div>
											<span className="text-xs text-muted-foreground">
												{new Date(r.claimedAt).toLocaleDateString(undefined, {
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
											</span>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* How it works */}
					<Card className="border-2 bg-muted/20">
						<CardHeader>
							<CardTitle className="text-base font-bold uppercase tracking-tight">
								How it works
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{[
								{ step: "1", text: "Share your unique referral code or link with an athlete." },
								{ step: "2", text: "They sign up using your code during registration." },
								{ step: "3", text: "Their account is linked to yours — tracked here." },
							].map((item) => (
								<div key={item.step} className="flex items-start gap-3">
									<div className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
										{item.step}
									</div>
									<p className="text-sm text-muted-foreground">{item.text}</p>
								</div>
							))}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	);
}
