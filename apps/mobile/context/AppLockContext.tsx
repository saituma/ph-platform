import * as SecureStore from "expo-secure-store";
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAppSelector } from "@/store/hooks";

type AutoLockInterval = "Immediately" | "1 min" | "5 min" | "15 min" | "30 min";

interface AppLockState {
  enabled: boolean;
  pin: string | null;
  recoveryQuestion: string | null;
  recoveryAnswer: string | null;
  autoLockInterval: AutoLockInterval;
  isLocked: boolean;
  setEnabled: (value: boolean) => Promise<void>;
  setPin: (pin: string | null) => Promise<void>;
  setRecovery: (question: string | null, answer: string | null) => Promise<void>;
  setAutoLockInterval: (value: AutoLockInterval) => Promise<void>;
  unlock: () => void;
  lock: () => void;
  checkRecoveryAnswer: (answer: string) => boolean;
}

const AppLockContext = createContext<AppLockState | undefined>(undefined);

const STORAGE_KEYS = {
  enabled: "appLockEnabled",
  pin: "appLockPin",
  question: "appLockQuestion",
  answer: "appLockAnswer",
  interval: "appLockInterval",
};

function parseIntervalToMs(interval: AutoLockInterval): number {
  if (interval === "Immediately") return 0;
  if (interval === "1 min") return 60_000;
  if (interval === "5 min") return 5 * 60_000;
  if (interval === "15 min") return 15 * 60_000;
  return 30 * 60_000;
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAppSelector((state) => state.user);
  const [enabled, setEnabledState] = useState(false);
  const [pin, setPinState] = useState<string | null>(null);
  const [recoveryQuestion, setRecoveryQuestion] = useState<string | null>(null);
  const [recoveryAnswer, setRecoveryAnswer] = useState<string | null>(null);
  const [autoLockInterval, setAutoLockIntervalState] = useState<AutoLockInterval>("5 min");
  const [isLocked, setIsLocked] = useState(false);
  const lastBackgroundAtRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const storedEnabled = await SecureStore.getItemAsync(STORAGE_KEYS.enabled);
      const storedPin = await SecureStore.getItemAsync(STORAGE_KEYS.pin);
      const storedQuestion = await SecureStore.getItemAsync(STORAGE_KEYS.question);
      const storedAnswer = await SecureStore.getItemAsync(STORAGE_KEYS.answer);
      const storedInterval = await SecureStore.getItemAsync(STORAGE_KEYS.interval);

      if (!mounted) return;
      setEnabledState(storedEnabled === "true");
      setPinState(storedPin ?? null);
      setRecoveryQuestion(storedQuestion ?? null);
      setRecoveryAnswer(storedAnswer ?? null);
      if (storedInterval) {
        setAutoLockIntervalState(storedInterval as AutoLockInterval);
      }
      if (storedEnabled === "true" && storedPin) {
        setIsLocked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (!enabled || !pin) return;
      if (state === "background" || state === "inactive") {
        lastBackgroundAtRef.current = Date.now();
      }
      if (state === "active") {
        const last = lastBackgroundAtRef.current;
        if (last === null) return;
        const elapsed = Date.now() - last;
        const required = parseIntervalToMs(autoLockInterval);
        if (elapsed >= required) {
          setIsLocked(true);
        }
      }
    });
    return () => subscription.remove();
  }, [enabled, pin, autoLockInterval]);

  useEffect(() => {
    if (isAuthenticated) return;
    setEnabledState(false);
    setPinState(null);
    setRecoveryQuestion(null);
    setRecoveryAnswer(null);
    setIsLocked(false);
    SecureStore.deleteItemAsync(STORAGE_KEYS.enabled);
    SecureStore.deleteItemAsync(STORAGE_KEYS.pin);
    SecureStore.deleteItemAsync(STORAGE_KEYS.question);
    SecureStore.deleteItemAsync(STORAGE_KEYS.answer);
  }, [isAuthenticated]);

  const setEnabled = async (value: boolean) => {
    setEnabledState(value);
    await SecureStore.setItemAsync(STORAGE_KEYS.enabled, value ? "true" : "false");
    if (!value) {
      setIsLocked(false);
    }
  };

  const setPin = async (nextPin: string | null) => {
    setPinState(nextPin);
    if (nextPin) {
      await SecureStore.setItemAsync(STORAGE_KEYS.pin, nextPin);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.pin);
    }
  };

  const setRecovery = async (question: string | null, answer: string | null) => {
    setRecoveryQuestion(question);
    setRecoveryAnswer(answer);
    if (question && answer) {
      await SecureStore.setItemAsync(STORAGE_KEYS.question, question);
      await SecureStore.setItemAsync(STORAGE_KEYS.answer, answer.toLowerCase());
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.question);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.answer);
    }
  };

  const setAutoLockInterval = async (value: AutoLockInterval) => {
    setAutoLockIntervalState(value);
    await SecureStore.setItemAsync(STORAGE_KEYS.interval, value);
  };

  const unlock = () => setIsLocked(false);
  const lock = () => {
    if (enabled && pin) setIsLocked(true);
  };

  const checkRecoveryAnswer = (answer: string) => {
    if (!recoveryAnswer) return false;
    return recoveryAnswer.toLowerCase() === answer.trim().toLowerCase();
  };

  const value = useMemo<AppLockState>(
    () => ({
      enabled,
      pin,
      recoveryQuestion,
      recoveryAnswer,
      autoLockInterval,
      isLocked,
      setEnabled,
      setPin,
      setRecovery,
      setAutoLockInterval,
      unlock,
      lock,
      checkRecoveryAnswer,
    }),
    [enabled, pin, recoveryQuestion, recoveryAnswer, autoLockInterval, isLocked]
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) {
    throw new Error("useAppLock must be used within AppLockProvider");
  }
  return ctx;
}
