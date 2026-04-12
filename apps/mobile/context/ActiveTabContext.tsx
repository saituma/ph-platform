import { useEffect, useState } from "react";

/**
 * Global active tab tracker.
 *
 * PagerView's native container breaks React Context propagation,
 * so we use a module-level state + listener pattern instead.
 * `SwipeableTabLayout` calls `setGlobalActiveTab()` whenever the
 * active page changes, and any component can subscribe via `useActiveTab()`.
 */

type Listener = (index: number) => void;
type RequestListener = (index: number) => void;

let _activeIndex = 0;
let _tabRouteKeys: string[] = [
  "programs",
  "messages",
  "index",
  "schedule",
  "tracking",
  "more",
];
const _listeners = new Set<Listener>();
const _requestListeners = new Set<RequestListener>();

export function setGlobalTabRoutes(keys: string[]) {
  if (!Array.isArray(keys) || keys.length === 0) return;
  _tabRouteKeys = keys;
}

export function setGlobalActiveTab(index: number) {
  if (!Number.isFinite(index)) return;
  if (_activeIndex === index) return;

  _activeIndex = index;
  if (__DEV__)
    console.log(
      `[ActiveTabContext] setGlobalActiveTab called with index: ${index}. Notifying ${_listeners.size} listeners.`,
    );
  _listeners.forEach((fn) => fn(index));
}

export function requestGlobalTabChange(index: number) {
  _requestListeners.forEach((fn) => fn(index));
}

export function subscribeToGlobalTabRequests(listener: RequestListener) {
  _requestListeners.add(listener);
  return () => {
    _requestListeners.delete(listener);
  };
}

import { usePathname } from "expo-router";

/** Returns the currently active tab index. Re-renders when it changes. */
export function useActiveTabIndex(): number {
  const [index, setIndex] = useState(_activeIndex);
  const pathname = usePathname();

  useEffect(() => {
    // Sync in case it changed between render and effect
    setIndex(_activeIndex);
    const listener: Listener = (newIndex) => {
      setIndex(newIndex);
    };
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  // Forcefully derive index from pathname as a permanent fallback for Expo Router
  useEffect(() => {
    if (!pathname) return;
    const normalizedPath = pathname
      .replace(/^\//, "")
      .replace(/^\(tabs\)\/?/, "");
    const routeName = normalizedPath.split("/")[0] || "index";

    const foundIndex = _tabRouteKeys.indexOf(routeName);
    if (foundIndex >= 0 && _activeIndex !== foundIndex) {
      if (__DEV__)
        console.log(
          `[ActiveTabContext] PATHNAME CHANGED: ${pathname} -> Setting activeIndex to ${foundIndex}`,
        );
      setGlobalActiveTab(foundIndex);
    }
  }, [pathname]);

  return index;
}

// ---- Legacy compatibility shim ----
// Some components still import `useActiveTab` / `ActiveTabProvider`.
// Keep them working but driven by the global emitter.

import React, { createContext, useContext, ReactNode } from "react";

type ActiveTabContextType = {
  activeTabIndex: number;
  currentTabIndex: number;
};

const ActiveTabContext = createContext<ActiveTabContextType>({
  activeTabIndex: -100,
  currentTabIndex: -200,
});

export const useActiveTab = () => useContext(ActiveTabContext);

export function ActiveTabProvider({
  activeTabIndex,
  currentTabIndex,
  children,
}: ActiveTabContextType & { children: ReactNode }) {
  return (
    <ActiveTabContext.Provider value={{ activeTabIndex, currentTabIndex }}>
      {children}
    </ActiveTabContext.Provider>
  );
}
