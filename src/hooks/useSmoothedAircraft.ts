import { useEffect, useRef, useState } from 'react';
import type { Aircraft } from '../types';
import { moveByHeading } from '../utils/geo';

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

  useEffect(() => {
    snapshotRef.current = {
      aircraft,
      capturedAt: lastUpdated?.getTime() ?? Date.now(),
    };
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

          return {
            ...ac,
            latitude: moved.latitude,
            longitude: moved.longitude,
          };
        }),
      );
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []);

  return displayed;
}
