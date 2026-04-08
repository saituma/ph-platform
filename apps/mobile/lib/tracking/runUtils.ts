type PaceSpeed = {
  paceMinPerKm: string;
  speedKmH: string;
};

export function formatDistanceKm(distanceMeters: number, decimals: number = 2) {
  const km = distanceMeters / 1000;
  if (!Number.isFinite(km) || km <= 0) return (0).toFixed(decimals);
  return km.toFixed(decimals);
}

export function formatDurationClock(totalSeconds: number) {
  const secondsSafe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const s = secondsSafe % 60;
  const m = Math.floor(secondsSafe / 60) % 60;
  const h = Math.floor(secondsSafe / 3600);
  return `${h > 0 ? `${h}:` : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function formatHoursMinutes(totalSeconds: number) {
  const secondsSafe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const m = Math.floor(secondsSafe / 60) % 60;
  const h = Math.floor(secondsSafe / 3600);
  return { h: h.toString(), m: m.toString() };
}

export function calculatePaceAndSpeed(distanceMeters: number, elapsedSeconds: number): PaceSpeed {
  const km = distanceMeters / 1000;
  const seconds = elapsedSeconds;

  if (!Number.isFinite(km) || !Number.isFinite(seconds) || km <= 0 || seconds <= 0) {
    return { paceMinPerKm: "0.00", speedKmH: "0.0" };
  }

  const paceMinPerKm = (seconds / 60 / km).toFixed(2);
  const speedKmH = (km / (seconds / 3600)).toFixed(1);
  return { paceMinPerKm, speedKmH };
}

export function estimateCalories(distanceMeters: number) {
  const km = distanceMeters / 1000;
  if (!Number.isFinite(km) || km <= 0) return 0;
  return Math.floor(km * 60);
}

