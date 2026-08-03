import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_DEFAULT,
  type Region,
} from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import type { Aircraft, Coordinates } from '../types';
import { t } from '../i18n';
import { bearingDeg, greatCirclePoints, moveByHeading } from '../utils/geo';
import AircraftPopup from './AircraftPopup';

/** Material "flight" のデフォルト向き（北東）を真北 0° に合わせる */
const PLANE_ICON_HEADING_OFFSET = -45;

/** 1°緯度あたりの距離（m） */
const METERS_PER_DEG_LAT = 111_320;
/** 表示南北幅に対する光の長さの割合 */
const BEAM_LENGTH_FRACTION = 0.18;
/** 長さに対する手元半幅の割合 */
const BEAM_BASE_RATIO = 0.12;
const BEAM_LENGTH_MIN_M = 120;
const BEAM_LENGTH_MAX_M = 80_000;

const COLORS = {
  bg: '#060B18',
  panelBorder: '#1A3A5C',
  cyan: '#00D4FF',
  orange: '#FF6B35',
  white: '#E8F4F8',
  muted: '#4A7A9B',
  text: '#B8D4E8',
} as const;

const DEFAULT_DELTA = 0.45;
/** 地図下部の nearest オーバーレイ分の余白 */
const BOTTOM_OVERLAY_PADDING = 96;
/** Fabric の insert クラッシュ緩和のため地図上マーカー数を制限 */
const MAX_MAP_AIRCRAFT = 30;

interface Props {
  location: Coordinates | null;
  /** 端末の向き（真北からの度数）。未取得時は null */
  heading?: number | null;
  aircraft: Aircraft[];
  loading?: boolean;
  /** 機体選択の有無が変わったとき（最近接バーの表示切替用） */
  onSelectionChange?: (selected: boolean) => void;
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

function beamSizeFromLatitudeDelta(latitudeDelta: number): {
  lengthM: number;
  baseHalfWidthM: number;
} {
  const visibleM = Math.max(latitudeDelta, 0.0001) * METERS_PER_DEG_LAT;
  const lengthM = Math.min(
    BEAM_LENGTH_MAX_M,
    Math.max(BEAM_LENGTH_MIN_M, visibleM * BEAM_LENGTH_FRACTION),
  );
  return {
    lengthM,
    baseHalfWidthM: lengthM * BEAM_BASE_RATIO,
  };
}

function buildHeadingBeam(
  location: Coordinates,
  heading: number,
  lengthM: number,
  baseHalfWidthM: number,
): Coordinates[] {
  // 手元が広く、尖端が進行方向の外側を向く三角形
  const tip = moveByHeading(
    location.latitude,
    location.longitude,
    heading,
    lengthM,
  );
  const left = moveByHeading(
    location.latitude,
    location.longitude,
    heading - 90,
    baseHalfWidthM,
  );
  const right = moveByHeading(
    location.latitude,
    location.longitude,
    heading + 90,
    baseHalfWidthM,
  );
  return [left, tip, right];
}

/** 折れ線上の指定割合の位置と、そこでの進行方位 */
function samplePathDirection(
  points: Coordinates[],
  fraction: number,
): { latitude: number; longitude: number; bearing: number } | null {
  if (points.length < 2) return null;
  const t = Math.min(1, Math.max(0, fraction)) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(t));
  const f = t - i;
  const a = points[i];
  const b = points[i + 1];
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * f,
    longitude: a.longitude + (b.longitude - a.longitude) * f,
    bearing: bearingDeg(a.latitude, a.longitude, b.latitude, b.longitude),
  };
}

/** 進行方向を示す小さな矢印（地理座標ポリゴン） */
function buildDirectionArrow(
  latitude: number,
  longitude: number,
  bearing: number,
  sizeM: number,
): Coordinates[] {
  const tip = moveByHeading(latitude, longitude, bearing, sizeM * 0.55);
  const left = moveByHeading(latitude, longitude, bearing - 150, sizeM * 0.5);
  const right = moveByHeading(latitude, longitude, bearing + 150, sizeM * 0.5);
  return [tip, left, right];
}

