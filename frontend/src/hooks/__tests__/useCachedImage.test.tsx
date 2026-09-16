import { renderHook, waitFor } from '@testing-library/react';
import {
  IMAGE_CACHE_PREFIX,
  clearImageCache,
  fetchAndCacheImage,
  getCachedImageSrc,
  prefetchImages,
  resolveImageUrl,
  useCachedImage,
} from '../useCachedImage';

const IMG_URL = '/images/bruschetta.jpg';

const mockFetchOk = (body = 'fake-bytes') => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob([body], { type: 'image/jpeg' }),
  }) as any;
};

describe('resolveImageUrl', () => {
  beforeEach(() => {
    // The local .env sets REACT_APP_API_URL — clear it so tests assert the
    // same-origin default unless a case sets it explicitly.
    delete process.env.REACT_APP_API_URL;
  });

  it('returns null for empty sources', () => {
    expect(resolveImageUrl()).toBeNull();
    expect(resolveImageUrl('')).toBeNull();
    expect(resolveImageUrl(null)).toBeNull();
  });

  it('passes through data/blob/absolute URLs', () => {
    expect(resolveImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(resolveImageUrl('blob:http://localhost/x')).toBe('blob:http://localhost/x');
    expect(resolveImageUrl('https://cdn.example.com/logo.png')).toBe(
      'https://cdn.example.com/logo.png',
    );
  });

  it('keeps backend-relative paths same-origin', () => {
    expect(resolveImageUrl('/images/a.jpg')).toBe('/images/a.jpg');
    expect(resolveImageUrl('images/a.jpg')).toBe('/images/a.jpg');
  });

  it('resolves bare filenames against /images', () => {
    expect(resolveImageUrl('restaurant.jpeg')).toBe('/images/restaurant.jpeg');
  });

  it('prefixes REACT_APP_API_URL when set', () => {
    process.env.REACT_APP_API_URL = 'http://localhost:5000/';
    try {
      expect(resolveImageUrl('restaurant.jpeg')).toBe(
        'http://localhost:5000/images/restaurant.jpeg',
      );
      expect(resolveImageUrl('/images/a.jpg')).toBe('http://localhost:5000/images/a.jpg');
      expect(resolveImageUrl('https://cdn.example.com/logo.png')).toBe(
        'https://cdn.example.com/logo.png',
      );
    } finally {
      delete process.env.REACT_APP_API_URL;
    }
  });
});

describe('useCachedImage', () => {
  beforeEach(() => {
    localStorage.clear();
    delete process.env.REACT_APP_API_URL;
    jest.restoreAllMocks();
  });

  it('returns the fallback without fetching when src is empty', () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;
    const { result } = renderHook(() => useCachedImage(undefined, '/images/empty.jpg'));
    expect(result.current).toBe('/images/empty.jpg');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns the cached copy immediately without fetching', () => {
    localStorage.setItem(`${IMAGE_CACHE_PREFIX}${IMG_URL}`, 'data:image/jpeg;base64,cached');
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;
    const { result } = renderHook(() => useCachedImage(IMG_URL, '/images/empty.jpg'));
    expect(result.current).toBe('data:image/jpeg;base64,cached');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches the backend image, stores it in localStorage, and swaps src', async () => {
    mockFetchOk();
    const { result } = renderHook(() => useCachedImage(IMG_URL, '/images/empty.jpg'));
    // Backend URL is used while the fetch is in flight.
    expect(result.current).toBe(IMG_URL);
    await waitFor(() => expect(result.current.startsWith('data:image/jpeg')).toBe(true));
    expect(localStorage.getItem(`${IMAGE_CACHE_PREFIX}${IMG_URL}`)).toBe(result.current);
    expect(global.fetch).toHaveBeenCalledWith(IMG_URL);
  });

  it('falls back to the backend URL when the fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    const { result } = renderHook(() => useCachedImage(IMG_URL, '/images/empty.jpg'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    // Gives the rejected promise a tick to settle, then src stays put.
    await waitFor(() => expect(result.current).toBe(IMG_URL));
    expect(localStorage.getItem(`${IMAGE_CACHE_PREFIX}${IMG_URL}`)).toBeNull();
  });
});

describe('image cache helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    delete process.env.REACT_APP_API_URL;
    jest.restoreAllMocks();
  });

  it('fetchAndCacheImage persists the data URL in localStorage', async () => {
    mockFetchOk();
    const dataUrl = await fetchAndCacheImage(IMG_URL);
    expect(dataUrl.startsWith('data:image/jpeg')).toBe(true);
    expect(getCachedImageSrc(IMG_URL)).toBe(dataUrl);
  });

  it('prefetchImages warms the cache and skips data URLs', async () => {
    mockFetchOk();
    await prefetchImages([IMG_URL, 'data:image/png;base64,x', undefined]);
    expect(getCachedImageSrc(IMG_URL)).not.toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('clearImageCache removes only image entries', () => {
    localStorage.setItem(`${IMAGE_CACHE_PREFIX}${IMG_URL}`, 'data:image/jpeg;base64,x');
    localStorage.setItem('unrelated', 'keep-me');
    clearImageCache();
    expect(localStorage.getItem(`${IMAGE_CACHE_PREFIX}${IMG_URL}`)).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep-me');
  });
});

describe('updatedAt versioning', () => {
  const V1 = '2024-01-01T10:00:00.000Z';
  const V2 = '2024-02-01T10:00:00.000Z';

  beforeEach(() => {
    localStorage.clear();
    delete process.env.REACT_APP_API_URL;
    jest.restoreAllMocks();
  });

  it('reuses the cache when url and version match', () => {
    localStorage.setItem(`${IMAGE_CACHE_PREFIX}${IMG_URL}::${V1}`, 'data:image/jpeg;base64,v1');
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;
    const { result } = renderHook(() => useCachedImage(IMG_URL, '/images/empty.jpg', V1));
    expect(result.current).toBe('data:image/jpeg;base64,v1');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refetches when updatedAt changes and evicts the stale version', async () => {
    localStorage.setItem(`${IMAGE_CACHE_PREFIX}${IMG_URL}::${V1}`, 'data:image/jpeg;base64,v1');
    mockFetchOk('new-bytes');
    const { result, rerender } = renderHook(
      ({ version }) => useCachedImage(IMG_URL, '/images/empty.jpg', version),
      { initialProps: { version: V1 } },
    );
    expect(result.current).toBe('data:image/jpeg;base64,v1');
    rerender({ version: V2 });
    // New version misses the old entry — backend URL while refetching.
    expect(result.current).toBe(IMG_URL);
    await waitFor(() => expect(result.current.startsWith('data:image/jpeg')).toBe(true));
    expect(localStorage.getItem(`${IMAGE_CACHE_PREFIX}${IMG_URL}::${V2}`)).toBe(result.current);
    expect(localStorage.getItem(`${IMAGE_CACHE_PREFIX}${IMG_URL}::${V1}`)).toBeNull();
  });

  it('falls back to the legacy unversioned entry', () => {
    localStorage.setItem(`${IMAGE_CACHE_PREFIX}${IMG_URL}`, 'data:image/jpeg;base64,legacy');
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;
    const { result } = renderHook(() => useCachedImage(IMG_URL, '/images/empty.jpg', V1));
    expect(result.current).toBe('data:image/jpeg;base64,legacy');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('prefetchImages supports versioned entries', async () => {
    mockFetchOk();
    await prefetchImages([{ src: IMG_URL, version: V1 }]);
    expect(getCachedImageSrc(IMG_URL, V1)).not.toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
