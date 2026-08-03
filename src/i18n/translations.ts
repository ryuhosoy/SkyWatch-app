export type TranslationKey = keyof typeof en;

const en = {
  tagline: 'Watch the sky above',
  scanning: 'Scanning...',
  retry: 'Retry',
  nearestAircraft: 'Nearest aircraft',
  noAircraftOverhead: 'No aircraft overhead',
  refresh: '↻ Refresh',

  mapLoading: 'Loading map...',
  mapNoLocation: 'Unable to get location',
  legendClosest: 'Nearest',
  legendAircraft: 'Aircraft',
  legendYou: 'You',
  altitude: 'Altitude',
  distance: 'Distance',
  speed: 'Speed',
  heading: 'Heading',
  photoCredit: 'Photo: {name}',
  photoSource: 'Planespotters.net',

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
  retry: '再試行',
  nearestAircraft: '最近接航空機',
  noAircraftOverhead: '頭上に航空機なし',
  refresh: '↻ 更新',

  mapLoading: '地図を読み込み中...',
  mapNoLocation: '位置情報を取得できません',
  legendClosest: '最近接',
  legendAircraft: '航空機',
  legendYou: '現在地',
  altitude: '高度',
  distance: '距離',
  speed: '速度',
  heading: '方位',
  photoCredit: '写真: {name}',
  photoSource: 'Planespotters.net',

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
