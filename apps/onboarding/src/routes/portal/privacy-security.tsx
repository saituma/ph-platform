import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { clearAuthToken } from "@/lib/client-storage";
import { settingsService } from "@/services/settingsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Key, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/lib/motion";
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
	const [password, setPassword] = useState("");
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleChangePassword = async () => {
		if (oldPassword.length < 8 || newPassword.length < 8) {
			toast.error("Passwords must be at least 8 characters");
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match");
			return;
		}
		setIsChangingPassword(true);
		try {
			await settingsService.changePassword({ oldPassword, newPassword });
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");
			toast.success("Password updated successfully");
		} catch (error: any) {
			toast.error(error.message || "Failed to update password");
		} finally {
			setIsChangingPassword(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}
		setIsDeleting(true);
		try {
			await settingsService.deleteAccount(password);
			await clearAuthToken();
			toast.success("Account deleted successfully");
			window.location.href = "/login";
		} catch (error: any) {
			toast.error(error.message || "Failed to delete account");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<PageTransition className="p-6 max-w-2xl mx-auto space-y-6">
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
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="old-password">Current password</Label>
						<Input
							id="old-password"
							type="password"
							value={oldPassword}
							onChange={(e) => setOldPassword(e.target.value)}
							className="h-12 border-2"
							autoComplete="current-password"
						/>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="new-password">New password</Label>
							<Input
								id="new-password"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								className="h-12 border-2"
								autoComplete="new-password"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password">Confirm password</Label>
							<Input
								id="confirm-password"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="h-12 border-2"
								autoComplete="new-password"
							/>
						</div>
					</div>
					<Button
						variant="outline"
						className="w-full h-12 rounded-xl border-2 font-bold uppercase tracking-wider"
						onClick={handleChangePassword}
						disabled={
							isChangingPassword ||
							oldPassword.length < 8 ||
							newPassword.length < 8 ||
							newPassword !== confirmPassword
						}
					>
						{isChangingPassword ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Key className="mr-2 h-4 w-4" />
						)}
						{isChangingPassword ? "Updating..." : "Change Password"}
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
		</PageTransition>
	);
}
