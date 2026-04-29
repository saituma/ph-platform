"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { AdminShell } from "../../components/admin/shell";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useGetAppFeedbackQuery } from "../../lib/apiSlice";

type FeedbackItem = {
  id: number;
  senderId: number;
  senderName: string;
  senderEmail: string;
  category: string;
  message: string;
  createdAt: string;
};

const CATEGORY_FILTERS = [
  "All",
  "Bug Report",
  "Feature Request",
  "General Feedback",
  "Billing & account",
  "Other",
];

export default function AdminSupportPage() {
  const { data, isLoading, isError, refetch } = useGetAppFeedbackQuery();
  const [filter, setFilter] = useState("All");
  const [viewing, setViewing] = useState<FeedbackItem | null>(null);

  const items = data?.items ?? [];
  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((it) => it.category === filter)),
    [items, filter],
  );

  return (
    <AdminShell
      title="Support & feedback"
      subtitle="User-submitted feedback from the mobile app. Each entry was sent through the in-app Support form."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="outline" render={<Link href="/messaging" />}>
          Open Messaging
        </Button>
        <Button variant="outline" onClick={() => void refetch()} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={filter === cat ? "default" : "outline"}
            onClick={() => setFilter(cat)}
          >
            {cat}
            {cat !== "All" ? (
              <span className="ml-2 text-xs opacity-70">
                {items.filter((it) => it.category === cat).length}
              </span>
            ) : (
              <span className="ml-2 text-xs opacity-70">{items.length}</span>
            )}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading feedback…"
              : isError
              ? "Could not load feedback."
              : filtered.length === 0
              ? "No feedback yet for this filter."
              : `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setViewing(item)}
              className="block w-full rounded-2xl border border-border bg-secondary/20 p-4 text-left transition hover:border-primary/40 hover:bg-secondary/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {item.senderName}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {item.senderEmail}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
                  {item.category}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-foreground">{item.message}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          {viewing ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.category}</DialogTitle>
                <DialogDescription>
                  From {viewing.senderName} ({viewing.senderEmail}) ·{" "}
                  {new Date(viewing.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="whitespace-pre-wrap rounded-2xl border border-border bg-secondary/20 p-4 text-sm text-foreground">
                  {viewing.message}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setViewing(null)}>
                    Close
                  </Button>
                  <Button render={<Link href={`/messaging?userId=${viewing.senderId}`} />}>
                    Reply in Messaging
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
