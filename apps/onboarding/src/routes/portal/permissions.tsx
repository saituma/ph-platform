import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Key, Bell, UserCheck, Lock, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/lib/motion";

export const Route = createFileRoute("/portal/permissions")({
	component: PermissionsPage,
});

function PermissionsPage() {
	const permissions = [
		{
			title: "Account Access",
			description: "Manage your login credentials and active sessions.",
			icon: Key,
			status: "Active",
			tone: "success",
		},
		{
			title: "Profile Visibility",
			description: "Control who can see your progress and performance stats.",
			icon: UserCheck,
			status: "Private",
			tone: "secondary",
		},
		{
			title: "Data Sharing",
			description: "Allow coaches to access your nutrition and training logs.",
			icon: Shield,
			status: "Granted",
			tone: "success",
		},
		{
			title: "Push Notifications",
			description: "Native mobile app alerts for real-time updates.",
			icon: Bell,
			status: "Configured",
			tone: "info",
		},
	];

	return (
		<PageTransition className="p-6 max-w-4xl mx-auto space-y-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">Access & Permissions</h1>
				<p className="text-muted-foreground">Review and manage your security settings and data access.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{permissions.map((p) => {
					const Icon = p.icon;
					return (
						<Card key={p.title} className="border-2 overflow-hidden hover:border-primary/40 transition-all group">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
									<Icon className="h-5 w-5" />
								</div>
								<Badge 
									variant={p.tone as any} 
									className="uppercase font-black text-[10px] px-2 py-0"
								>
									{p.status}
								</Badge>
							</CardHeader>
							<CardContent>
								<CardTitle className="text-lg font-bold uppercase tracking-tight mb-1">{p.title}</CardTitle>
								<CardDescription className="font-medium">{p.description}</CardDescription>
							</CardContent>
						</Card>
					);
				})}
			</div>

			<Card className="border-2 bg-muted/30">
				<CardHeader>
					<div className="flex items-center gap-2 text-primary">
						<Smartphone className="h-5 w-5" />
						<CardTitle className="text-lg font-bold uppercase tracking-tight">Device Authorization</CardTitle>
					</div>
					<CardDescription>View and manage devices that have access to your account.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between p-4 rounded-xl border-2 bg-card">
						<div className="flex items-center gap-4">
							<div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center">
								<Smartphone className="h-5 w-5 text-primary" />
							</div>
							<div>
								<p className="font-bold">This Browser (Web Portal)</p>
								<p className="text-xs text-muted-foreground uppercase font-black">Last active: Just now</p>
							</div>
						</div>
						<Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-black text-[10px]">Current</Badge>
					</div>
					
					<div className="flex items-center justify-center p-8 border-2 border-dashed rounded-2xl">
						<div className="text-center space-y-2">
							<Lock className="h-8 w-8 text-muted-foreground mx-auto opacity-20" />
							<p className="text-sm text-muted-foreground font-bold italic">No other authorized devices found.</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</PageTransition>
	);
}
