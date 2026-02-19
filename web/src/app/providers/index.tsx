"use client";

import { UserProvider } from "@/entities/user";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Toaster } from "@/shared/ui/sonner";
import { NetworkStatus } from "@/shared/ui/network-status";
import { TierSwitcher } from "@/widgets/tier-switcher";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <TooltipProvider>
        {children}
        <Toaster position="bottom-right" />
        <NetworkStatus />
        <TierSwitcher />
      </TooltipProvider>
    </UserProvider>
  );
}
