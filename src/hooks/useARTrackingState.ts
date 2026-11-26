import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Aircraft, Coordinates } from '../types';
import {
  computeAROverlays,
  overlayForAircraft,
  smoothAngleDeg,
  type ARAircraftOverlay,
} from '../utils/arPointing';

const TICK_MS = 125;
/** ロック解除後もUIをこの時間キープ */
const LOCK_RELEASE_HOLD_MS = 700;

type ARDisplayState = {
  overlays: ARAircraftOverlay[];
  locked: Aircraft | null;
  lockUiActive: boolean;
};

type Inputs = {
  location: Coordinates | null;
  heading: number | null;
  deviceElevation: number | null;
  aircraft: readonly Aircraft[];
};

export function useARTrackingState({
  location,
  heading,
  deviceElevation,
  aircraft,
}: Inputs): ARDisplayState {
  const inputsRef = useRef<Inputs>({
    location,
    heading,
    deviceElevation,
    aircraft,
  });
  inputsRef.current = { location, heading, deviceElevation, aircraft };

  const stickyLockIcaoRef = useRef<string | null>(null);
  const stickyMarkerIcaoRef = useRef<string | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const smoothedElevationRef = useRef<number | null>(null);
  const smoothScreenRef = useRef<{
    key: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  const displayLockedRef = useRef<Aircraft | null>(null);
  const lockLostAtRef = useRef<number | null>(null);
  const heldOverlaysRef = useRef<ARAircraftOverlay[]>([]);

  const [display, setDisplay] = useState<ARDisplayState>({
    overlays: [],
    locked: null,
    lockUiActive: false,
  });

  useEffect(() => {
    const resetTracking = (): void => {
      stickyLockIcaoRef.current = null;
      stickyMarkerIcaoRef.current = null;
      smoothedHeadingRef.current = null;
      smoothedElevationRef.current = null;
      smoothScreenRef.current = null;
      displayLockedRef.current = null;
      lockLostAtRef.current = null;
      heldOverlaysRef.current = [];
    };

    const tick = (): void => {
      const {
        location: loc,
        heading: hdg,
        deviceElevation: elev,
        aircraft: list,
      } = inputsRef.current;

      if (loc == null || hdg == null || elev == null) {
        resetTracking();
        setDisplay({ overlays: [], locked: null, lockUiActive: false });
        return;
      }

      if (smoothedHeadingRef.current == null) {
        smoothedHeadingRef.current = hdg;
      } else {
        smoothedHeadingRef.current = smoothAngleDeg(
          smoothedHeadingRef.current,
          hdg,
          0.18,
        );
      }

      if (smoothedElevationRef.current == null) {
        smoothedElevationRef.current = elev;
      } else {
        const p = smoothedElevationRef.current;
        smoothedElevationRef.current = p + (elev - p) * 0.2;
      }

      const result = computeAROverlays(
        list,
        smoothedHeadingRef.current,
        smoothedElevationRef.current,
        loc.latitude,
        loc.longitude,
        loc.altitude,
        stickyLockIcaoRef.current,
        stickyMarkerIcaoRef.current,
      );

      if (result.locked != null) {
        lockLostAtRef.current = null;
        displayLockedRef.current = result.locked;
        stickyLockIcaoRef.current = result.locked.icao24;
        stickyMarkerIcaoRef.current = result.locked.icao24;

        const lockOverlay =
          result.overlays[0] ??
          overlayForAircraft(
            result.locked,
            smoothedHeadingRef.current,
            smoothedElevationRef.current,
            loc.latitude,
            loc.longitude,
            loc.altitude,
          );
        if (lockOverlay != null) {
          heldOverlaysRef.current = smoothOverlayPosition(
            lockOverlay,
            smoothScreenRef,
          );
        }
      } else if (displayLockedRef.current != null) {
        if (lockLostAtRef.current == null) {
          lockLostAtRef.current = Date.now();
        }
        const heldMs = Date.now() - lockLostAtRef.current;
        if (heldMs >= LOCK_RELEASE_HOLD_MS) {
          displayLockedRef.current = null;
          heldOverlaysRef.current = [];
          stickyLockIcaoRef.current = null;
          stickyMarkerIcaoRef.current = null;
          smoothScreenRef.current = null;
        } else {
          const holdKey = displayLockedRef.current.icao24.trim().toLowerCase();
          const fresh = list.find(
            (ac) => ac.icao24.trim().toLowerCase() === holdKey,
          );
          if (fresh != null) {
            displayLockedRef.current = fresh;
          }
          const holdOverlay = overlayForAircraft(
            displayLockedRef.current,
            smoothedHeadingRef.current,
            smoothedElevationRef.current,
            loc.latitude,
            loc.longitude,
            loc.altitude,
          );
          if (holdOverlay != null) {
            heldOverlaysRef.current = smoothOverlayPosition(
              holdOverlay,
              smoothScreenRef,
            );
          }
        }
      } else {
        stickyLockIcaoRef.current = null;
        stickyMarkerIcaoRef.current = null;
        heldOverlaysRef.current = [];
      }

      const locked = displayLockedRef.current;
      const lockUiActive = locked != null;
      const overlays = lockUiActive ? heldOverlaysRef.current : [];

      setDisplay({ overlays, locked, lockUiActive });
    };

    tick();
    const id = setInterval(tick, TICK_MS);
    return () => {
      clearInterval(id);
      resetTracking();
    };
  }, []);

  return display;
}

function smoothOverlayPosition(
  item: ARAircraftOverlay,
  smoothScreenRef: MutableRefObject<{
    key: string;
    screenX: number;
    screenY: number;
  } | null>,
): ARAircraftOverlay[] {
  const key = item.aircraft.icao24.toLowerCase();
  const prev = smoothScreenRef.current;
  if (prev == null || prev.key !== key) {
    smoothScreenRef.current = {
      key,
      screenX: item.screenX,
      screenY: item.screenY,
    };
    return [item];
  }
  const alpha = 0.28;
  const screenX = prev.screenX + (item.screenX - prev.screenX) * alpha;
  const screenY = prev.screenY + (item.screenY - prev.screenY) * alpha;
  smoothScreenRef.current = { key, screenX, screenY };
  return [{ ...item, screenX, screenY }];
}