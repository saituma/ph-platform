import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { 
  User, 
  Shield, 
  Clipboard, 
  Bell, 
  Lock, 
  Star, 
  Radio, 
  HelpCircle, 
  MessageSquare, 
  Info, 
  FileText, 
  LogOut,
  ChevronRight,
  Loader2,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showPortalNutritionNav } from "@/lib/portal-roles";
import { usePortal } from "@/portal/PortalContext";

export const Route = createFileRoute("/portal/more")({
  component: MorePage,
});

function MorePage() {
	const { user, loading } = usePortal();

	const handleLogout = () => {
		localStorage.removeItem("auth_token");
		window.location.href = "/login";
	};

	const formatTier = (tier?: string | null) => {
		if (!tier) return "Standard";
		const labels: Record<string, string> = {
			PHP: "PHP Standard",
			PHP_Premium: "Premium",
			PHP_Premium_Plus: "Plus",
			PHP_Pro: "Pro",
		};
		return labels[tier] || tier.replace(/_/g, " ");
	};

	if (loading && !user) {
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<Loader2 className="w-10 h-10 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 pb-24 space-y-8 max-w-2xl">
			<div className="flex items-center gap-3 px-2">
				<div className="h-8 w-2 rounded-full bg-primary" />
				<h1 className="text-4xl font-black italic uppercase tracking-tight">
					More
				</h1>
			</div>

			{/* Profile Card */}
			<div className="relative overflow-hidden rounded-[2.5rem] border bg-card p-8 shadow-sm">
				<div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5" />

				<div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
					<div className="relative">
						{user?.athleteName ? ( // Check if there's any specific field or just use generic avatar
							<div className="h-20 w-20 rounded-[1.5rem] bg-primary/10 flex items-center justify-center border-2 border-primary/5">
								<User className="w-10 h-10 text-primary" />
							</div>
						) : (
							<div className="h-20 w-20 rounded-[1.5rem] bg-primary/10 flex items-center justify-center border-2 border-primary/5">
								<User className="w-10 h-10 text-primary" />
							</div>
						)}
						<div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-4 border-card" />
					</div>

					<div className="text-center sm:text-left flex-1 space-y-1">
						<div className="inline-flex px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-1">
							Account Overview
						</div>
						<h2 className="text-2xl font-black italic uppercase tracking-tight">
							{user?.name || "Athlete Profile"}
						</h2>
						<p className="text-muted-foreground font-medium">
							{user?.email || "Connect your account"}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 mt-8">
					<div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
						<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
							Access Tier
						</p>
						<p className="font-bold text-primary">
							{formatTier(user?.programTier)}
						</p>
					</div>
					<div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
						<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
							Experience
						</p>
						<p className="font-bold">Performance</p>
					</div>
				</div>
			</div>

      {/* Menu Groups */}
      <div className="space-y-8">
        <MenuGroup title="Account">
          <MenuItem icon={<User />} label="Profile Information" path="/portal/profile" />
          <MenuItem icon={<CreditCard />} label="Billing & Plan" path="/portal/billing" />
          <MenuItem icon={<Shield />} label="Permissions" path="/portal/permissions" />
          {showPortalNutritionNav(user?.role) ? (
            <MenuItem icon={<Clipboard />} label="Nutrition Tracking" path="/portal/nutrition" />
          ) : null}
          <MenuItem icon={<Bell />} label="Notifications" path="/portal/notifications" />
          <MenuItem icon={<Lock />} label="Privacy & Security" path="/portal/privacy-security" isLast />
        </MenuGroup>

        <MenuGroup title="Support & About">
          <MenuItem icon={<Star />} label="Submit Testimonial" path="/portal/testimonial" />
          <MenuItem icon={<Radio />} label="Announcements" path="/portal/announcements" />
          <MenuItem icon={<HelpCircle />} label="Help Center" path="/portal/help" />
          <MenuItem icon={<MessageSquare />} label="Send Feedback" path="/portal/feedback" />
          <MenuItem icon={<Info />} label="About Platform" path="/portal/about" isLast />
        </MenuGroup>

        <MenuGroup title="Legal">
          <MenuItem icon={<FileText />} label="Terms of Service" path="/portal/terms" />
          <MenuItem icon={<Shield />} label="Privacy Policy" path="/portal/privacy-policy" isLast />
        </MenuGroup>
      </div>

      {/* Logout Footer */}
      <div className="pt-4">
        <button 
          onClick={handleLogout}
          className="w-full h-16 flex items-center justify-center gap-3 rounded-2xl bg-destructive text-destructive-foreground font-black uppercase italic tracking-wider hover:opacity-90 transition-all shadow-xl shadow-destructive/10"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
        <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-8">
           PH Performance v1.2.0 (Stable)
        </p>
      </div>
    </div>
  );
}

function MenuGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 ml-2">
        <div className="h-4 w-1 rounded-full bg-primary/40" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
      <div className="bg-card border rounded-[2rem] overflow-hidden shadow-sm">
        {children}
      </div>
    </div>
  );
}

function MenuItem({
	icon,
	label,
	path,
	isLast,
}: {
	icon: React.ReactElement<{ className?: string }>;
	label: string;
	path: string;
	isLast?: boolean;
}) {
  return (
    <Link to={path} className={cn(
      "w-full px-6 py-5 flex items-center gap-5 hover:bg-muted/50 transition-all text-left group",
      !isLast && "border-b border-border/50"
    )}>
      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { className: "w-5 h-5" })}
      </div>
      <span className="flex-1 font-bold text-foreground/80">{label}</span>
      <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}
