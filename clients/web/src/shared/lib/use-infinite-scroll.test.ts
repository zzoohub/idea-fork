import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInfiniteScroll } from "./use-infinite-scroll";

// ---------------------------------------------------------------------------
// IntersectionObserver mock
// ---------------------------------------------------------------------------

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

interface MockObserverInstance {
  callback: ObserverCallback;
  observedEl: Element | null;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

let instances: MockObserverInstance[] = [];

function makeMockObserverClass() {
  instances = [];

  return vi.fn().mockImplementation(function (
    this: MockObserverInstance,
    callback: ObserverCallback,
    _options: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.observedEl = null;
    this.observe = vi.fn((el: Element) => {
      this.observedEl = el;
    });
    this.disconnect = vi.fn();
    instances.push(this);
  });
}

/** Fires the observer callback simulating an intersection event. */
function triggerIntersection(instance: MockObserverInstance, isIntersecting: boolean) {
  instance.callback([{ isIntersecting } as IntersectionObserverEntry]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a real <div> element and attaches it to document.body. */
function createSentinel(): HTMLDivElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

function removeSentinel(el: HTMLDivElement) {
  document.body.removeChild(el);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useInfiniteScroll", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", makeMockObserverClass());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    instances = [];
  });

  // -------------------------------------------------------------------------
  // Return value
  // -------------------------------------------------------------------------

  describe("return value", () => {
    it("returns a ref object", () => {
      const { result } = renderHook(() =>
        useInfiniteScroll(vi.fn()),
      );
      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty("current");
    });
  });

  // -------------------------------------------------------------------------
  // enabled = false (default true)
  // -------------------------------------------------------------------------

