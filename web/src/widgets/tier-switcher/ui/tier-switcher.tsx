"use client";

import { useUser } from "@/entities/user";
import type { UserTier } from "@/shared/types";

const tiers: UserTier[] = ["anonymous", "free", "pro"];

export function TierSwitcher() {
  const { tier, setTier } = useUser();

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border bg-card p-2 shadow-lg text-xs">
      <span className="font-medium text-muted-foreground">Tier:</span>
      {tiers.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTier(t)}
          className={`rounded px-2 py-1 transition-colors ${
            tier === t
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
