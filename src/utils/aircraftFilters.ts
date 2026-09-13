import type { Aircraft } from '../types';
import type { AppSettings } from '../constants/settings';

export function aircraftInAltitudeRange(
  aircraft: Aircraft,
  settings: Pick<AppSettings, 'altitudeMinM' | 'altitudeMaxM'>,
): boolean {
  const alt = aircraft.altitudeMeters;
  if (!Number.isFinite(alt)) return false;
  return alt >= settings.altitudeMinM && alt <= settings.altitudeMaxM;
}

export function filterAircraftByAltitude(
  aircraft: readonly Aircraft[],
  settings: Pick<AppSettings, 'altitudeMinM' | 'altitudeMaxM'>,
): Aircraft[] {
  return aircraft.filter((ac) => aircraftInAltitudeRange(ac, settings));
}
