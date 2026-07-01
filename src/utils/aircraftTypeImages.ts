/**
 * 機種コード（ICAO type）ごとの汎用シルエット画像。
 * 航空会社の塗装付き個別機体写真は使わず、同じ機種なら常に同じ画像を表示する。
 */
const SILHOUETTES = {
  B738: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Boeing_737-800_silhouette.svg/330px-Boeing_737-800_silhouette.svg.png',
  B744: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Boeing_747-400_silhouette.svg/330px-Boeing_747-400_silhouette.svg.png',
  B748: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Boeing_747-8_silhouette.svg/330px-Boeing_747-8_silhouette.svg.png',
  B752: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Boeing_757-200_silhouette.svg/330px-Boeing_757-200_silhouette.svg.png',
  B763: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Boeing_767-300_silhouette.svg/330px-Boeing_767-300_silhouette.svg.png',
  B772: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Boeing_777-200_silhouette.svg/330px-Boeing_777-200_silhouette.svg.png',
  B773: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Boeing_777-300_silhouette.svg/330px-Boeing_777-300_silhouette.svg.png',
  B788: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Boeing_787-8_silhouette.svg/330px-Boeing_787-8_silhouette.svg.png',
  B789: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Boeing_787-9_silhouette.svg/330px-Boeing_787-9_silhouette.svg.png',
  GENERIC: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Airplane_silhouette_white.svg/330px-Airplane_silhouette_white.svg.png',
} as const;

const TYPE_IMAGES: Record<string, string> = {
  // Airbus（シルエットが無い機種は汎用アイコン）
  A318: SILHOUETTES.GENERIC,
  A319: SILHOUETTES.GENERIC,
  A320: SILHOUETTES.GENERIC,
  A321: SILHOUETTES.GENERIC,
  A20N: SILHOUETTES.GENERIC,
  A21N: SILHOUETTES.GENERIC,
  A332: SILHOUETTES.GENERIC,
  A333: SILHOUETTES.GENERIC,
  A359: SILHOUETTES.GENERIC,
  A388: SILHOUETTES.GENERIC,

  // Boeing narrow-body
  B737: SILHOUETTES.B738,
  B738: SILHOUETTES.B738,
  B739: SILHOUETTES.B738,
  B38M: SILHOUETTES.B738,
  B39M: SILHOUETTES.B738,

  // Boeing wide-body
  B744: SILHOUETTES.B744,
  B748: SILHOUETTES.B748,
  B752: SILHOUETTES.B752,
  B753: SILHOUETTES.B752,
  B762: SILHOUETTES.B763,
  B763: SILHOUETTES.B763,
  B764: SILHOUETTES.B763,
  B772: SILHOUETTES.B772,
  B773: SILHOUETTES.B773,
  B77W: SILHOUETTES.B773,
  B788: SILHOUETTES.B788,
  B789: SILHOUETTES.B789,

  // Regional / other
  E170: SILHOUETTES.GENERIC,
  E175: SILHOUETTES.GENERIC,
  E190: SILHOUETTES.GENERIC,
  DH8D: SILHOUETTES.GENERIC,
};

/** 機種ファミリー → 代表機種コード */
const FAMILY_FALLBACKS: ReadonlyArray<{ pattern: RegExp; type: keyof typeof SILHOUETTES | string }> = [
  { pattern: /^A3[1-9N]/, type: 'GENERIC' },
  { pattern: /^A2[0N]/, type: 'GENERIC' },
  { pattern: /^A33/, type: 'GENERIC' },
  { pattern: /^A35/, type: 'GENERIC' },
  { pattern: /^A38/, type: 'GENERIC' },
  { pattern: /^B73|^B38|^B39/, type: 'B738' },
  { pattern: /^B74/, type: 'B744' },
  { pattern: /^B75/, type: 'B752' },
  { pattern: /^B76/, type: 'B763' },
  { pattern: /^B77/, type: 'B772' },
  { pattern: /^B78/, type: 'B788' },
  { pattern: /^E1[7-9]/, type: 'GENERIC' },
  { pattern: /^DH8/, type: 'GENERIC' },
];

export function resolveTypeImageUrl(icaoType: string | null | undefined): string | null {
  if (!icaoType) return null;

  const key = icaoType.trim().toUpperCase();
  if (TYPE_IMAGES[key]) {
    return TYPE_IMAGES[key];
  }

  for (const { pattern, type } of FAMILY_FALLBACKS) {
    if (pattern.test(key)) {
      if (type in SILHOUETTES) {
        return SILHOUETTES[type as keyof typeof SILHOUETTES];
      }
      if (TYPE_IMAGES[type]) {
        return TYPE_IMAGES[type];
      }
    }
  }

  return SILHOUETTES.GENERIC;
}
