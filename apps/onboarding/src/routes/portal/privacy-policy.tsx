import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Eye, Database } from "lucide-react";

export const Route = createFileRoute("/portal/privacy-policy")({
	component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
	return (
		<div className="p-6 max-w-4xl mx-auto space-y-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">Privacy Policy</h1>
				<p className="text-muted-foreground">How we handle and protect your personal data.</p>
			</div>

			<Card className="border-2 overflow-hidden">
				<div className="bg-primary/5 p-6 border-b-2">
					<div className="flex items-center gap-4">
						<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
							<Shield className="h-6 w-6" />
						</div>
						<div className="space-y-1">
							<h2 className="text-xl font-bold uppercase tracking-tight leading-none">Your Data is Secure</h2>
							<p className="text-sm text-muted-foreground">We prioritize your privacy above all else.</p>
						</div>
					</div>
				</div>
				<CardContent className="p-0">
					<div className="divide-y divide-muted-foreground/10">
						<div className="p-6 flex gap-6">
							<Lock className="h-6 w-6 text-primary shrink-0 mt-1" />
							<div className="space-y-2">
								<h3 className="font-black uppercase italic tracking-tight text-lg">Data Encryption</h3>
								<p className="text-foreground/80 leading-relaxed">
									All personal data is encrypted at rest and in transit using industry-standard security protocols.
								</p>
							</div>
						</div>
						
						<div className="p-6 flex gap-6">
							<Eye className="h-6 w-6 text-primary shrink-0 mt-1" />
							<div className="space-y-2">
								<h3 className="font-black uppercase italic tracking-tight text-lg">Limited Access</h3>
								<p className="text-foreground/80 leading-relaxed">
									Only your assigned coaches and authorized administrators have access to your performance and nutrition logs.
								</p>
							</div>
						</div>

						<div className="p-6 flex gap-6">
							<Database className="h-6 w-6 text-primary shrink-0 mt-1" />
							<div className="space-y-2">
								<h3 className="font-black uppercase italic tracking-tight text-lg">Your Rights</h3>
								<p className="text-foreground/80 leading-relaxed">
									You have the right to request a copy of your data or ask for its permanent deletion at any time through the Privacy & Security tab.
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="bg-muted/30 rounded-2xl p-6 text-center">
				<p className="text-sm text-muted-foreground leading-relaxed">
					For questions regarding our privacy practices, please contact us at <span className="font-bold text-primary">privacy@phperformance.uk</span>
				</p>
			</div>
		</div>
	);
}
