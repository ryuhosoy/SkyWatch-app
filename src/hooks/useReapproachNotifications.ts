import { useEffect, useRef, useState } from 'react';
import type { Aircraft } from '../types';
import { ReapproachTracker } from '../utils/reapproachTracker';
import { notifyReapproach, requestNotificationPermissions } from '../utils/notifications';

export function useReapproachNotifications(
  aircraft: Aircraft[],
  enabled: boolean,
): void {
  const trackerRef = useRef(new ReapproachTracker());
  const [notifyReady, setNotifyReady] = useState(false);

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
    }
  }, [aircraft, enabled, notifyReady]);
}
