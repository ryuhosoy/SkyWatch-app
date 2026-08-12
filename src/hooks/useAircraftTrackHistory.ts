import { useCallback, useEffect, useRef, useState } from 'react';
import type { Aircraft, Coordinates } from '../types';
import { haversineKm } from '../utils/geo';
import { fetchAircraftTrack } from '../utils/opensky';

/** ほぼ同じ地点の連続追記を避ける */
const MIN_POINT_DISTANCE_M = 80;
/** OpenSky tracks を間引く距離（長距離便の点過多対策） */
const SEED_MIN_POINT_DISTANCE_M = 250;
/** 1機あたりの上限（メモリ・描画負荷） */
const MAX_POINTS_PER_AIRCRAFT = 800;
/** 受信から消えた機体の履歴を捨てるまでの時間 */
const STALE_AFTER_MS = 10 * 60_000;

export type AircraftTrackHistory = ReadonlyMap<string, readonly Coordinates[]>;

function simplifyTrack(
  points: Coordinates[],
  minDistanceM: number,
): Coordinates[] {
  if (points.length === 0) return [];

  const out: Coordinates[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1];
    const next = points[i];
    const distM =
      haversineKm(prev.latitude, prev.longitude, next.latitude, next.longitude) *
      1000;
    if (distM >= minDistanceM) {
      out.push(next);
    }
  }

  const last = points[points.length - 1];
  const outLast = out[out.length - 1];
  if (
    outLast.latitude !== last.latitude ||
    outLast.longitude !== last.longitude
  ) {
    out.push(last);
  }

  return out;
}

function trimTrack(points: Coordinates[]): Coordinates[] {
  if (points.length <= MAX_POINTS_PER_AIRCRAFT) return points;
  return points.slice(points.length - MAX_POINTS_PER_AIRCRAFT);
}

/** API 軌跡をベースに、既存のライブ点で末尾を伸ばす */
function mergeSeedWithLive(
  seeded: Coordinates[],
  live: Coordinates[] | undefined,
): Coordinates[] {
  const base = simplifyTrack(seeded, SEED_MIN_POINT_DISTANCE_M);
  if (!live || live.length === 0) {
    return trimTrack(base);
  }

  const merged = [...base];
  for (const point of live) {
    const last = merged[merged.length - 1];
    const distM =
      haversineKm(last.latitude, last.longitude, point.latitude, point.longitude) *
      1000;
    if (distM >= MIN_POINT_DISTANCE_M) {
      merged.push(point);
    }
  }
  return trimTrack(merged);
}

export function useAircraftTrackHistory(aircraft: Aircraft[]): {
  tracks: AircraftTrackHistory;
  ensureFullTrack: (icao24: string) => Promise<void>;
} {
  const tracksRef = useRef(new Map<string, Coordinates[]>());
  const lastSeenRef = useRef(new Map<string, number>());
  const seededRef = useRef(new Set<string>());
  const inflightRef = useRef(new Map<string, Promise<void>>());
  const [tracks, setTracks] = useState<AircraftTrackHistory>(() => new Map());

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
      const distM =
        haversineKm(last.latitude, last.longitude, point.latitude, point.longitude) *
        1000;
      if (distM < MIN_POINT_DISTANCE_M) {
        continue;
      }

      existing.push(point);
      if (existing.length > MAX_POINTS_PER_AIRCRAFT) {
        existing.splice(0, existing.length - MAX_POINTS_PER_AIRCRAFT);
      }
      changed = true;
    }

    for (const [key, seenAt] of lastSeenRef.current) {
      if (seen.has(key)) continue;
      if (now - seenAt < STALE_AFTER_MS) continue;
      lastSeenRef.current.delete(key);
      seededRef.current.delete(key);
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
        // 404 / 空は再取得しない（ライブ点のみで継続）
        if (remote == null) {
          seededRef.current.add(key);
          return;
        }

        const live = tracksRef.current.get(key);
        tracksRef.current.set(key, mergeSeedWithLive(remote, live));
        seededRef.current.add(key);
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

  return { tracks, ensureFullTrack };
}
