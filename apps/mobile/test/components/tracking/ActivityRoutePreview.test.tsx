import { Animated } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ActivityRoutePreview } from "@/components/tracking/ActivityRoutePreview";

jest.mock("@/components/ScaledText", () => ({ Text: "Text" }));

const colors = {
  background: "#eeeeee",
  foreground: "#111111",
  muted: "#666666",
  accent: "#ff5500",
  border: "#cccccc",
};

const actions = {
  onOpenActivity: jest.fn(),
  onRequestPermission: jest.fn(),
  onRetry: jest.fn(),
  onOpenSettings: jest.fn(),
};

describe("ActivityRoutePreview", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gives a recorded route precedence and opens the activity", () => {
    render(
      <ActivityRoutePreview
        coordinates={[{ latitude: 9, longitude: 38 }, { latitude: 9.01, longitude: 38.01 }]}
        locationState={{ status: "ready", coordinates: { latitude: 1, longitude: 2 }, areaLabel: "Elsewhere" }}
        colors={colors}
        reducedMotion={false}
        {...actions}
      />,
    );
    expect(screen.getByText("Route Preview")).toBeTruthy();
    expect(screen.queryByText("Current location")).toBeNull();
    fireEvent.press(screen.getByLabelText("Open recorded route"));
    expect(actions.onOpenActivity).toHaveBeenCalledTimes(1);
  });

  it("renders the coarse current area without raw coordinates", () => {
    const loopSpy = jest.spyOn(Animated, "loop");
    render(
      <ActivityRoutePreview
        coordinates={[]}
        locationState={{ status: "ready", coordinates: { latitude: 9.01, longitude: 38.76 }, areaLabel: "Addis Ababa" }}
        colors={colors}
        reducedMotion
        {...actions}
      />,
    );
    expect(screen.getByText("Current location")).toBeTruthy();
    expect(screen.getByText("Addis Ababa")).toBeTruthy();
    expect(screen.queryByText(/9\.01|38\.76/)).toBeNull();
    expect(screen.getByLabelText("Current location in Addis Ababa")).toBeTruthy();
    expect(loopSpy).not.toHaveBeenCalled();
    loopSpy.mockRestore();
  });

  it("keeps even a single recorded coordinate ahead of current location", () => {
    render(
      <ActivityRoutePreview
        coordinates={[{ latitude: 9, longitude: 38 }]}
        locationState={{ status: "ready", coordinates: { latitude: 1, longitude: 2 }, areaLabel: "Elsewhere" }}
        colors={colors}
        reducedMotion={false}
        {...actions}
      />,
    );
    expect(screen.getByText("Route Preview")).toBeTruthy();
    expect(screen.queryByText("Current location")).toBeNull();
  });

  it("keeps permission and Settings actions separate from activity opening", () => {
    const { rerender } = render(
      <ActivityRoutePreview coordinates={[]} locationState={{ status: "permission-required" }} colors={colors} reducedMotion={false} {...actions} />,
    );
    fireEvent.press(screen.getByRole("button", { name: "Use my location" }));
    expect(actions.onRequestPermission).toHaveBeenCalledTimes(1);
    expect(actions.onOpenActivity).not.toHaveBeenCalled();

    rerender(<ActivityRoutePreview coordinates={[]} locationState={{ status: "denied", canOpenSettings: true }} colors={colors} reducedMotion={false} {...actions} />);
    fireEvent.press(screen.getByRole("button", { name: "Open Settings" }));
    expect(actions.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(actions.onOpenActivity).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: "checking" } as const, "Finding your area"],
    [{ status: "unavailable" } as const, "Location unavailable"],
  ])("renders the %s designed state", (state, label) => {
    render(<ActivityRoutePreview coordinates={[]} locationState={state} colors={colors} reducedMotion={false} {...actions} />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByLabelText(state.status === "checking" ? "Finding your current area" : "Current location unavailable")).toBeTruthy();
  });
});
