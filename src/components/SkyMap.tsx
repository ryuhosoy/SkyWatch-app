import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import type { Aircraft, Coordinates } from '../types';

/** Material "flight" のデフォルト向き（北東）を真北 0° に合わせる */
const PLANE_ICON_HEADING_OFFSET = -45;

const COLORS = {
  bg: '#060B18',
  panelBorder: '#1A3A5C',
  cyan: '#00D4FF',
  orange: '#FF6B35',
  white: '#E8F4F8',
  muted: '#4A7A9B',
} as const;

const MAP_HEIGHT = 280;
const DEFAULT_DELTA = 0.45;

interface Props {
  location: Coordinates | null;
  aircraft: Aircraft[];
  loading?: boolean;
}

function AircraftMarker({
  aircraft,
  isClosest,
}: {
  aircraft: Aircraft;
  isClosest: boolean;
}): React.JSX.Element {
  const color = isClosest ? COLORS.cyan : COLORS.orange;
  const headingDeg = aircraft.heading ?? 0;
  const rotationDeg = headingDeg + PLANE_ICON_HEADING_OFFSET;
  const headingKey = Math.round(headingDeg);

  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 200);
    return () => clearTimeout(timer);
  }, [headingKey]);

  return (
    <Marker
      coordinate={{
        latitude: aircraft.latitude,
        longitude: aircraft.longitude,
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      tracksViewChanges={tracksViewChanges}
    >
      <View style={styles.markerWrap}>
        <View
          style={[
            styles.planeRotate,
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
  const aircraftKey = aircraft
    .map((ac) => ac.icao24)
    .sort()
    .join(',');

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
      >
        {aircraft.map((ac, index) => (
          <AircraftMarker key={ac.icao24} aircraft={ac} isClosest={index === 0} />
        ))}
      </MapView>

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
});
