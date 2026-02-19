"use client";

import { formatRelativeTime } from "@/shared/lib/utils";

interface RelativeTimeProps {
  dateString: string;
  className?: string;
}

export function RelativeTime({ dateString, className }: RelativeTimeProps) {
  return (
    <time
      dateTime={dateString}
      className={`text-xs text-muted-foreground ${className ?? ""}`}
      title={new Date(dateString).toLocaleString()}
    >
      {formatRelativeTime(dateString)}
    </time>
  );
}
