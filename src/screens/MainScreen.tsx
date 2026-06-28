import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAircraftOverhead } from '../hooks/useAircraftOverhead';
import { useSmoothedAircraft } from '../hooks/useSmoothedAircraft';
import { formatAirportDisplay } from '../utils/airports';
import RadarAnimation from '../components/RadarAnimation';
import SkyMap from '../components/SkyMap';
import AircraftCard from '../components/AircraftCard';

const COLORS = {
  bg: '#060B18',
  panel: '#0A1628',
  panelBorder: '#1A3A5C',
  cyan: '#00D4FF',
  cyanDim: 'rgba(0, 212, 255, 0.1)',
  orange: '#FF6B35',
  white: '#E8F4F8',
  muted: '#4A7A9B',
  text: '#B8D4E8',
} as const;

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', { hour12: false });
}

function formatCoord(val: number, posChar: string, negChar: string): string {
  const sign = val >= 0 ? posChar : negChar;
  return `${sign}${Math.abs(val).toFixed(4)}°`;
}

export default function MainScreen(): React.JSX.Element {
  const {
    location,
    aircraft,
    loading,
    refreshing,
    error,
    lastUpdated,
    manualRefresh,
  } = useAircraftOverhead();

  const mapAircraft = useSmoothedAircraft(aircraft, lastUpdated);

  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, [blinkAnim]);

  const closestAircraft = aircraft[0] ?? null;
  const closestRoute = closestAircraft
    ? `${formatAirportDisplay(closestAircraft.departureAirport, {
        iata: closestAircraft.departureAirportIata,
        municipality: closestAircraft.departureAirportMunicipality,
        englishName: closestAircraft.departureAirportEnglishName,
        countryIso: closestAircraft.departureAirportCountry,
      }).label} → ${formatAirportDisplay(closestAircraft.arrivalAirport, {
        iata: closestAircraft.arrivalAirportIata,
        municipality: closestAircraft.arrivalAirportMunicipality,
        englishName: closestAircraft.arrivalAirportEnglishName,
        countryIso: closestAircraft.arrivalAirportCountry,
      }).label}`
    : null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.logoText}>
            SKY<Text style={styles.logoAccent}>WATCH</Text>
          </Text>
          <Text style={styles.tagline}>頭上の空を見る</Text>
        </View>
        <View style={styles.headerRight}>
          <Animated.View
            style={[
              styles.statusDot,
              {
                opacity: loading ? blinkAnim : 1,
                backgroundColor: loading ? COLORS.orange : COLORS.cyan,
              },
            ]}
          />
          <Text style={styles.statusText}>{loading ? 'SCANNING' : 'LIVE'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={manualRefresh}
            tintColor={COLORS.cyan}
            colors={[COLORS.cyan]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <SkyMap location={location} aircraft={mapAircraft} loading={loading} />

        <View style={styles.heroSection}>
          <RadarAnimation size={120} isActive={!loading} />

          <View style={styles.heroInfo}>
            {loading ? (
              <View style={styles.loadingBox}>
                <Animated.Text style={[styles.loadingText, { opacity: blinkAnim }]}>
                  スキャン中...
                </Animated.Text>
                <Text style={styles.loadingSubText}>位置情報を取得しています</Text>
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={manualRefresh}>
                  <Text style={styles.retryBtnText}>再試行</Text>
                </TouchableOpacity>
              </View>
            ) : closestAircraft ? (
              <View style={styles.nearestBox}>
                <Text style={styles.nearestLabel}>最近接航空機</Text>
                <Text style={styles.nearestCallsign}>{closestAircraft.flightNumber}</Text>
                <Text style={styles.nearestAltitude}>
                  {closestAircraft.altitudeMeters.toLocaleString()} m 上空
                </Text>
                <Text style={styles.nearestDistance}>
                  水平距離 {closestAircraft.distanceKm} km
                </Text>
                {closestRoute ? (
                  <Text style={styles.nearestRoute}>{closestRoute}</Text>
                ) : null}
                <View style={styles.nearestAirlinePill}>
                  <Text style={styles.nearestAirlineName} numberOfLines={1}>
                    {closestAircraft.airlineName}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🌌</Text>
                <Text style={styles.emptyText}>頭上に航空機なし</Text>
                <Text style={styles.emptySubText}>半径約90km圏内</Text>
              </View>
            )}
          </View>
        </View>

        {location && (
          <View style={styles.locationBar}>
            <Text style={styles.locationLabel}>📍</Text>
            <Text style={styles.locationText}>
              {formatCoord(location.latitude, 'N', 'S')}
              {'  '}
              {formatCoord(location.longitude, 'E', 'W')}
            </Text>
            <Text style={styles.updateTime}>
              {lastUpdated ? formatTime(lastUpdated) : '--:--:--'}
            </Text>
          </View>
        )}

        {!loading && !error && (
          <View style={styles.countBar}>
            <Text style={styles.countText}>
              {aircraft.length > 0
                ? `${aircraft.length}機を追跡中`
                : '現在追跡中の航空機なし'}
            </Text>
            <TouchableOpacity onPress={manualRefresh} style={styles.refreshBtn}>
              <Text style={styles.refreshBtnText}>↻ 更新</Text>
            </TouchableOpacity>
          </View>
        )}

        {aircraft.length > 0 && (
          <View style={styles.listSection}>
            {aircraft.slice(0, 15).map((ac, i) => (
              <AircraftCard key={ac.icao24} aircraft={ac} index={i} />
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            データ: OpenSky Network  •  15秒ごとに自動更新
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.panelBorder,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  logoAccent: {
    color: COLORS.cyan,
  },
  tagline: {
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 1,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 20,
  },
  heroInfo: {
    flex: 1,
  },
  loadingBox: {
    gap: 6,
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.cyan,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  loadingSubText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  errorBox: {
    gap: 8,
    alignItems: 'flex-start',
  },
  errorIcon: {
    fontSize: 24,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.orange,
    lineHeight: 18,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: COLORS.cyan,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 4,
  },
  retryBtnText: {
    color: COLORS.cyan,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  nearestBox: {
    gap: 3,
  },
  nearestLabel: {
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  nearestCallsign: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: 'monospace',
    letterSpacing: 3,
  },
  nearestAltitude: {
    fontSize: 16,
    color: COLORS.cyan,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  nearestDistance: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: 'monospace',
  },
  nearestRoute: {
    fontSize: 13,
    color: COLORS.cyan,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  nearestAirlinePill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.cyanDim,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  nearestAirlineName: {
    fontSize: 12,
    color: COLORS.cyan,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 4,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.panel,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.panelBorder,
    gap: 8,
  },
  locationLabel: {
    fontSize: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  updateTime: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: 'monospace',
  },
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  countText: {
    fontSize: 13,
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.cyanDim,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  refreshBtnText: {
    fontSize: 12,
    color: COLORS.cyan,
    fontFamily: 'monospace',
  },
  listSection: {
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
