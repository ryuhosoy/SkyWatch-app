import React, { useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  getNativeAdCorner,
  nativeCellWidth,
  nativeColumnsForWidth,
  NATIVE_CELL_HEIGHT,
  type BannerPlacement,
} from '../constants/ads';
import CompactNativeAd from './CompactNativeAd';

type Props = {
  placement?: BannerPlacement;
};

/**
 * 上部／下部帯: ネイティブ広告を整数幅で横いっぱいまで詰める。
 * （バナーは使わない）
 */
export default function AdBanner({
  placement = 'bottom',
}: Props): React.JSX.Element | null {
  const { width: windowWidth } = useWindowDimensions();

  const screenW = Math.floor(windowWidth);
  const nativeCount = nativeColumnsForWidth(screenW);
  const cellW = nativeCellWidth(screenW, nativeCount);
  const rowW = cellW * nativeCount;

  const nativeSlots = useMemo(
    () =>
      Array.from({ length: nativeCount }, (_, i) => ({
        key: `${placement}-native-${i}`,
        corner: getNativeAdCorner(placement, i, nativeCount),
      })),
    [placement, nativeCount],
  );

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={[styles.nativeRow, { width: rowW }]}>
        {nativeSlots.map((slot) => (
          <CompactNativeAd
            key={slot.key}
            slotKey={slot.key}
            corner={slot.corner}
            width={cellW}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#060B18',
    alignItems: 'center',
  },
  nativeRow: {
    height: Math.floor(NATIVE_CELL_HEIGHT),
    flexDirection: 'row',
  },
});
