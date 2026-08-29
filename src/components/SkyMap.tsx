import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { GOOGLE_MAPS_MAP_ID } from '../constants/mapDarkStyle';
import type { Aircraft, Coordinates } from '../types';
import type { AircraftTrackHistory } from '../hooks/useAircraftTrackHistory';
import { t } from '../i18n';
import { alignToTrackTip, bearingDeg, greatCirclePoints, haversineKm, moveByHeading, shortestHeadingDiff } from '../utils/geo';
import AircraftPopup from './AircraftPopup';

/** Material "flight" はデフォルトで真北（上）向き */

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
  ground: '#9AA8B5',
  white: '#E8F4F8',
  muted: '#4A7A9B',
  text: '#B8D4E8',
} as const;

const DEFAULT_DELTA = 0.45;
/** Android: 凡例・現在地ボタンを少し下げる（ステータスバー等との重なり回避） */
const MAP_OVERLAY_TOP = Platform.OS === 'android' ? 44 : 8;
/** Fabric の insert クラッシュ緩和のため地図上マーカー数を制限 */
const MAX_MAP_AIRCRAFT = 30;

interface Props {
  location: Coordinates | null;
  /** 端末の向き（真北からの度数）。未取得時は null */
  heading?: number | null;
  aircraft: Aircraft[];
  /** 観測済みの実測軌跡（通過済み経路の描画用） */
  trackHistory?: AircraftTrackHistory;
  /** /tracks/all 取得済みの機体。過去経路の本表示はこれがあるまで出さない */
  fullTrackIcaos?: ReadonlySet<string>;
  /** 選択機体などの出発〜現在までの全軌跡を OpenSky から埋める */
  ensureFullTrack?: (icao24: string) => Promise<void>;
  loading?: boolean;
  /** 機体選択の有無が変わったとき（最近接バーの表示切替用） */
  onSelectionChange?: (selected: boolean) => void;
}

/** 飛行機アイコンのタップ当たり判定サイズ */
const AIRCRAFT_TAP_SLOT = 32;
/** 便名ラベル行の高さ（anchor 計算・tap 枠用。pill + 文字 + border 込み） */
const AIRCRAFT_LABEL_HEIGHT = 18;
/** 重なり時は近い機体（slot 0）を優先 */
const aircraftMarkerZIndex = (slotIndex: number): number => MAX_MAP_AIRCRAFT - slotIndex;
/** 地図パン直後の誤タップを無視する ms */
const MAP_GESTURE_TAP_COOLDOWN_MS = 200;
const ANDROID_SLOT_ID = /^ac-slot-(\d+)$/;

function aircraftSlotIdentifier(slotIndex: number): string {
  return `ac-slot-${slotIndex}`;
}

function aircraftMarkerAnchor(hasLabel: boolean): { x: number; y: number } {
  if (!hasLabel) return { x: 0.5, y: 0.5 };
  const totalH = AIRCRAFT_TAP_SLOT + AIRCRAFT_LABEL_HEIGHT;
  return { x: 0.5, y: AIRCRAFT_TAP_SLOT / 2 / totalH };
}

function aircraftMarkerSize(hasLabel: boolean): { width: number; height: number } {
  return {
    width: hasLabel ? 72 : AIRCRAFT_TAP_SLOT,
    height: hasLabel ? AIRCRAFT_TAP_SLOT + AIRCRAFT_LABEL_HEIGHT : AIRCRAFT_TAP_SLOT,
  };
}

