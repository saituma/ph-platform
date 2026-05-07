import { getProgressReminderPrefs, setProgressReminderPrefs } from "@/lib/progressPreferences";
import AsyncStorage from "@react-native-async-storage/async-storage";

describe("progressPreferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns defaults when storage is empty", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const prefs = await getProgressReminderPrefs();
    expect(prefs.enabled).toBe(false);
    expect(prefs.hour).toBe(9);
    expect(prefs.minute).toBe(0);
  });

  it("parses stored values", async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce("1")
      .mockResolvedValueOnce("10")
      .mockResolvedValueOnce("30");
    const prefs = await getProgressReminderPrefs();
    expect(prefs.enabled).toBe(true);
    expect(prefs.hour).toBe(10);
    expect(prefs.minute).toBe(30);
  });

  it("saves preferences", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.multiSet as any) = jest.fn().mockResolvedValue(undefined);
    await setProgressReminderPrefs({ enabled: true, hour: 7 });
    expect(AsyncStorage.multiSet).toHaveBeenCalled();
  });
});
