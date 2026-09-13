import { NOTIFY_RADIUS_KM } from './notifications';

/** 高度上限「制限なし」を表す値（m） */
export const ALTITUDE_MAX_UNLIMITED_M = 50_000;

/** 高度スライダーの表示上限（m）。右端は「制限なし」扱い */
export const ALTITUDE_SLIDER_MAX_M = 15_000;
export const ALTITUDE_SLIDER_STEP_M = 100;

/** 通知半径スライダー */
export const NOTIFY_RADIUS_SLIDER_MIN_KM = 5;
export const NOTIFY_RADIUS_SLIDER_MAX_KM = 80;
export const NOTIFY_RADIUS_SLIDER_STEP_KM = 1;

export type AppSettings = {
  /** 地図に表示する最低高度（m、含む） */
  altitudeMinM: number;
  /** 地図に表示する最高高度（m、含む） */
  altitudeMaxM: number;
  /** 再接近通知の半径（km） */
  notifyRadiusKm: number;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  altitudeMinM: 0,
  altitudeMaxM: ALTITUDE_MAX_UNLIMITED_M,
  notifyRadiusKm: NOTIFY_RADIUS_KM,
};

export const APP_SETTINGS_STORAGE_KEY = 'skywatch.appSettings.v1';

/** 保存値 → スライダー表示用の上限位置 */
export function altitudeMaxToSlider(altitudeMaxM: number): number {
  if (altitudeMaxM >= ALTITUDE_MAX_UNLIMITED_M) return ALTITUDE_SLIDER_MAX_M;
  return Math.min(ALTITUDE_SLIDER_MAX_M, Math.max(0, altitudeMaxM));
}

/** スライダー上限位置 → 保存値（右端は制限なし） */
export function altitudeMaxFromSlider(sliderMax: number): number {
  if (sliderMax >= ALTITUDE_SLIDER_MAX_M) return ALTITUDE_MAX_UNLIMITED_M;
  return sliderMax;
}
