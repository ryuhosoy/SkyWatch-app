import { useEffect, useState } from 'react';
import { DeviceMotion } from 'expo-sensors';

/**
 * 縦持ち・背面カメラ想定。
 * 0°＝水平、正の値＝上空方向。
 */
export function elevationDegFromAcceleration(x: number, y: number, z: number): number {
  const pitchRad = Math.atan2(-z, Math.sqrt(x * x + y * y));
  const deg = (pitchRad * 180) / Math.PI;
  return Math.max(-20, Math.min(88, deg));
}

export function useDeviceElevation(enabled: boolean): number | null {
  const [elevation, setElevation] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setElevation(null);
      return;
    }

    let subscription: { remove: () => void } | null = null;
    DeviceMotion.setUpdateInterval(150);

    void DeviceMotion.isAvailableAsync().then((available) => {
      if (!available) return;
      subscription = DeviceMotion.addListener((data) => {
        const a = data.acceleration;
        if (a == null) return;
        const next = elevationDegFromAcceleration(a.x, a.y, a.z);
        setElevation((prev) => {
          if (prev == null) return Math.round(next * 10) / 10;
          return Math.abs(next - prev) < 2.2 ? prev : Math.round(next * 10) / 10;
        });
      });
    });

    return () => {
      subscription?.remove();
    };
  }, [enabled]);

  return elevation;
}