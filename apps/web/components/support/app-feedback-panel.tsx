"use client";

import { useState } from "react";

import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { cn } from "../../lib/utils";
import { toast } from "../../lib/toast";
import { useSubmitAppFeedbackMutation } from "../../lib/apiSlice";

const CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "General Feedback",
  "Billing & account",
  "Other",
] as const;

type Variant = "admin" | "parent";

type ApiErrorLike = {
  data?: { error?: string };
  message?: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const e = error as ApiErrorLike;
    if (typeof e.data?.error === "string") return e.data.error;
    if (typeof e.message === "string") return e.message;
  }
  return fallback;
}

export function AppFeedbackPanel({
  variant,
  className,
}: {
  variant: Variant;
  className?: string;
}) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [submitFeedback, { isLoading }] = useSubmitAppFeedbackMutation();

  const sourceLine =
    variant === "parent"
      ? "Parent portal (web)"
      : "Admin dashboard (web)";

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error("Message required", "Please enter a short description so the team can help.");
      return;
    }
    const body = `[${sourceLine}]\n\n${trimmed}`;
    if (body.length > 8000) {
      toast.error("Too long", "Please keep your message under the character limit.");
      return;
    }
    try {
      await submitFeedback({ category, message: body }).unwrap();
      toast.success("Sent", "Your message was delivered to the team. It appears in Messaging like other coach DMs.");
      setMessage("");
    } catch (err: unknown) {
      const detail = getErrorMessage(err, "Please try again.");
      toast.error("Could not send", detail);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Send feedback</CardTitle>
        <CardDescription>
          Reports go to your coaching team as a direct message (same pipeline as the mobile app). Include what you were doing,
          what you expected, and what happened instead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  category === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-secondary/60",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-message">Your message</Label>
          <Textarea
            id="support-message"
            placeholder="What should we know?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[180px] resize-y"
            maxLength={7800}
          />
          <p className="text-xs text-muted-foreground">{message.length} / 7800</p>
        </div>
        <Button type="button" onClick={() => void handleSubmit()} disabled={isLoading || !message.trim()}>
          {isLoading ? "Sending…" : "Send to team"}
        </Button>
      </CardContent>
    </Card>
  );
}
