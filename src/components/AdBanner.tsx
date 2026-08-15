import React, { useRef, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, useForeground } from 'react-native-google-mobile-ads';
import { getBannerAdUnitId } from '../constants/ads';

const BANNER_KEYWORDS = ['aviation', 'aircraft', 'flight', 'travel'];

export default function AdBanner(): React.JSX.Element | null {
  const bannerRef = useRef<BannerAd>(null);
  const [failed, setFailed] = useState(false);
  const unitId = getBannerAdUnitId();

  // iOS でバックグラウンドから戻ったとき、バナーが空になることがあるため再読み込み
  useForeground(() => {
    if (Platform.OS === 'ios') {
      bannerRef.current?.load();
    }
  });

  if (failed) {
    return null;
  }

  return (
    <SafeAreaView style={styles.wrap}>
      <BannerAd
        ref={bannerRef}
        unitId={unitId}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        maxHeight={50}
        requestOptions={{ keywords: BANNER_KEYWORDS }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#060B18',
    alignItems: 'center',
  },
});
