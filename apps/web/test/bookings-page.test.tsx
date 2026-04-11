import { fireEvent, render, screen } from "@testing-library/react";

import BookingsPage from "../app/bookings/page";

jest.mock("@fullcalendar/react", () => ({
  __esModule: true,
  default: () => <div data-testid="fullcalendar" />,
}));
jest.mock("@fullcalendar/daygrid", () => ({}));
jest.mock("@fullcalendar/timegrid", () => ({}));
jest.mock("@fullcalendar/interaction", () => ({}));

jest.mock("../components/admin/shell", () => ({
  AdminShell: ({ title, children, actions }: any) => (
    <div>
      <h1>{title}</h1>
      <div>{actions}</div>
      {children}
    </div>
  ),
}));

jest.mock("../components/admin/section-header", () => ({
  SectionHeader: ({ title, description }: any) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

jest.mock("../components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock("../components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../components/admin/bookings/bookings-list", () => ({
  BookingsList: ({ bookings, onSelect }: any) => (
    <div>
      <div data-testid="bookings-count">{bookings.length}</div>
      <button type="button" onClick={() => onSelect?.(bookings[0])}>
        Select Booking
      </button>
    </div>
  ),
}));

jest.mock("../components/admin/bookings/bookings-filters", () => ({
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

jest.mock("../components/admin/bookings/availability-panel", () => ({
  AvailabilityPanel: () => <div data-testid="availability-panel" />,
}));

jest.mock("../components/admin/bookings/bookings-dialogs", () => ({
  BookingsDialogs: () => null,
}));

jest.mock("../lib/apiSlice", () => ({
  useGetBookingsQuery: jest.fn(),
  useGetServicesQuery: jest.fn(),
  useGetUsersQuery: jest.fn(),
  useUpdateBookingStatusMutation: jest.fn(),
  useUpdateServiceMutation: jest.fn(),
  useDeleteServiceMutation: jest.fn(),
}));

const {
  useGetBookingsQuery,
  useGetServicesQuery,
  useGetUsersQuery,
  useUpdateBookingStatusMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
} = jest.requireMock("../lib/apiSlice");

describe("bookings page", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("shows loading state when data is loading", () => {
    useGetBookingsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    });
    useGetServicesQuery.mockReturnValue({ data: undefined, isLoading: true });
    useGetUsersQuery.mockReturnValue({ data: { users: [] } });
    useUpdateBookingStatusMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    useUpdateServiceMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    useDeleteServiceMutation.mockReturnValue([jest.fn(), { isLoading: false }]);

    render(<BookingsPage />);

    expect(screen.getByText(/loading bookings/i)).toBeInTheDocument();
  });

  it("filters bookings by chip and renders list", () => {
    const baseDate = new Date();
    const noonLocal = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      12,
      0,
      0,
    );
    const laterLocal = new Date(noonLocal.getTime() + 60 * 60 * 1000);

    useGetBookingsQuery.mockReturnValue({
      data: {
        bookings: [
          {
            serviceName: "Group Session",
            athleteName: "Sam",
            startsAt: noonLocal.toISOString(),
            type: "group_call",
          },
          {
            serviceName: "Lift Lab",
            athleteName: "Lee",
            startsAt: laterLocal.toISOString(),
            type: "lift_lab_1on1",
          },
        ],
      },
      isLoading: false,
      refetch: jest.fn(),
    });
    useGetServicesQuery.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    });
    useGetUsersQuery.mockReturnValue({ data: { users: [] } });
    useUpdateBookingStatusMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    useUpdateServiceMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    useDeleteServiceMutation.mockReturnValue([jest.fn(), { isLoading: false }]);

    render(<BookingsPage />);

    expect(screen.getByTestId("bookings-count")).toHaveTextContent("2");

    fireEvent.click(screen.getByRole("button", { name: "Group" }));
    expect(screen.getByTestId("bookings-count")).toHaveTextContent("1");
  });
});
