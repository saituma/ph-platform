type BookingActionPageProps = {
  searchParams?: { token?: string };
};

const getApiBase = () => {
  return process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "";
};

async function actOnBooking(token: string) {
  const base = getApiBase();
  if (!base) {
    return { ok: false, message: "Missing API base URL." };
  }
  const url = `${base.replace(/\/$/, "")}/api/public/booking-action?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  return { ok: res.ok, message: text || (res.ok ? "Booking updated." : "Failed to update booking.") };
}

export default async function BookingActionPage({ searchParams }: BookingActionPageProps) {
  const token = searchParams?.token ?? "";
  const result = token ? await actOnBooking(token) : { ok: false, message: "Missing booking action token." };
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_WEB_URL || "https://ph-app-web.vercel.app/bookings";

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Booking update</h1>
        <p className="mt-3 text-sm text-muted-foreground">{result.message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={adminUrl}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Open Admin
          </a>
          <a
            href="/bookings"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground"
          >
            Go to Bookings
          </a>
        </div>
      </div>
    </div>
  );
}
