import type { Aircraft } from '../types';
import { ABSENCE_RESET_MS, NOTIFY_RADIUS_KM } from '../constants/notifications';

type Phase = 'outside' | 'inside';

interface TrackState {
  phase: Phase;
  lastSeenAt: number;
}

export interface ReapproachEvent {
  aircraft: Aircraft;
}

/**
 * 再接近の検知:
 * - 半径外 → 半径内に入った瞬間だけイベントを返す
 * - 同じ接近サイクル中は再通知しない
 * - 初回起動時に既に圏内にいる機は通知しない
 * - 地上機（onGround）は通知しない
 */
export class ReapproachTracker {
  private readonly states = new Map<string, TrackState>();
  private bootstrapped = false;

  process(
    aircraft: Aircraft[],
    now = Date.now(),
    radiusKm: number = NOTIFY_RADIUS_KM,
  ): ReapproachEvent[] {
    const events: ReapproachEvent[] = [];
    const radius = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : NOTIFY_RADIUS_KM;
    const currentKeys = new Set(aircraft.map((ac) => ac.icao24.toLowerCase()));

    if (!this.bootstrapped) {
      for (const ac of aircraft) {
        this.states.set(ac.icao24.toLowerCase(), {
          phase: ac.distanceKm <= radius ? 'inside' : 'outside',
          lastSeenAt: now,
        });
      }
      this.bootstrapped = true;
      return events;
    }

    for (const ac of aircraft) {
      const key = ac.icao24.toLowerCase();
      let state = this.states.get(key);

      if (!state) {
        this.states.set(key, {
          phase: ac.distanceKm <= radius ? 'inside' : 'outside',
          lastSeenAt: now,
        });
        continue;
      }

      state.lastSeenAt = now;

      if (ac.distanceKm > radius) {
        state.phase = 'outside';
        continue;
      }

      if (state.phase === 'outside') {
        state.phase = 'inside';
        // 地上の機体（タクシー・駐機など）は通知しない
        if (!ac.onGround) {
          events.push({ aircraft: ac });
        }
      }
    }

    for (const [key, state] of this.states) {
      if (!currentKeys.has(key) && now - state.lastSeenAt >= ABSENCE_RESET_MS) {
        state.phase = 'outside';
      }
    }

    return events;
  }
}
