import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { fetchAircraftOverhead } from '../utils/opensky';
import type { Aircraft, Coordinates, UseAircraftOverheadReturn } from '../types';

const REFRESH_INTERVAL = 15_000;
const LOCATION_DISTANCE_INTERVAL_M = 15;
const LOCATION_TIME_INTERVAL_MS = 5_000;

export function useAircraftOverhead(): UseAircraftOverheadReturn {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef<Coordinates | null>(null);

  const fetchData = useCallback(
    async (coords: Coordinates, isManual = false): Promise<void> => {
      if (isManual) setRefreshing(true);
      try {
        const data = await fetchAircraftOverhead(
          coords.latitude,
          coords.longitude,
        );
        setAircraft(data);
        setLastUpdated(new Date());
        setError(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('429')) {
          setError('APIリクエスト上限に達しました。しばらくお待ちください。');
        } else {
          setError('航空機データの取得に失敗しました。');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const requestLocationAndStart = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('位置情報の許可が必要です。設定から許可してください。');
        setLoading(false);
        return;
      }
      setPermissionGranted(true);

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: Coordinates = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude,
        accuracy: loc.coords.accuracy ?? undefined,
      };
      locationRef.current = coords;
      setLocation(coords);

      await fetchData(coords);

      intervalRef.current = setInterval(() => {
        if (locationRef.current) {
          void fetchData(locationRef.current);
        }
      }, REFRESH_INTERVAL);
    } catch {
      setError('位置情報の取得に失敗しました。');
      setLoading(false);
    }
  }, [fetchData]);

  const manualRefresh = useCallback((): void => {
    if (locationRef.current) void fetchData(locationRef.current, true);
  }, [fetchData]);

  useEffect(() => {
    void requestLocationAndStart();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!permissionGranted) return;

    let subscription: Location.LocationSubscription | null = null;

    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: LOCATION_DISTANCE_INTERVAL_M,
        timeInterval: LOCATION_TIME_INTERVAL_MS,
      },
      (loc) => {
        const coords: Coordinates = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude,
          accuracy: loc.coords.accuracy ?? undefined,
        };
        locationRef.current = coords;
        setLocation(coords);
      },
    ).then((sub) => {
      subscription = sub;
    });

    return () => {
      subscription?.remove();
    };
  }, [permissionGranted]);

  return {
    location,
    aircraft,
    loading,
    refreshing,
    error,
    lastUpdated,
    permissionGranted,
    manualRefresh,
  };
}
