import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { Aircraft } from '../types';

interface Props {
  aircraft: Aircraft;
  index: number;
}

interface DataCellProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bgColor?: string;
}

const COLORS = {
  bg: '#060B18',
  panel: '#0A1628',
  panelBorder: '#1A3A5C',
  cyan: '#00D4FF',
  cyanDim: 'rgba(0, 212, 255, 0.15)',
  orange: '#FF6B35',
  orangeDim: 'rgba(255, 107, 53, 0.15)',
  white: '#E8F4F8',
  muted: '#4A7A9B',
  text: '#B8D4E8',
} as const;

const DIRECTIONS = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'] as const;

function headingToJapanese(heading: number | null): string {
  if (heading == null) return '';
  return DIRECTIONS[Math.round(heading / 45) % 8];
}

function DataCell({ label, value, sub, color, bgColor }: DataCellProps): React.JSX.Element {
  return (
    <View style={[styles.cell, bgColor ? { backgroundColor: bgColor } : undefined]}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellValue, { color: color ?? COLORS.text }]}>{value}</Text>
      {sub ? <Text style={styles.cellSub}>{sub}</Text> : null}
    </View>
  );
}

export default function AircraftCard({ aircraft, index }: Props): React.JSX.Element {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isClosest = index === 0;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 8,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isHigh = aircraft.altitudeMeters > 10_000;
  const altColor = isHigh ? COLORS.cyan : COLORS.orange;
  const altBg = isHigh ? COLORS.cyanDim : COLORS.orangeDim;

  return (
    <Animated.View
      style={[
        styles.card,
        isClosest && styles.cardClosest,
        { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
      ]}
    >
      {isClosest && (
        <View style={styles.closestBadge}>
          <Text style={styles.closestBadgeText}>★ 最近接</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={styles.callsignRow}>
          <Text style={styles.planeIcon}>✈</Text>
          <Text style={styles.callsign}>{aircraft.flightNumber}</Text>
          {aircraft.country ? (
            <Text style={styles.country}>{aircraft.country}</Text>
          ) : null}
        </View>
        <Text style={styles.airlineName}>{aircraft.airlineName}</Text>
      </View>

      <View style={styles.dataGrid}>
        <DataCell
          label="高度"
          value={`${aircraft.altitudeMeters.toLocaleString()} m`}
          sub={`${aircraft.altitudeFeet.toLocaleString()} ft`}
          color={altColor}
          bgColor={altBg}
        />
        <DataCell
          label="距離"
          value={`${aircraft.distanceKm} km`}
          sub="水平距離"
          color={COLORS.cyan}
          bgColor={COLORS.cyanDim}
        />
        <DataCell
          label="速度"
          value={
            aircraft.velocityMs != null
              ? `${Math.round(aircraft.velocityMs * 3.6)} km/h`
              : '--'
          }
          color={COLORS.text}
        />
        <DataCell
          label="方位"
          value={aircraft.heading != null ? `${Math.round(aircraft.heading)}°` : '--'}
          sub={headingToJapanese(aircraft.heading)}
          color={COLORS.text}
        />
      </View>

      {aircraft.verticalRate != null && Math.abs(aircraft.verticalRate) > 0.5 && (
        <View style={styles.verticalRateRow}>
          <Text style={styles.verticalRateIcon}>
            {aircraft.verticalRate > 0 ? '↑' : '↓'}
          </Text>
          <Text style={styles.verticalRateText}>
            {aircraft.verticalRate > 0 ? '上昇中' : '降下中'}{' '}
            {Math.abs(Math.round(aircraft.verticalRate * 196.85))} ft/min
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardClosest: {
    borderColor: COLORS.cyan,
    borderWidth: 1.5,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  closestBadge: {
    position: 'absolute',
    top: -1,
    right: 14,
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  closestBadgeText: {
    color: COLORS.bg,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardHeader: {
    marginBottom: 12,
  },
  callsignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  planeIcon: {
    fontSize: 16,
    color: COLORS.cyan,
  },
  callsign: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  country: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 'auto',
  },
  airlineName: {
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 26,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(26, 58, 92, 0.3)',
    borderRadius: 8,
    padding: 10,
  },
  cellLabel: {
    fontSize: 10,
    color: COLORS.muted,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cellValue: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  cellSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  verticalRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  verticalRateIcon: {
    fontSize: 16,
    color: COLORS.orange,
  },
  verticalRateText: {
    fontSize: 12,
    color: COLORS.orange,
    fontFamily: 'monospace',
  },
});
