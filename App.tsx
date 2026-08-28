import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';
import MainScreen from './src/screens/MainScreen';

export default function App() {
  const [adsReady, setAdsReady] = useState(false);

  useEffect(() => {
    // Android では AdMob を使わない（iOS のみ初期化）
    if (Platform.OS !== 'ios') {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await mobileAds().initialize();
        if (!cancelled) {
          setAdsReady(true);
        }
      } catch {
        if (!cancelled) {
          setAdsReady(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return <MainScreen adsReady={adsReady} />;
}
