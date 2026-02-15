import { fireEvent, render, screen } from "@testing-library/react";

import BookingsPage from "@/app/bookings/page";

jest.mock("@/components/admin/shell", () => ({
  AdminShell: ({ title, children, actions }: any) => (
    <div>
      <h1>{title}</h1>
      <div>{actions}</div>
      {children}
    </div>
  ),
}));

jest.mock("@/components/admin/bookings/bookings-list", () => ({
  BookingsList: ({ bookings, onSelect }: any) => (
    <div>
      <div data-testid="bookings-count">{bookings.length}</div>
      <button type="button" onClick={() => onSelect?.(bookings[0])}>
        Select Booking
      </button>
    </div>
  ),
}));

jest.mock("@/components/admin/bookings/bookings-filters", () => ({
  BookingsFilters: ({ chips, onChipSelect }: any) => (
    <div>
      {chips.map((chip: string) => (
        <button key={chip} type="button" onClick={() => onChipSelect(chip)}>
          {chip}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("@/components/admin/bookings/availability-panel", () => ({
  AvailabilityPanel: () => <div data-testid="availability-panel" />,
}));

jest.mock("@/components/admin/bookings/bookings-dialogs", () => ({
  BookingsDialogs: () => null,
}));

jest.mock("@/lib/apiSlice", () => ({
  useGetBookingsQuery: jest.fn(),
  useGetServicesQuery: jest.fn(),
}));

const { useGetBookingsQuery, useGetServicesQuery } = jest.requireMock("@/lib/apiSlice");

describe("bookings page", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("shows loading state when data is loading", () => {
    useGetBookingsQuery.mockReturnValue({ data: undefined, isLoading: true, refetch: jest.fn() });
    useGetServicesQuery.mockReturnValue({ data: undefined, isLoading: true });

    render(<BookingsPage />);

    expect(screen.getByText(/loading bookings/i)).toBeInTheDocument();
  });

  it("filters bookings by chip and renders list", () => {
    useGetBookingsQuery.mockReturnValue({
      data: {
        bookings: [
          { serviceName: "Group Session", athleteName: "Sam", startsAt: new Date().toISOString(), type: "Group" },
          { serviceName: "Video Review", athleteName: "Lee", startsAt: new Date().toISOString(), type: "Video" },
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });
    useGetServicesQuery.mockReturnValue({ data: { items: [] }, isLoading: false });

    render(<BookingsPage />);

    expect(screen.getByTestId("bookings-count")).toHaveTextContent("2");

    fireEvent.click(screen.getByRole("button", { name: "Video" }));
    expect(screen.getByTestId("bookings-count")).toHaveTextContent("1");
  });
});
