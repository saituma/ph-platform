import type { TabConfig } from "@/components/navigation";
import type { AppCapabilities } from "@/store/slices/userSlice";

export function filterTabsByCapabilities(tabs: TabConfig[], capabilities: AppCapabilities | null): TabConfig[] {
  if (!capabilities) return tabs;
  return tabs.filter((tab) => {
    if (tab.key === "programs") return capabilities.training;
    if (tab.key === "messages") return capabilities.messaging || capabilities.groupChat;
    if (tab.key === "schedule") return capabilities.schedule;
    if (tab.key === "tracking") return capabilities.progressTracking || capabilities.teamTracking;
    return true;
  });
}
