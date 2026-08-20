/** Google 公式の iOS アダプティブバナー テストユニット ID */
const IOS_TEST_ADAPTIVE_BANNER = 'ca-app-pub-3940256099942544/2435281174';

export type BannerPlacement = 'top' | 'bottom';

export function getBannerAdUnitId(placement: BannerPlacement): string {
  const envKey =
    placement === 'top'
      ? process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_TOP
      : process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_BOTTOM;

  return envKey?.trim() || IOS_TEST_ADAPTIVE_BANNER;
}
