import { useEffect, useRef, useState } from 'react';
import type { Aircraft, Coordinates } from '../types';
import { haversineKm } from '../utils/geo';

/** ほぼ同じ地点の連続追記を避ける */
const MIN_POINT_DISTANCE_M = 80;
/** 1機あたりの上限（メモリ・描画負荷） */
const MAX_POINTS_PER_AIRCRAFT = 400;
/** 受信から消えた機体の履歴を捨てるまでの時間 */
const STALE_AFTER_MS = 10 * 60_000;

export type AircraftTrackHistory = ReadonlyMap<string, readonly Coordinates[]>;

export function useAircraftTrackHistory(aircraft: Aircraft[]): AircraftTrackHistory {
  const tracksRef = useRef(new Map<string, Coordinates[]>());
  const lastSeenRef = useRef(new Map<string, number>());
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
        haversineKm(last.latitude, last.longitude, point.latitude, point.longitude) * 1000;
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
      if (tracksRef.current.delete(key)) {
        changed = true;
      }
    }

    if (changed) {
      setTracks(new Map(tracksRef.current));
    }
  }, [aircraft]);

  return tracks;
}
