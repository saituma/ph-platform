import { Badge } from "../../ui/badge";
import { Empty, EmptyTitle, EmptyDescription } from "../../ui/empty";
import { Skeleton } from "../../ui/skeleton";

type Booking = {
  id: number;
  name: string;
  athlete: string;
  time: string;
  type: string;
  status?: string | null;
};

type BookingsListProps = {
  bookings: Booking[];
  isLoading?: boolean;
  onSelect: (booking: Booking) => void;
};

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "cancelled":
    case "declined":
      return "error" as const;
    case "pending":
    case "requested":
      return "warning" as const;
    case "confirmed":
      return "success" as const;
    default:
      return "outline" as const;
  }
}

export function BookingsList({ bookings, isLoading = false, onSelect }: BookingsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`booking-skeleton-${index}`}
            className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 p-4"
          >
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No upcoming bookings</EmptyTitle>
        <EmptyDescription>
          Create a booking when you&apos;re ready to schedule a session.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <button
          type="button"
          key={booking.id}
          onClick={() => onSelect(booking)}
          className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-left text-sm transition hover:border-primary/40"
        >
          <div>
            <p className="font-semibold text-foreground">{booking.name}</p>
            <p className="text-xs text-muted-foreground">{booking.athlete}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-semibold text-foreground">{booking.time}</p>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Badge variant="secondary">{booking.type}</Badge>
              {booking.status ? (
                <Badge variant={getStatusBadgeVariant(booking.status)}>
                  {booking.status === "cancelled" ? "Cancelled by client" : booking.status}
                </Badge>
              ) : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
