import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAircraftOverhead } from '../hooks/useAircraftOverhead';
import { useAircraftTrackHistory } from '../hooks/useAircraftTrackHistory';
import { useReapproachNotifications } from '../hooks/useReapproachNotifications';
import { t } from '../i18n';
import SkyMap from '../components/SkyMap';
import AdBanner from '../components/AdBanner';

const COLORS = {
  bg: '#060B18',
  panelBorder: '#1A3A5C',
  cyan: '#00D4FF',
  cyanDim: 'rgba(0, 212, 255, 0.1)',
  orange: '#FF6B35',
  muted: '#4A7A9B',
} as const;

type MainScreenProps = {
  adsReady?: boolean;
};

export default function MainScreen({ adsReady = false }: MainScreenProps): React.JSX.Element {
  const {
    location,
    heading,
    aircraft,
    loading,
    error,
    manualRefresh,
    permissionGranted,
  } = useAircraftOverhead();

  useReapproachNotifications(aircraft, permissionGranted);

  const { tracks: trackHistory, fullTrackIcaos, ensureFullTrack } =
    useAircraftTrackHistory(aircraft);
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

  const showStatusBar = !aircraftSelected && aircraft.length === 0;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {adsReady ? (
        <AdBanner placement="top" />
      ) : (
        <SafeAreaView style={styles.topInset} />
      )}

      <View style={styles.mapSection}>
        <SkyMap
          location={location}
          heading={heading}
          aircraft={aircraft}
          trackHistory={trackHistory}
          fullTrackIcaos={fullTrackIcaos}
          ensureFullTrack={ensureFullTrack}
          loading={loading}
          onSelectionChange={setAircraftSelected}
        />

        {showStatusBar ? (
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

      {adsReady ? <AdBanner placement="bottom" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topInset: {
    backgroundColor: COLORS.bg,
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
