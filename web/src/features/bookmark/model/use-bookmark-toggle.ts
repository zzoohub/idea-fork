"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

export function useBookmarkToggle<T extends { id: string; isBookmarked: boolean }>(
  initialItems: T[],
) {
  const [items, setItems] = useState(initialItems);

  const toggle = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, isBookmarked: !item.isBookmarked }
          : item,
      ),
    );
    toast("Bookmark updated");
  }, []);

  return { items, setItems, toggle } as const;
}
