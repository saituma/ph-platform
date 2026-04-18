import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import {
  getRunBackgroundTrackingDefault,
  setRunBackgroundTrackingDefault,
  getOsrmRoutingDefault,
  setOsrmRoutingDefault,
  getOsrmRoutingConsentState,
  setOsrmRoutingConsentState,
  type OsrmConsentState,
} from "@/lib/runTrackingPreferences";
import { ensureOsrmConsentOrExplain } from "@/lib/osrmRoutingConsent";

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

describe("osrmRoutingConsent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns true immediately when OSRM consent already accepted", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("accepted");
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    await expect(ensureOsrmConsentOrExplain()).resolves.toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("returns false immediately when OSRM consent already declined", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("declined");
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    await expect(ensureOsrmConsentOrExplain()).resolves.toBe(false);
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("prompts and persists declined when user chooses Not now", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation((...args: any[]) => {
        const buttons = args[2] as Array<{ text?: string; onPress?: () => void }>;
        const notNow = buttons.find((b) => b.text === "Not now");
        notNow?.onPress?.();
      });

    await expect(ensureOsrmConsentOrExplain()).resolves.toBe(false);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "ph:run:osrm_consent:v1",
      "declined",
    );

    alertSpy.mockRestore();
  });

  it("prompts and persists accepted when user chooses Enable", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation((...args: any[]) => {
        const buttons = args[2] as Array<{ text?: string; onPress?: () => void }>;
        const enable = buttons.find((b) => b.text === "Enable");
        enable?.onPress?.();
      });

    await expect(ensureOsrmConsentOrExplain()).resolves.toBe(true);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "ph:run:osrm_consent:v1",
      "accepted",
    );

    alertSpy.mockRestore();
  });
});
