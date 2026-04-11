"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ReviewBooking = {
  id: number;
  status: "pending" | "confirmed" | "declined" | "cancelled" | string;
  serviceName: string;
  athleteName: string;
  startsAt: string | null;
  endTime: string | null;
  location: string | null;
  meetingLink: string | null;
};

type ReviewGetResponse =
  | { ok: true; booking: ReviewBooking }
  | { ok: false; error: string; booking?: { id: number; status: string } };

type PostUpdates = {
  startsAt?: string;
  endTime?: string | null;
  location?: string | null;
  meetingLink?: string | null;
};

function isoToLocalInput(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function localInputToIso(value: string) {
  // value is YYYY-MM-DDTHH:mm in local time
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

export default function BookingActionClient(props: {
  token: string;
  apiBase: string;
  adminUrl: string;
}) {
  const token = props.token.trim();
  const apiBase = props.apiBase.replace(/\/$/, "");

  const [mode, setMode] = useState<"loading" | "review" | "message" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string>("");
  const [booking, setBooking] = useState<ReviewBooking | null>(null);
  const [startsAt, setStartsAt] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [meetingLink, setMeetingLink] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const canEdit = useMemo(
    () => booking?.status === "pending",
    [booking?.status],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setMode("error");
        setMessage("Missing booking action token.");
        return;
      }
      if (!apiBase) {
        setMode("error");
        setMessage("Missing API base URL.");
        return;
      }

      setMode("loading");
      setMessage("");

      const url = `${apiBase}/api/public/booking-action?token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { cache: "no-store" });

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = (await res
          .json()
          .catch(() => null)) as ReviewGetResponse | null;
        if (!data) {
          if (cancelled) return;
          setMode("error");
          setMessage("Failed to load booking details.");
          return;
        }

        if (!res.ok || !data.ok) {
          if (cancelled) return;
          setMode("error");
          setMessage(
            "error" in data ? data.error : "Failed to load booking details.",
          );
          return;
        }

        if (cancelled) return;
        setBooking(data.booking);
        setStartsAt(
          data.booking.startsAt ? isoToLocalInput(data.booking.startsAt) : "",
        );
        setEndTime(
          data.booking.endTime ? isoToLocalInput(data.booking.endTime) : "",
        );
        setLocation(data.booking.location ?? "");
        setMeetingLink(data.booking.meetingLink ?? "");
        setMode("review");
        return;
      }

      const text = await res.text().catch(() => "");
      if (cancelled) return;
      setMode(res.ok ? "message" : "error");
      setMessage(
        text || (res.ok ? "Booking updated." : "Failed to update booking."),
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, apiBase]);

  async function submit(action: "approve" | "decline") {
    if (!apiBase) return;
    setSubmitting(true);
    setMessage("");

    try {
      const updates: PostUpdates = {};

      if (action === "approve") {
        const startsAtIso = startsAt ? localInputToIso(startsAt) : null;
        const endTimeIso = endTime ? localInputToIso(endTime) : null;

        if (startsAtIso) updates.startsAt = startsAtIso;
        if (endTime) updates.endTime = endTimeIso;
        if (location.trim().length) updates.location = location;
        else updates.location = null;
        if (meetingLink.trim().length) updates.meetingLink = meetingLink;
        else updates.meetingLink = null;
      }

      const res = await fetch(`${apiBase}/api/public/booking-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action,
          ...(action === "approve" ? { updates } : {}),
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setMode("error");
        setMessage(json?.error || "Action failed.");
        return;
      }

      setMode("message");
      setMessage(
        json.message ||
          (action === "approve" ? "Booking confirmed." : "Booking declined."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const tbd = "TBD (coach will confirm)";

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Booking review</h1>

        {mode === "loading" ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : null}

        {mode === "error" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {message || "Something went wrong."}
          </p>
        ) : null}

        {mode === "message" ? (
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        ) : null}

        {mode === "review" && booking ? (
          <>
            <div className="mt-4 rounded-2xl border border-border p-4">
              <p className="text-sm">
                <span className="font-semibold">
                  {booking.serviceName || "Session"}
                </span>
                {booking.athleteName ? ` · ${booking.athleteName}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Status: {booking.status}
              </p>
            </div>

            {!canEdit ? (
              <p className="mt-4 text-sm text-muted-foreground">
                This request has already been processed.
              </p>
            ) : (
              <>
                <div className="mt-6 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Starts at
                    </span>
                    <input
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      End time (optional)
                    </span>
                    <input
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Location
                    </span>
                    <input
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                      value={location}
                      placeholder={tbd}
                      onChange={(e) => setLocation(e.target.value)}
                      maxLength={500}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Meeting link
                    </span>
                    <input
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                      value={meetingLink}
                      placeholder={tbd}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      maxLength={500}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => submit("approve")}
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {submitting ? "Working…" : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => submit("decline")}
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              </>
            )}
          </>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={props.adminUrl}
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground"
          >
            Open Admin
          </a>
          <Link
            href="/bookings"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground"
          >
            Go to Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}
