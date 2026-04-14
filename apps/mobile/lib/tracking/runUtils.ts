import { haversineDistance } from "../haversine";

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
    return { paceMinPerKm: "0:00", speedKmH: "0.0" };
  }

  const paceMin = seconds / 60 / km;
  const mins = Math.floor(paceMin);
  const secs = Math.floor((paceMin - mins) * 60);
  const paceMinPerKm = `${mins}:${secs.toString().padStart(2, "0")}`;
  
  const speedKmH = (km / (seconds / 3600)).toFixed(1);
  return { paceMinPerKm, speedKmH };
}

export function estimateCalories(distanceMeters: number) {
  const km = distanceMeters / 1000;
  if (!Number.isFinite(km) || km <= 0) return 0;
  return Math.floor(km * 60);
}

export function estimateCaloriesAdvanced(
  distanceMeters: number,
  durationSeconds: number,
  weightKg: number = 70
): number {
  if (distanceMeters <= 0 || durationSeconds <= 0) return 0;
  const speedMs = distanceMeters / durationSeconds;
  const speedKmh = speedMs * 3.6;
  
  // MET estimate based on running speed
  let MET = 8.0;
  if (speedKmh < 4) MET = 3.0; // walking
  else if (speedKmh < 6) MET = 4.3; // brisk walking
  else if (speedKmh < 8) MET = 6.0; // jogging
  else if (speedKmh < 10.8) MET = 9.0; // running 6 mph
  else if (speedKmh < 13.0) MET = 11.0; 
  else MET = 13.0;

  const durationHours = durationSeconds / 3600;
  return Math.floor(MET * weightKg * durationHours);
}

export function getPaceZone(paceMinPerKm: number): {
  zone: 1 | 2 | 3 | 4 | 5;
  label: string;
  color: string;
  description: string;
} {
  if (paceMinPerKm < 4.0) {
    return { zone: 5, label: "Max Effort", color: "#EF4444", description: "Anaerobic, very hard pace" }; // Red
  } else if (paceMinPerKm < 4.75) {
    return { zone: 4, label: "Threshold", color: "#F97316", description: "Hard pace, pushing limits" }; // Orange
  } else if (paceMinPerKm < 6.0) {
    return { zone: 3, label: "Aerobic", color: "#EAB308", description: "Moderate steady pace" }; // Yellow
  } else if (paceMinPerKm < 8.0) {
    return { zone: 2, label: "Fat Burn", color: "#22C55E", description: "Comfortable jogging pace" }; // Green
  } else {
    return { zone: 1, label: "Recovery", color: "#3B82F6", description: "Easy walking or recovery" }; // Blue
  }
}

export function estimateVO2Max(
  distanceMeters: number,
  durationSeconds: number
): number | null {
  if (durationSeconds < 300) return null; // at least 5 minutes
  const speedMs = distanceMeters / durationSeconds;
  const estimated12MinDistance = speedMs * 720;
  const vo2max = (estimated12MinDistance / 1000 - 0.3138) / 0.0278;
  return Math.max(20, Math.min(80, Math.round(vo2max * 10) / 10)); // bounds check
}

export function calculateEfficiencyScore(
  coordinates: Array<{latitude: number; longitude: number; timestamp: number}>
): number {
  if (coordinates.length < 5) return 100;
  
  const speeds: number[] = [];
  for (let i = 1; i < coordinates.length; i++) {
    const c1 = coordinates[i - 1];
    const c2 = coordinates[i];
    const dist = haversineDistance(c1.latitude, c1.longitude, c2.latitude, c2.longitude);
    const dt = (c2.timestamp - c1.timestamp) / 1000;
    if (dt > 0) {
      speeds.push(dist / dt);
    }
  }
  
  if (speeds.length === 0) return 100;
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  if (avgSpeed === 0) return 100;
  
  const variance = speeds.reduce((acc, val) => acc + Math.pow(val - avgSpeed, 2), 0) / speeds.length;
  const stdDev = Math.sqrt(variance);
  
  const cv = stdDev / avgSpeed; // Coefficient of variation
  const score = Math.max(0, Math.min(100, 100 - cv * 100));
  return Math.round(score);
}

export function calculateRunMetrics(
  distanceMeters: number,
  elapsedSeconds: number,
  coordinates: Array<{latitude: number; longitude: number; timestamp: number}>,
  weightKg: number = 70
) {
  const km = distanceMeters / 1000;
  const paceMin = km > 0 ? (elapsedSeconds / 60) / km : 0;
  
  const mins = Math.floor(paceMin);
  const secs = Math.floor((paceMin - mins) * 60);
  const paceStr = km > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : "0:00";
  
  const speedKmH = km > 0 ? (km / (elapsedSeconds / 3600)).toFixed(1) : "0.0";
  const calories = estimateCaloriesAdvanced(distanceMeters, elapsedSeconds, weightKg);
  const paceZone = getPaceZone(paceMin > 0 ? paceMin : 10);
  const vo2max = estimateVO2Max(distanceMeters, elapsedSeconds);
  const efficiencyScore = calculateEfficiencyScore(coordinates);
  
  const speedKmhNum = km > 0 ? km / (elapsedSeconds / 3600) : 0;
  const avgCadenceEstimate = speedKmhNum > 0 ? Math.min(190, 100 + speedKmhNum * 7) : 0;
  
  // Calculate km splits
  const splitPaces: string[] = [];
  let currentSplitDistance = 0;
  let currentSplitStartTime = coordinates.length > 0 ? coordinates[0].timestamp : 0;
  let lastCoord = coordinates.length > 0 ? coordinates[0] : null;

  for (let i = 1; i < coordinates.length; i++) {
    const c = coordinates[i];
    if (lastCoord) {
      const dist = haversineDistance(lastCoord.latitude, lastCoord.longitude, c.latitude, c.longitude);
      currentSplitDistance += dist;
      if (currentSplitDistance >= 1000) {
        const dtSeconds = (c.timestamp - currentSplitStartTime) / 1000;
        const splitMins = Math.floor(dtSeconds / 60);
        const splitSecs = Math.floor(dtSeconds % 60);
        splitPaces.push(`${splitMins}:${splitSecs.toString().padStart(2, "0")}`);
        currentSplitDistance -= 1000; // retain overflow
        currentSplitStartTime = c.timestamp;
      }
    }
    lastCoord = c;
  }
  
  return {
    paceMinPerKm: paceStr,
    speedKmH,
    calories,
    paceZone,
    vo2max,
    efficiencyScore,
    splitPaces,
    avgCadenceEstimate: Math.round(avgCadenceEstimate)
  };
}
