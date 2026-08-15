/** Google 公式の iOS アダプティブバナー テストユニット ID */
const IOS_TEST_ADAPTIVE_BANNER = 'ca-app-pub-3940256099942544/2435281174';

export function getBannerAdUnitId(): string {
  return process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID?.trim() || IOS_TEST_ADAPTIVE_BANNER;
}
