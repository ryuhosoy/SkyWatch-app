import type {
  Aircraft,
  Coordinates,
  OpenSkyResponse,
  OpenSkyState,
  OpenSkyTrackResponse,
} from '../types';
import { t, isJapanese } from '../i18n';
import { enrichAircraftWithRoutes } from './adsbdb';
import { fetchOpenSkyWithAuth } from './openskyAuth';

const OPENSKY_BASE = 'https://opensky-network.org/api';

const AIRLINE_NAMES_JA: Record<string, string> = {
  ANA: '全日空 (ANA)',
  JAL: '日本航空 (JAL)',
  JJP: 'ジェットスター・ジャパン',
  APJ: 'Peach Aviation',
  SJO: 'スカイマーク',
  ADO: 'AIR DO',
  SNJ: 'ソラシドエア',
  AMX: 'AeroMexico',
  UAL: 'ユナイテッド航空',
  DAL: 'デルタ航空',
  AAL: 'アメリカン航空',
  BAW: 'ブリティッシュ・エアウェイズ',
  AFR: 'エールフランス',
  DLH: 'ルフトハンザ',
  KAL: '大韓航空',
  AAR: 'アシアナ航空',
  CES: '中国東方航空',
  CCA: '中国国際航空',
  CSN: '中国南方航空',
  SIA: 'シンガポール航空',
  THA: 'タイ国際航空',
  QFA: 'カンタス航空',
  UAE: 'エミレーツ航空',
  THY: 'ターキッシュ エアラインズ',
};

const AIRLINE_NAMES_EN: Record<string, string> = {
  ANA: 'All Nippon Airways',
  JAL: 'Japan Airlines',
  JJP: 'Jetstar Japan',
  APJ: 'Peach Aviation',
  SJO: 'Skymark Airlines',
  ADO: 'AIR DO',
  SNJ: 'Solaseed Air',
  AMX: 'AeroMexico',
  UAL: 'United Airlines',
  DAL: 'Delta Air Lines',
  AAL: 'American Airlines',
  BAW: 'British Airways',
  AFR: 'Air France',
  DLH: 'Lufthansa',
  KAL: 'Korean Air',
  AAR: 'Asiana Airlines',
  CES: 'China Eastern Airlines',
  CCA: 'Air China',
  CSN: 'China Southern Airlines',
  SIA: 'Singapore Airlines',
  THA: 'Thai Airways',
  QFA: 'Qantas',
  UAE: 'Emirates',
  THY: 'Turkish Airlines',
};

function getAirlineName(callsign: string | null): string {
  if (!callsign) return t('unknownAircraft');
  const code = callsign.trim().replace(/\d+$/, '').toUpperCase();
  const map = isJapanese ? AIRLINE_NAMES_JA : AIRLINE_NAMES_EN;
  return map[code] ?? callsign.trim();
}

function formatFlightNumber(callsign: string | null): string {
  if (!callsign) return '----';
  return callsign.trim();
}

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export async function fetchAircraftOverhead(
  latitude: number,
  longitude: number,
  radiusDeg = 0.8,
): Promise<Aircraft[]> {
  const lamin = latitude - radiusDeg;
  const lamax = latitude + radiusDeg;
  const lomin = longitude - radiusDeg;
  const lomax = longitude + radiusDeg;

  const url = `${OPENSKY_BASE}/states/all?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;

  const response = await fetchOpenSkyWithAuth(url);

  if (!response.ok) {
    throw new Error(`OpenSky API error: ${response.status}`);
  }

  const data: OpenSkyResponse = await response.json();

  if (!data.states || data.states.length === 0) {
    return [];
  }

  const aircraft = data.states
    .filter((s: OpenSkyState) => s[5] != null && s[6] != null)
    .map((s: OpenSkyState): Aircraft => {
      const altMeters = s[7] ?? s[13] ?? 0;
      const callsign = s[1] ? s[1].trim() : null;
      const acLat = s[6] as number;
      const acLon = s[5] as number;
      const distKm = haversine(latitude, longitude, acLat, acLon);

      return {
        icao24: s[0],
        callsign: callsign ?? '----',
        airlineName: getAirlineName(callsign),
        flightNumber: formatFlightNumber(callsign),
        country: s[2],
        latitude: acLat,
        longitude: acLon,
        altitudeMeters: Math.round(altMeters),
        altitudeFeet: Math.round(altMeters * 3.28084),
        velocityMs: s[9],
        velocityKnots: s[9] != null ? Math.round(s[9] * 1.94384) : null,
        heading: s[10],
        verticalRate: s[11],
        distanceKm: Math.round(distKm * 10) / 10,
        onGround: s[8],
        departureAirport: null,
        arrivalAirport: null,
        departureAirportIata: null,
        arrivalAirportIata: null,
        departureAirportMunicipality: null,
        arrivalAirportMunicipality: null,
        departureAirportEnglishName: null,
        arrivalAirportEnglishName: null,
        departureAirportCountry: null,
        arrivalAirportCountry: null,
        departureLatitude: null,
        departureLongitude: null,
        arrivalLatitude: null,
        arrivalLongitude: null,
        aircraftType: null,
        aircraftIcaoType: null,
        aircraftManufacturer: null,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  try {
    return await enrichAircraftWithRoutes(aircraft);
  } catch {
    return aircraft;
  }
}

/**
 * 当該便のライブ軌跡（出発〜現在までの waypoints）を取得する。
 * 軌跡が無い / 404 のときは null。
 */
export async function fetchAircraftTrack(
  icao24: string,
): Promise<Coordinates[] | null> {
  const id = icao24.trim().toLowerCase();
  if (!id) return null;

  const url = `${OPENSKY_BASE}/tracks/all?icao24=${encodeURIComponent(id)}&time=0`;
  const response = await fetchOpenSkyWithAuth(url);

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`OpenSky track API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenSkyTrackResponse;
  if (!data.path || data.path.length === 0) {
    return null;
  }

  const points: Coordinates[] = [];
  for (const waypoint of data.path) {
    const latitude = waypoint[1];
    const longitude = waypoint[2];
    if (latitude == null || longitude == null) continue;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    points.push({ latitude, longitude });
  }

  return points.length >= 2 ? points : null;
}
