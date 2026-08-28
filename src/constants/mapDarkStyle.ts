/**
 * Google Cloud のマップスタイル用 JSON（クラウドベースマップスタイリング）。
 * Console で Dark スタイル（例: { "variant": "dark" }）を Map ID に紐付ける。
 *
 * Android では Maps SDK 19+ の mapColorScheme(DARK) と併用する。
 * @see https://developers.google.com/maps/documentation/android-sdk/configure-map?hl=ja
 */
export const googleCloudDarkMapStyle = {
  variant: 'dark',
} as const;

/** Android Google Maps の Cloud スタイル用 Map ID（任意） */
export const GOOGLE_MAPS_MAP_ID =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || undefined;

/** Android: 店舗・スポット等の POI ピン/ラベルを非表示 */
export const hideGooglePoiMapStyle = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
];
