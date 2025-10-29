import { useCallback, useRef } from "react";

type Options = {
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore: () => void;
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
};

/**
 * useInfiniteScroll
 * Returns a ref-callback that should be attached to a sentinel element.
 * When the sentinel becomes visible and `hasMore` is true and not `loading`,
 * `onLoadMore` is invoked.
 */
export default function useInfiniteScroll({
  loading = false,
  hasMore = false,
  onLoadMore,
  root = null,
  rootMargin = "200px",
  threshold = 0,
}: Options) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const setSentinel = useCallback(
    (node: Element | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node) return;
      if (loading) return;
      if (!hasMore) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          if (e && e.isIntersecting) {
            onLoadMore();
          }
        },
        { root: root ?? null, rootMargin, threshold }
      );

      observerRef.current.observe(node);
    },
    [loading, hasMore, onLoadMore, root, rootMargin, threshold]
  );

  return setSentinel;
}
