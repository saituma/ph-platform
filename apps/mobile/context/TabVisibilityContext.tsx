import React, { createContext, useContext, useState } from "react";

interface TabVisibilityContextType {
  isTabBarVisible: boolean;
  setIsTabBarVisible: (visible: boolean) => void;
}

const TabVisibilityContext = createContext<TabVisibilityContextType | undefined>(
  undefined,
);

export function TabVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  return (
    <TabVisibilityContext.Provider
      value={{ isTabBarVisible, setIsTabBarVisible }}
    >
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
