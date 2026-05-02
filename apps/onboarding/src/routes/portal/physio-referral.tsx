import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { settingsService } from "@/services/settingsService";
import { PageTransition } from "@/lib/motion";

export const Route = createFileRoute("/portal/physio-referral")({
	component: PhysioReferralPage,
});

function PhysioReferralPage() {
	const [referral, setReferral] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		settingsService
			.getMyPhysioReferral()
			.then((res) => setReferral(res.item ?? null))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	return (
		<PageTransition className="p-6 max-w-2xl mx-auto space-y-6">
			<div className="space-y-2">
				<div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-primary">
					<Stethoscope className="h-3.5 w-3.5" />
					Provider Referral
				</div>
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">
					My Referral
				</h1>
				<p className="text-muted-foreground">
					Provider referrals assigned to you by your coach or admin.
				</p>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-16">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : !referral ? (
				<Card className="border-2 border-dashed">
					<CardContent className="py-16 text-center space-y-2">
						<Stethoscope className="h-10 w-10 text-muted-foreground/30 mx-auto" />
						<p className="text-muted-foreground text-sm font-medium">
							No referral assigned yet.
						</p>
						<p className="text-muted-foreground/60 text-xs">
							Your coach will add one when needed.
						</p>
					</CardContent>
				</Card>
			) : (
				<ReferralCard referral={referral} />
			)}
		</PageTransition>
	);
}

function ReferralCard({ referral }: { referral: any }) {
	const meta = referral.metadata ?? {};

	const details = [
		meta.providerName && ["Provider", meta.providerName],
		meta.physioName && ["Physio", meta.physioName],
		meta.specialty && ["Specialty", meta.specialty],
		meta.phone && ["Phone", meta.phone],
		meta.email && ["Email", meta.email],
		meta.location && ["Location", meta.location],
	].filter(Boolean) as [string, string][];

	return (
		<Card className="border-2">
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-1">
						<CardTitle className="text-lg font-bold">
							{meta.clinicName ??
								meta.organizationName ??
								meta.providerName ??
								meta.referralType ??
								"Referral"}
						</CardTitle>
						{meta.referralType && (
							<Badge
								variant="secondary"
								className="rounded-full font-bold text-xs"
							>
								{meta.referralType}
							</Badge>
						)}
					</div>
					{referral.discountPercent ? (
						<Badge className="rounded-full font-bold shrink-0 bg-green-500/10 text-green-700 border-green-200">
							{referral.discountPercent}% discount
						</Badge>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{details.length > 0 && (
					<div className="rounded-xl bg-muted/30 divide-y">
						{details.map(([label, value]) => (
							<div
								key={label}
								className="flex justify-between items-center px-4 py-3 text-sm gap-3"
							>
								<span className="text-muted-foreground font-medium shrink-0">
									{label}
								</span>
								<span className="font-bold text-right">{value}</span>
							</div>
						))}
					</div>
				)}

				{meta.notes && (
					<div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground italic">
						{meta.notes}
					</div>
				)}

				{referral.referalLink && (
					<a
						href={referral.referalLink}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(
							"flex items-center justify-center gap-2 w-full h-11 rounded-xl font-bold",
							"bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
						)}
					>
						<ExternalLink className="h-4 w-4" />
						Open Referral Link
					</a>
				)}
			</CardContent>
		</Card>
	);
}
