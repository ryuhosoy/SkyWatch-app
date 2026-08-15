import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import mobileAds from 'react-native-google-mobile-ads';
import MainScreen from './src/screens/MainScreen';

export default function App() {
  const [adsReady, setAdsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (Platform.OS === 'ios') {
          const { status } = await getTrackingPermissionsAsync();
          if (status === PermissionStatus.UNDETERMINED) {
            await requestTrackingPermissionsAsync();
          }
        }

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