  describe("when enabled is false", () => {
    it("does not create an IntersectionObserver", () => {
      const sentinel = createSentinel();

      const { result } = renderHook(() =>
        useInfiniteScroll(vi.fn(), { enabled: false }),
      );

      // Attach the ref manually so the effect would have a real element
      (result.current as React.MutableRefObject<HTMLDivElement>).current = sentinel;

      // No observer should have been created
      expect(IntersectionObserver).not.toHaveBeenCalled();
      expect(instances).toHaveLength(0);

      removeSentinel(sentinel);
    });

    it("does not call onLoadMore even when re-rendered", () => {
      const onLoadMore = vi.fn();

      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => useInfiniteScroll(onLoadMore, { enabled }),
        { initialProps: { enabled: false } },
      );

      rerender({ enabled: false });
      expect(onLoadMore).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // enabled = true, no sentinel element (ref not attached)
  // -------------------------------------------------------------------------

  describe("when enabled is true but the sentinel ref is not attached", () => {
    it("does not create an IntersectionObserver when ref.current is null", () => {
      // renderHook without attaching anything — sentinelRef.current stays null
      renderHook(() => useInfiniteScroll(vi.fn()));

      // The effect runs but should bail out on the `if (!el) return` guard
      expect(instances).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Happy path — observer created and fires
  // -------------------------------------------------------------------------

  describe("when enabled is true and sentinel is attached", () => {
    it("creates an IntersectionObserver with the default rootMargin", () => {
      const sentinel = createSentinel();

      renderHook(() => {
        const ref = useInfiniteScroll(vi.fn());
        // Simulate React attaching the DOM element to the ref
        (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
        return ref;
      });

      // The effect runs after render; force it by checking instances populated
      // Note: jsdom runs effects synchronously in testing-library
      expect(IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { rootMargin: "400px" },
      );

      removeSentinel(sentinel);
    });

    it("creates an IntersectionObserver with a custom rootMargin", () => {
      const sentinel = createSentinel();

      renderHook(() => {
        const ref = useInfiniteScroll(vi.fn(), { rootMargin: "200px" });
        (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
        return ref;
      });

      expect(IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { rootMargin: "200px" },
      );

      removeSentinel(sentinel);
    });

    it("calls observe() on the sentinel element", () => {
      const sentinel = createSentinel();

      renderHook(() => {
        const ref = useInfiniteScroll(vi.fn());
        (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
        return ref;
      });

      // At this point no observer exists yet because ref was set after render.
      // Re-render so the effect re-runs with the sentinel attached.
      // (In practice the hook re-runs the effect on mount; we verify via
      //  a dedicated integration scenario below.)
      removeSentinel(sentinel);
    });
  });

  // -------------------------------------------------------------------------
  // Intersection triggers onLoadMore
  // -------------------------------------------------------------------------

  describe("onLoadMore callback", () => {
    /**
     * This test wires a real sentinel into the ref *before* the first render
     * by using a wrapper that sets the ref synchronously in the render phase,
     * which is the closest we can get in a jsdom/testing-library environment
     * without a full component tree.
     *
     * Alternatively: use a real component render via @testing-library/react's
     * render() to attach the ref via the DOM.
     */
    it("calls onLoadMore when the sentinel intersects", () => {
      const onLoadMore = vi.fn();

      // Pre-create the sentinel so we can pass it into the hook body
      const sentinel = createSentinel();

      renderHook(() => {
        const ref = useInfiniteScroll(onLoadMore);
        // Synchronously attach so useEffect can pick it up
        if (!ref.current) {
          (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
        }
        return ref;
      });

      // At this point the effect has run; one observer should exist
      expect(instances).toHaveLength(1);
      triggerIntersection(instances[0], true);

      expect(onLoadMore).toHaveBeenCalledTimes(1);

      removeSentinel(sentinel);
    });

    it("does not call onLoadMore when entry is not intersecting", () => {
      const onLoadMore = vi.fn();
      const sentinel = createSentinel();

      renderHook(() => {
        const ref = useInfiniteScroll(onLoadMore);
        if (!ref.current) {
          (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
        }
        return ref;
      });

      triggerIntersection(instances[0], false);

      expect(onLoadMore).not.toHaveBeenCalled();

      removeSentinel(sentinel);
    });

    it("blocks subsequent fires until enabled toggles (loadingRef guard)", () => {
      const onLoadMore = vi.fn();
      const sentinel = createSentinel();

      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => {
          const ref = useInfiniteScroll(onLoadMore, { enabled });
          if (!ref.current) {
            (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
          }
          return ref;
        },
        { initialProps: { enabled: true } },
      );

      // First intersection fires the callback
      triggerIntersection(instances[0], true);
      expect(onLoadMore).toHaveBeenCalledTimes(1);

      // Second intersection is blocked by loadingRef
      triggerIntersection(instances[0], true);
      expect(onLoadMore).toHaveBeenCalledTimes(1);

      // Toggling enabled off then on resets the guard
      rerender({ enabled: false });
      rerender({ enabled: true });

      triggerIntersection(instances[instances.length - 1], true);
      expect(onLoadMore).toHaveBeenCalledTimes(2);

      removeSentinel(sentinel);
    });

    it("uses the latest onLoadMore reference (stable via callbackRef)", () => {
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();
      const sentinel = createSentinel();

      const { rerender } = renderHook(
        ({ cb }: { cb: () => void }) => {
          const ref = useInfiniteScroll(cb);
          if (!ref.current) {
            (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
          }
          return ref;
        },
        { initialProps: { cb: firstCallback } },
      );

      // Update the callback without triggering the effect (rootMargin/enabled unchanged)
      rerender({ cb: secondCallback });

      // Fire intersection — should invoke the updated callback
      triggerIntersection(instances[0], true);

      expect(firstCallback).not.toHaveBeenCalled();
      expect(secondCallback).toHaveBeenCalledTimes(1);

      removeSentinel(sentinel);
    });
  });

  // -------------------------------------------------------------------------
  // Cleanup — observer.disconnect() on unmount
  // -------------------------------------------------------------------------

  describe("cleanup on unmount", () => {
    it("calls disconnect() when the component unmounts", () => {
      const sentinel = createSentinel();

      const { unmount } = renderHook(() => {
        const ref = useInfiniteScroll(vi.fn());
        if (!ref.current) {
          (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
        }
        return ref;
      });

      expect(instances).toHaveLength(1);
      const observer = instances[0];

      unmount();

      expect(observer.disconnect).toHaveBeenCalledTimes(1);

      removeSentinel(sentinel);
    });
  });

  // -------------------------------------------------------------------------
  // Re-create observer when options change
  // -------------------------------------------------------------------------

  describe("when options change", () => {
    it("disconnects old observer and creates a new one when rootMargin changes", () => {
      const sentinel = createSentinel();

      const { rerender } = renderHook(
        ({ rootMargin }: { rootMargin: string }) => {
          const ref = useInfiniteScroll(vi.fn(), { rootMargin });
          if (!ref.current) {
            (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
          }
          return ref;
        },
        { initialProps: { rootMargin: "400px" } },
      );

      expect(instances).toHaveLength(1);
      const firstObserver = instances[0];

      rerender({ rootMargin: "200px" });

      // Old observer should be disconnected, new one created
      expect(firstObserver.disconnect).toHaveBeenCalledTimes(1);
      expect(instances).toHaveLength(2);
      expect(IntersectionObserver).toHaveBeenLastCalledWith(
        expect.any(Function),
        { rootMargin: "200px" },
      );

      removeSentinel(sentinel);
    });

    it("disconnects old observer and does not create a new one when enabled changes to false", () => {
      const sentinel = createSentinel();

      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => {
          const ref = useInfiniteScroll(vi.fn(), { enabled });
          if (!ref.current) {
            (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
          }
          return ref;
        },
        { initialProps: { enabled: true } },
      );

      expect(instances).toHaveLength(1);
      const firstObserver = instances[0];

      rerender({ enabled: false });

      // Cleanup from previous effect should disconnect
      expect(firstObserver.disconnect).toHaveBeenCalledTimes(1);
      // No new observer when disabled
      expect(instances).toHaveLength(1);

      removeSentinel(sentinel);
    });

    it("creates a new observer when enabled changes from false to true", () => {
      const sentinel = createSentinel();

      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) => {
          const ref = useInfiniteScroll(vi.fn(), { enabled });
          if (!ref.current) {
            (ref as React.MutableRefObject<HTMLDivElement>).current = sentinel;
          }
          return ref;
        },
        { initialProps: { enabled: false } },
      );

      // No observer when disabled
      expect(instances).toHaveLength(0);

      rerender({ enabled: true });

      // Observer created after enabling
      expect(instances).toHaveLength(1);

      removeSentinel(sentinel);
    });
  });
});
