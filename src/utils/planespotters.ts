/** Planespotters.net Photo API — https://www.planespotters.net/photo/api */

const API_BASE = 'https://api.planespotters.net/pub/photos';
/** ToS: identify the app and include a contact URL/email */
const USER_AGENT = 'FlightOverhead/1.0.3 (+https://www.planespotters.net/photo/api; com.ryuhosoy.FlightOverhead)';
/** ToS: JSON may be cached up to 24 hours */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface PlanespotterPhoto {
  id: string;
  thumbnailUrl: string;
  thumbnailLargeUrl: string;
  link: string;
  photographer: string;
}

interface ApiThumbnail {
  src: string;
  size?: { width: number; height: number };
}

interface ApiPhoto {
  id: string;
  thumbnail?: ApiThumbnail;
  thumbnail_large?: ApiThumbnail;
  link: string;
  photographer: string;
}

interface ApiResponse {
  photos?: ApiPhoto[];
  error?: string;
}

interface CacheEntry {
  photo: PlanespotterPhoto | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PlanespotterPhoto | null>>();

function mapPhoto(raw: ApiPhoto): PlanespotterPhoto | null {
  const thumbnailLargeUrl = raw.thumbnail_large?.src;
  const thumbnailUrl = raw.thumbnail?.src ?? thumbnailLargeUrl;
  if (!thumbnailUrl || !raw.link || !raw.photographer) {
    return null;
  }

  return {
    id: raw.id,
    thumbnailUrl,
    thumbnailLargeUrl: thumbnailLargeUrl ?? thumbnailUrl,
    link: raw.link,
    photographer: raw.photographer,
  };
}

async function fetchByHex(icao24: string): Promise<PlanespotterPhoto | null> {
  const response = await fetch(`${API_BASE}/hex/${icao24}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Planespotters API error: ${response.status}`);
  }

  const data = (await response.json()) as ApiResponse;
  if (data.error) {
    throw new Error(data.error);
  }

  const first = data.photos?.[0];
  return first ? mapPhoto(first) : null;
}

/**
 * 機体の最新写真を ICAO24 で取得する。
 * 結果（写真なし含む）は最大 24 時間キャッシュする。
 */
export async function fetchAircraftPhoto(icao24: string): Promise<PlanespotterPhoto | null> {
  const key = icao24.trim().toLowerCase();
  if (!key) return null;

  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.photo;
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fetchByHex(key)
    .then((photo) => {
      cache.set(key, { photo, expiresAt: Date.now() + CACHE_TTL_MS });
      return photo;
    })
    .catch((error) => {
      // 一時的な失敗はキャッシュせず次回リトライ
      console.warn('[planespotters]', error);
      return null;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
