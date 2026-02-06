"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "../../components/admin/shell";
import { SectionHeader } from "../../components/admin/section-header";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { BookingsDialogs, type BookingsDialog } from "../../components/admin/bookings/bookings-dialogs";
import { BookingsFilters } from "../../components/admin/bookings/bookings-filters";
import { BookingsList } from "../../components/admin/bookings/bookings-list";
import { AvailabilityPanel } from "../../components/admin/bookings/availability-panel";

const bookings = [
  {
    name: "Role Model Meeting",
    athlete: "Jordan Miles",
    time: "13:00",
    type: "Video",
  },
  {
    name: "Lift Lab 1:1",
    athlete: "Kayla Davis",
    time: "15:30",
    type: "In-person",
  },
  {
    name: "Group Call",
    athlete: "PHP Plus Cohort",
    time: "18:00",
    type: "Video",
  },
];

export default function BookingsPage() {
  const isLoading = false;
  const [activeDialog, setActiveDialog] = useState<BookingsDialog>(null);
  const [selectedBooking, setSelectedBooking] = useState<(typeof bookings)[number] | null>(null);
  const [activeChip, setActiveChip] = useState<string>("All");
  const chips = ["All", "Video", "In-person", "Group", "Premium"];

  const filteredBookings = useMemo(() => {
    if (activeChip === "All") return bookings;
    if (activeChip === "Group") return bookings.filter((booking) => booking.name.includes("Group"));
    if (activeChip === "Premium") return bookings.filter((booking) => booking.name.includes("Role Model"));
    return bookings.filter((booking) => booking.type === activeChip);
  }, [activeChip]);

  return (
    <AdminShell
      title="Bookings"
      subtitle="Manage availability and upcoming sessions."
      actions={<Button onClick={() => setActiveDialog("new-service")}>New Service</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="space-y-4">
            <SectionHeader
              title="Upcoming"
              description="Next confirmed sessions."
              actionLabel="Calendar"
              onAction={() => setActiveDialog("calendar")}
            />
            <BookingsFilters chips={chips} onChipSelect={setActiveChip} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-6 text-center text-sm text-muted-foreground">
                Loading bookings...
              </div>
            ) : (
              <BookingsList
                bookings={filteredBookings}
                onSelect={(booking) => {
                  setSelectedBooking(booking);
                  setActiveDialog("booking-details");
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeader
              title="Availability Blocks"
              description="Open or adjust coaching windows."
            />
          </CardHeader>
          <CardContent>
            <AvailabilityPanel
              isLoading={isLoading}
              onOpenSlots={() => setActiveDialog("open-slots")}
            />
          </CardContent>
        </Card>
      </div>

      <BookingsDialogs
        active={activeDialog}
        onClose={() => setActiveDialog(null)}
        selectedBooking={selectedBooking}
      />
    </AdminShell>
  );
}
