/** Google 公式テスト（iOS ネイティブ）https://developers.google.com/admob/ios/native?hl=ja */
const IOS_TEST_NATIVE = 'ca-app-pub-3940256099942544/3986624511';

export type BannerPlacement = 'top' | 'bottom';

export type NativeAdCorner =
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight';

/**
 * ネイティブセル（整数 pt のみ）。
 * 本数は控えめ（iPhone で各帯だいたい 2 本）、高さは最小寄り。
 * @see https://github.com/invertase/react-native-google-mobile-ads/issues/700
 */
export const NATIVE_CELL_MIN_WIDTH = 170;
export const NATIVE_CELL_HEIGHT = 72;

const AD_KEYWORDS = ['aviation', 'aircraft', 'flight', 'travel'] as const;

export const adRequestKeywords = [...AD_KEYWORDS];

const NATIVE_UNIT_ENV: Record<NativeAdCorner, string | undefined> = {
  topLeft: process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID_TOP_LEFT,
  topRight: process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID_TOP_RIGHT,
  bottomLeft: process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID_BOTTOM_LEFT,
  bottomRight: process.env.EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID_BOTTOM_RIGHT,
};

export function getNativeAdUnitId(corner: NativeAdCorner): string {
  return NATIVE_UNIT_ENV[corner]?.trim() || IOS_TEST_NATIVE;
}

/** 帯内の列位置から四隅の corner を決める（左端=左、右端=右） */
export function getNativeAdCorner(
  placement: BannerPlacement,
  columnIndex: number,
  columnCount: number,
): NativeAdCorner {
  const isLeft = columnIndex === 0;
  const isRight = columnIndex === columnCount - 1;

  if (placement === 'top') {
    if (isRight && !isLeft) return 'topRight';
    return 'topLeft';
  }

  if (isRight && !isLeft) return 'bottomRight';
  return 'bottomLeft';
}

export function nativeColumnsForWidth(screenWidth: number): number {
  return Math.max(1, Math.floor(screenWidth / NATIVE_CELL_MIN_WIDTH));
}

/** 画面幅を列数で割った整数セル幅（余りは使わない） */
export function nativeCellWidth(screenWidth: number, columns: number): number {
  return Math.floor(screenWidth / columns);
}
