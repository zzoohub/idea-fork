"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, UserTier } from "@/shared/types";
import { mockUser } from "@/shared/mocks/data";

interface UserContextValue {
  user: User | null;
  tier: UserTier;
  isLoggedIn: boolean;
  setTier: (tier: UserTier) => void;
  deepDivesUsedToday: number;
  useDeepDive: () => boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<UserTier>("anonymous");
  const [deepDivesUsedToday, setDeepDivesUsedToday] = useState(0);

  const user =
    tier === "anonymous" ? null : { ...mockUser, tier };

  const setTier = useCallback((newTier: UserTier) => {
    setTierState(newTier);
  }, []);

  const useDeepDive = useCallback((): boolean => {
    if (tier === "pro") return true;
    if (deepDivesUsedToday >= 3) return false;
    setDeepDivesUsedToday((prev) => prev + 1);
    return true;
  }, [tier, deepDivesUsedToday]);

  return (
    <UserContext.Provider
      value={{
        user,
        tier,
        isLoggedIn: tier !== "anonymous",
        setTier,
        deepDivesUsedToday,
        useDeepDive,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
