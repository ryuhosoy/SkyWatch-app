import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { Aircraft } from '../types';
import { headingDirection, t } from '../i18n';
import { formatAirportDisplay } from '../utils/airports';
import {
  fetchAircraftPhoto,
  type PlanespotterPhoto,
} from '../utils/planespotters';

const COLORS = {
  cyan: '#00D4FF',
  white: '#E8F4F8',
  muted: '#4A7A9B',
  text: '#B8D4E8',
} as const;

function formatRoute(aircraft: Aircraft): string {
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
  return `${dep.primary} → ${arr.primary}`;
}

interface Props {
  aircraft: Aircraft;
  /** 例: 「最近接航空機」 */
  label?: string;
  onClose?: () => void;
}

export default function AircraftPopup({
  aircraft,
  label,
  onClose,
}: Props): React.JSX.Element {
  const [photo, setPhoto] = useState<PlanespotterPhoto | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPhoto(null);
    setPhotoLoading(true);
    setPhotoFailed(false);

    fetchAircraftPhoto(aircraft.icao24).then((result) => {
      if (cancelled) return;
      setPhoto(result);
      setPhotoLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [aircraft.icao24]);

  const speed =
    aircraft.velocityMs != null ? `${Math.round(aircraft.velocityMs * 3.6)} km/h` : '--';
  const heading =
    aircraft.heading != null
      ? `${Math.round(aircraft.heading)}° ${headingDirection(aircraft.heading)}`
      : '--';
  const model = [aircraft.aircraftIcaoType, aircraft.aircraftManufacturer]
    .filter(Boolean)
    .join(' · ');

  const openPhotoPage = (): void => {
    if (!photo?.link) return;
    void Linking.openURL(photo.link);
  };

  return (
    <View style={styles.popup}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.popupBody}>
        {photo && !photoFailed ? (
          <Pressable
            onPress={openPhotoPage}
            accessibilityRole="link"
            style={styles.photoColumn}
          >
            <Image
              source={{ uri: photo.thumbnailLargeUrl }}
              style={styles.photo}
              resizeMode="contain"
              onError={() => setPhotoFailed(true)}
            />
            <Text style={styles.photoCredit} numberOfLines={2}>
              {t('photoCredit', { name: photo.photographer })}
              {'\n'}
              {t('photoSource')}
            </Text>
          </Pressable>
        ) : photoLoading ? (
          <View style={styles.photoColumn}>
            <View style={styles.photoLoading}>
              <ActivityIndicator size="small" color={COLORS.muted} />
            </View>
          </View>
        ) : null}

        <View style={styles.popupInfo}>
          <View style={styles.popupHeader}>
            <View style={styles.popupTitleRow}>
              <MaterialIcons name="flight" size={16} color={COLORS.cyan} />
              <Text style={styles.popupCallsign}>{aircraft.flightNumber}</Text>
            </View>
            {onClose ? (
              <Pressable onPress={onClose} hitSlop={12} style={styles.popupClose}>
                <Text style={styles.popupCloseText}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.popupAirline} numberOfLines={1}>
            {aircraft.airlineName}
          </Text>
          <Text style={styles.popupRoute} numberOfLines={1}>
            {formatRoute(aircraft)}
          </Text>
          {model ? (
            <Text style={styles.popupModel} numberOfLines={1}>
              {model}
            </Text>
          ) : null}

          <View style={styles.popupStats}>
            <View style={styles.popupStat}>
              <Text style={styles.popupStatLabel}>{t('altitude')}</Text>
              <Text style={styles.popupStatValue}>
                {aircraft.altitudeMeters.toLocaleString()} m
              </Text>
            </View>
            <View style={styles.popupStat}>
              <Text style={styles.popupStatLabel}>{t('distance')}</Text>
              <Text style={[styles.popupStatValue, { color: COLORS.cyan }]}>
                {aircraft.distanceKm} km
              </Text>
            </View>
            <View style={styles.popupStat}>
              <Text style={styles.popupStatLabel}>{t('speed')}</Text>
              <Text style={styles.popupStatValue}>{speed}</Text>
            </View>
            <View style={styles.popupStat}>
              <Text style={styles.popupStatLabel}>{t('heading')}</Text>
              <Text style={styles.popupStatValue}>{heading}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(10, 22, 40, 0.92)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: {
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  popupBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  photoColumn: {
    width: 100,
    flexShrink: 0,
  },
  photoLoading: {
    width: 100,
    height: 72,
    borderRadius: 6,
    backgroundColor: 'rgba(26, 58, 92, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: 100,
    height: 72,
    borderRadius: 6,
    backgroundColor: 'rgba(26, 58, 92, 0.35)',
  },
  photoCredit: {
    marginTop: 4,
    fontSize: 8,
    lineHeight: 11,
    color: COLORS.muted,
  },
  popupInfo: {
    flex: 1,
    minWidth: 0,
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  popupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  popupCallsign: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  popupClose: {
    padding: 2,
  },
  popupCloseText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  popupAirline: {
    fontSize: 12,
    color: COLORS.text,
    marginBottom: 2,
  },
  popupRoute: {
    fontSize: 12,
    color: COLORS.cyan,
    marginBottom: 2,
  },
  popupModel: {
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  popupStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  popupStat: {
    flexGrow: 1,
    flexBasis: '22%',
    backgroundColor: 'rgba(26, 58, 92, 0.45)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  popupStatLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 2,
  },
  popupStatValue: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    fontFamily: 'monospace',
  },
});
