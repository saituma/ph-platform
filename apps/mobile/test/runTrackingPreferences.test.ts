import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getRunBackgroundTrackingDefault,
  setRunBackgroundTrackingDefault,
  getOsrmRoutingDefault,
  setOsrmRoutingDefault,
  getOsrmRoutingConsentState,
  setOsrmRoutingConsentState,
  type OsrmConsentState,
} from "@/lib/runTrackingPreferences";

describe("runTrackingPreferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("defaults background tracking to false when unset", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    await expect(getRunBackgroundTrackingDefault()).resolves.toBe(false);
  });

  it("roundtrips background tracking default", async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
    await setRunBackgroundTrackingDefault(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "ph:run:bg_tracking_default:v1",
      "1",
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("1");
    await expect(getRunBackgroundTrackingDefault()).resolves.toBe(true);
  });

  it("roundtrips OSRM routing default", async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
    await setOsrmRoutingDefault(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "ph:run:osrm_routing_default:v1",
      "1",
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("1");
    await expect(getOsrmRoutingDefault()).resolves.toBe(true);
  });

  it("roundtrips OSRM consent state", async () => {
    const state: OsrmConsentState = "accepted";
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
    await setOsrmRoutingConsentState(state);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "ph:run:osrm_consent:v1",
      "accepted",
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("accepted");
    await expect(getOsrmRoutingConsentState()).resolves.toBe("accepted");
  });
});

