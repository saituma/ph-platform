import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Smartphone, MessageCircle, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/notifications")({
	component: NotificationsPage,
});

function NotificationsPage() {
	const [settings, setSettings] = useState({
		emailPromos: true,
		emailLogs: true,
		appMessages: true,
		appReminders: false,
	});

	const toggle = (key: keyof typeof settings) => {
		const newVal = !settings[key];
		setSettings(prev => ({ ...prev, [key]: newVal }));
		toast.success(`Preference updated`);
	};

	return (
		<div className="p-6 max-w-2xl mx-auto space-y-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">Notifications</h1>
				<p className="text-muted-foreground">Control how and when you receive updates from the platform.</p>
			</div>

			<Card className="border-2">
				<CardHeader>
					<div className="flex items-center gap-2 text-primary">
						<Mail className="h-5 w-5" />
						<CardTitle className="text-lg font-bold uppercase tracking-tight">Email Notifications</CardTitle>
					</div>
					<CardDescription>Manage updates sent to your registered email address.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="font-bold">Training Summaries</Label>
							<p className="text-xs text-muted-foreground">Receive weekly recaps of your progress and logs.</p>
						</div>
						<Switch checked={settings.emailLogs} onCheckedChange={() => toggle('emailLogs')} />
					</div>
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="font-bold">Announcements & News</Label>
							<p className="text-xs text-muted-foreground">Stay updated on new features and platform updates.</p>
						</div>
						<Switch checked={settings.emailPromos} onCheckedChange={() => toggle('emailPromos')} />
					</div>
				</CardContent>
			</Card>

			<Card className="border-2">
				<CardHeader>
					<div className="flex items-center gap-2 text-primary">
						<Smartphone className="h-5 w-5" />
						<CardTitle className="text-lg font-bold uppercase tracking-tight">In-App Alerts</CardTitle>
					</div>
					<CardDescription>Manage push notifications for your mobile device.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<div className="flex items-center gap-2">
								<MessageCircle className="h-3 w-3" />
								<Label className="font-bold">New Messages</Label>
							</div>
							<p className="text-xs text-muted-foreground">Alerts when a coach sends you a new message.</p>
						</div>
						<Switch checked={settings.appMessages} onCheckedChange={() => toggle('appMessages')} />
					</div>
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<div className="flex items-center gap-2">
								<Bell className="h-3 w-3" />
								<Label className="font-bold">Logging Reminders</Label>
							</div>
							<p className="text-xs text-muted-foreground">Get reminded if you haven't logged your metrics for the day.</p>
						</div>
						<Switch checked={settings.appReminders} onCheckedChange={() => toggle('appReminders')} />
					</div>
				</CardContent>
			</Card>

			<div className="bg-primary/5 rounded-2xl p-4 flex gap-4 border-2 border-primary/10">
				<Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
				<p className="text-xs text-muted-foreground leading-relaxed">
					Push notifications require the **PH Mobile App** to be installed on your device. Web portal notifications are currently limited to email and in-browser toasts.
				</p>
			</div>
		</div>
	);
}
