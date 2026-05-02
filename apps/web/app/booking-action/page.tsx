type BookingActionPageProps = {
  searchParams?: Promise<{ token?: string }>;
};

import BookingActionClient from "./BookingActionClient";

const getApiBase = () => {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "")
    .trim()
    .replace(/\/api\/?$/, "")
    .replace(/\/+$/, "");
};

export default async function BookingActionPage({
  searchParams,
}: BookingActionPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const token = resolvedSearchParams.token ?? "";
  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_WEB_URL ||
    "https://ph-app-web.vercel.app/bookings";

  return (
    <BookingActionClient
      token={token}
      apiBase={getApiBase()}
      adminUrl={adminUrl}
    />
  );
}
