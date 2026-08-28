import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Aircraft } from '../types';
import { t } from '../i18n';
import { formatAirportDisplay } from './airports';
import { NOTIFY_RADIUS_KM } from '../constants/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function formatRoute(aircraft: Aircraft): string | null {
  const dep = formatAirportDisplay(aircraft.departureAirport, {
    iata: aircraft.departureAirportIata,
    municipality: aircraft.departureAirportMunicipality,
    englishName: aircraft.departureAirportEnglishName,
    countryIso: aircraft.departureAirportCountry,
  });
  const arr = formatAirportDisplay(aircraft.arrivalAirport, {
    iata: aircraft.arrivalAirportIata,
    municipality: aircraft.arrivalAirportMunicipality,
    englishName: aircraft.arrivalAirportEnglishName,
    countryIso: aircraft.arrivalAirportCountry,
  });

  if (dep.primary === dep.code && arr.primary === arr.code) {
    return null;
  }

  return `${dep.primary} → ${arr.primary}`;
}

function buildNotificationBody(aircraft: Aircraft): string {
  const parts = [
    t('notifyBody', {
      dist: aircraft.distanceKm,
      alt: aircraft.altitudeMeters.toLocaleString(),
    }),
    aircraft.airlineName !== aircraft.flightNumber ? aircraft.airlineName : null,
    formatRoute(aircraft),
  ].filter((p): p is string => p != null && p.length > 0);

  return parts.join(' / ');
}

const ANDROID_CHANNEL_ID = 'reapproach';

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Aircraft approach',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00D4FF',
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync(
    Platform.OS === 'ios'
      ? {
          ios: {
            allowAlert: true,
            allowBadge: false,
            allowSound: true,
          },
        }
      : undefined,
  );

  return status === 'granted';
}

export async function notifyReapproach(aircraft: Aircraft): Promise<void> {
  const flightLabel =
    aircraft.flightNumber !== '----' ? aircraft.flightNumber : aircraft.icao24.toUpperCase();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: t('notifyTitle', { flight: flightLabel, km: NOTIFY_RADIUS_KM }),
      body: buildNotificationBody(aircraft),
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null),
    },
    trigger: null,
  });
}
