import { useEffect, useRef, useState } from 'react';
import type { Aircraft } from '../types';
import { ReapproachTracker } from '../utils/reapproachTracker';
import { notifyReapproach, requestNotificationPermissions } from '../utils/notifications';

export function useReapproachNotifications(
  aircraft: Aircraft[],
  enabled: boolean,
  onNotified?: (icao24: string) => void,
): void {
  const trackerRef = useRef(new ReapproachTracker());
  const onNotifiedRef = useRef(onNotified);
  const [notifyReady, setNotifyReady] = useState(false);

  useEffect(() => {
    onNotifiedRef.current = onNotified;
  }, [onNotified]);

  useEffect(() => {
    if (!enabled) return;

    void requestNotificationPermissions().then((granted) => {
      setNotifyReady(granted);
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !notifyReady) return;

    const events = trackerRef.current.process(aircraft);
    for (const event of events) {
      void notifyReapproach(event.aircraft);
      onNotifiedRef.current?.(event.aircraft.icao24);
    }
  }, [aircraft, enabled, notifyReady]);
}
