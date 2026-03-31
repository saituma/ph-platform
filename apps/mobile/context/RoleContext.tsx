import React, { createContext, ReactNode, useContext, useMemo } from "react";

/**
 * Simplified role context — the mobile app always operates in Guardian mode.
 * The Guardian manages athlete(s); content is driven by the athlete's age/tier.
 */
type RoleType = "Guardian";

interface RoleContextType {
  role: RoleType;
  setRole: (role: RoleType) => void;
  guardianPin: string | null;
  setGuardianPin: (pin: string | null) => void;
  checkPin: (pin: string) => boolean;
}

const defaultContext: RoleContextType = {
  role: "Guardian",
  setRole: () => {},
  guardianPin: null,
  setGuardianPin: () => {},
  checkPin: () => true,
};

const RoleContext = createContext<RoleContextType>(defaultContext);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo(() => defaultContext, []);

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  return useContext(RoleContext);
};
