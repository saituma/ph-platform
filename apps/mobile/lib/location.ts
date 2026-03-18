import * as SecureStore from "expo-secure-store";
import { apiRequest } from "./api";

export async function sendDailyLocation(token: string, options?: { force?: boolean }) {
  // Location collection is disabled to avoid prompting for location permission.
  void token;
  void options;
}

export async function resetLocationConsent() {
  // No-op while location collection is disabled.
}
