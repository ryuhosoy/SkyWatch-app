/**
 * Google Cloud のマップスタイル用（Console + Map ID 方式）。
 * @see https://developers.google.com/maps/documentation/android-sdk/cloud-customization
 */
export const googleCloudDarkMapStyle = {
  variant: 'dark',
} as const;

/** Android Google Maps の Cloud スタイル用 Map ID（任意） */
export const GOOGLE_MAPS_MAP_ID =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || undefined;
