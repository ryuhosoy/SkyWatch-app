export type TranslationKey = keyof typeof en;

const en = {
  tagline: 'Watch the sky above',
  scanning: 'Scanning...',
  fetchingLocation: 'Getting your location',
  retry: 'Retry',
  nearestAircraft: 'Nearest aircraft',
  altitudeAbove: '{alt} m above',
  horizontalDistance: 'Horizontal distance {dist} km',
  noAircraftOverhead: 'No aircraft overhead',
  radiusAbout90km: 'Within ~90 km radius',
  trackingCount: 'Tracking {count} aircraft',
  trackingNone: 'No aircraft being tracked',
  refresh: '↻ Refresh',
  footerData: 'Data: OpenSky Network  •  Auto-updates every 15s',

  mapLoading: 'Loading map...',
  mapNoLocation: 'Unable to get location',
  legendClosest: 'Nearest',
  legendAircraft: 'Aircraft',
  legendYou: 'You',
  altitude: 'Altitude',
  distance: 'Distance',
  speed: 'Speed',
  heading: 'Heading',

  closestBadge: '★ Nearest',
  departure: 'From',
  arrival: 'To',
  horizontalRange: 'Horizontal',
  climbing: 'Climbing',
  descending: 'Descending',

  dirN: 'N',
  dirNE: 'NE',
  dirE: 'E',
  dirSE: 'SE',
  dirS: 'S',
  dirSW: 'SW',
  dirW: 'W',
  dirNW: 'NW',

  unknown: 'Unknown',
  unknownAircraft: 'Unknown aircraft',

  errorRateLimit: 'API rate limit reached. Please wait a moment.',
  errorFetchAircraft: 'Failed to fetch aircraft data.',
  errorLocationPermission: 'Location permission is required. Please enable it in Settings.',
  errorLocationFetch: 'Failed to get location.',

  notifyTitle: '✈ {flight} re-approaching (within {km}km)',
  notifyBody: 'Distance {dist}km · Altitude {alt}m',
} as const;

const ja: Record<TranslationKey, string> = {
  tagline: '頭上の空を見る',
  scanning: 'スキャン中...',
  fetchingLocation: '位置情報を取得しています',
  retry: '再試行',
  nearestAircraft: '最近接航空機',
  altitudeAbove: '{alt} m 上空',
  horizontalDistance: '水平距離 {dist} km',
  noAircraftOverhead: '頭上に航空機なし',
  radiusAbout90km: '半径約90km圏内',
  trackingCount: '{count}機を追跡中',
  trackingNone: '現在追跡中の航空機なし',
  refresh: '↻ 更新',
  footerData: 'データ: OpenSky Network  •  15秒ごとに自動更新',

  mapLoading: '地図を読み込み中...',
  mapNoLocation: '位置情報を取得できません',
  legendClosest: '最近接',
  legendAircraft: '航空機',
  legendYou: '現在地',
  altitude: '高度',
  distance: '距離',
  speed: '速度',
  heading: '方位',

  closestBadge: '★ 最近接',
  departure: '出発',
  arrival: '到着',
  horizontalRange: '水平距離',
  climbing: '上昇中',
  descending: '降下中',

  dirN: '北',
  dirNE: '北東',
  dirE: '東',
  dirSE: '南東',
  dirS: '南',
  dirSW: '南西',
  dirW: '西',
  dirNW: '北西',

  unknown: '不明',
  unknownAircraft: '不明な航空機',

  errorRateLimit: 'APIリクエスト上限に達しました。しばらくお待ちください。',
  errorFetchAircraft: '航空機データの取得に失敗しました。',
  errorLocationPermission: '位置情報の許可が必要です。設定から許可してください。',
  errorLocationFetch: '位置情報の取得に失敗しました。',

  notifyTitle: '✈ {flight} が再接近（{km}km以内）',
  notifyBody: '距離 {dist}km・高度 {alt}m',
};

export const translations = { en, ja } as const;
