"use client";

import { MessageSquare, Rocket, Play, Smartphone } from "lucide-react";
import type { Platform } from "@/types";
import { PLATFORM_CONFIG } from "@/lib/constants";

const icons: Record<Platform, typeof MessageSquare> = {
  reddit: MessageSquare,
  producthunt: Rocket,
  playstore: Play,
  appstore: Smartphone,
};

interface PlatformIconProps {
  platform: Platform;
  showName?: boolean;
  size?: number;
  className?: string;
}

export function PlatformIcon({
  platform,
  showName = false,
  size = 16,
  className,
}: PlatformIconProps) {
  const config = PLATFORM_CONFIG[platform];
  const Icon = icons[platform];

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <Icon size={size} style={{ color: config.color }} aria-hidden="true" />
      {showName && (
        <span className="text-xs text-muted-foreground">{config.name}</span>
      )}
    </span>
  );
}
