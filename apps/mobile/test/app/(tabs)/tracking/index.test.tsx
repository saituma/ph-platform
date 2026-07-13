import React from "react";
import { Pressable, Text, View } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ActivityRoutePreview } from "@/components/tracking/ActivityRoutePreview";
import { CurrentLocationPreviewProvider } from "@/components/tracking/CurrentLocationPreviewProvider";

const mockLookup = jest.fn();
const mockRequestPermission = jest.fn();

function mockUseCurrentLocationPreview() {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- this mock implements a hook
  React.useEffect(() => {
    mockLookup();
  }, []);
  return {
    state: { status: "permission-required" as const },
    requestPermission: mockRequestPermission,
    retry: jest.fn(),
    openSettings: jest.fn(),
  };
}

jest.mock("@/hooks/tracking/useCurrentLocationPreview", () => ({
  useCurrentLocationPreview: mockUseCurrentLocationPreview,
}));
jest.mock("react-native-reanimated", () => ({ useReducedMotion: () => false }));
jest.mock("@/components/ScaledText", () => ({ Text: "Text" }));

const colors = {
  background: "#eee",
  foreground: "#111",
  muted: "#666",
  accent: "#f05a28",
  border: "#ccc",
};

describe("Tracking route-less activity integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shares one lookup across cards and keeps permission taps out of activity details", () => {
    const openActivity = jest.fn();
    render(
      <CurrentLocationPreviewProvider enabled>
        {(preview, reducedMotion) => (
          <View>
            {[1, 2].map((id) => (
              <View key={id}>
                <ActivityRoutePreview
                  coordinates={[]}
                  locationState={preview.state}
                  colors={colors}
                  reducedMotion={reducedMotion}
                  onOpenActivity={openActivity}
                  onRequestPermission={preview.requestPermission}
                  onRetry={preview.retry}
                  onOpenSettings={preview.openSettings}
                />
                <Pressable accessibilityRole="button" accessibilityLabel={`Open activity ${id}`} onPress={openActivity}>
                  <Text>Open activity</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </CurrentLocationPreviewProvider>,
    );

    expect(mockLookup).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getAllByRole("button", { name: "Use my location" })[0]!);
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(openActivity).not.toHaveBeenCalled();
  });

  it("does not mount the location hook when all displayed activities have routes", () => {
    render(
      <CurrentLocationPreviewProvider enabled={false}>
        {() => <Text>Recorded activities</Text>}
      </CurrentLocationPreviewProvider>,
    );
    expect(screen.getByText("Recorded activities")).toBeTruthy();
    expect(mockLookup).not.toHaveBeenCalled();
  });
});
