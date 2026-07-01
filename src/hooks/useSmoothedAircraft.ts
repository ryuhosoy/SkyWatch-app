import { useEffect, useRef, useState } from 'react';
import type { Aircraft } from '../types';
import { bearingDeg, haversineKm, moveByHeading } from '../utils/geo';

const TICK_MS = 1_000;
const MAX_EXTRAPOLATE_SEC = 18;

interface AircraftSnapshot {
  aircraft: Aircraft[];
  capturedAt: number;
}

export function useSmoothedAircraft(
  aircraft: Aircraft[],
  lastUpdated: Date | null,
): Aircraft[] {
  const [displayed, setDisplayed] = useState<Aircraft[]>(aircraft);
  const snapshotRef = useRef<AircraftSnapshot>({
    aircraft,
    capturedAt: lastUpdated?.getTime() ?? Date.now(),
  });
  const previousPositionsRef = useRef<Map<string, { latitude: number; longitude: number }>>(
    new Map(),
  );

  useEffect(() => {
    snapshotRef.current = {
      aircraft,
      capturedAt: lastUpdated?.getTime() ?? Date.now(),
    };
    const nextPositions = new Map<string, { latitude: number; longitude: number }>();
    for (const ac of aircraft) {
      nextPositions.set(ac.icao24, { latitude: ac.latitude, longitude: ac.longitude });
    }
    previousPositionsRef.current = nextPositions;
    setDisplayed(aircraft);
  }, [aircraft, lastUpdated]);

  useEffect(() => {
    const timer = setInterval(() => {
      const { aircraft: base, capturedAt } = snapshotRef.current;
      const elapsedSec = (Date.now() - capturedAt) / 1000;
      if (elapsedSec > MAX_EXTRAPOLATE_SEC) {
        setDisplayed(base);
        return;
      }

      setDisplayed(
        base.map((ac) => {
          if (ac.velocityMs == null || ac.heading == null || ac.velocityMs < 5) {
            return ac;
          }

          const moved = moveByHeading(
            ac.latitude,
            ac.longitude,
            ac.heading,
            ac.velocityMs * elapsedSec,
          );

          const prev = previousPositionsRef.current.get(ac.icao24);
          let heading = ac.heading;
          if (prev) {
            const distM = haversineKm(
              prev.latitude,
              prev.longitude,
              moved.latitude,
              moved.longitude,
            ) * 1000;
            if (distM > 2) {
              heading = bearingDeg(
                prev.latitude,
                prev.longitude,
                moved.latitude,
                moved.longitude,
              );
            }
          }

          previousPositionsRef.current.set(ac.icao24, {
            latitude: moved.latitude,
            longitude: moved.longitude,
          });

          return {
            ...ac,
            latitude: moved.latitude,
            longitude: moved.longitude,
            heading,
          };
        }),
      );
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []);

  return displayed;
}
