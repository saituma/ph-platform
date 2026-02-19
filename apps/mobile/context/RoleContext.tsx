import React, {
  createContext,
  ReactNode,
  startTransition,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

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
  const [role, setRoleState] = useState<RoleType>("Guardian");
  const [guardianPin, setGuardianPin] = useState<string | null>(null);

  const setRole = useCallback((nextRole: RoleType) => {
    startTransition(() => {
      setRoleState(nextRole);
    });
  }, []);

  const checkPin = useCallback((pin: string) => {
    if (!guardianPin) return true;
    return guardianPin === pin;
  }, [guardianPin]);

  const value = useMemo(
    () => ({ role, setRole, guardianPin, setGuardianPin, checkPin }),
    [role, setRole, guardianPin, checkPin],
  );

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  return useContext(RoleContext);
};
