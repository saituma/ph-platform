import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";

import { useCurrentLocationPreview } from "@/hooks/tracking/useCurrentLocationPreview";

function mockUseFocusEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- this mock implements a hook
  React.useEffect(effect, [effect]);
}

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: mockUseFocusEffect,
}));

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  PermissionStatus: { GRANTED: "granted", DENIED: "denied", UNDETERMINED: "undetermined" },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const permission = (status: "granted" | "denied" | "undetermined", canAskAgain = true) => ({
  status,
  canAskAgain,
  granted: status === "granted",
  expires: "never" as const,
});

const position = (latitude: number, longitude: number) => ({
  coords: {
    latitude,
    longitude,
    altitude: null,
    accuracy: 25,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
});

const mockedLocation = Location as jest.Mocked<typeof Location>;

describe("useCurrentLocationPreview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLocation.getLastKnownPositionAsync.mockResolvedValue(null);
    mockedLocation.reverseGeocodeAsync.mockResolvedValue([{ city: "Addis Ababa", region: "Addis Ababa", country: "Ethiopia" } as Location.LocationGeocodedAddress]);
  });

  it("checks an existing grant, shows cached data first, then refreshes once", async () => {
    let resolveCurrent!: (value: Location.LocationObject) => void;
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(permission("granted"));
    mockedLocation.getLastKnownPositionAsync.mockResolvedValue(position(9.01, 38.76));
    mockedLocation.getCurrentPositionAsync.mockImplementation(() => new Promise((resolve) => { resolveCurrent = resolve; }));

    const { result } = renderHook(() => useCurrentLocationPreview());

    await waitFor(() => expect(result.current.state).toMatchObject({ status: "ready", areaLabel: "Addis Ababa" }));
    expect(mockedLocation.getLastKnownPositionAsync).toHaveBeenCalledWith({ maxAge: 600_000 });
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Balanced });

    mockedLocation.reverseGeocodeAsync.mockResolvedValueOnce([{ region: "Oromia", country: "Ethiopia" } as Location.LocationGeocodedAddress]);
    await act(async () => resolveCurrent(position(8.98, 38.8)));
    await waitFor(() => expect(result.current.state).toMatchObject({ status: "ready", areaLabel: "Oromia", coordinates: { latitude: 8.98 } }));
  });

  it("does not prompt until permission is requested", async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(permission("undetermined"));
    mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue(permission("granted"));
    mockedLocation.getCurrentPositionAsync.mockResolvedValue(position(9.01, 38.76));

    const { result } = renderHook(() => useCurrentLocationPreview());
    await waitFor(() => expect(result.current.state.status).toBe("permission-required"));
    expect(mockedLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();

    await act(async () => result.current.requestPermission());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(mockedLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it.each([
    [true, false],
    [false, true],
  ] as const)("maps a denied result with canAskAgain=%s to denied", async (canAskAgain, canOpenSettings) => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(permission("undetermined"));
    mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue(permission("denied", canAskAgain));
    const { result } = renderHook(() => useCurrentLocationPreview());
    await waitFor(() => expect(result.current.state.status).toBe("permission-required"));
    await act(async () => result.current.requestPermission());
    expect(result.current.state).toEqual({ status: "denied", canOpenSettings });
  });

  it("falls back through coarse reverse-geocode fields", async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(permission("granted"));
    mockedLocation.getCurrentPositionAsync.mockResolvedValue(position(9.01, 38.76));
    mockedLocation.reverseGeocodeAsync.mockResolvedValue([{ country: "Ethiopia" } as Location.LocationGeocodedAddress]);
    const { result } = renderHook(() => useCurrentLocationPreview());
    await waitFor(() => expect(result.current.state).toMatchObject({ status: "ready", areaLabel: "Ethiopia" }));
  });

  it("ignores stale async results after unmount", async () => {
    let resolveCurrent!: (value: Location.LocationObject) => void;
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(permission("granted"));
    mockedLocation.getCurrentPositionAsync.mockImplementation(() => new Promise((resolve) => { resolveCurrent = resolve; }));
    const { result, unmount } = renderHook(() => useCurrentLocationPreview());
    await waitFor(() => expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalled());
    unmount();
    await act(async () => resolveCurrent(position(1, 2)));
    expect(result.current.state.status).toBe("checking");
  });

  it("uses a designed unavailable state when location lookup fails", async () => {
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(permission("granted"));
    mockedLocation.getCurrentPositionAsync.mockRejectedValue(new Error("GPS unavailable"));
    const { result } = renderHook(() => useCurrentLocationPreview());
    await waitFor(() => expect(result.current.state.status).toBe("unavailable"));
  });
});
