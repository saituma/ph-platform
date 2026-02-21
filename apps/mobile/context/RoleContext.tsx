import * as SecureStore from "expo-secure-store";
import { useAppSelector } from "@/store/hooks";
import React, {
  createContext,
  ReactNode,
  startTransition,
  useCallback,
  useContext,
  useEffect,
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

const STORAGE_KEYS = {
  role: "userRole",
  pin: "guardianPin",
};

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
  const { isAuthenticated } = useAppSelector((state) => state.user);
  const [role, setRoleState] = useState<RoleType>("Guardian");
  const [guardianPin, setGuardianPinState] = useState<string | null>(null);

  // Load persisted values on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const storedRole = await SecureStore.getItemAsync(STORAGE_KEYS.role);
        const storedPin = await SecureStore.getItemAsync(STORAGE_KEYS.pin);
        
        if (!mounted) return;
        if (storedRole === "Athlete" || storedRole === "Guardian") {
          setRoleState(storedRole as RoleType);
        }
        if (storedPin) {
          setGuardianPinState(storedPin);
        }
      } catch (e) {
        console.error("Failed to load persisted role/pin", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Clear on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setRoleState("Guardian");
      setGuardianPinState(null);
      SecureStore.deleteItemAsync(STORAGE_KEYS.role).catch(() => {});
      SecureStore.deleteItemAsync(STORAGE_KEYS.pin).catch(() => {});
    }
  }, [isAuthenticated]);

  const setRole = useCallback((nextRole: RoleType) => {
    startTransition(() => {
      setRoleState(nextRole);
      SecureStore.setItemAsync(STORAGE_KEYS.role, nextRole).catch(() => {});
    });
  }, []);

  const setGuardianPin = useCallback((pin: string | null) => {
    setGuardianPinState(pin);
    if (pin) {
      SecureStore.setItemAsync(STORAGE_KEYS.pin, pin).catch(() => {});
    } else {
      SecureStore.deleteItemAsync(STORAGE_KEYS.pin).catch(() => {});
    }
  }, []);

  const checkPin = useCallback((pin: string) => {
    if (!guardianPin) return true;
    return guardianPin === pin;
  }, [guardianPin]);

  const value = useMemo(
    () => ({ role, setRole, guardianPin, setGuardianPin, checkPin }),
    [role, setRole, guardianPin, setGuardianPin, checkPin],
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
