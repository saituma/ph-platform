import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

// ── Mocks for the hook's dependencies ────────────────────────────────────────
const mockApiRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiRequest: (...args: any[]) => mockApiRequest(...args) }));

jest.mock("@/store/hooks", () => ({
  useAppSelector: (fn: any) => fn({ user: { token: "t", profile: { id: 1, name: "A" } } }),
}));
jest.mock("@/hooks/useActingUser", () => ({ useActingUser: () => ({ actingUserId: null }) }));

const mockSocketHandlers: Record<string, Function> = {};
jest.mock("@/context/SocketContext", () => ({
  useSocket: () => ({
    socket: {
      on: (e: string, cb: Function) => {
        mockSocketHandlers[e] = cb;
      },
      off: jest.fn(),
    },
  }),
}));

// Run the focus callback on mount, like a real screen focus.
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (cb: any) => {
      React.useEffect(() => cb(), [cb]);
    },
  };
});

import { useNutritionDay } from "@/components/nutrition/useNutritionDay";

const TODAY = new Date().toISOString().slice(0, 10);

function logsResponse(breakfast: string | null) {
  return { logs: breakfast === null ? [] : [{ dateKey: TODAY, mealType: "daily", breakfast }] };
}

function Harness() {
  const { data, optimisticUpdateMeal } = useNutritionDay(TODAY);
  (Harness as any).optimistic = optimisticUpdateMeal;
  const count = data?.meals?.breakfast?.items?.length ?? -1;
  return <Text testID="bf-count">{String(count)}</Text>;
}

function BreakfastHarness() {
  const { data } = useNutritionDay(TODAY);
  const count = data?.meals?.breakfast?.items?.length ?? -1;
  return <Text testID="bf-count">{String(count)}</Text>;
}

describe("useNutritionDay — logged meal must not vanish", () => {
  beforeEach(() => {
    Object.keys(mockSocketHandlers).forEach((k) => delete mockSocketHandlers[k]);
    mockApiRequest.mockReset();
    // Server starts with no breakfast; targets return defaults.
    mockApiRequest.mockImplementation((url: string) => {
      if (url.includes("/nutrition/targets")) return Promise.resolve({ targets: { calories: 2000 } });
      if (url.includes("hasFeedback")) return Promise.resolve({ logs: [] });
      return Promise.resolve(logsResponse(null)); // today's logs: empty
    });
  });

  it("keeps the meal when the server echoes the save over the socket", async () => {
    render(<Harness />);

    // initial load completes → breakfast empty (0 items)
    await waitFor(() => expect(screen.getByTestId("bf-count").props.children).toBe("0"));

    // user logs a breakfast item → optimistic update shows it
    await act(async () => {
      (Harness as any).optimistic("breakfast", [
        { id: "x", name: "Eggs", calories: 200, weightGrams: 100, unit: "g" },
      ]);
    });
    expect(screen.getByTestId("bf-count").props.children).toBe("1");

    const callsBeforeEcho = mockApiRequest.mock.calls.length;

    // server echoes our own save back to our socket room
    await act(async () => {
      mockSocketHandlers["nutrition:log:updated"]?.({ actorUserId: 1 });
    });

    // The echo must be ignored (no refetch) so the meal stays visible.
    expect(mockApiRequest.mock.calls.length).toBe(callsBeforeEcho);
    expect(screen.getByTestId("bf-count").props.children).toBe("1");
  });

  it("rebuilds the day from all same-date rows when the first row is empty", async () => {
    const breakfast = JSON.stringify([
      { id: "b1", name: "Oats", calories: 260, weightGrams: 80, unit: "g" },
    ]);
    mockApiRequest.mockImplementation((url: string) => {
      if (url.includes("/nutrition/targets")) return Promise.resolve({ targets: { calories: 2000 } });
      if (url.includes("hasFeedback")) return Promise.resolve({ logs: [] });
      return Promise.resolve({
        logs: [
          { id: 11, dateKey: TODAY, mealType: "daily", breakfast: null },
          { id: 10, dateKey: TODAY, mealType: "breakfast", breakfast },
        ],
      });
    });

    render(<BreakfastHarness />);

    await waitFor(() => expect(screen.getByTestId("bf-count").props.children).toBe("1"));
    expect(mockApiRequest.mock.calls.some(([url, options]) => url.includes("/nutrition/logs") && options?.forceRefresh === true)).toBe(true);
  });
});
