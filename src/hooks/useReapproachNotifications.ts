import { useEffect, useRef, useState } from 'react';
import type { Aircraft } from '../types';
import { NOTIFY_RADIUS_KM } from '../constants/notifications';
import { ReapproachTracker } from '../utils/reapproachTracker';
import { notifyReapproach, requestNotificationPermissions } from '../utils/notifications';

export function useReapproachNotifications(
  aircraft: Aircraft[],
  enabled: boolean,
  onNotified?: (icao24: string) => void,
  notifyRadiusKm: number = NOTIFY_RADIUS_KM,
): void {
  const trackerRef = useRef(new ReapproachTracker());
  const onNotifiedRef = useRef(onNotified);
  const [notifyReady, setNotifyReady] = useState(false);

  useEffect(() => {
    onNotifiedRef.current = onNotified;
  }, [onNotified]);

  // 半径が変わったら追跡状態をリセット（圏内定義が変わるため）
  useEffect(() => {
    trackerRef.current = new ReapproachTracker();
  }, [notifyRadiusKm]);

  useEffect(() => {
    if (!enabled) return;

    void requestNotificationPermissions().then((granted) => {
      setNotifyReady(granted);
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !notifyReady) return;

    const events = trackerRef.current.process(aircraft, Date.now(), notifyRadiusKm);
    for (const event of events) {
      void notifyReapproach(event.aircraft, notifyRadiusKm);
      onNotifiedRef.current?.(event.aircraft.icao24);
    }
  }, [aircraft, enabled, notifyReady, notifyRadiusKm]);
}
