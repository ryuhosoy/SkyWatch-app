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

/** Android Google Maps: 店舗・スポット等の POI ピン/ラベルを非表示 */
export const hideGooglePoiMapStyle = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.line', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.man_made', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];
