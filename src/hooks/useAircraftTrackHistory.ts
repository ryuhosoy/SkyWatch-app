import { useCallback, useEffect, useRef, useState } from 'react';
import type { Aircraft, Coordinates } from '../types';
import { fetchAircraftTrack } from '../utils/opensky';

/** 受信から消えた機体の履歴を捨てるまでの時間 */
const STALE_AFTER_MS = 10 * 60_000;
/** 地図表示上限と揃えて事前キャッシュする機数 */
const MAX_PREFETCH_AIRCRAFT = 30;
/** /tracks/all 同時取得数（429 回避） */
const PREFETCH_CONCURRENCY = 2;

export type AircraftTrackHistory = ReadonlyMap<string, readonly Coordinates[]>;

export function useAircraftTrackHistory(aircraft: Aircraft[]): {
  tracks: AircraftTrackHistory;
  /** /tracks/all の取得に成功した機体（過去経路の本表示用） */
  fullTrackIcaos: ReadonlySet<string>;
  ensureFullTrack: (icao24: string) => Promise<void>;
} {
  const tracksRef = useRef(new Map<string, Coordinates[]>());
  const lastSeenRef = useRef(new Map<string, number>());
  const seededRef = useRef(new Set<string>());
  const fullTrackRef = useRef(new Set<string>());
  const inflightRef = useRef(new Map<string, Promise<void>>());
  const prefetchQueueRef = useRef<string[]>([]);
  const prefetchActiveRef = useRef(0);
  const [tracks, setTracks] = useState<AircraftTrackHistory>(() => new Map());
  const [fullTrackIcaos, setFullTrackIcaos] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const now = Date.now();
    let changed = false;
    const seen = new Set<string>();

    for (const ac of aircraft) {
      const key = ac.icao24.toLowerCase();
      seen.add(key);
      lastSeenRef.current.set(key, now);

      const point: Coordinates = {
        latitude: ac.latitude,
        longitude: ac.longitude,
      };
      const existing = tracksRef.current.get(key);
      if (!existing) {
        tracksRef.current.set(key, [point]);
        changed = true;
        continue;
      }

      const last = existing[existing.length - 1];
      if (last.latitude === point.latitude && last.longitude === point.longitude) {
        continue;
      }

      existing.push(point);
      changed = true;
    }

    for (const [key, seenAt] of lastSeenRef.current) {
      if (seen.has(key)) continue;
      if (now - seenAt < STALE_AFTER_MS) continue;
      lastSeenRef.current.delete(key);
      seededRef.current.delete(key);
      if (fullTrackRef.current.delete(key)) {
        setFullTrackIcaos(new Set(fullTrackRef.current));
      }
      if (tracksRef.current.delete(key)) {
        changed = true;
      }
    }

    if (changed) {
      setTracks(new Map(tracksRef.current));
    }
  }, [aircraft]);

  const ensureFullTrack = useCallback(async (icao24: string): Promise<void> => {
    const key = icao24.trim().toLowerCase();
    if (!key || seededRef.current.has(key)) return;

    const existingInflight = inflightRef.current.get(key);
    if (existingInflight) {
      await existingInflight;
      return;
    }

    const promise = (async () => {
      try {
        const remote = await fetchAircraftTrack(key);
        // 404 / 空は再取得しない
        if (remote == null) {
          seededRef.current.add(key);
          return;
        }

        // tracks API の点をすべて使う
        tracksRef.current.set(key, remote.map((p) => ({ ...p })));
        seededRef.current.add(key);
        fullTrackRef.current.add(key);
        setFullTrackIcaos(new Set(fullTrackRef.current));
        setTracks(new Map(tracksRef.current));
      } catch {
        // 一時的な失敗は seeded にしない（次回選択で再試行）
      } finally {
        inflightRef.current.delete(key);
      }
    })();

    inflightRef.current.set(key, promise);
    await promise;
  }, []);

  const pumpPrefetch = useCallback(() => {
    while (
      prefetchActiveRef.current < PREFETCH_CONCURRENCY &&
      prefetchQueueRef.current.length > 0
    ) {
      const key = prefetchQueueRef.current.shift();
      if (!key || seededRef.current.has(key) || inflightRef.current.has(key)) {
        continue;
      }
      prefetchActiveRef.current += 1;
      void ensureFullTrack(key).finally(() => {
        prefetchActiveRef.current -= 1;
        pumpPrefetch();
      });
    }
  }, [ensureFullTrack]);

  useEffect(() => {
    const needed: string[] = [];
    const seen = new Set<string>();
    for (const ac of aircraft.slice(0, MAX_PREFETCH_AIRCRAFT)) {
      const key = ac.icao24.toLowerCase();
      if (
        !key ||
        seededRef.current.has(key) ||
        inflightRef.current.has(key) ||
        seen.has(key)
      ) {
        continue;
      }
      needed.push(key);
      seen.add(key);
    }
    prefetchQueueRef.current = needed;
    pumpPrefetch();
  }, [aircraft, pumpPrefetch]);

  return { tracks, fullTrackIcaos, ensureFullTrack };
}
