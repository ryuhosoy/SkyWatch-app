import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 24;
const HIT_SLOP = 14;

type DualRangeSliderProps = {
  min: number;
  max: number;
  step?: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  /** つまみ同士の最小間隔（値単位） */
  minGap?: number;
};

type ActiveThumb = 'low' | 'high' | null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, min: number, max: number, step: number): number {
  if (step <= 0) return clamp(value, min, max);
  const snapped = Math.round((value - min) / step) * step + min;
  return clamp(snapped, min, max);
}

/**
 * 横棒の両端に丸いつまみがあるレンジスライダー。
 */
export function DualRangeSlider({
  min,
  max,
  step = 1,
  low,
  high,
  onChange,
  minGap = step,
}: DualRangeSliderProps): React.JSX.Element {
  const [trackWidth, setTrackWidth] = useState(0);
  const activeThumbRef = useRef<ActiveThumb>(null);
  const lowRef = useRef(low);
  const highRef = useRef(high);
  const trackWidthRef = useRef(0);
  const onChangeRef = useRef(onChange);

  lowRef.current = low;
  highRef.current = high;
  trackWidthRef.current = trackWidth;
  onChangeRef.current = onChange;

  const valueToX = useCallback((value: number, width: number): number => {
    if (width <= 0 || max <= min) return 0;
    const ratio = (clamp(value, min, max) - min) / (max - min);
    return ratio * width;
  }, [min, max]);

  const xToValue = useCallback((x: number, width: number): number => {
    if (width <= 0 || max <= min) return min;
    const ratio = clamp(x / width, 0, 1);
    return snap(min + ratio * (max - min), min, max, step);
  }, [min, max, step]);

  const pickThumb = useCallback((x: number, width: number): ActiveThumb => {
    const lowX = valueToX(lowRef.current, width);
    const highX = valueToX(highRef.current, width);
    const dLow = Math.abs(x - lowX);
    const dHigh = Math.abs(x - highX);
    if (dLow <= dHigh) return 'low';
    return 'high';
  }, [valueToX]);

  const applyMove = useCallback((x: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    const thumb = activeThumbRef.current;
    if (thumb == null) return;

    const nextValue = xToValue(x, width);
    let nextLow = lowRef.current;
    let nextHigh = highRef.current;
    const gap = Math.max(minGap, step);

    if (thumb === 'low') {
      nextLow = Math.min(nextValue, nextHigh - gap);
      nextLow = clamp(nextLow, min, max);
    } else {
      nextHigh = Math.max(nextValue, nextLow + gap);
      nextHigh = clamp(nextHigh, min, max);
    }

    if (nextLow === lowRef.current && nextHigh === highRef.current) return;
    onChangeRef.current(nextLow, nextHigh);
  }, [min, max, minGap, step, xToValue]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const width = trackWidthRef.current;
          if (width <= 0) return;
          const x = evt.nativeEvent.locationX;
          activeThumbRef.current = pickThumb(x, width);
          applyMove(x);
        },
        onPanResponderMove: (
          evt: GestureResponderEvent,
          _gesture: PanResponderGestureState,
        ) => {
          applyMove(evt.nativeEvent.locationX);
        },
        onPanResponderRelease: () => {
          activeThumbRef.current = null;
        },
        onPanResponderTerminate: () => {
          activeThumbRef.current = null;
        },
      }),
    [applyMove, pickThumb],
  );

  const onLayout = (event: LayoutChangeEvent): void => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - trackWidth) > 0.5) {
      setTrackWidth(width);
    }
  };

  const lowX = valueToX(low, trackWidth);
  const highX = valueToX(high, trackWidth);
  const activeLeft = Math.min(lowX, highX);
  const activeWidth = Math.max(0, Math.abs(highX - lowX));

  return (
    <View style={styles.wrap} onLayout={onLayout} {...panResponder.panHandlers}>
      <View style={styles.track} />
      {trackWidth > 0 ? (
        <>
          <View
            style={[
              styles.trackActive,
              { left: activeLeft, width: activeWidth },
            ]}
          />
          <View
            style={[
              styles.thumb,
              { left: lowX - THUMB_SIZE / 2 },
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.thumb,
              { left: highX - THUMB_SIZE / 2 },
            ]}
            pointerEvents="none"
          />
        </>
      ) : null}
    </View>
  );
}

type SingleSliderProps = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
};

/**
 * 単一つまみの横スライダー（通知範囲用）。
 */
export function SingleSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
}: SingleSliderProps): React.JSX.Element {
  const [trackWidth, setTrackWidth] = useState(0);
  const valueRef = useRef(value);
  const trackWidthRef = useRef(0);
  const onChangeRef = useRef(onChange);

  valueRef.current = value;
  trackWidthRef.current = trackWidth;
  onChangeRef.current = onChange;

  const valueToX = useCallback((v: number, width: number): number => {
    if (width <= 0 || max <= min) return 0;
    const ratio = (clamp(v, min, max) - min) / (max - min);
    return ratio * width;
  }, [min, max]);

  const xToValue = useCallback((x: number, width: number): number => {
    if (width <= 0 || max <= min) return min;
    const ratio = clamp(x / width, 0, 1);
    return snap(min + ratio * (max - min), min, max, step);
  }, [min, max, step]);

  const applyMove = useCallback((x: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    const next = xToValue(x, width);
    if (next === valueRef.current) return;
    onChangeRef.current(next);
  }, [xToValue]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          applyMove(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          applyMove(evt.nativeEvent.locationX);
        },
      }),
    [applyMove],
  );

  const thumbX = valueToX(value, trackWidth);

  return (
    <View
      style={styles.wrap}
      onLayout={(event: LayoutChangeEvent) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0 && Math.abs(width - trackWidth) > 0.5) {
          setTrackWidth(width);
        }
      }}
      {...panResponder.panHandlers}
    >
      <View style={styles.track} />
      {trackWidth > 0 ? (
        <>
          <View style={[styles.trackActive, { left: 0, width: thumbX }]} />
          <View
            style={[styles.thumb, { left: thumbX - THUMB_SIZE / 2 }]}
            pointerEvents="none"
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: THUMB_SIZE + HIT_SLOP * 2,
    justifyContent: 'center',
    marginHorizontal: THUMB_SIZE / 2,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#1A3A5C',
  },
  trackActive: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#00D4FF',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#00D4FF',
    borderWidth: 3,
    borderColor: '#E8F4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
});
