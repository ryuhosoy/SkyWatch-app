import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useAircraftOverhead } from '../hooks/useAircraftOverhead';
import { useAircraftTrackHistory } from '../hooks/useAircraftTrackHistory';
import { useReapproachNotifications } from '../hooks/useReapproachNotifications';
import { useAppSettings } from '../hooks/useAppSettings';
import { NOTIFY_HIGHLIGHT_MS } from '../constants/notifications';
import { filterAircraftByAltitude } from '../utils/aircraftFilters';
import { t } from '../i18n';
import SkyMap from '../components/SkyMap';
import AdBanner from '../components/AdBanner';
import SettingsModal from '../components/SettingsModal';

const COLORS = {
  bg: '#060B18',
  panelBorder: '#1A3A5C',
  cyan: '#00D4FF',
  cyanDim: 'rgba(0, 212, 255, 0.1)',
  orange: '#FF6B35',
  muted: '#4A7A9B',
} as const;

const SETTINGS_BTN_TOP = Platform.OS === 'android' ? 44 : 8;

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

  const { settings, updateSettings } = useAppSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const filteredAircraft = useMemo(
    () => filterAircraftByAltitude(aircraft, settings),
    [aircraft, settings],
  );

  const [highlightedIcaos, setHighlightedIcaos] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const highlightTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const handleNotified = useCallback((icao24: string): void => {
    const key = icao24.trim().toLowerCase();
    if (!key) return;

    setHighlightedIcaos((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    const existing = highlightTimersRef.current.get(key);
    if (existing != null) clearTimeout(existing);

    highlightTimersRef.current.set(
      key,
      setTimeout(() => {
        highlightTimersRef.current.delete(key);
        setHighlightedIcaos((prev) => {
          if (!prev.has(key)) return prev;
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, NOTIFY_HIGHLIGHT_MS),
    );
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of highlightTimersRef.current.values()) {
        clearTimeout(timer);
      }
      highlightTimersRef.current.clear();
    };
  }, []);

  useReapproachNotifications(
    filteredAircraft,
    permissionGranted,
    handleNotified,
    settings.notifyRadiusKm,
  );

  const { tracks: trackHistory, fullTrackIcaos, ensureFullTrack } =
    useAircraftTrackHistory(filteredAircraft);
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

  const showStatusBar = !aircraftSelected && filteredAircraft.length === 0;

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
          aircraft={filteredAircraft}
          trackHistory={trackHistory}
          fullTrackIcaos={fullTrackIcaos}
          ensureFullTrack={ensureFullTrack}
          loading={loading}
          highlightedIcaos={highlightedIcaos}
          onSelectionChange={setAircraftSelected}
        />

        <TouchableOpacity
          style={[styles.settingsBtn, { top: SETTINGS_BTN_TOP + 56 }]}
          onPress={() => setSettingsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('settingsOpen')}
          activeOpacity={0.75}
        >
          <MaterialIcons name="tune" size={22} color={COLORS.cyan} />
        </TouchableOpacity>

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

      <SettingsModal
        visible={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={updateSettings}
      />
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
  settingsBtn: {
    position: 'absolute',
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 11, 24, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
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
