import { useEffect, useState } from 'react';

// localStorage namespace for backend images cached on the client.
export const IMAGE_CACHE_PREFIX = 'rms-img:';

// Key format: `rms-img:<url>::<version>` (`version` is the entity's
// `updatedAt`, so an edit that replaces the image bytes busts the cache).
// Entries written before versioning used the bare `rms-img:<url>` key —
// still honored as a fallback on read, evicted on the next versioned write.
const cacheKey = (url: string, version?: string | null) =>
  version ? `${IMAGE_CACHE_PREFIX}${url}::${version}` : `${IMAGE_CACHE_PREFIX}${url}`;

const legacyKey = (url: string) => `${IMAGE_CACHE_PREFIX}${url}`;

/**
 * Base URL of the backend serving `/images/*` (no trailing slash).
 * Empty means same-origin: relative URLs hit the backend via the CRA proxy
 * in dev and Caddy `/images*` in production.
 */
export const getImageApiBase = () => (process.env.REACT_APP_API_URL ?? '').replace(/\/+$/, '');

/**
 * Resolve an image reference to a fetchable URL.
 * - `data:`/`blob:` and absolute `http(s):` URLs are returned as-is.
 * - Bare filenames (`restaurant.jpeg`) resolve to `<api-base>/images/<file>`.
 * - Backend-relative paths (`/images/x.jpg`, `images/x.jpg`) resolve against
 *   the API base (same-origin when REACT_APP_API_URL is empty).
 */
export const resolveImageUrl = (src?: string | null): string | null => {
  if (!src) return null;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (/^https?:\/\//i.test(src)) return src;
  const base = getImageApiBase();
  const clean = src.replace(/^\.\//, '');
  if (clean.startsWith('/')) return `${base}${clean}`;
  if (clean.startsWith('images/')) return `${base}/${clean}`;
  return `${base}/images/${clean}`;
};

/** Synchronously read a previously cached image (data URL) for `src` + `version`. */
export const getCachedImageSrc = (src?: string | null, version?: string | null): string | null => {
  const url = resolveImageUrl(src);
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  try {
    return localStorage.getItem(cacheKey(url, version)) ?? localStorage.getItem(legacyKey(url));
  } catch {
    return null;
  }
};

/** Drop every cached copy of `url` except `keepKey` (stale versions + legacy key). */
const evictStaleKeys = (url: string, keepKey: string): void => {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(IMAGE_CACHE_PREFIX)) continue;
      if (key === keepKey) continue;
      if (key === legacyKey(url) || key.startsWith(`${legacyKey(url)}::`)) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable — nothing to evict.
  }
};

const blobToDataURL = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'));
    reader.readAsDataURL(blob);
  });

/**
 * Fetch `src` from the backend and persist it in localStorage as a data URL
 * under the `version` key (the entity's `updatedAt`). Stale versions of the
 * same URL are evicted. Failures reject so callers can fall back.
 */
export const fetchAndCacheImage = async (src: string, version?: string | null): Promise<string> => {
  const url = resolveImageUrl(src);
  if (!url) throw new Error('No image source');
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image request failed: ${res.status}`);
  const dataUrl = await blobToDataURL(await res.blob());
  const key = cacheKey(url, version);
  try {
    localStorage.setItem(key, dataUrl);
    evictStaleKeys(url, key);
  } catch {
    // Quota / private mode — still usable for this session via data URL.
  }
  return dataUrl;
};

/** Remove every cached backend image from localStorage. */
export const clearImageCache = (): void => {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(IMAGE_CACHE_PREFIX)) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable — nothing to clear.
  }
};

export type PrefetchSource =
  string | null | undefined | { src?: string | null; version?: string | null };

/** Warm the cache for a list of image URLs (fire-and-forget friendly). */
export const prefetchImages = async (sources: PrefetchSource[]): Promise<void> => {
  const normalized = sources.map((s) =>
    s !== null && typeof s === 'object' ? s : { src: s ?? undefined, version: undefined },
  );
  const entries = normalized
    .map(({ src, version }) => ({ url: resolveImageUrl(src ?? undefined), version }))
    .filter(
      (e): e is { url: string; version: string | null | undefined } =>
        !!e.url && !e.url.startsWith('data:') && !e.url.startsWith('blob:'),
    )
    .filter((e) => getCachedImageSrc(e.url, e.version) == null);
  const seen = new Set<string>();
  const deduped = entries.filter((e) => {
    const k = cacheKey(e.url, e.version);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  await Promise.allSettled(deduped.map((e) => fetchAndCacheImage(e.url, e.version)));
};

/**
 * Return the best-available `src` for an `<img>`: the localStorage-cached
 * copy for this `src` + `version` (`updatedAt`) when present, otherwise the
 * backend URL while the fetch completes in the background (then swaps to
 * the cached data URL). A new `version` after a menu-item / logo edit
 * misses the old cache entry and refetches. Falls back to `fallback` when
 * `src` is empty or the fetch fails.
 */
export const useCachedImage = (
  src?: string | null,
  fallback = '',
  version?: string | null,
): string => {
  const url = resolveImageUrl(src);
  const [cached, setCached] = useState<string | null>(() => getCachedImageSrc(url, version));

  useEffect(() => {
    setCached(getCachedImageSrc(url, version));
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;
    if (getCachedImageSrc(url, version)) return;
    let cancelled = false;
    fetchAndCacheImage(url, version)
      .then((dataUrl) => {
        if (!cancelled) setCached(dataUrl);
      })
      .catch(() => {
        // Keep the backend URL — the <img onError> fallback still applies.
      });
    return () => {
      cancelled = true;
    };
  }, [url, version]);

  return cached ?? url ?? fallback;
};
