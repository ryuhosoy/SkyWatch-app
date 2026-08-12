const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** 方位・距離で緯度経度を移動（大圏航路の近似） */
export function moveByHeading(
  lat: number,
  lon: number,
  headingDeg: number,
  distanceM: number,
): { latitude: number; longitude: number } {
  const angularDist = distanceM / EARTH_RADIUS_M;
  const bearing = toRad(headingDeg);
  const lat1 = toRad(lat);
  const lon1 = toRad(lon);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist) +
      Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
      Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2),
    );

  return { latitude: toDeg(lat2), longitude: toDeg(lon2) };
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return (EARTH_RADIUS_M / 1000) * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 方位差（0〜180） */
export function shortestHeadingDiff(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

/** 2点間の進行方位（北=0°、時計回り） */
export function bearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * ライブ位置が軌跡先端より後ろなら、先端へスナップする。
 * 先端より先にいる場合はそのまま（経路を伸ばす）。
 */
export function alignToTrackTip(
  live: { latitude: number; longitude: number; heading: number | null },
  track: readonly { latitude: number; longitude: number }[] | undefined,
): { latitude: number; longitude: number; heading: number | null } {
  if (track == null || track.length === 0) return live;

  const tip = track[track.length - 1];
  const distM =
    haversineKm(live.latitude, live.longitude, tip.latitude, tip.longitude) * 1000;
  if (distM < 250) return live;

  const prev = track.length >= 2 ? track[track.length - 2] : null;
  const trackHeading =
    prev != null
      ? bearingDeg(prev.latitude, prev.longitude, tip.latitude, tip.longitude)
      : live.heading;
  if (trackHeading == null || !Number.isFinite(trackHeading)) return live;

  const toTip = bearingDeg(live.latitude, live.longitude, tip.latitude, tip.longitude);
  if (shortestHeadingDiff(toTip, trackHeading) > 90) return live;

  return {
    latitude: tip.latitude,
    longitude: tip.longitude,
    heading: trackHeading,
  };
}

/** 大圏航路上の点列（地図のルート線用） */
export function greatCirclePoints(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  segments = 48,
): { latitude: number; longitude: number }[] {
  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  const Δ =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    );

  if (!Number.isFinite(Δ) || Δ < 1e-12) {
    return [
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 },
    ];
  }

  const points: { latitude: number; longitude: number }[] = [];
  const sinΔ = Math.sin(Δ);

  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * Δ) / sinΔ;
    const B = Math.sin(f * Δ) / sinΔ;
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    points.push({
      latitude: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
      longitude: toDeg(Math.atan2(y, x)),
    });
  }

  return points;
}
