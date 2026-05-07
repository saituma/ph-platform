import { Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";

export function ForbiddenPage({ message }: { message?: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mb-6">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        {message || "You don't have permission to view this page. Please check your subscription or contact support."}
      </p>
      <div className="flex gap-4">
        <Link
          to="/portal/dashboard"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold"
        >
          Go to Dashboard
        </Link>
        <Link
          to="/"
          className="px-6 py-3 border border-foreground/10 rounded-xl font-bold"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
