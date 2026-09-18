import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyOf: (item: T, index: number) => string | number;
  /** Infinite-query helpers: when the virtualizer nears the end, fetch more. */
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  emptyMessage?: string;
  maxHeight?: number;
}

/**
 * Windowing wrapper combining TanStack Virtual (useVirtualizer) with
 * TanStack Query (useInfiniteQuery) pagination.
 *
 * Only the visible window (+overscan) is mounted, so orders/reservations/
 * logs lists stay fast with hundreds of rows. When `fetchNextPage`
 * is provided, scrolling near the bottom loads the next page.
 * (The menu keeps its responsive card grid — row windowing would force a
 * single column, so it intentionally does not use this component.)
 */
export default function VirtualizedList<T>({
  items,
  estimateSize = 120,
  overscan = 5,
  renderItem,
  keyOf,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  emptyMessage = 'No items yet.',
  maxHeight = 720,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: hasNextPage ? items.length + 1 : items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    if (!hasNextPage || !fetchNextPage || isFetchingNextPage) return;
    const last = virtualItems[virtualItems.length - 1];
    if (last && last.index >= items.length - 1) fetchNextPage();
  }, [virtualItems, hasNextPage, fetchNextPage, isFetchingNextPage, items.length]);

  if (items.length === 0 && !hasNextPage) {
    return <p className="text-gray-400 mt-5">{emptyMessage}</p>;
  }

  // Short lists render exactly as before (no wrapper elements, so card
  // layout is byte-identical to a plain `.map`) — windowing only pays off
  // once the list grows past the threshold.
  const VIRTUALIZE_AFTER = 20;
  if (items.length <= VIRTUALIZE_AFTER && !hasNextPage) {
    return (
      <>
        {items.map((item, index) => (
          <React.Fragment key={keyOf(item, index)}>{renderItem(item, index)}</React.Fragment>
        ))}
      </>
    );
  }

  return (
    <div ref={parentRef} className="overflow-auto w-full" style={{ maxHeight }}>
      <div className="w-full relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualItems.map((virtualRow) => {
          const isLoaderRow = virtualRow.index >= items.length;
          const item = items[virtualRow.index];
          return (
            <div
              key={isLoaderRow ? 'loader' : keyOf(item, virtualRow.index)}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <div className="pb-2">
                {isLoaderRow ? (
                  <p className="text-gray-400 text-sm px-1">
                    {isFetchingNextPage ? 'Loading more…' : 'Load more'}
                  </p>
                ) : (
                  renderItem(item, virtualRow.index)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
