"use client";

import { useParams, useRouter } from "next/navigation";

import { AdminShell } from "../../../components/admin/shell";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  useGetBookingByIdQuery,
  useUpdateBookingStatusMutation,
} from "../../../lib/apiSlice";

const BOOKING_TYPE_LABELS: Record<string, string> = {
  group_call: "Group Call",
  individual_call: "1:1",
  one_on_one: "1:1",
  lift_lab_1on1: "Lift Lab 1:1",
  role_model: "Premium",
  call: "Call",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  requested: "Requested",
  declined: "Declined",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
  pending: "border-amber-200/70 bg-amber-50/80 text-amber-700",
  requested: "border-amber-200/70 bg-amber-50/80 text-amber-700",
  declined: "border-rose-200/70 bg-rose-50/80 text-rose-700",
  cancelled: "border-slate-200/70 bg-slate-50/80 text-slate-700",
};

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = Number(params.id);
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useGetBookingByIdQuery(bookingId, { skip: !bookingId });
  const [updateBookingStatus, { isLoading: isUpdating }] =
    useUpdateBookingStatusMutation();

  const booking = data?.booking ?? null;
  const statusKey = booking?.status ?? "unknown";
  const bookingTypeKey = booking?.type ?? "";

  const handleApprove = async () => {
    if (!booking) return;
    await updateBookingStatus({ bookingId: booking.id, status: "confirmed" }).unwrap();
    refetch();
  };

  const handleDecline = async () => {
    if (!booking) return;
    await updateBookingStatus({ bookingId: booking.id, status: "declined" }).unwrap();
    refetch();
  };

  if (!bookingId) {
    return (
      <AdminShell title="Booking" subtitle="Invalid booking ID.">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Invalid booking ID.
          </CardContent>
        </Card>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Booking Details"
      subtitle={booking ? `#${booking.id} — ${booking.serviceName ?? "Session"}` : "Loading..."}
    >
      <div className="mb-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/bookings")}>
          ← Back to Bookings
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading booking…
          </CardContent>
        </Card>
      ) : error || !booking ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Booking not found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left: Booking info */}
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {booking.serviceName ?? "Session"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {BOOKING_TYPE_LABELS[bookingTypeKey] ?? booking.type ?? "Session"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${STATUS_STYLES[statusKey] ?? "border-border text-muted-foreground"}`}
                >
                  {STATUS_LABELS[statusKey] ?? statusKey}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Athlete" value={booking.athleteName ?? "Unknown"} />
                <InfoRow label="Guardian" value={booking.guardianName ?? "Unknown"} />
                <InfoRow label="Email" value={booking.guardianEmail ?? "N/A"} />
                <InfoRow
                  label="Starts"
                  value={
                    booking.startsAt
                      ? new Date(booking.startsAt).toLocaleString()
                      : "—"
                  }
                />
                <InfoRow
                  label="Ends"
                  value={
                    booking.endTime
                      ? new Date(booking.endTime).toLocaleString()
                      : "—"
                  }
                />
                <InfoRow label="Location" value={booking.location ?? "None"} />
                <InfoRow
                  label="Meeting Link"
                  value={
                    booking.meetingLink ? (
                      <a
                        href={booking.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {booking.meetingLink}
                      </a>
                    ) : (
                      "None"
                    )
                  }
                />
                <InfoRow
                  label="Created"
                  value={
                    booking.createdAt
                      ? new Date(booking.createdAt).toLocaleString()
                      : "—"
                  }
                />
              </div>

              {/* Slot capacity info */}
              {booking.slotsTotal != null && booking.slotsTotal > 0 ? (
                <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                  <p className="text-sm font-medium text-foreground">Slot Capacity</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            ((booking.slotsUsed ?? 0) / booking.slotsTotal) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                      {booking.slotsUsed ?? 0} / {booking.slotsTotal}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Math.max(0, booking.slotsTotal - (booking.slotsUsed ?? 0))} slot
                    {Math.max(0, booking.slotsTotal - (booking.slotsUsed ?? 0)) === 1
                      ? ""
                      : "s"}{" "}
                    remaining
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Right: Actions */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-foreground">Actions</h3>
              <p className="text-sm text-muted-foreground">
                {statusKey === "pending"
                  ? "This booking is awaiting your approval."
                  : `This booking is ${STATUS_LABELS[statusKey]?.toLowerCase() ?? statusKey}.`}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusKey === "pending" ? (
                <>
                  <Button
                    className="w-full"
                    onClick={handleApprove}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Processing…" : "Approve Booking"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDecline}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Processing…" : "Decline Booking"}
                  </Button>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
                  No actions available for {STATUS_LABELS[statusKey]?.toLowerCase() ?? statusKey} bookings.
                </div>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/bookings")}
              >
                Go to All Bookings
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