function UserLocationMarker({ location }: { location: Coordinates }): React.JSX.Element {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const coordinate = useMemo(
    () => ({
      latitude: location.latitude,
      longitude: location.longitude,
    }),
    [location.latitude, location.longitude],
  );

  // 座標が変わるたびに一度だけ再描画を許可（Android でマーカーが固まる対策）
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => setTracksViewChanges(false), 300);
    return () => clearTimeout(timer);
  }, [location.latitude, location.longitude]);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={1000}
    >
      <View style={styles.userMarker} pointerEvents="none">
        <View style={styles.userDotOuter}>
          <View style={styles.userDotInner} />
        </View>
      </View>
    </Marker>
  );
}

export default function SkyMap({
  location,
  heading = null,
  aircraft,
  loading,
  onSelectionChange,
}: Props): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const hasFittedRef = useRef(false);
  const regionRef = useRef<Region | null>(null);
  const [selectedIcao24, setSelectedIcao24] = useState<string | null>(null);
  const [popupNonce, setPopupNonce] = useState(0);
  const [latitudeDelta, setLatitudeDelta] = useState(DEFAULT_DELTA);

  const mapAircraft = aircraft.slice(0, MAX_MAP_AIRCRAFT);

  const aircraftKey = mapAircraft
    .map((ac) => ac.icao24)
    .sort()
    .join(',');

  const selectedAircraft =
    selectedIcao24 != null
      ? (mapAircraft.find((ac) => ac.icao24 === selectedIcao24) ??
          aircraft.find((ac) => ac.icao24 === selectedIcao24) ??
          null)
      : null;

  const nearestAircraft = mapAircraft[0] ?? null;
  const isNearestSelected =
    selectedAircraft != null &&
    nearestAircraft != null &&
    selectedAircraft.icao24 === nearestAircraft.icao24;
  /** 最接近カードを出している（未選択 or 最接近をタップしただけ） */
  const showingNearestCard = selectedAircraft == null || isNearestSelected;

  const headingBeam = useMemo(() => {
    if (!location || heading == null) return null;
    const { lengthM, baseHalfWidthM } = beamSizeFromLatitudeDelta(latitudeDelta);
    return buildHeadingBeam(location, heading, lengthM, baseHalfWidthM);
  }, [location, heading, latitudeDelta]);

  const selectedRouteLines = useMemo(() => {
    if (
      selectedAircraft?.departureLatitude == null ||
      selectedAircraft.departureLongitude == null ||
      selectedAircraft.arrivalLatitude == null ||
      selectedAircraft.arrivalLongitude == null
    ) {
      return null;
    }

    const planeLat = selectedAircraft.latitude;
    const planeLon = selectedAircraft.longitude;

    return {
      // 出発地 → 現在位置（飛行済み）
      flown: greatCirclePoints(
        selectedAircraft.departureLatitude,
        selectedAircraft.departureLongitude,
        planeLat,
        planeLon,
        32,
      ),
      // 現在位置 → 目的地（残り）
      remaining: greatCirclePoints(
        planeLat,
        planeLon,
        selectedAircraft.arrivalLatitude,
        selectedAircraft.arrivalLongitude,
        32,
      ),
    };
  }, [
    selectedAircraft?.departureLatitude,
    selectedAircraft?.departureLongitude,
    selectedAircraft?.arrivalLatitude,
    selectedAircraft?.arrivalLongitude,
    selectedAircraft?.latitude,
    selectedAircraft?.longitude,
  ]);

  const selectedRouteArrows = useMemo(() => {
    if (!selectedRouteLines) return [];

    const visibleM = Math.max(latitudeDelta, 0.0001) * METERS_PER_DEG_LAT;
    const arrowSizeM = Math.min(
      12_000,
      Math.max(400, visibleM * 0.045),
    );

    const samples: { path: Coordinates[]; fraction: number }[] = [
      { path: selectedRouteLines.flown, fraction: 0.55 },
      { path: selectedRouteLines.remaining, fraction: 0.35 },
      { path: selectedRouteLines.remaining, fraction: 0.72 },
    ];

    const arrows: Coordinates[][] = [];
    for (const sample of samples) {
      if (sample.path.length < 2) continue;
      const point = samplePathDirection(sample.path, sample.fraction);
      if (!point || !Number.isFinite(point.bearing)) continue;
      arrows.push(
        buildDirectionArrow(
          point.latitude,
          point.longitude,
          point.bearing,
          arrowSizeM,
        ),
      );
    }
    return arrows;
  }, [selectedRouteLines, latitudeDelta]);

  const selectedRouteEndpoints = useMemo(() => {
    if (
      selectedAircraft?.departureLatitude == null ||
      selectedAircraft.departureLongitude == null ||
      selectedAircraft.arrivalLatitude == null ||
      selectedAircraft.arrivalLongitude == null
    ) {
      return null;
    }
    return {
      departure: {
        latitude: selectedAircraft.departureLatitude,
        longitude: selectedAircraft.departureLongitude,
      },
      arrival: {
        latitude: selectedAircraft.arrivalLatitude,
        longitude: selectedAircraft.arrivalLongitude,
      },
    };
  }, [
    selectedAircraft?.departureLatitude,
    selectedAircraft?.departureLongitude,
    selectedAircraft?.arrivalLatitude,
    selectedAircraft?.arrivalLongitude,
  ]);

  const initialRegion: Region | undefined = regionRef.current ?? (
    location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        }
      : undefined
  );

  const handleSelectAircraft = (icao24: string | null): void => {
    if (icao24 != null) {
      // 同じ機体の再タップでもポップアップを最初から表示し直す
      setPopupNonce((n) => n + 1);
    }
    setSelectedIcao24(icao24);
  };

  useEffect(() => {
    onSelectionChange?.(selectedIcao24 != null);
  }, [selectedIcao24, onSelectionChange]);

  useEffect(() => {
    if (selectedIcao24 && !aircraft.some((ac) => ac.icao24 === selectedIcao24)) {
      handleSelectAircraft(null);
    }
  }, [aircraft, selectedIcao24]);

  useEffect(() => {
    if (!mapRef.current || !location) return;

    const points = [
      { latitude: location.latitude, longitude: location.longitude },
      ...mapAircraft.map((ac) => ({
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
      hasFittedRef.current = true;
      return;
    }

    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 48, right: 48, bottom: BOTTOM_OVERLAY_PADDING, left: 48 },
      animated: hasFittedRef.current,
    });
    hasFittedRef.current = true;
    // 初回の位置取得時 + 航空機セット変更時だけ表示範囲を調整
    // （位置更新のたびに fit するとマーカーが動いて見えない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraftKey, location != null]);

  if (!location) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          {loading ? t('mapLoading') : t('mapNoLocation')}
        </Text>
      </View>
    );
  }

  const hiddenPoint = {
    latitude: location.latitude,
    longitude: location.longitude,
  };
  const hiddenLine = [hiddenPoint, hiddenPoint];
  const hiddenArrow = [hiddenPoint, hiddenPoint, hiddenPoint];
  const routeOverlayVisible = selectedRouteLines != null && selectedRouteEndpoints != null;
  const routeFlownCoords = routeOverlayVisible ? selectedRouteLines.flown : hiddenLine;
  const routeRemainingCoords = routeOverlayVisible ? selectedRouteLines.remaining : hiddenLine;
  const routeArrowCoords = Array.from({ length: 3 }, (_, index) =>
    routeOverlayVisible ? (selectedRouteArrows[index] ?? hiddenArrow) : hiddenArrow,
  );
  const departureCoordinate = routeOverlayVisible ? selectedRouteEndpoints.departure : hiddenPoint;
  const arrivalCoordinate = routeOverlayVisible ? selectedRouteEndpoints.arrival : hiddenPoint;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={Platform.OS === 'android'}
        showsCompass={false}
        userInterfaceStyle="dark"
        mapType="standard"
        onPress={() => handleSelectAircraft(null)}
        onRegionChangeComplete={(region) => {
          regionRef.current = region;
          setLatitudeDelta(region.latitudeDelta);
        }}
      >
        {headingBeam ? (
          <Polygon
            key="heading-beam"
            coordinates={headingBeam}
            fillColor="rgba(66, 133, 244, 0.28)"
            strokeColor="rgba(0, 212, 255, 0.55)"
            strokeWidth={1}
            zIndex={1}
          />
        ) : null}
        <Polyline
          key="route-flown"
          coordinates={routeFlownCoords}
          strokeColor={routeOverlayVisible ? COLORS.cyan : 'rgba(0, 0, 0, 0)'}
          strokeWidth={2}
          lineDashPattern={[10, 8]}
          zIndex={2}
        />
        <Polyline
          key="route-remaining"
          coordinates={routeRemainingCoords}
          strokeColor={routeOverlayVisible ? COLORS.cyan : 'rgba(0, 0, 0, 0)'}
          strokeWidth={2}
          lineDashPattern={[10, 8]}
          zIndex={2}
        />
        {routeArrowCoords.map((coords, index) => (
          <Polygon
            key={`route-arrow-${index}`}
            coordinates={coords}
            fillColor={routeOverlayVisible ? 'rgba(0, 212, 255, 0.85)' : 'rgba(0, 0, 0, 0)'}
            strokeColor={routeOverlayVisible ? COLORS.cyan : 'rgba(0, 0, 0, 0)'}
            strokeWidth={1}
            zIndex={4}
          />
        ))}
        <Marker
          key="route-departure"
          coordinate={departureCoordinate}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          zIndex={3}
        >
          <View style={[styles.airportDot, !routeOverlayVisible && styles.hiddenOverlayMarker]}>
            <View style={[styles.airportDotInner, { backgroundColor: COLORS.muted }]} />
          </View>
        </Marker>
        <Marker
          key="route-arrival"
          coordinate={arrivalCoordinate}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          zIndex={3}
        >
          <View
            style={[styles.airportDotArrival, !routeOverlayVisible && styles.hiddenOverlayMarker]}
          >
            <MaterialIcons name="flag" size={10} color={COLORS.cyan} />
          </View>
        </Marker>
        <UserLocationMarker location={location} />
        {mapAircraft.map((ac, index) => (
          <AircraftMarker
            key={ac.icao24}
            aircraft={ac}
            isClosest={index === 0}
            isSelected={ac.icao24 === selectedIcao24 && !isNearestSelected}
            onPress={() => handleSelectAircraft(ac.icao24)}
          />
        ))}
      </MapView>

      {showingNearestCard ? (
        <>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.cyan }]} />
              <Text style={styles.legendText}>{t('legendClosest')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.orange }]} />
              <Text style={styles.legendText}>{t('legendAircraft')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4285F4' }]} />
              <Text style={styles.legendText}>{t('legendYou')}</Text>
            </View>
          </View>
          {nearestAircraft ? (
            <AircraftPopup
              key={`nearest-${nearestAircraft.icao24}-${popupNonce}`}
              aircraft={nearestAircraft}
              label={t('nearestAircraft')}
            />
          ) : null}
        </>
      ) : selectedAircraft ? (
        <AircraftPopup
          key={`selected-${selectedAircraft.icao24}-${popupNonce}`}
          aircraft={selectedAircraft}
          onClose={() => handleSelectAircraft(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
    borderBottomWidth: 0,
    borderColor: COLORS.panelBorder,
  },
  map: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 0,
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
  userMarker: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(66, 133, 244, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  userDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4285F4',
  },
  airportDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(6, 11, 24, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  airportDotInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  airportDotArrival: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(6, 11, 24, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cyan,
  },
  hiddenOverlayMarker: {
    opacity: 0,
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
    top: 8,
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
