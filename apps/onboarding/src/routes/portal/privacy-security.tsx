import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { settingsService } from "@/services/settingsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Key, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/portal/privacy-security")({
	component: PrivacySecurityPage,
});

function PrivacySecurityPage() {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDeleteAccount = async () => {
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}
		setIsDeleting(true);
		try {
			await settingsService.deleteAccount(password);
			localStorage.removeItem("auth_token");
			toast.success("Account deleted successfully");
			window.location.href = "/login";
		} catch (error: any) {
			toast.error(error.message || "Failed to delete account");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className="p-6 max-w-2xl mx-auto space-y-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">Privacy & Security</h1>
				<p className="text-muted-foreground">Manage your account security and data privacy.</p>
			</div>

			<Card className="border-2">
				<CardHeader>
					<div className="flex items-center gap-2 text-primary">
						<Key className="h-5 w-5" />
						<CardTitle className="text-lg font-bold">Password</CardTitle>
					</div>
					<CardDescription>Update your password to keep your account secure.</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="outline"
						className="w-full h-12 rounded-xl border-2 font-bold uppercase tracking-wider"
						onClick={() => toast.info("Password change flow would go here")}
					>
						Change Password
					</Button>
				</CardContent>
			</Card>

			<Card className="border-2 border-destructive/20 bg-destructive/5">
				<CardHeader>
					<div className="flex items-center gap-2 text-destructive">
						<Trash2 className="h-5 w-5" />
						<CardTitle className="text-lg font-bold">Danger Zone</CardTitle>
					</div>
					<CardDescription className="text-destructive/80">
						Permanently delete your account and all associated data.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-destructive/70">
						This action is irreversible. All your progress, logs, and personal information will be permanently removed.
					</p>
					
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="destructive"
								className="w-full h-12 rounded-xl font-bold uppercase tracking-wider"
							>
								Delete Account
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent className="rounded-2xl">
							<AlertDialogHeader>
								<AlertDialogTitle className="text-xl font-black uppercase italic tracking-tight">Are you absolutely sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. This will permanently delete your account
									and remove your data from our servers.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<div className="py-4 space-y-2">
								<Label htmlFor="delete-password">Enter password to confirm</Label>
								<Input
									id="delete-password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Your current password"
									className="h-12 border-2 focus-visible:ring-destructive"
								/>
							</div>
							<AlertDialogFooter>
								<AlertDialogCancel className="rounded-xl font-bold uppercase">Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={(e) => {
										e.preventDefault();
										handleDeleteAccount();
									}}
									disabled={isDeleting || password.length < 8}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold uppercase"
								>
									{isDeleting ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<AlertTriangle className="mr-2 h-4 w-4" />
									)}
									{isDeleting ? "Deleting..." : "Delete Permanently"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardContent>
			</Card>
		</div>
	);
}
