import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, ViewStyle } from 'react-native';

interface Props {
  size?: number;
  isActive?: boolean;
}

const CYAN = '#00D4FF';
const CYAN_DIM = 'rgba(0, 212, 255, 0.15)';

export default function RadarAnimation({
  size = 200,
  isActive = true,
}: Props): React.JSX.Element {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) return;

    const spin = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    spin.start();
    pulse.start();

    return () => {
      spin.stop();
      pulse.stop();
    };
  }, [isActive, rotation, pulseAnim]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const half = size / 2;

  return (
    <View style={{ width: size, height: size } satisfies ViewStyle}>
      {([0.25, 0.5, 0.75, 1.0] as const).map((ratio, i) => {
        const d = size * ratio;
        return (
          <View
            key={i}
            style={[
              styles.ring,
              {
                width: d,
                height: d,
                borderRadius: d / 2,
                borderColor: i === 3 ? CYAN : CYAN_DIM,
                borderWidth: i === 3 ? 1.5 : 1,
                top: half - d / 2,
                left: half - d / 2,
              },
            ]}
          />
        );
      })}

      <View
        style={[styles.crossH, { width: size, top: half - 0.5, backgroundColor: CYAN_DIM }]}
      />
      <View
        style={[styles.crossV, { height: size, left: half - 0.5, backgroundColor: CYAN_DIM }]}
      />

      <Animated.View
        style={[
          styles.sweepContainer,
          { width: size, height: size, transform: [{ rotate: rotateInterpolate }] },
        ]}
      >
        <View
          style={[
            styles.sweepBeam,
            { width: half, height: half, left: half, top: half },
          ]}
        />
        <View style={[styles.sweepLine, { width: half, left: half, top: half - 0.5 }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.center,
          { left: half - 5, top: half - 5, opacity: pulseOpacity },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  crossH: {
    position: 'absolute',
    height: 1,
    left: 0,
  },
  crossV: {
    position: 'absolute',
    width: 1,
    top: 0,
  },
  sweepContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sweepBeam: {
    position: 'absolute',
    opacity: 0.12,
    backgroundColor: CYAN,
    transform: [{ rotate: '-90deg' }],
    borderRadius: 2,
  },
  sweepLine: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: CYAN,
    opacity: 0.9,
  },
  center: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: CYAN,
  },
});
