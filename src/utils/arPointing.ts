import type { Aircraft } from '../types';
import { bearingDeg } from './geo';

/** 画面中心からの許容角（横・縦） */
export const AR_VIEW_HALF_FOV_H = 32;
export const AR_VIEW_HALF_FOV_V = 28;
/** 照準ロック開始（この角度以内） */
export const AR_LOCK_ENTER_THRESHOLD = 10;
/** 照準ロック解除（開始より広くしてチラつき防止） */
export const AR_LOCK_EXIT_THRESHOLD = 16;
/** ロック切替時、新候補が現ロックよりこの角度以上近くないと切替えない */
export const AR_LOCK_HYSTERESIS_DEG = 5;
/** マーカー表示の切替ヒステリシス（ロック外） */
export const AR_MARKER_SWITCH_HYSTERESIS_DEG = 8;
/** 一度表示したマーカーを視野外まで保持するFOV倍率 */
export const AR_STICKY_FOV_SCALE = 1.22;
/** 画面上に出すマーカー数 */
export const AR_MAX_VISIBLE_MARKERS = 1;

export function normalizeRelativeBearing(
  bearingToTarget: number,
  deviceHeading: number,
): number {
  let diff = bearingToTarget - deviceHeading;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

export function aircraftElevationDeg(
  horizontalDistM: number,
  aircraftAltM: number,
  observerAltM = 0,
): number {
  if (horizontalDistM < 1) return 90;
  const delta = aircraftAltM - observerAltM;
  return (Math.atan2(delta, horizontalDistM) * 180) / Math.PI;
}

export type ARAircraftOverlay = {
  aircraft: Aircraft;
  relativeBearingDeg: number;
  relativeElevationDeg: number;
  angularDistance: number;
  screenX: number;
  screenY: number;
};

function icaoKey(icao24: string): string {
  return icao24.trim().toLowerCase();
}

function inFov(relH: number, relV: number, scale = 1): boolean {
  return (
    Math.abs(relH) <= AR_VIEW_HALF_FOV_H * scale &&
    Math.abs(relV) <= AR_VIEW_HALF_FOV_V * scale
  );
}

export function overlayForAircraft(
  ac: Aircraft,
  deviceHeading: number,
  deviceElevation: number,
  observerLat: number,
  observerLon: number,
  observerAltM: number | null | undefined,
): ARAircraftOverlay | null {
  return buildOverlay(
    ac,
    deviceHeading,
    deviceElevation,
    observerLat,
    observerLon,
    observerAltM ?? 0,
  );
}

function buildOverlay(
  ac: Aircraft,
  deviceHeading: number,
  deviceElevation: number,
  observerLat: number,
  observerLon: number,
  observerAlt: number,
): ARAircraftOverlay | null {
  if (ac.onGround) return null;

  const brg = bearingDeg(observerLat, observerLon, ac.latitude, ac.longitude);
  const relH = normalizeRelativeBearing(brg, deviceHeading);
  const horizM = ac.distanceKm * 1000;
  const el = aircraftElevationDeg(horizM, ac.altitudeMeters, observerAlt);
  const relV = el - deviceElevation;

  const angularDistance = Math.hypot(relH, relV);
  const screenX = 0.5 + relH / (2 * AR_VIEW_HALF_FOV_H);
  const screenY = 0.5 - relV / (2 * AR_VIEW_HALF_FOV_V);

  return {
    aircraft: ac,
    relativeBearingDeg: relH,
    relativeElevationDeg: relV,
    angularDistance,
    screenX: Math.max(0.06, Math.min(0.94, screenX)),
    screenY: Math.max(0.1, Math.min(0.9, screenY)),
  };
}

function pickLockedAircraft(
  inView: readonly ARAircraftOverlay[],
  byIcao: ReadonlyMap<string, ARAircraftOverlay>,
  previousLockedIcao: string | null | undefined,
): Aircraft | null {
  const prevKey = previousLockedIcao?.trim().toLowerCase();
  const nearest = inView[0] ?? null;

  if (prevKey) {
    const prev = byIcao.get(prevKey);
    if (
      prev != null &&
      inFov(prev.relativeBearingDeg, prev.relativeElevationDeg, AR_STICKY_FOV_SCALE)
    ) {
      if (prev.angularDistance <= AR_LOCK_EXIT_THRESHOLD) {
        if (
          nearest != null &&
          icaoKey(nearest.aircraft.icao24) !== prevKey &&
          nearest.angularDistance <= AR_LOCK_ENTER_THRESHOLD &&
          nearest.angularDistance <
            prev.angularDistance - AR_LOCK_HYSTERESIS_DEG
        ) {
          return nearest.aircraft;
        }
        return prev.aircraft;
      }
      return null;
    }
  }

  if (
    nearest != null &&
    nearest.angularDistance <= AR_LOCK_ENTER_THRESHOLD
  ) {
    return nearest.aircraft;
  }
  return null;
}

function pickMarkerIcao(
  _inView: readonly ARAircraftOverlay[],
  _byIcao: ReadonlyMap<string, ARAircraftOverlay>,
  _previousMarkerIcao: string | null | undefined,
  locked: Aircraft | null,
): string | null {
  // ロック中のみスカイラベルを出す（未ロック時の最寄り切替チラつきを防ぐ）
  if (locked != null) return icaoKey(locked.icao24);
  return null;
}

export function computeAROverlays(
  aircraftList: readonly Aircraft[],
  deviceHeading: number,
  deviceElevation: number,
  observerLat: number,
  observerLon: number,
  observerAltM: number | null | undefined,
  previousLockedIcao?: string | null,
  previousMarkerIcao?: string | null,
): { overlays: ARAircraftOverlay[]; locked: Aircraft | null } {
  const observerAlt = observerAltM ?? 0;
  const byIcao = new Map<string, ARAircraftOverlay>();
  const inView: ARAircraftOverlay[] = [];

  for (const ac of aircraftList) {
    const overlay = buildOverlay(
      ac,
      deviceHeading,
      deviceElevation,
      observerLat,
      observerLon,
      observerAlt,
    );
    if (overlay == null) continue;
    const key = icaoKey(ac.icao24);
    byIcao.set(key, overlay);
    if (inFov(overlay.relativeBearingDeg, overlay.relativeElevationDeg, 1)) {
      inView.push(overlay);
    }
  }

  inView.sort((a, b) => a.angularDistance - b.angularDistance);

  const finalLocked = pickLockedAircraft(inView, byIcao, previousLockedIcao);
  const markerIcao = pickMarkerIcao(
    inView,
    byIcao,
    previousMarkerIcao,
    finalLocked,
  );

  let visibleOverlays: ARAircraftOverlay[] = [];
  if (markerIcao != null) {
    const marker = byIcao.get(markerIcao);
    if (
      marker != null &&
      inFov(
        marker.relativeBearingDeg,
        marker.relativeElevationDeg,
        AR_STICKY_FOV_SCALE,
      )
    ) {
      visibleOverlays = [marker];
    }
  }

  if (visibleOverlays.length > AR_MAX_VISIBLE_MARKERS) {
    visibleOverlays = visibleOverlays.slice(0, AR_MAX_VISIBLE_MARKERS);
  }

  return { overlays: visibleOverlays, locked: finalLocked };
}

/** 方位角の指数移動平均（AR用） */
export function smoothAngleDeg(prev: number, next: number, alpha: number): number {
  let diff = next - prev;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  let out = prev + diff * alpha;
  while (out < 0) out += 360;
  while (out >= 360) out -= 360;
  return out;
}