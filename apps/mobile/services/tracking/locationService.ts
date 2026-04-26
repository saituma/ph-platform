import { apiRequest } from "@/lib/api";

export type UserLocation = {
  userId: number;
  name: string;
  role: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: string;
  routePoints?: Array<{ lat: number; lng: number }> | null;
};

export async function sendLiveLocation(token: string, input: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  routePoints?: Array<{ lat: number; lng: number }> | null;
}) {
  return apiRequest<{ ok: true }>("/location", {
    method: "POST",
    token,
    body: input,
    suppressLog: true,
  });
}

export async function fetchTeamLocations(token: string) {
  return apiRequest<{ locations: UserLocation[] }>("/location/team", {
    token,
    suppressLog: true,
    skipCache: true,
  });
}