function AircraftMarker({
  aircraft,
  isClosest,
  isSelected,
  mapHeading,
  slotIndex,
  markerIdentifier,
  hiddenCoordinate,
  onPress,
}: {
  aircraft: Aircraft | null;
  isClosest: boolean;
  isSelected: boolean;
  /** 地図カメラの方位。機首の地図上方位計算に使用 */
  mapHeading: number;
  slotIndex: number;
  /** Android はスロット固定 ID にしてネイティブ Marker の重複を防ぐ */
  markerIdentifier: string;
  hiddenCoordinate?: Coordinates;
  onPress: () => void;
}): React.JSX.Element {
  const markerRef = useRef<InstanceType<typeof Marker>>(null);
  const isHidden = aircraft == null;
  const headingDeg = aircraft?.heading ?? 0;
  const icaoKey = aircraft?.icao24.trim().toLowerCase() ?? 'hidden';
  const hasLabel = aircraft != null && aircraft.flightNumber !== '----';
  const mapHeadingBucket = Math.round(mapHeading / 3) * 3;
  const renderKey = isHidden
    ? `hidden:${slotIndex}`
    : `${icaoKey}:${aircraft.latitude.toFixed(5)}:${aircraft.longitude.toFixed(5)}:${headingDeg.toFixed(0)}:${mapHeadingBucket}:${isSelected}:${isClosest}:${aircraft.onGround}:${aircraft.flightNumber}`;

  const [tracksViewChanges, setTracksViewChanges] = useState(!isHidden);

  useEffect(() => {
    if (isHidden) {
      setTracksViewChanges(false);
      return;
    }
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
      if (Platform.OS === 'android') {
        markerRef.current?.redraw();
      }
    }, Platform.OS === 'android' ? 400 : 500);
    return () => clearTimeout(timer);
  }, [renderKey, isHidden]);

  if (isHidden) {
    const coordinate = hiddenCoordinate ?? { latitude: 0, longitude: 0 };
    return (
      <Marker
        identifier={markerIdentifier}
        coordinate={coordinate}
        opacity={0}
        tracksViewChanges={false}
        zIndex={0}
      >
        <View style={styles.hiddenMarker} collapsable={false} />
      </Marker>
    );
  }

  const color = isSelected
    ? COLORS.white
    : isClosest
      ? COLORS.cyan
      : aircraft.onGround
        ? COLORS.ground
        : COLORS.orange;
  const iconRotationDeg = headingDeg - mapHeading;
  const coordinate = {
    latitude: aircraft.latitude,
    longitude: aircraft.longitude,
  };

  const planeIcon = (
    <View style={styles.planeSlot} collapsable={false}>
      <View
        style={[
          styles.planeRotate,
          isSelected && styles.planeSelected,
          { transform: [{ rotate: `${iconRotationDeg}deg` }] },
        ]}
      >
        <MaterialIcons name="flight" size={22} color={color} />
      </View>
    </View>
  );

  const labelPill = hasLabel ? (
    <View style={[styles.labelPill, { borderColor: color }]}>
      <Text style={[styles.labelText, { color }]} numberOfLines={1}>
        {aircraft.flightNumber}
      </Text>
    </View>
  ) : null;

  const handlePress = (e: { stopPropagation: () => void }): void => {
    e.stopPropagation();
    onPress();
  };

  const { width: markerWidth, height: markerHeight } = aircraftMarkerSize(hasLabel);

  return (
    <Marker
      ref={markerRef}
      identifier={markerIdentifier}
      coordinate={coordinate}
      anchor={aircraftMarkerAnchor(hasLabel)}
      zIndex={aircraftMarkerZIndex(slotIndex)}
      tracksViewChanges={tracksViewChanges}
      onPress={handlePress}
    >
      <View
        style={[
          styles.markerWrap,
          { width: markerWidth, height: markerHeight },
        ]}
        collapsable={false}
      >
        {planeIcon}
        {labelPill}
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
  // 尖端が自分、進行方向の外側に向かって広がる三角形
  const tip: Coordinates = {
    latitude: location.latitude,
    longitude: location.longitude,
  };
  const far = moveByHeading(
    location.latitude,
    location.longitude,
    heading,
    lengthM,
  );
  const left = moveByHeading(far.latitude, far.longitude, heading - 90, baseHalfWidthM);
  const right = moveByHeading(far.latitude, far.longitude, heading + 90, baseHalfWidthM);
  return [tip, left, right];
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

export default function SkyMap({
  location,
  heading = null,
  aircraft,
  trackHistory,
  fullTrackIcaos,
  ensureFullTrack,
  loading,
  onSelectionChange,
}: Props): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region | null>(null);
  const lastMapHeadingRef = useRef(0);
  const headingSyncAtRef = useRef(0);
  const [selectedIcao24, setSelectedIcao24] = useState<string | null>(null);
  const [popupNonce, setPopupNonce] = useState(0);
  const [latitudeDelta, setLatitudeDelta] = useState(DEFAULT_DELTA);
  const [mapHeading, setMapHeading] = useState(0);
  /** Marker タップ後に MapView onPress が続いて選択解除されるのを防ぐ */
  const ignoreMapPressRef = useRef(false);
  /** 地図ジェスチャ中・直後の誤タップ防止（Android） */
  const mapGestureActiveRef = useRef(false);
  const mapGestureEndedAtRef = useRef(0);

  const syncMapHeading = useCallback(() => {
    const now = Date.now();
    if (now - headingSyncAtRef.current < 50) return;
    headingSyncAtRef.current = now;
    void mapRef.current?.getCamera().then((camera) => {
      const raw = camera?.heading;
      if (raw == null || !Number.isFinite(raw)) return;
      const next = ((raw % 360) + 360) % 360;
      if (shortestHeadingDiff(next, lastMapHeadingRef.current) < 1) return;
      lastMapHeadingRef.current = next;
      setMapHeading(next);
    });
  }, []);

  const recenterOnUser = useCallback((): void => {
    if (!location || mapRef.current == null) return;
    const delta = regionRef.current?.latitudeDelta ?? latitudeDelta;
    const lonDelta = regionRef.current?.longitudeDelta ?? delta;
    mapRef.current.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: delta,
        longitudeDelta: lonDelta,
      },
      350,
    );
  }, [location, latitudeDelta]);

  const displayAircraft = useMemo(() => {
    const byIcao = new Map<string, Aircraft>();
    for (const ac of aircraft) {
      const key = ac.icao24?.trim().toLowerCase();
      if (!key) continue;
      const existing = byIcao.get(key);
      if (existing != null && existing.distanceKm <= ac.distanceKm) continue;
      const track = trackHistory?.get(key);
      const aligned = alignToTrackTip(ac, track);
      const normalized =
        aligned.latitude === ac.latitude &&
        aligned.longitude === ac.longitude &&
        aligned.heading === ac.heading
          ? ac
          : { ...ac, ...aligned };
      byIcao.set(key, { ...normalized, icao24: key });
    }
    return Array.from(byIcao.values());
  }, [aircraft, trackHistory]);

  const mapAircraft = displayAircraft.slice(0, MAX_MAP_AIRCRAFT);

  /** Android: スロット数を固定し Marker の add/remove による残像・重複を防ぐ */
  const aircraftMarkerSlots = useMemo(() => {
    const slots: Array<Aircraft | null> = Array.from({ length: MAX_MAP_AIRCRAFT }, () => null);
    mapAircraft.forEach((ac, index) => {
      slots[index] = ac;
    });
    return slots;
  }, [mapAircraft]);

  const selectedAircraft =
    selectedIcao24 != null
      ? (mapAircraft.find((ac) => ac.icao24 === selectedIcao24) ??
          displayAircraft.find((ac) => ac.icao24 === selectedIcao24) ??
          null)
      : null;

  const nearestAircraft = mapAircraft[0] ?? null;
  const isNearestSelected =
    selectedAircraft != null &&
    nearestAircraft != null &&
    selectedAircraft.icao24 === nearestAircraft.icao24;

  useEffect(() => {
    if (!ensureFullTrack || !selectedIcao24) return;
    // 選択機はプリフェッチ待ちにせず優先取得
    void ensureFullTrack(selectedIcao24);
  }, [selectedIcao24, ensureFullTrack]);

  const headingBeam = useMemo(() => {
    if (Platform.OS === 'android') return null;
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

    const icao = selectedAircraft.icao24.toLowerCase();
    const planeLat = selectedAircraft.latitude;
    const planeLon = selectedAircraft.longitude;
    const depLat = selectedAircraft.departureLatitude;
    const depLon = selectedAircraft.departureLongitude;
    const arrLat = selectedAircraft.arrivalLatitude;
    const arrLon = selectedAircraft.arrivalLongitude;

    const hasFullTrack = fullTrackIcaos?.has(icao) === true;
    const tracked = trackHistory?.get(icao);

    let flown: { latitude: number; longitude: number }[];

    if (hasFullTrack && tracked != null && tracked.length >= 2) {
      // 本経路: OpenSky /tracks/all の実測
      flown = tracked.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }));

      // 出発空港から離れて始まっていたら空港までつなぐ
      const first = flown[0];
      const gapM = haversineKm(depLat, depLon, first.latitude, first.longitude) * 1000;
      if (gapM > 400) {
        const toFirst = greatCirclePoints(depLat, depLon, first.latitude, first.longitude, 16);
        flown.unshift(...toFirst.slice(0, -1));
      }

      // 現在位置が軌跡より先なら末尾に足す
      const last = flown[flown.length - 1];
      if (last.latitude !== planeLat || last.longitude !== planeLon) {
        const prev = flown.length >= 2 ? flown[flown.length - 2] : null;
        const trackHeading =
          prev != null
            ? bearingDeg(prev.latitude, prev.longitude, last.latitude, last.longitude)
            : selectedAircraft.heading;
        const toLive = bearingDeg(last.latitude, last.longitude, planeLat, planeLon);
        const liveIsAhead =
          trackHeading == null ||
          !Number.isFinite(trackHeading) ||
          shortestHeadingDiff(toLive, trackHeading) <= 90;
        if (liveIsAhead) {
          flown.push({ latitude: planeLat, longitude: planeLon });
        }
      }
    } else {
      // tracks 取得前 / 失敗時は通過済み経路を描かない
      flown = [];
    }

    return {
      flown,
      remaining: greatCirclePoints(planeLat, planeLon, arrLat, arrLon, 32),
    };
  }, [
    selectedAircraft?.departureLatitude,
    selectedAircraft?.departureLongitude,
    selectedAircraft?.arrivalLatitude,
    selectedAircraft?.arrivalLongitude,
    selectedAircraft?.latitude,
    selectedAircraft?.longitude,
    selectedAircraft?.icao24,
    selectedAircraft?.heading,
    trackHistory,
    fullTrackIcaos,
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

  const handleSelectAircraft = useCallback((icao24: string | null): void => {
    if (icao24 != null) {
      ignoreMapPressRef.current = true;
      // 同じ機体の再タップでもポップアップを最初から表示し直す
      setPopupNonce((n) => n + 1);
    }
    setSelectedIcao24(icao24);
  }, []);

  const shouldIgnoreMapTap = useCallback((): boolean => {
    if (mapGestureActiveRef.current) return true;
    return Date.now() - mapGestureEndedAtRef.current < MAP_GESTURE_TAP_COOLDOWN_MS;
  }, []);

  const handleMarkerSelect = useCallback(
    (icao24: string): void => {
      if (shouldIgnoreMapTap()) return;
      handleSelectAircraft(icao24);
    },
    [handleSelectAircraft, shouldIgnoreMapTap],
  );

  const handleMapPress = useCallback((): void => {
    if (ignoreMapPressRef.current) {
      ignoreMapPressRef.current = false;
      return;
    }
    if (shouldIgnoreMapTap()) return;
    handleSelectAircraft(null);
  }, [handleSelectAircraft, shouldIgnoreMapTap]);

  /** Android: スロット ID から現在の機体を引く（identifier は icao 固定にしない） */
  const handleAndroidMarkerPress = useCallback(
    (event: { nativeEvent: { id?: string } }): void => {
      const id = event.nativeEvent.id?.trim().toLowerCase();
      if (!id) return;

      const slotMatch = ANDROID_SLOT_ID.exec(id);
      const icao24 =
        slotMatch != null
          ? aircraftMarkerSlots[Number(slotMatch[1])]?.icao24 ?? null
          : id;

      if (icao24 == null) return;
      ignoreMapPressRef.current = true;
      handleMarkerSelect(icao24);
    },
    [handleMarkerSelect, aircraftMarkerSlots],
  );

  useEffect(() => {
    onSelectionChange?.(selectedIcao24 != null);
  }, [selectedIcao24, onSelectionChange]);

  useEffect(() => {
    if (selectedIcao24 && !aircraft.some((ac) => ac.icao24 === selectedIcao24)) {
      handleSelectAircraft(null);
    }
  }, [aircraft, selectedIcao24]);

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
  const flownVisible =
    routeOverlayVisible && selectedRouteLines.flown.length >= 2;
  const routeFlownCoords = flownVisible ? selectedRouteLines.flown : hiddenLine;
  const routeRemainingCoords = routeOverlayVisible ? selectedRouteLines.remaining : hiddenLine;
  const routeArrowCoords = Array.from({ length: 3 }, (_, index) =>
    routeOverlayVisible ? (selectedRouteArrows[index] ?? hiddenArrow) : hiddenArrow,
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        googleMapId={Platform.OS === 'android' ? GOOGLE_MAPS_MAP_ID : undefined}
        googleRenderer={Platform.OS === 'android' ? 'LATEST' : undefined}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        userInterfaceStyle="dark"
        loadingBackgroundColor={COLORS.bg}
        poiClickEnabled={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        zoomTapEnabled={false}
        mapType="standard"
        onPress={handleMapPress}
        onMarkerPress={
          Platform.OS === 'android' ? handleAndroidMarkerPress : undefined
        }
        onRegionChangeStart={(_, details) => {
          if (details.isGesture) {
            mapGestureActiveRef.current = true;
          }
        }}
        onRegionChange={() => {
          syncMapHeading();
        }}
        onRegionChangeComplete={(region, details) => {
          regionRef.current = region;
          setLatitudeDelta(region.latitudeDelta);
          syncMapHeading();
          if (details.isGesture) {
            mapGestureActiveRef.current = false;
            mapGestureEndedAtRef.current = Date.now();
          }
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
          strokeColor={flownVisible ? COLORS.cyan : 'rgba(0, 0, 0, 0)'}
          strokeWidth={2.5}
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
        {Platform.OS === 'android'
          ? aircraftMarkerSlots.map((ac, slotIndex) => (
              <AircraftMarker
                key={aircraftSlotIdentifier(slotIndex)}
                slotIndex={slotIndex}
                markerIdentifier={aircraftSlotIdentifier(slotIndex)}
                aircraft={ac}
                hiddenCoordinate={hiddenPoint}
                isClosest={slotIndex === 0 && ac != null}
                isSelected={
                  ac != null &&
                  ac.icao24 === selectedIcao24 &&
                  !isNearestSelected
                }
                mapHeading={mapHeading}
                onPress={() => {
                  if (ac != null) handleMarkerSelect(ac.icao24);
                }}
              />
            ))
          : mapAircraft.map((ac, slotIndex) => (
              <AircraftMarker
                key={ac.icao24}
                slotIndex={slotIndex}
                markerIdentifier={ac.icao24}
                aircraft={ac}
                isClosest={slotIndex === 0}
                isSelected={ac.icao24 === selectedIcao24 && !isNearestSelected}
                mapHeading={mapHeading}
                onPress={() => handleMarkerSelect(ac.icao24)}
              />
            ))}
      </MapView>

      <TouchableOpacity
        style={[styles.recenterBtn, { top: MAP_OVERLAY_TOP }]}
        onPress={recenterOnUser}
        accessibilityRole="button"
        accessibilityLabel={t('recenterLocation')}
        activeOpacity={0.75}
      >
        <MaterialIcons name="my-location" size={24} color={COLORS.cyan} />
        <Text style={styles.recenterBtnText}>{t('recenterLocationShort')}</Text>
      </TouchableOpacity>

      {selectedAircraft == null || isNearestSelected ? (
        <View style={[styles.legend, { top: MAP_OVERLAY_TOP }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.cyan }]} />
            <Text style={styles.legendText}>{t('legendClosest')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.orange }]} />
            <Text style={styles.legendText}>{t('legendAirborne')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.ground }]} />
            <Text style={styles.legendText}>{t('legendGround')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4285F4' }]} />
            <Text style={styles.legendText}>{t('legendYou')}</Text>
          </View>
        </View>
      ) : null}
      {isNearestSelected ? (
        <AircraftPopup
          key={`nearest-${selectedAircraft.icao24}-${popupNonce}`}
          aircraft={selectedAircraft}
          label={t('nearestAircraft')}
        />
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
    overflow: 'hidden',
  },
  hiddenMarker: {
    width: 1,
    height: 1,
  },
  planeSlot: {
    width: AIRCRAFT_TAP_SLOT,
    height: AIRCRAFT_TAP_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 2,
    maxWidth: 72,
    alignSelf: 'center',
  },
  labelText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  legend: {
    position: 'absolute',
    left: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  recenterBtn: {
    position: 'absolute',
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(6, 11, 24, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  recenterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.cyan,
    letterSpacing: 0.3,
  },
});
