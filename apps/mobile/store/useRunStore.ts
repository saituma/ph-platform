import { create } from "zustand";
import * as Crypto from "expo-crypto";
import { haversineDistance } from "../lib/haversine";
import { Platform } from "react-native";

const DEV_MODE = __DEV__ && Platform.OS === 'ios';

/** Minimum movement between recorded trail points (filters GPS jitter). */
export const MIN_RUN_SEGMENT_METERS = 12;

/** Ignore location updates worse than this horizontal accuracy when appending trail points. */
const MAX_TRAIL_ACCURACY_METERS = 48;

/** First fix is often noisier; allow a slightly looser bound so the run can start. */
const FIRST_POINT_MAX_ACCURACY_METERS = 100;

interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
  /** Meters; when present, very poor fixes are skipped for the trail/distance. */
  accuracy?: number | null;
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
  /** Stable id for this session — used to save the run before feedback completes. */
  currentRunId: string | null;

  startRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  stopRun: () => void;
  resetRun: () => void;
  addCoordinate: (coord: Coordinate) => void;
  tick: () => void;
  setDistanceOverrideMeters: (meters: number | null) => void;
  setGoalKm: (km: number | null) => void;
  setDestination: (dest: Destination | null) => void;
  markGoalReached: () => void;
  markDestinationReached: () => void;
}

export const useRunStore = create<RunStore>((set) => ({
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
  currentRunId: null,

  startRun: () => {
    set({
      status: "running",
      startTime: Date.now(),
      pauseStart: null,
      totalPausedMs: 0,
      distanceMeters: 0,
      distanceOverrideMeters: null,
      coordinates: [],
      elapsedSeconds: 0,
      currentRunId: Crypto.randomUUID(),
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
      currentRunId: null,
    });
  },

  setDistanceOverrideMeters: (meters) => {
    set({ distanceOverrideMeters: meters });
  },

  addCoordinate: (coord: Coordinate) => {
    set((state) => {
      if (state.status !== "running") return state;

      const acc = coord.accuracy;
      const accuracyOk =
        acc == null || !Number.isFinite(acc) || acc <= MAX_TRAIL_ACCURACY_METERS;
      const firstPointOk =
        acc == null ||
        !Number.isFinite(acc) ||
        acc <= FIRST_POINT_MAX_ACCURACY_METERS;

      if (state.coordinates.length === 0) {
        if (!firstPointOk) return state;
        return {
          coordinates: [coord],
          distanceMeters: 0,
        };
      }

      if (!accuracyOk) return state;

      const last = state.coordinates[state.coordinates.length - 1];
      const dist = haversineDistance(
        last.latitude,
        last.longitude,
        coord.latitude,
        coord.longitude
      );
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
      
      if (DEV_MODE && state.elapsedSeconds % 5 === 0 && state.elapsedSeconds > 0) {
          // Internal simulation map coordinates dispatch logic removed from here and placed into ActiveRunScreen
          // To prevent mutating coordinates explicitly from a tick payload without action intent
      }
      
      return {
        elapsedSeconds: Math.floor(elapsedMilliseconds / 1000),
      };
    });
  },

  setGoalKm: (km) => set({ goalKm: km, goalReached: false }),
  setDestination: (dest) => set({ destination: dest, destinationReached: false }),
  markGoalReached: () => set({ goalReached: true }),
  markDestinationReached: () => set({ destinationReached: true }),
}));
