import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import type { Aircraft, Coordinates } from '../types';
import { formatAirportDisplay } from '../utils/airports';

/** Material "flight" のデフォルト向き（北東）を真北 0° に合わせる */
const PLANE_ICON_HEADING_OFFSET = -45;

const COLORS = {
  bg: '#060B18',
  panelBorder: '#1A3A5C',
  cyan: '#00D4FF',
  orange: '#FF6B35',
  white: '#E8F4F8',
  muted: '#4A7A9B',
  text: '#B8D4E8',
} as const;

const MAP_HEIGHT = 280;
const DEFAULT_DELTA = 0.45;

const DIRECTIONS = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'] as const;

interface Props {
  location: Coordinates | null;
  aircraft: Aircraft[];
  loading?: boolean;
}

function headingToJapanese(heading: number | null): string {
  if (heading == null) return '';
  return DIRECTIONS[Math.round(heading / 45) % 8];
}

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

function AircraftPopup({
  aircraft,
  onClose,
}: {
  aircraft: Aircraft;
  onClose: () => void;
}): React.JSX.Element {
  const speed =
    aircraft.velocityMs != null ? `${Math.round(aircraft.velocityMs * 3.6)} km/h` : '--';
  const heading =
    aircraft.heading != null
      ? `${Math.round(aircraft.heading)}° ${headingToJapanese(aircraft.heading)}`
      : '--';
  const model = [aircraft.aircraftIcaoType, aircraft.aircraftManufacturer]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.popup}>
      <View style={styles.popupHeader}>
        <View style={styles.popupTitleRow}>
          <MaterialIcons name="flight" size={16} color={COLORS.cyan} />
          <Text style={styles.popupCallsign}>{aircraft.flightNumber}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} style={styles.popupClose}>
          <Text style={styles.popupCloseText}>✕</Text>
        </Pressable>
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
          <Text style={styles.popupStatLabel}>高度</Text>
          <Text style={styles.popupStatValue}>
            {aircraft.altitudeMeters.toLocaleString()} m
          </Text>
        </View>
        <View style={styles.popupStat}>
          <Text style={styles.popupStatLabel}>距離</Text>
          <Text style={[styles.popupStatValue, { color: COLORS.cyan }]}>
            {aircraft.distanceKm} km
          </Text>
        </View>
        <View style={styles.popupStat}>
          <Text style={styles.popupStatLabel}>速度</Text>
          <Text style={styles.popupStatValue}>{speed}</Text>
        </View>
        <View style={styles.popupStat}>
          <Text style={styles.popupStatLabel}>方位</Text>
          <Text style={styles.popupStatValue}>{heading}</Text>
        </View>
      </View>
    </View>
  );
}

function AircraftMarker({
  aircraft,
  isClosest,
  isSelected,
  onPress,
}: {
  aircraft: Aircraft;
  isClosest: boolean;
  isSelected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const color = isSelected ? COLORS.white : isClosest ? COLORS.cyan : COLORS.orange;
  const headingDeg = aircraft.heading ?? 0;
  const rotationDeg = headingDeg + PLANE_ICON_HEADING_OFFSET;
  const renderKey = `${aircraft.latitude.toFixed(6)}:${aircraft.longitude.toFixed(6)}:${headingDeg.toFixed(1)}:${isSelected}`;

  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, [renderKey]);

  return (
    <Marker
      coordinate={{
        latitude: aircraft.latitude,
        longitude: aircraft.longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      tracksViewChanges={tracksViewChanges}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <View style={styles.markerWrap}>
        <View
          style={[
            styles.planeRotate,
            isSelected && styles.planeSelected,
            { transform: [{ rotate: `${rotationDeg}deg` }] },
          ]}
        >
          <MaterialIcons name="flight" size={22} color={color} />
        </View>
        {aircraft.flightNumber !== '----' ? (
          <View style={[styles.labelPill, { borderColor: color }]}>
            <Text style={[styles.labelText, { color }]} numberOfLines={1}>
              {aircraft.flightNumber}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}

export default function SkyMap({ location, aircraft, loading }: Props): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const hasFittedRef = useRef(false);
  const [selectedIcao24, setSelectedIcao24] = useState<string | null>(null);

  const aircraftKey = aircraft
    .map((ac) => ac.icao24)
    .sort()
    .join(',');

  const selectedAircraft =
    selectedIcao24 != null
      ? (aircraft.find((ac) => ac.icao24 === selectedIcao24) ?? null)
      : null;

  useEffect(() => {
    if (selectedIcao24 && !aircraft.some((ac) => ac.icao24 === selectedIcao24)) {
      setSelectedIcao24(null);
    }
  }, [aircraft, selectedIcao24]);

  const initialRegion: Region | undefined = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      }
    : undefined;

  useEffect(() => {
    if (!mapRef.current || !location) return;

    const points = [
      { latitude: location.latitude, longitude: location.longitude },
      ...aircraft.map((ac) => ({
        latitude: ac.latitude,
        longitude: ac.longitude,
      })),
    ];

    if (points.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        },
        600,
      );
      return;
    }

    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: hasFittedRef.current,
    });
    hasFittedRef.current = true;
    // aircraftKey が変わったときだけ表示範囲を調整（スムーズ移動のたびにズームしない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, aircraftKey]);

  if (!location) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          {loading ? '地図を読み込み中...' : '位置情報を取得できません'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={Platform.OS === 'android'}
        showsCompass={false}
        userInterfaceStyle="dark"
        mapType="standard"
        onPress={() => setSelectedIcao24(null)}
      >
        {aircraft.map((ac, index) => (
          <AircraftMarker
            key={ac.icao24}
            aircraft={ac}
            isClosest={index === 0}
            isSelected={ac.icao24 === selectedIcao24}
            onPress={() => setSelectedIcao24(ac.icao24)}
          />
        ))}
      </MapView>

      {selectedAircraft ? (
        <AircraftPopup
          aircraft={selectedAircraft}
          onClose={() => setSelectedIcao24(null)}
        />
      ) : (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.cyan }]} />
            <Text style={styles.legendText}>最近接</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.orange }]} />
            <Text style={styles.legendText}>航空機</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4285F4' }]} />
            <Text style={styles.legendText}>現在地</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  map: {
    flex: 1,
  },
  placeholder: {
    height: MAP_HEIGHT,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    backgroundColor: '#0A1628',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  markerWrap: {
    alignItems: 'center',
    gap: 2,
  },
  planeRotate: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  planeSelected: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    borderRadius: 14,
  },
  labelPill: {
    backgroundColor: 'rgba(6, 11, 24, 0.85)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    maxWidth: 72,
  },
  labelText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  legend: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(6, 11, 24, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 9,
    color: COLORS.muted,
  },
  popup: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(6, 11, 24, 0.95)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cyan,
    padding: 12,
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
