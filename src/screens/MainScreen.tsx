import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAircraftOverhead } from '../hooks/useAircraftOverhead';
import { useReapproachNotifications } from '../hooks/useReapproachNotifications';
import { useSmoothedAircraft } from '../hooks/useSmoothedAircraft';
import { formatLocaleTime, t } from '../i18n';
import { formatAirportDisplay } from '../utils/airports';
import SkyMap from '../components/SkyMap';

const COLORS = {
  bg: '#060B18',
  panelBorder: '#1A3A5C',
  cyan: '#00D4FF',
  cyanDim: 'rgba(0, 212, 255, 0.1)',
  orange: '#FF6B35',
  white: '#E8F4F8',
  muted: '#4A7A9B',
  text: '#B8D4E8',
} as const;

function formatCoord(val: number, posChar: string, negChar: string): string {
  const sign = val >= 0 ? posChar : negChar;
  return `${sign}${Math.abs(val).toFixed(4)}°`;
}

export default function MainScreen(): React.JSX.Element {
  const {
    location,
    heading,
    aircraft,
    loading,
    error,
    lastUpdated,
    manualRefresh,
    permissionGranted,
  } = useAircraftOverhead();

  useReapproachNotifications(aircraft, permissionGranted);

  const mapAircraft = useSmoothedAircraft(aircraft, lastUpdated);
  const [aircraftSelected, setAircraftSelected] = useState(false);

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
            Flight <Text style={styles.logoAccent}>Overhead</Text>
          </Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
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

      <View style={styles.mapSection}>
        <SkyMap
          location={location}
          heading={heading}
          aircraft={mapAircraft}
          loading={loading}
          onSelectionChange={setAircraftSelected}
        />

        {!aircraftSelected ? (
          <View style={styles.nearestBar} pointerEvents="box-none">
            {loading ? (
              <Animated.Text style={[styles.nearestBarStatus, { opacity: blinkAnim }]}>
                {t('scanning')}
              </Animated.Text>
            ) : error ? (
              <View style={styles.nearestBarRow}>
                <Text style={styles.nearestBarError} numberOfLines={1}>
                  {error}
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={manualRefresh}>
                  <Text style={styles.retryBtnText}>{t('retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : closestAircraft ? (
              <>
                <View style={styles.nearestBarRow}>
                  <Text style={styles.nearestLabel}>{t('nearestAircraft')}</Text>
                  <Text style={styles.nearestMeta} numberOfLines={1}>
                    {lastUpdated ? formatLocaleTime(lastUpdated) : '--:--:--'}
                    {location
                      ? `  ·  ${formatCoord(location.latitude, 'N', 'S')} ${formatCoord(location.longitude, 'E', 'W')}`
                      : ''}
                  </Text>
                </View>
                <View style={styles.nearestBarRow}>
                  <Text style={styles.nearestCallsign}>{closestAircraft.flightNumber}</Text>
                  <Text style={styles.nearestStats} numberOfLines={1}>
                    {closestAircraft.altitudeMeters.toLocaleString()} m
                    {'  ·  '}
                    {closestAircraft.distanceKm} km
                  </Text>
                </View>
                <View style={styles.nearestBarRow}>
                  <Text style={styles.nearestRoute} numberOfLines={1}>
                    {closestRoute ?? closestAircraft.airlineName}
                  </Text>
                  <TouchableOpacity onPress={manualRefresh} style={styles.refreshBtn}>
                    <Text style={styles.refreshBtnText}>{t('refresh')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.nearestBarRow}>
                <Text style={styles.nearestBarStatus}>{t('noAircraftOverhead')}</Text>
                <TouchableOpacity onPress={manualRefresh} style={styles.refreshBtn}>
                  <Text style={styles.refreshBtnText}>{t('refresh')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </View>
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
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1,
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
  mapSection: {
    flex: 1,
    position: 'relative',
  },
  nearestBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(10, 22, 40, 0.92)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    gap: 2,
  },
  nearestBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nearestBarStatus: {
    flex: 1,
    fontSize: 13,
    color: COLORS.cyan,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  nearestBarError: {
    flex: 1,
    fontSize: 12,
    color: COLORS.orange,
  },
  nearestLabel: {
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  nearestMeta: {
    flex: 1,
    textAlign: 'right',
    fontSize: 10,
    color: COLORS.muted,
    fontFamily: 'monospace',
  },
  nearestCallsign: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  nearestStats: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: COLORS.cyan,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  nearestRoute: {
    flex: 1,
    fontSize: 11,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: COLORS.cyan,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryBtnText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.cyanDim,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  refreshBtnText: {
    fontSize: 11,
    color: COLORS.cyan,
    fontFamily: 'monospace',
  },
});
