import React, { createContext, useContext, useState } from "react";

type RefreshHandler = () => Promise<void> | void;

interface RefreshContextType {
  registerHandler: (handler: RefreshHandler) => void;
  unregisterHandler: (handler: RefreshHandler) => void;
  refreshHandler: RefreshHandler | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshHandler, setRefreshHandler] = useState<RefreshHandler | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  const registerHandler = (handler: RefreshHandler) => {
    setRefreshHandler(() => handler);
  };

  const unregisterHandler = (handler: RefreshHandler) => {
    setRefreshHandler((prev) => (prev === handler ? null : prev));
  };

  return (
    <RefreshContext.Provider
      value={{
        registerHandler,
        unregisterHandler,
        refreshHandler,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefreshContext() {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefreshContext must be used within a RefreshProvider");
  }
  return context;
}

/**
 * Hook to register pull-to-refresh logic for a screen.
 * Automatically cleans up on unmount.
 */
export function usePullToRefresh(onRefresh: RefreshHandler) {
  const { registerHandler, unregisterHandler } = useRefreshContext();

  React.useEffect(() => {
    registerHandler(onRefresh);
    return () => unregisterHandler(onRefresh);
  }, [onRefresh, registerHandler, unregisterHandler]);
}
