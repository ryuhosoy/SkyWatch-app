import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  NativeAd,
  NativeAdChoicesPlacement,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
} from 'react-native-google-mobile-ads';
import {
  adRequestKeywords,
  getNativeAdUnitId,
  NATIVE_CELL_HEIGHT,
  type NativeAdCorner,
} from '../constants/ads';

type Props = {
  /** 整数のセル幅 */
  width: number;
  slotKey: string;
  corner: NativeAdCorner;
};

/**
 * 低背のネイティブ広告セル。
 * width/height は整数のみ。AdChoices は右上余白で確保。
 */
export default function CompactNativeAd({
  width,
  slotKey,
  corner,
}: Props): React.JSX.Element | null {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [failed, setFailed] = useState(false);
  const [viewSize, setViewSize] = useState<{ w: number; h: number } | null>(
    null,
  );

  const cellW = Math.floor(width);
  const cellH = Math.floor(NATIVE_CELL_HEIGHT);

  useEffect(() => {
    let cancelled = false;
    let loaded: NativeAd | null = null;

    NativeAd.createForAdRequest(getNativeAdUnitId(corner), {
      keywords: adRequestKeywords,
      startVideoMuted: true,
      adChoicesPlacement: NativeAdChoicesPlacement.TOP_RIGHT,
    })
      .then((ad) => {
        if (cancelled) {
          ad.destroy();
          return;
        }
        loaded = ad;
        setNativeAd(ad);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [slotKey, corner]);

  if (failed || nativeAd == null) {
    return <View style={{ width: cellW, height: cellH }} />;
  }

  const adW = viewSize?.w ?? cellW;
  const adH = viewSize?.h ?? cellH;

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={{
        width: adW,
        height: adH,
        backgroundColor: '#0A1628',
      }}
      onLayout={(e) => {
        if (viewSize != null) return;
        const { width: lw, height: lh } = e.nativeEvent.layout;
        setViewSize({
          w: Math.max(cellW, Math.ceil(lw)),
          h: Math.max(cellH, Math.ceil(lh)),
        });
      }}
    >
      <View style={styles.inner}>
        <Text style={styles.badge}>広告</Text>

        <View style={styles.row}>
          {nativeAd.icon ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
            </NativeAsset>
          ) : null}

          <View style={styles.mid}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.headline} numberOfLines={1}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <Text style={styles.cta} numberOfLines={1}>
                {nativeAd.callToAction}
              </Text>
            </NativeAsset>
          </View>
        </View>
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    paddingTop: 14,
    paddingRight: 22,
    paddingBottom: 4,
    paddingLeft: 6,
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    left: 4,
    fontSize: 8,
    lineHeight: 11,
    minWidth: 16,
    minHeight: 11,
    paddingHorizontal: 2,
    color: '#4A7A9B',
    borderWidth: 1,
    borderColor: '#4A7A9B',
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 28,
    height: 28,
    marginRight: 6,
    borderRadius: 4,
  },
  mid: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 11,
    lineHeight: 13,
    color: '#E8F4F8',
    fontWeight: '600',
    marginBottom: 2,
  },
  cta: {
    alignSelf: 'flex-start',
    fontSize: 9,
    lineHeight: 12,
    paddingHorizontal: 5,
    paddingVertical: 1,
    color: '#061018',
    backgroundColor: '#00D4FF',
    fontWeight: '700',
  },
});
