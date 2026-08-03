export interface Aircraft {
  icao24: string;
  callsign: string;
  airlineName: string;
  flightNumber: string;
  country: string | null;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  altitudeFeet: number;
  velocityMs: number | null;
  velocityKnots: number | null;
  heading: number | null;
  verticalRate: number | null;
  distanceKm: number;
  onGround: boolean;
  departureAirport: string | null;
  arrivalAirport: string | null;
  departureAirportIata: string | null;
  arrivalAirportIata: string | null;
  departureAirportMunicipality: string | null;
  arrivalAirportMunicipality: string | null;
  departureAirportEnglishName: string | null;
  arrivalAirportEnglishName: string | null;
  departureAirportCountry: string | null;
  arrivalAirportCountry: string | null;
  departureLatitude: number | null;
  departureLongitude: number | null;
  arrivalLatitude: number | null;
  arrivalLongitude: number | null;
  aircraftType: string | null;
  aircraftIcaoType: string | null;
  aircraftManufacturer: string | null;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number;
}

export interface OpenSkyState {
  /** ICAO24 address */
  0: string;
  /** Callsign */
  1: string | null;
  /** Origin country */
  2: string;
  /** Time position */
  3: number | null;
  /** Last contact */
  4: number;
  /** Longitude */
  5: number | null;
  /** Latitude */
  6: number | null;
  /** Baro altitude (m) */
  7: number | null;
  /** On ground */
  8: boolean;
  /** Velocity (m/s) */
  9: number | null;
  /** True track (deg) */
  10: number | null;
  /** Vertical rate (m/s) */
  11: number | null;
  /** Sensors */
  12: number[] | null;
  /** Geo altitude (m) */
  13: number | null;
  /** Squawk */
  14: string | null;
  /** SPI */
  15: boolean;
  /** Position source */
  16: number;
}

export interface OpenSkyResponse {
  time: number;
  states: OpenSkyState[] | null;
}

export interface UseAircraftOverheadReturn {
  location: Coordinates | null;
  /** 端末の向き（真北からの度数）。未取得時は null */
  heading: number | null;
  aircraft: Aircraft[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  permissionGranted: boolean;
  manualRefresh: () => void;
}
