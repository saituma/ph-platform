import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { usePortal } from "@/portal/PortalContext";
import { settingsService } from "@/services/settingsService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/profile")({
	component: ProfilePage,
});

function displayName(user: ReturnType<typeof usePortal>["user"]): string {
	if (user?.name && user.name !== "User") return user.name;
	if (user?.athleteName) return user.athleteName;
	if (user?.team?.name) return user.team.name;
	return "";
}

function ProfilePage() {
	const { user, refreshUser } = usePortal();
	const resolved = displayName(user);
	const [name, setName] = useState(resolved);
	const [isSaving, setIsSaving] = useState(false);
	const [isUploading, setIsUploading] = useState(false);

	useEffect(() => {
		const n = displayName(user);
		if (n) setName(n);
	}, [user]);

	const handleSave = async () => {
		if (!name.trim()) return;
		setIsSaving(true);
		try {
			await settingsService.updateProfile({ name: name.trim() });
			await refreshUser();
			toast.success("Profile updated successfully");
		} catch (error: any) {
			toast.error(error.message || "Failed to update profile");
		} finally {
			setIsSaving(false);
		}
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploading(true);
		try {
			const { uploadUrl, publicUrl } = await settingsService.presignUpload({
				folder: "profile-photos",
				fileName: `avatar-${Date.now()}-${file.name}`,
				contentType: file.type,
				sizeBytes: file.size,
			});

			await fetch(uploadUrl, {
				method: "PUT",
				headers: { "Content-Type": file.type },
				body: file,
			});

			await settingsService.updateProfile({ profilePicture: publicUrl });
			await refreshUser();
			toast.success("Avatar updated successfully");
		} catch (error: any) {
			toast.error(error.message || "Failed to upload avatar");
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className="p-6 max-w-2xl mx-auto space-y-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black uppercase italic tracking-tighter">Profile Information</h1>
				<p className="text-muted-foreground">Fine-tune identity details and keep your account polished.</p>
			</div>

			<Card className="border-2">
				<CardHeader>
					<CardTitle className="text-lg font-bold">Your Avatar</CardTitle>
					<CardDescription>Click on the image to upload a new profile picture.</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center gap-6">
					<div className="relative group cursor-pointer">
						<Avatar className="h-24 w-24 border-2 border-primary/20">
							<AvatarImage src={user?.profilePicture || ""} alt={user?.name || "User"} />
							<AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
								{user?.name?.slice(0, 2).toUpperCase() || "PH"}
							</AvatarFallback>
						</Avatar>
						<Input
							type="file"
							accept="image/*"
							className="absolute inset-0 opacity-0 cursor-pointer"
							onChange={handleFileChange}
							disabled={isUploading}
						/>
						{isUploading && (
							<div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
								<Loader2 className="h-6 w-6 animate-spin text-primary" />
							</div>
						)}
					</div>
					<div className="flex-1 space-y-1">
						<p className="font-black uppercase italic tracking-tight">{user?.name || "Athlete"}</p>
						<p className="text-sm text-muted-foreground">{user?.email}</p>
					</div>
				</CardContent>
			</Card>

			<Card className="border-2">
				<CardHeader>
					<CardTitle className="text-lg font-bold">Account Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Full Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Enter your name"
							className="h-12 rounded-xl border-2 focus-visible:ring-primary"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email Address</Label>
						<Input
							id="email"
							value={user?.email || ""}
							disabled
							className="h-12 rounded-xl border-2 bg-muted/50"
						/>
						<p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider px-1">
							Email cannot be changed from the portal.
						</p>
					</div>
					<Button
						onClick={handleSave}
						disabled={isSaving || !name.trim() || name === user?.name}
						className="w-full h-12 rounded-xl font-bold uppercase italic tracking-wider transition-all active:scale-[0.98]"
					>
						{isSaving ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<CheckCircle2 className="mr-2 h-4 w-4" />
						)}
						{isSaving ? "Saving Changes..." : "Save Changes"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
