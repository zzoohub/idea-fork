import { useEffect, useRef } from "react";

/**
 * Calls `onLoadMore` when a sentinel element scrolls into view.
 * Returns a ref to attach to the sentinel element.
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  { enabled = true, rootMargin = "400px" } = {},
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onLoadMore);
  callbackRef.current = onLoadMore;

  const loadingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      loadingRef.current = false;
      return;
    }
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current) {
          loadingRef.current = true;
          callbackRef.current();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
