import { formatDurationClock } from "./runUtils";

let Speech: typeof import("expo-speech") | null = null;

async function getSpeech() {
  if (Speech) return Speech;
  try {
    Speech = await import("expo-speech");
    return Speech;
  } catch {
    return null;
  }
}

export function announceKilometerSplit(opts: {
  km: number;
  totalDistanceMeters: number;
  elapsedSeconds: number;
}) {
  const { km, totalDistanceMeters, elapsedSeconds } = opts;

  const kmDist = totalDistanceMeters / 1000;
  const paceNumeric = kmDist > 0 && elapsedSeconds > 0 ? elapsedSeconds / 60 / kmDist : 0;
  const paceMin = Math.floor(paceNumeric);
  const paceSec = Math.round((paceNumeric - paceMin) * 60);

  const duration = formatDurationClock(elapsedSeconds);
  const parts: string[] = [];

  parts.push(`${km} kilometer${km > 1 ? "s" : ""}`);
  parts.push(`Time: ${duration}`);

  if (Number.isFinite(paceNumeric) && paceNumeric > 0 && paceNumeric < 60) {
    parts.push(`Pace: ${paceMin} minutes ${paceSec} seconds per kilometer`);
  }

  const text = parts.join(". ");

  getSpeech().then((speech) => {
    if (!speech) return;
    speech.speak(text, { language: "en-US", pitch: 1.0, rate: 0.95 });
  }).catch(() => {});
}

export function announceAutoPause(paused: boolean) {
  getSpeech().then((speech) => {
    if (!speech) return;
    speech.speak(paused ? "Run paused" : "Run resumed", {
      language: "en-US",
      pitch: 1.0,
      rate: 1.0,
    });
  }).catch(() => {});
}

export function announceRunComplete(distanceMeters: number, elapsedSeconds: number) {
  const km = (distanceMeters / 1000).toFixed(2);
  const duration = formatDurationClock(elapsedSeconds);

  getSpeech().then((speech) => {
    if (!speech) return;
    speech.speak(`Run complete. Distance: ${km} kilometers. Time: ${duration}.`, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.95,
    });
  }).catch(() => {});
}
