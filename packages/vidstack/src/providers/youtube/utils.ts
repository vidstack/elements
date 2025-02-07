const videoIdRE =
  /(?:youtu\.be|youtube|youtube\.com|youtube-nocookie\.com)(?:\/shorts)?\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|)((?:\w|-){11})/;

const posterCache = new Map<string, string>();

const pendingFetch = new Map<string, Promise<string>>();

export function resolveYouTubeVideoId(src: string) {
  return src.match(videoIdRE)?.[1];
}

export async function findYouTubePoster(videoId: string, abort: AbortController) {
  if (posterCache.has(videoId)) return posterCache.get(videoId)!;

  if (pendingFetch.has(videoId)) return pendingFetch.get(videoId)!;

  const pending = new Promise<string>(async (resolve) => {
    const sizes = ['maxresdefault', 'sddefault', 'hqdefault'];
    for (const size of sizes) {
      for (const webp of [true, false]) {
        const url = resolveYouTubePosterURL(videoId, size, webp),
          response = await fetch(url, {
            mode: 'no-cors',
            signal: abort.signal,
          });

        if (response.status < 400) {
          posterCache.set(videoId, url);
          resolve(url);
          return;
        }
      }
    }
  })
    .catch(() => '')
    .finally(() => pendingFetch.delete(videoId));

  pendingFetch.set(videoId, pending);
  return pending;
}

function resolveYouTubePosterURL(videoId: string, size: string, webp: boolean) {
  const type = webp ? 'webp' : 'jpg';
  return `https://i.ytimg.com/${webp ? 'vi_webp' : 'vi'}/${videoId}/${size}.${type}`;
}
