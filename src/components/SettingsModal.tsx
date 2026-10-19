import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  ALTITUDE_MAX_UNLIMITED_M,
  ALTITUDE_SLIDER_MAX_M,
  ALTITUDE_SLIDER_STEP_M,
  NOTIFY_RADIUS_SLIDER_MAX_KM,
  NOTIFY_RADIUS_SLIDER_MIN_KM,
  NOTIFY_RADIUS_SLIDER_STEP_KM,
  altitudeMaxFromSlider,
  altitudeMaxToSlider,
  type AppSettings,
} from '../constants/settings';
import { DualRangeSlider, SingleSlider } from './RangeSlider';
import { t } from '../i18n';

const COLORS = {
  panel: '#0A1628',
  panelBorder: '#1A3A5C',
  cyan: '#00D4FF',
  muted: '#4A7A9B',
  text: '#B8D4E8',
  white: '#E8F4F8',
} as const;

type Props = {
  visible: boolean;
  settings: AppSettings;
  onClose: () => void;
  onChange: (patch: Partial<AppSettings>) => void;
};

function formatAltitudeLabel(meters: number): string {
  if (meters >= ALTITUDE_MAX_UNLIMITED_M) return t('settingsAltitudeUnlimited');
  return t('settingsAltitudeMeters', { m: meters.toLocaleString() });
}

export default function SettingsModal({
  visible,
  settings,
  onClose,
  onChange,
}: Props): React.JSX.Element {
  const sliderHigh = altitudeMaxToSlider(settings.altitudeMaxM);
  const sliderLow = Math.min(settings.altitudeMinM, sliderHigh);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('settingsTitle')}</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('settingsClose')}
              hitSlop={8}
            >
              <MaterialIcons name="close" size={22} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>{t('settingsAltitudeRange')}</Text>
            <Text style={styles.sectionHint}>{t('settingsAltitudeHint')}</Text>

            <View style={styles.valueRow}>
              <Text style={styles.valueText}>{formatAltitudeLabel(sliderLow)}</Text>
              <Text style={styles.valueSep}>–</Text>
              <Text style={styles.valueText}>
                {formatAltitudeLabel(altitudeMaxFromSlider(sliderHigh))}
              </Text>
            </View>

            <DualRangeSlider
              min={0}
              max={ALTITUDE_SLIDER_MAX_M}
              step={ALTITUDE_SLIDER_STEP_M}
              low={sliderLow}
              high={sliderHigh}
              minGap={ALTITUDE_SLIDER_STEP_M}
              onChange={(low, high) => {
                onChange({
                  altitudeMinM: low,
                  altitudeMaxM: altitudeMaxFromSlider(high),
                });
              }}
            />
            <View style={styles.axisRow}>
              <Text style={styles.axisLabel}>0 m</Text>
              <Text style={styles.axisLabel}>
                {t('settingsAltitudeMeters', {
                  m: ALTITUDE_SLIDER_MAX_M.toLocaleString(),
                })}
                +
              </Text>
            </View>

            <Text style={[styles.sectionTitle, styles.sectionSpaced]}>
              {t('settingsNotifyRadius')}
            </Text>
            <Text style={styles.sectionHint}>{t('settingsNotifyHint')}</Text>

            <View style={styles.valueRow}>
              <Text style={styles.valueText}>
                {t('settingsRadiusKm', { km: settings.notifyRadiusKm })}
              </Text>
            </View>

            <SingleSlider
              min={NOTIFY_RADIUS_SLIDER_MIN_KM}
              max={NOTIFY_RADIUS_SLIDER_MAX_KM}
              step={NOTIFY_RADIUS_SLIDER_STEP_KM}
              value={settings.notifyRadiusKm}
              onChange={(km) => onChange({ notifyRadiusKm: km })}
            />
            <View style={styles.axisRow}>
              <Text style={styles.axisLabel}>
                {t('settingsRadiusKm', { km: NOTIFY_RADIUS_SLIDER_MIN_KM })}
              </Text>
              <Text style={styles.axisLabel}>
                {t('settingsRadiusKm', { km: NOTIFY_RADIUS_SLIDER_MAX_KM })}
              </Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: COLORS.panel,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.panelBorder,
    borderBottomWidth: 0,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.panelBorder,
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  body: {
    paddingHorizontal: 18,
  },
  bodyContent: {
    paddingBottom: 12,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.cyan,
    marginTop: 4,
  },
  sectionSpaced: {
    marginTop: 22,
  },
  sectionHint: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 17,
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
  },
  valueSep: {
    fontSize: 16,
    color: COLORS.muted,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  axisLabel: {
    fontSize: 11,
    color: COLORS.muted,
  },
});
