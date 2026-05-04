import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type RefreshHandler = () => Promise<void> | void;

interface RefreshHandlerContextType {
  registerHandler: (handler: RefreshHandler) => void;
  unregisterHandler: (handler: RefreshHandler) => void;
  refreshHandler: RefreshHandler | null;
}

interface RefreshLoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const RefreshHandlerContext = createContext<RefreshHandlerContextType | undefined>(undefined);
const RefreshLoadingContext = createContext<RefreshLoadingContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const registerHandler = useCallback((handler: RefreshHandler) => {
    setRefreshHandler(() => handler);
  }, []);

  const unregisterHandler = useCallback((handler: RefreshHandler) => {
    setRefreshHandler((prev) => (prev === handler ? null : prev));
  }, []);

  const setIsLoadingCb = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handlerValue = useMemo(
    () => ({ registerHandler, unregisterHandler, refreshHandler }),
    [registerHandler, unregisterHandler, refreshHandler],
  );

  const loadingValue = useMemo(
    () => ({ isLoading, setIsLoading: setIsLoadingCb }),
    [isLoading, setIsLoadingCb],
  );

  return (
    <RefreshHandlerContext.Provider value={handlerValue}>
      <RefreshLoadingContext.Provider value={loadingValue}>
        {children}
      </RefreshLoadingContext.Provider>
    </RefreshHandlerContext.Provider>
  );
}

export function useRefreshContext() {
  const handler = useContext(RefreshHandlerContext);
  const loading = useContext(RefreshLoadingContext);
  if (!handler || !loading) {
    throw new Error("useRefreshContext must be used within a RefreshProvider");
  }
  return { ...handler, ...loading };
}

/**
 * Hook to register pull-to-refresh logic for a screen.
 * Automatically cleans up on unmount.
 */
export function usePullToRefresh(onRefresh: RefreshHandler) {
  const { registerHandler, unregisterHandler } = useRefreshContext();
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const stableHandler = useCallback(() => {
    const fn = onRefreshRef.current;
    return fn?.();
  }, []);

  useEffect(() => {
    registerHandler(stableHandler);
    return () => unregisterHandler(stableHandler);
  }, [registerHandler, unregisterHandler, stableHandler]);
}
