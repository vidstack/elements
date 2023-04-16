import { deferredPromise, isNull, type DeferredPromise } from 'maverick.js/std';

export function preconnect(
  url: string,
  rel: 'preconnect' | 'prefetch' | 'preload' = 'preconnect',
): boolean {
  if (__SERVER__) return false;

  const exists = document.querySelector(`link[href="${url}"]`);
  if (!isNull(exists)) return true;

  const link = document.createElement('link');
  link.rel = rel;
  link.href = url;
  link.crossOrigin = 'true';

  document.head.append(link);
  return true;
}

const pendingRequests: Record<string, DeferredPromise<void>> = {};
export function loadScript(src: string): Promise<void> {
  if (pendingRequests[src]) return pendingRequests[src].promise;

  const promise = deferredPromise(),
    exists = document.querySelector(`script[src="${src}"]`);

  if (!isNull(exists)) {
    promise.resolve();
    return promise.promise;
  }

  const script = document.createElement('script');
  script.src = src;

  script.onload = () => {
    promise.resolve();
    delete pendingRequests[src];
  };

  script.onerror = () => {
    promise.reject();
    delete pendingRequests[src];
  };

  setTimeout(() => document.head.append(script), 0);
  return promise.promise;
}
