import React, { createContext, ReactNode, useContext, useState } from "react";

type RoleType = "Guardian" | "Athlete";

interface RoleContextType {
  role: RoleType;
  setRole: (role: RoleType) => void;
  guardianPin: string | null;
  setGuardianPin: (pin: string | null) => void;
  checkPin: (pin: string) => boolean;
}

// Provide default values to prevent errors during pre-render
const defaultContext: RoleContextType = {
  role: "Guardian",
  setRole: () => {},
  guardianPin: null,
  setGuardianPin: () => {},
  checkPin: () => true,
};

const RoleContext = createContext<RoleContextType>(defaultContext);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<RoleType>("Guardian");
  const [guardianPin, setGuardianPin] = useState<string | null>(null);

  const checkPin = (pin: string) => {
    if (!guardianPin) return true;
    return guardianPin === pin;
  };

  return (
    <RoleContext.Provider
      value={{ role, setRole, guardianPin, setGuardianPin, checkPin }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  return useContext(RoleContext);
};
