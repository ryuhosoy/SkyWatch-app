import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import type { Aircraft, Coordinates } from '../types';
import { t } from '../i18n';
import { useDeviceElevation } from '../hooks/useDeviceElevation';
import { useARTrackingState } from '../hooks/useARTrackingState';
import AircraftPopup from './AircraftPopup';

const COLORS = {
  bg: '#060B18',
  cyan: '#00D4FF',
  orange: '#FF6B35',
  muted: '#4A7A9B',
  white: '#E8F4F8',
} as const;

type SkyARViewProps = {
  location: Coordinates | null;
  heading: number | null;
  aircraft: readonly Aircraft[];
  onClose: () => void;
};

export default function SkyARView({
  location,
  heading,
  aircraft,
  onClose,
}: SkyARViewProps): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const deviceElevation = useDeviceElevation(true);
  const { width, height } = useWindowDimensions();

  const { overlays, locked, lockUiActive } = useARTrackingState({
    location,
    heading,
    deviceElevation,
    aircraft,
  });

  if (permission == null) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.hintText}>{t('arCameraLoading')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.centered, styles.permissionPanel]}>
        <MaterialIcons name="photo-camera" size={40} color={COLORS.cyan} />
        <Text style={styles.permissionText}>{t('arCameraPermission')}</Text>
        <Pressable style={styles.permissionBtn} onPress={() => void requestPermission()}>
          <Text style={styles.permissionBtnText}>{t('arGrantCamera')}</Text>
        </Pressable>
        <TouchableOpacity style={styles.backBtn} onPress={onClose}>
          <Text style={styles.backBtnText}>{t('arClose')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sensorsReady = heading != null && deviceElevation != null && location != null;

  return (
    <View style={styles.root}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('arClose')}
          >
            <MaterialIcons name="map" size={22} color={COLORS.cyan} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t('arTitle')}</Text>
          <View style={styles.topBtnSpacer} />
        </View>

        {!sensorsReady ? (
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>
              {heading == null ? t('arNoHeading') : t('arCalibrating')}
            </Text>
          </View>
        ) : lockUiActive ? (
          <View style={[styles.statusChip, styles.statusChipLocked]}>
            <MaterialIcons name="gps-fixed" size={14} color={COLORS.orange} />
            <Text style={styles.statusChipLockedText}>{t('arLocked')}</Text>
          </View>
        ) : (
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{t('arHint')}</Text>
          </View>
        )}

        <View style={styles.reticle} pointerEvents="none">
          <View style={styles.reticleH} />
          <View style={styles.reticleV} />
        </View>

        {sensorsReady && lockUiActive
          ? overlays.map((item) => {
              const left = item.screenX * width - 52;
              const top = item.screenY * height - 28;
              return (
                <View
                  key={item.aircraft.icao24}
                  style={[styles.marker, styles.markerLocked, { left, top }]}
                  pointerEvents="none"
                >
                  <MaterialIcons
                    name="flight"
                    size={16}
                    color={COLORS.orange}
                    style={styles.markerIcon}
                  />
                  <Text
                    style={[styles.markerCallsign, styles.markerCallsignLocked]}
                    numberOfLines={1}
                  >
                    {item.aircraft.flightNumber || item.aircraft.callsign}
                  </Text>
                  <Text style={styles.markerMeta} numberOfLines={1}>
                    {item.aircraft.altitudeMeters.toLocaleString()}m · {item.aircraft.distanceKm}km
                  </Text>
                </View>
              );
            })
          : null}

        {lockUiActive && locked != null ? (
          <AircraftPopup
            aircraft={locked}
            label={t('arLocked')}
            onClose={undefined}
          />
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 11, 24, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.45)',
  },
  topBtnSpacer: {
    width: 44,
  },
  topTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  statusChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 11, 24, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(74, 122, 155, 0.6)',
  },
  statusChipLocked: {
    borderColor: COLORS.orange,
  },
  statusChipText: {
    color: COLORS.muted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  statusChipLockedText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  reticle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
  },
  reticleH: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: 23,
    height: 2,
    backgroundColor: 'rgba(0, 212, 255, 0.85)',
    borderRadius: 1,
  },
  reticleV: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 23,
    width: 2,
    backgroundColor: 'rgba(0, 212, 255, 0.85)',
    borderRadius: 1,
  },
  marker: {
    position: 'absolute',
    width: 104,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 11, 24, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.55)',
  },
  markerLocked: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(30, 14, 8, 0.88)',
  },
  markerIcon: {
    transform: [{ rotate: '-45deg' }],
    marginBottom: 2,
  },
  markerCallsign: {
    color: COLORS.cyan,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  markerCallsignLocked: {
    color: COLORS.orange,
  },
  markerMeta: {
    color: COLORS.muted,
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  permissionPanel: {
    gap: 16,
  },
  permissionText: {
    color: COLORS.white,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    borderWidth: 1,
    borderColor: COLORS.cyan,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  permissionBtnText: {
    color: COLORS.cyan,
    fontSize: 14,
    fontWeight: '600',
  },
  backBtn: {
    marginTop: 8,
  },
  backBtnText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  hintText: {
    color: COLORS.muted,
    fontSize: 13,
  },
});