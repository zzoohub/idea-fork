"use client";

import { X } from "lucide-react";

interface KeywordChipProps {
  keyword: string;
  onRemove: () => void;
}

export function KeywordChip({ keyword, onRemove }: KeywordChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm">
      {keyword}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-accent transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center"
        aria-label={`Remove ${keyword}`}
      >
        <X size={12} />
      </button>
    </span>
  );
}
