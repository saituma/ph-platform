import { create } from "zustand";
import * as Crypto from "expo-crypto";
import { haversineDistance } from "../lib/haversine";
import { Platform } from "react-native";

const DEV_MODE = __DEV__ && Platform.OS === 'ios';

export interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number | null;
}

interface Destination {
  latitude: number;
  longitude: number;
}

interface RunStore {
  status: 'idle' | 'running' | 'paused' | 'stopped';
  startTime: number | null;
  pauseStart: number | null;
  totalPausedMs: number;
  distanceMeters: number;
  distanceOverrideMeters: number | null;
  coordinates: Coordinate[];
  elapsedSeconds: number;
  goalKm: number | null;
  destination: Destination | null;
  goalReached: boolean;
  destinationReached: boolean;
  /** Optional local notification cadence (progress). */
  progressNotifyEveryMeters: number | null;
  nextProgressNotifyAtMeters: number | null;
  warmupUntil: number | null;
  currentRunId: string | null;
  shareLiveLocationEnabled: boolean;

  startRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  stopRun: () => void;
  resetRun: () => void;
  addCoordinate: (coord: Coordinate, accuracy: number | null) => void;
  tick: () => void;
  setDistanceOverrideMeters: (meters: number | null) => void;
  setGoalKm: (km: number | null) => void;
  setDestination: (dest: Destination | null) => void;
  setProgressNotifyEveryMeters: (meters: number | null) => void;
  consumeProgressMilestones: () => number[];
  markGoalReached: () => void;
  markDestinationReached: () => void;
  getIsWarmedUp: () => boolean;
  setShareLiveLocationEnabled: (enabled: boolean) => void;
}

const MIN_RUN_SEGMENT_METERS = 12;
const MAX_TRAIL_ACCURACY_METERS = 32;

export const useRunStore = create<RunStore>((set, get) => ({
  status: "idle",
  startTime: null,
  pauseStart: null,
  totalPausedMs: 0,
  distanceMeters: 0,
  distanceOverrideMeters: null,
  coordinates: [],
  elapsedSeconds: 0,
  goalKm: null,
  destination: null,
  goalReached: false,
  destinationReached: false,
  progressNotifyEveryMeters: null,
  nextProgressNotifyAtMeters: null,
  warmupUntil: null,
  currentRunId: null,
  shareLiveLocationEnabled: false,

  startRun: () => {
    const every = get().progressNotifyEveryMeters;
    set({
      status: "running",
      startTime: Date.now(),
      pauseStart: null,
      totalPausedMs: 0,
      distanceMeters: 0,
      distanceOverrideMeters: null,
      coordinates: [],
      elapsedSeconds: 0,
      warmupUntil: Date.now() + 8000,
      currentRunId: Crypto.randomUUID(),
      nextProgressNotifyAtMeters:
        typeof every === "number" && Number.isFinite(every) && every >= 100 ? every : null,
    });
  },

  pauseRun: () => {
    set({
      status: "paused",
      pauseStart: Date.now(),
    });
  },

  resumeRun: () => {
    set((state) => {
      const now = Date.now();
      const pausedMs = state.pauseStart ? now - state.pauseStart : 0;
      return {
        status: "running",
        totalPausedMs: state.totalPausedMs + pausedMs,
        pauseStart: null,
      };
    });
  },

  stopRun: () => {
    set({ status: "stopped" });
  },

  resetRun: () => {
    set({
      status: "idle",
      startTime: null,
      pauseStart: null,
      totalPausedMs: 0,
      distanceMeters: 0,
      distanceOverrideMeters: null,
      coordinates: [],
      elapsedSeconds: 0,
      goalKm: null,
      destination: null,
      goalReached: false,
      destinationReached: false,
      progressNotifyEveryMeters: null,
      nextProgressNotifyAtMeters: null,
      warmupUntil: null,
      currentRunId: null,
      shareLiveLocationEnabled: false,
    });
  },

  addCoordinate: (coord: Coordinate, accuracy: number | null) => {
    set((state) => {
      if (state.status !== "running" || !state.startTime) return state;

      if (state.warmupUntil && Date.now() < state.warmupUntil) {
        return state;
      }

      if (accuracy != null && Number.isFinite(accuracy) && accuracy > MAX_TRAIL_ACCURACY_METERS) {
        return state;
      }

      if (state.coordinates.length === 0) {
        return {
          coordinates: [coord]
        };
      }

      const last = state.coordinates[state.coordinates.length - 1];
      const timeDeltaSeconds = (coord.timestamp - last.timestamp) / 1000;

      if (timeDeltaSeconds < 0.5) return state;

      const dist = haversineDistance(
        last.latitude,
        last.longitude,
        coord.latitude,
        coord.longitude
      );

      const speed = dist / timeDeltaSeconds;
      if (speed < 0.5) return state;

      if (dist < MIN_RUN_SEGMENT_METERS) return state;

      return {
        coordinates: [...state.coordinates, coord],
        distanceMeters: state.distanceMeters + dist,
      };
    });
  },

  tick: () => {
    set((state) => {
      if (state.status !== "running" || !state.startTime) return state;
      const now = Date.now();
      const elapsedMilliseconds = now - state.startTime - state.totalPausedMs;

      return {
        elapsedSeconds: Math.floor(elapsedMilliseconds / 1000),
      };
    });
  },

  setDistanceOverrideMeters: (meters) => set({ distanceOverrideMeters: meters }),
  setGoalKm: (km) => set({ goalKm: km, goalReached: false }),
  setDestination: (dest) => set({ destination: dest, destinationReached: false }),
  setProgressNotifyEveryMeters: (meters) => {
    const m =
      typeof meters === "number" && Number.isFinite(meters) && meters >= 100
        ? Math.floor(meters)
        : null;
    set({ progressNotifyEveryMeters: m, nextProgressNotifyAtMeters: m != null ? m : null });
  },
  consumeProgressMilestones: () => {
    const { progressNotifyEveryMeters, nextProgressNotifyAtMeters, distanceMeters } = get();
    const every =
      typeof progressNotifyEveryMeters === "number" && Number.isFinite(progressNotifyEveryMeters) && progressNotifyEveryMeters >= 100
        ? progressNotifyEveryMeters
        : null;
    if (!every) return [];

    let next =
      typeof nextProgressNotifyAtMeters === "number" && Number.isFinite(nextProgressNotifyAtMeters)
        ? nextProgressNotifyAtMeters
        : every;

    const reached: number[] = [];
    // Cap per call to avoid lockups if distance jumps wildly.
    while (distanceMeters >= next && reached.length < 8) {
      reached.push(next);
      next += every;
    }
    if (reached.length) {
      set({ nextProgressNotifyAtMeters: next });
    }
    return reached;
  },
  markGoalReached: () => set({ goalReached: true }),
  markDestinationReached: () => set({ destinationReached: true }),

  getIsWarmedUp: () => {
    const warmupUntil = get().warmupUntil;
    if (!warmupUntil) return false;
    return Date.now() >= warmupUntil;
  },

  setShareLiveLocationEnabled: (enabled) => set({ shareLiveLocationEnabled: enabled }),
}));
