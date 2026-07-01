import type { Aircraft } from '../types';
import { resolveTypeImageUrl } from './aircraftTypeImages';

const ADSBDB_BASE = 'https://api.adsbdb.com/v0';

export interface AirportRouteInfo {
  icao: string | null;
  iata: string | null;
  municipality: string | null;
  name: string | null;
  countryIso: string | null;
}

export interface FlightRoute {
  departure: AirportRouteInfo | null;
  arrival: AirportRouteInfo | null;
}

interface AdsbdbAirport {
  icao_code: string;
  iata_code?: string;
  municipality?: string;
  name?: string;
  country_iso_name?: string;
}

interface AdsbdbCallsignResponse {
  response?: {
    flightroute?: {
      origin?: AdsbdbAirport;
      destination?: AdsbdbAirport;
    };
  };
}

interface RouteCacheEntry {
  route: FlightRoute | null;
}

interface AdsbdbAircraftInfo {
  type: string;
  icao_type: string;
  manufacturer: string;
  url_photo: string | null;
  url_photo_thumbnail: string | null;
}

interface AdsbdbAircraftResponse {
  response?:
    | {
        aircraft?: AdsbdbAircraftInfo;
      }
    | string;
}

interface AircraftInfoCacheEntry {
  info: AdsbdbAircraftInfo | null;
}

const routeCache = new Map<string, RouteCacheEntry>();
const inflightLookups = new Map<string, Promise<FlightRoute | null>>();
const aircraftInfoCache = new Map<string, AircraftInfoCacheEntry>();
const inflightAircraftLookups = new Map<string, Promise<AdsbdbAircraftInfo | null>>();

function isValidCallsign(callsign: string): boolean {
  const trimmed = callsign.trim();
  return trimmed.length > 0 && trimmed !== '----';
}

function toAirportInfo(airport?: AdsbdbAirport): AirportRouteInfo | null {
  if (!airport?.icao_code) return null;

  return {
    icao: airport.icao_code,
    iata: airport.iata_code ?? null,
    municipality: airport.municipality ?? null,
    name: airport.name ?? null,
    countryIso: airport.country_iso_name ?? null,
  };
}

async function fetchRouteByCallsign(callsign: string): Promise<FlightRoute | null> {
  const normalized = callsign.trim().toUpperCase();
  const url = `${ADSBDB_BASE}/callsign/${encodeURIComponent(normalized)}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (response.status === 404 || response.status === 400) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`adsbdb error: ${response.status}`);
  }

  const data = (await response.json()) as AdsbdbCallsignResponse;
  const flightRoute = data.response?.flightroute;
  if (!flightRoute) {
    return null;
  }

  const departure = toAirportInfo(flightRoute.origin);
  const arrival = toAirportInfo(flightRoute.destination);
  if (!departure && !arrival) {
    return null;
  }

  return { departure, arrival };
}

async function lookupRoute(icao24: string, callsign: string): Promise<FlightRoute | null> {
  const key = icao24.toLowerCase();
  const cached = routeCache.get(key);
  if (cached) {
    return cached.route;
  }

  const pending = inflightLookups.get(key);
  if (pending) {
    return pending;
  }

  const promise = fetchRouteByCallsign(callsign)
    .then((route) => {
      routeCache.set(key, { route });
      return route;
    })
    .finally(() => {
      inflightLookups.delete(key);
    });

  inflightLookups.set(key, promise);
  return promise;
}

function applyRoute(ac: Aircraft, route: FlightRoute): Aircraft {
  return {
    ...ac,
    departureAirport: route.departure?.icao ?? null,
    arrivalAirport: route.arrival?.icao ?? null,
    departureAirportIata: route.departure?.iata ?? null,
    arrivalAirportIata: route.arrival?.iata ?? null,
    departureAirportMunicipality: route.departure?.municipality ?? null,
    arrivalAirportMunicipality: route.arrival?.municipality ?? null,
    departureAirportEnglishName: route.departure?.name ?? null,
    arrivalAirportEnglishName: route.arrival?.name ?? null,
    departureAirportCountry: route.departure?.countryIso ?? null,
    arrivalAirportCountry: route.arrival?.countryIso ?? null,
  };
}

async function fetchAircraftInfo(icao24: string): Promise<AdsbdbAircraftInfo | null> {
  const normalized = icao24.toLowerCase();
  const url = `${ADSBDB_BASE}/aircraft/${encodeURIComponent(normalized)}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (response.status === 404 || response.status === 400) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`adsbdb aircraft error: ${response.status}`);
  }

  const data = (await response.json()) as AdsbdbAircraftResponse;
  if (!data.response || typeof data.response === 'string') {
    return null;
  }

  return data.response.aircraft ?? null;
}

async function lookupAircraftInfo(icao24: string): Promise<AdsbdbAircraftInfo | null> {
  const key = icao24.toLowerCase();
  const cached = aircraftInfoCache.get(key);
  if (cached) {
    return cached.info;
  }

  const pending = inflightAircraftLookups.get(key);
  if (pending) {
    return pending;
  }

  const promise = fetchAircraftInfo(icao24)
    .then((info) => {
      aircraftInfoCache.set(key, { info });
      return info;
    })
    .finally(() => {
      inflightAircraftLookups.delete(key);
    });

  inflightAircraftLookups.set(key, promise);
  return promise;
}

function applyAircraftInfo(ac: Aircraft, info: AdsbdbAircraftInfo | null): Aircraft {
  if (!info) {
    return ac;
  }

  const icaoType = info.icao_type ?? null;

  return {
    ...ac,
    aircraftType: info.type ?? null,
    aircraftIcaoType: icaoType,
    aircraftManufacturer: info.manufacturer ?? null,
    photoUrl: resolveTypeImageUrl(icaoType),
  };
}

export async function enrichAircraftWithRoutes(aircraft: Aircraft[]): Promise<Aircraft[]> {
  await Promise.all(
    aircraft.map(async (ac) => {
      const key = ac.icao24.toLowerCase();
      const tasks: Promise<unknown>[] = [];

      if (!routeCache.has(key) && !inflightLookups.has(key)) {
        if (!isValidCallsign(ac.callsign)) {
          routeCache.set(key, { route: null });
        } else {
          tasks.push(
            lookupRoute(ac.icao24, ac.callsign).catch(() => {
              // ネットワークエラー時はキャッシュせず次回リトライ
            }),
          );
        }
      }

      if (!aircraftInfoCache.has(key) && !inflightAircraftLookups.has(key)) {
        tasks.push(
          lookupAircraftInfo(ac.icao24).catch(() => {
            // ネットワークエラー時はキャッシュせず次回リトライ
          }),
        );
      }

      if (tasks.length > 0) {
        await Promise.all(tasks);
      }
    }),
  );

  return aircraft.map((ac) => {
    const routeEntry = routeCache.get(ac.icao24.toLowerCase());
    const infoEntry = aircraftInfoCache.get(ac.icao24.toLowerCase());

    let enriched = ac;
    if (routeEntry?.route) {
      enriched = applyRoute(enriched, routeEntry.route);
    }
    if (infoEntry) {
      enriched = applyAircraftInfo(enriched, infoEntry.info);
    }

    return enriched;
  });
}
