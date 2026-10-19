import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ALTITUDE_SLIDER_MAX_M,
  APP_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  NOTIFY_RADIUS_SLIDER_MAX_KM,
  NOTIFY_RADIUS_SLIDER_MIN_KM,
  type AppSettings,
} from '../constants/settings';

function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const altitudeMinM =
    typeof raw?.altitudeMinM === 'number' && Number.isFinite(raw.altitudeMinM)
      ? Math.max(0, Math.min(ALTITUDE_SLIDER_MAX_M, Math.round(raw.altitudeMinM)))
      : DEFAULT_APP_SETTINGS.altitudeMinM;
  const altitudeMaxM =
    typeof raw?.altitudeMaxM === 'number' && Number.isFinite(raw.altitudeMaxM)
      ? Math.max(altitudeMinM, Math.round(raw.altitudeMaxM))
      : Math.max(altitudeMinM, DEFAULT_APP_SETTINGS.altitudeMaxM);
  const notifyRadiusKm =
    typeof raw?.notifyRadiusKm === 'number' && Number.isFinite(raw.notifyRadiusKm)
      ? Math.max(
          NOTIFY_RADIUS_SLIDER_MIN_KM,
          Math.min(NOTIFY_RADIUS_SLIDER_MAX_KM, Math.round(raw.notifyRadiusKm)),
        )
      : DEFAULT_APP_SETTINGS.notifyRadiusKm;

  return { altitudeMinM, altitudeMaxM, notifyRadiusKm };
}

export function useAppSettings(): {
  settings: AppSettings;
  ready: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
} {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY)
      .then((json) => {
        if (cancelled) return;
        if (json == null) {
          setReady(true);
          return;
        }
        try {
          const parsed = JSON.parse(json) as Partial<AppSettings>;
          setSettings(normalizeSettings(parsed));
        } catch {
          setSettings(DEFAULT_APP_SETTINGS);
        } finally {
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>): void => {
    setSettings((prev) => {
      const next = normalizeSettings({ ...prev, ...patch });
      void AsyncStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, ready, updateSettings };
}
