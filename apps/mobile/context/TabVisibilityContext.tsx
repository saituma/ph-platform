import React, { createContext, useContext, useMemo, useState } from "react";

interface TabVisibilityContextType {
  isTabBarVisible: boolean;
  setIsTabBarVisible: (visible: boolean) => void;
}

const TabVisibilityContext = createContext<TabVisibilityContextType | undefined>(
  undefined,
);

export function TabVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  const value = useMemo(
    () => ({ isTabBarVisible, setIsTabBarVisible }),
    [isTabBarVisible],
  );

  return (
    <TabVisibilityContext.Provider value={value}>
      {children}
    </TabVisibilityContext.Provider>
  );
}

export function useTabVisibility() {
  const context = useContext(TabVisibilityContext);
  if (context === undefined) {
    throw new Error("useTabVisibility must be used within a TabVisibilityProvider");
  }
  return context;
}
