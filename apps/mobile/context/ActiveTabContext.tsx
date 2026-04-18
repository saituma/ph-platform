import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  "index",
  "programs",
  "messages",
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
  if (__DEV__) {
    // console.log(`[ActiveTabContext] setGlobalActiveTab: ${index}`);
  }
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

/** Returns the currently active tab index. Re-renders when it changes. */
export function useActiveTabIndex(): number {
  const [index, setIndex] = useState(_activeIndex);
  // NOTE: Do not call Expo Router hooks (usePathname/useSegments) here.
  // After returning from native pickers (camera/library), navigation context can be transiently unavailable
  // and those hooks can throw, crashing the whole app. We rely on the tab layout to drive active index.

  useEffect(() => {
    const listener: Listener = (newIndex) => {
      setIndex(newIndex);
    };
    _listeners.add(listener);
    // Sync immediately in case it changed between initialization and effect
    if (_activeIndex !== index) {
      setIndex(_activeIndex);
    }
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  return index;
}

// ---- Legacy compatibility shim ----
// Some components still import `useActiveTab` / `ActiveTabProvider`.
// Keep them working but driven by the global emitter.

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
  const value = useMemo(
    () => ({ activeTabIndex, currentTabIndex }),
    [activeTabIndex, currentTabIndex],
  );
  return (
    <ActiveTabContext.Provider value={value}>{children}</ActiveTabContext.Provider>
  );
}
