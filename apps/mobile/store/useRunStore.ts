import { create } from "zustand";
import { haversineDistance } from "../lib/haversine";
import { Platform } from "react-native";

const DEV_MODE = __DEV__ && Platform.OS === 'ios';

interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface RunStore {
  status: 'idle' | 'running' | 'paused' | 'stopped';
  startTime: number | null;
  pauseStart: number | null;
  totalPausedMs: number;
  distanceMeters: number;
  coordinates: Coordinate[];
  elapsedSeconds: number;

  startRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  stopRun: () => void;
  resetRun: () => void;
  addCoordinate: (coord: Coordinate) => void;
  tick: () => void;
}

export const useRunStore = create<RunStore>((set) => ({
  status: "idle",
  startTime: null,
  pauseStart: null,
  totalPausedMs: 0,
  distanceMeters: 0,
  coordinates: [],
  elapsedSeconds: 0,

  startRun: () => {
    set({
      status: "running",
      startTime: Date.now(),
      pauseStart: null,
      totalPausedMs: 0,
      distanceMeters: 0,
      coordinates: [],
      elapsedSeconds: 0,
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
      coordinates: [],
      elapsedSeconds: 0,
    });
  },

  addCoordinate: (coord: Coordinate) => {
    set((state) => {
      if (state.status !== "running") return state;

      const newCoordinates = [...state.coordinates, coord];
      let newDistance = state.distanceMeters;

      if (state.coordinates.length > 0) {
        const last = state.coordinates[state.coordinates.length - 1];
        const dist = haversineDistance(
          last.latitude,
          last.longitude,
          coord.latitude,
          coord.longitude
        );
        newDistance += dist;
      }

      return {
        coordinates: newCoordinates,
        distanceMeters: newDistance,
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
}));
