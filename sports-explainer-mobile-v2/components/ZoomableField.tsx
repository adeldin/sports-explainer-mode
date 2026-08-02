import { useState, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Pinch-to-zoom for a field/court/hole, contained INSIDE its own box.
 *
 * The art is drawn at a fixed viewBox and scaled down to fit the landscape column, so on a
 * phone the smallest labels (yardages, position tags, stat chips) land near the legibility
 * floor. Zooming the whole screen would push the verdict card and the call buttons out of
 * reach — the decision UI has to stay put — so the transform is applied to the field only
 * and the parent clips it.
 *
 * Gesture choice is load-bearing: several modules answer a TAP on the field itself (tap a
 * base, a receiver, a target ring). So this component claims only MULTI-touch —
 * two-finger pinch and two-finger pan. A single finger is never intercepted and reaches
 * the SVG exactly as before. There is deliberately no double-tap-to-reset, because a tap
 * recogniser would have to delay every single tap to disambiguate; pinching back below
 * ~1.06 snaps to fit instead.
 */
const MAX_SCALE = 4;
const SNAP_BACK_BELOW = 1.06;

export default function ZoomableField({ children }: { children: ReactNode }) {
  const [box, setBox] = useState({ w: 0, h: 0 });

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // Keep the art from being dragged off its own box: at scale s the content overhangs by
  // (s-1)/2 of each dimension, and that overhang is exactly how far it may travel.
  const clampToBox = (x: number, y: number, s: number) => {
    'worklet';
    const maxX = Math.max(0, (box.w * s - box.w) / 2);
    const maxY = Math.max(0, (box.h * s - box.h) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1, { duration: 160 });
    tx.value = withTiming(0, { duration: 160 });
    ty.value = withTiming(0, { duration: 160 });
    savedScale.value = 1;
    savedTx.value = 0;
    savedTy.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      'worklet';
      scale.value = Math.min(MAX_SCALE, Math.max(1, savedScale.value * e.scale));
    })
    .onEnd(() => {
      'worklet';
      if (scale.value < SNAP_BACK_BELOW) { reset(); return; }
      savedScale.value = scale.value;
      const c = clampToBox(tx.value, ty.value, scale.value);
      tx.value = withTiming(c.x, { duration: 120 });
      ty.value = withTiming(c.y, { duration: 120 });
      savedTx.value = c.x;
      savedTy.value = c.y;
    });

  // Two fingers only — a one-finger drag stays available to the module's own tap targets.
  const pan = Gesture.Pan()
    .minPointers(2)
    .onUpdate(e => {
      'worklet';
      const c = clampToBox(savedTx.value + e.translationX, savedTy.value + e.translationY, scale.value);
      tx.value = c.x;
      ty.value = c.y;
    })
    .onEnd(() => {
      'worklet';
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  const artStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  // The affordance fades out the moment it stops being news.
  const hintStyle = useAnimatedStyle(() => ({ opacity: scale.value > 1.02 ? 0 : 1 }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.clip}
        onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <Animated.View style={artStyle}>{children}</Animated.View>
        <Animated.View style={[styles.hint, hintStyle]} pointerEvents="none">
          <Text style={styles.hintTxt}>⤢ pinch to zoom</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // overflow:hidden is what keeps the zoom "inside its box" — the art grows, the box doesn't.
  clip: { overflow: 'hidden', borderRadius: 14 },
  hint: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(13,27,62,0.62)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  hintTxt: { color: '#e8edf5', fontSize: 10, fontWeight: '700' },
});
