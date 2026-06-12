import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Polygon, Defs, LinearGradient, Stop } from 'react-native-svg';
import MorphBall from './MorphBall';

interface Props {
  onComplete: () => void;
  /** Repeat-launch variant — fast morph straight to the rugby settle (~1.7s). */
  quick?: boolean;
}

/**
 * Full launch cinematic: stadium lights flicker on and cast beams → a neon
 * line-art ball rises and morphs baseball → basketball → soccer → football →
 * rugby (glow green → cyan) → gold insight-spark at the settle → title resolves
 * → dissolve into the app.
 *
 * One exit: onComplete fires from the dissolve's own callback (never a separate
 * timer). Tapping fast-forwards into that same dissolve.
 */
export default function MorphCinematic({ onComplete, quick = false }: Props) {
  // Absolute beat times (ms) so the morph sequence, haptics, and later beats all agree.
  const T = quick
    ? {
        flicker: 0,
        flickerStagger: 30,
        pool: 60,
        enter: 60,
        enterDur: 160,
        morphStart: 240,
        hold: 110,
        morphDur: 110,
        settle: 300,
        // derived below
      }
    : {
        flicker: 240,
        flickerStagger: 110,
        pool: 760,
        enter: 760,
        enterDur: 280,
        morphStart: 1040,
        hold: 460, // each ball clearly held
        morphDur: 230, // morph between balls
        settle: 600, // rugby signature hold
      };

  // When each ball is fully formed (absolute ms), used for haptics + spark + title.
  const step = T.hold + T.morphDur;
  const rugbyFormed = T.morphStart + 4 * step; // after 4 transitions
  const settleEnd = rugbyFormed + T.settle;
  const sparkAt = rugbyFormed + 80;
  const titleAt = quick ? settleEnd - 120 : settleEnd - 320;
  const taglineAt = titleAt + (quick ? 160 : 280);
  const dissolveAt = settleEnd + (quick ? 60 : 120);
  const dissolveDur = quick ? 220 : 360;

  // --- Shared values ---
  const morph = useSharedValue(0); // 0 baseball → 1 basketball → 2 soccer → 3 football → 4 rugby
  const enter = useSharedValue(0);
  const light1 = useSharedValue(0);
  const light2 = useSharedValue(0);
  const light3 = useSharedValue(0);
  const pool = useSharedValue(0);
  const sparkScale = useSharedValue(0);
  const sparkOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(12);
  const taglineOpacity = useSharedValue(0);
  const screen = useSharedValue(1);

  // --- Single exit point ---
  const doneRef = useRef(false);
  const handleDone = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  };

  const hapticTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const lin = Easing.linear;
    const mo = Easing.inOut(Easing.ease);

    // Lights: real flicker stutter, staggered.
    const flick = () =>
      quick
        ? withTiming(1, { duration: 120 })
        : withSequence(
            withTiming(1, { duration: 40 }),
            withTiming(0.05, { duration: 50 }),
            withTiming(1, { duration: 30 }),
            withTiming(0.2, { duration: 55 }),
            withTiming(0.9, { duration: 35 }),
            withTiming(1, { duration: 60 }),
          );
    light1.value = withDelay(T.flicker, flick());
    light2.value = withDelay(T.flicker + T.flickerStagger, flick());
    light3.value = withDelay(T.flicker + 2 * T.flickerStagger, flick());
    pool.value = withDelay(T.pool, withTiming(1, { duration: quick ? 200 : 500 }));

    // Ball entrance.
    enter.value = withDelay(T.enter, withTiming(1, { duration: T.enterDur, easing: Easing.out(Easing.cubic) }));

    // Morph through the 5 balls; rugby settles.
    morph.value = withDelay(
      T.morphStart,
      withSequence(
        withTiming(0, { duration: T.hold, easing: lin }),
        withTiming(1, { duration: T.morphDur, easing: mo }),
        withTiming(1, { duration: T.hold, easing: lin }),
        withTiming(2, { duration: T.morphDur, easing: mo }),
        withTiming(2, { duration: T.hold, easing: lin }),
        withTiming(3, { duration: T.morphDur, easing: mo }),
        withTiming(3, { duration: T.hold, easing: lin }),
        withTiming(4, { duration: T.morphDur, easing: mo }),
        withTiming(4, { duration: T.settle, easing: lin }),
      ),
    );

    // Gold insight-spark at the settle.
    sparkScale.value = withDelay(sparkAt, withSequence(withTiming(1.25, { duration: 200 }), withTiming(1, { duration: 200 })));
    sparkOpacity.value = withDelay(sparkAt, withSequence(withTiming(1, { duration: 180 }), withTiming(0.5, { duration: 320 })));

    // Title + tagline resolve.
    titleOpacity.value = withDelay(titleAt, withTiming(1, { duration: quick ? 200 : 300 }));
    titleY.value = withDelay(titleAt, withTiming(0, { duration: quick ? 200 : 300, easing: Easing.out(Easing.cubic) }));
    taglineOpacity.value = withDelay(taglineAt, withTiming(1, { duration: quick ? 150 : 280 }));

    // Single source of truth: dissolve fires onComplete from its own callback.
    screen.value = withDelay(
      dissolveAt,
      withTiming(0, { duration: dissolveDur }, (finished) => {
        if (finished) runOnJS(handleDone)();
      }),
    );

    // Haptics on the beats.
    const beats: [number, () => void][] = quick
      ? [
          [T.enter, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)],
          [rugbyFormed, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)],
          [sparkAt, () => Haptics.selectionAsync()],
        ]
      : [
          [T.flicker, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)],
          [T.enter, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)],
          [T.morphStart + step, () => Haptics.selectionAsync()], // basketball
          [T.morphStart + 2 * step, () => Haptics.selectionAsync()], // soccer
          [T.morphStart + 3 * step, () => Haptics.selectionAsync()], // football
          [rugbyFormed, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)], // rugby
          [sparkAt, () => Haptics.selectionAsync()],
        ];
    hapticTimers.current = beats.map(([t, fn]) => setTimeout(fn, t));

    return () => {
      hapticTimers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = () => {
    if (doneRef.current) return;
    hapticTimers.current.forEach(clearTimeout);
    [morph, enter, light1, light2, light3, pool, sparkScale, sparkOpacity, titleOpacity, titleY, taglineOpacity, screen].forEach(
      cancelAnimation,
    );
    morph.value = 4; // settled rugby
    enter.value = 1;
    light1.value = 1;
    light2.value = 1;
    light3.value = 1;
    pool.value = 1;
    sparkScale.value = 1;
    sparkOpacity.value = 0.5;
    titleOpacity.value = 1;
    titleY.value = 0;
    taglineOpacity.value = 1;
    Haptics.selectionAsync();
    screen.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) runOnJS(handleDone)();
    });
  };

  // --- Animated styles ---
  const screenStyle = useAnimatedStyle(() => ({ opacity: screen.value }));
  const light1Style = useAnimatedStyle(() => ({ opacity: light1.value }));
  const light2Style = useAnimatedStyle(() => ({ opacity: light2.value }));
  const light3Style = useAnimatedStyle(() => ({ opacity: light3.value }));
  const poolStyle = useAnimatedStyle(() => ({ opacity: pool.value * 0.9 }));
  const ballStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: 16 * (1 - enter.value) }, { scale: 0.7 + 0.3 * enter.value }],
  }));
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: sparkOpacity.value,
    transform: [{ scale: sparkScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  return (
    <Pressable style={styles.pressable} onPress={handleSkip}>
      <Animated.View style={[styles.container, screenStyle]}>
        {/* Stadium light banks — flicker on and cast soft beams downward */}
        <View style={styles.lightRow}>
          <LightBank style={light1Style} tilt={-9} gradId="mbeam0" />
          <LightBank style={light2Style} tilt={0} gradId="mbeam1" big />
          <LightBank style={light3Style} tilt={9} gradId="mbeam2" />
        </View>

        {/* Soft pool of light the ball sits in */}
        <Animated.View style={[styles.spotPool, poolStyle]} />

        {/* Hero ball + gold insight-spark */}
        <View style={styles.ballBox}>
          <Animated.View style={[styles.sparkRing, sparkStyle]} pointerEvents="none" />
          <Animated.View style={ballStyle}>
            <MorphBall morph={morph} />
          </Animated.View>
        </View>

        {/* Title + tagline */}
        <Animated.Text style={[styles.title, titleStyle]}>SPORTS EXPLAINER</Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]}>⚡ THE SMART PLAY</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// A single stadium floodlight: bright lens + downward beam cone.
function LightBank({
  style,
  tilt,
  gradId,
  big = false,
}: {
  style: ReturnType<typeof useAnimatedStyle>;
  tilt: number;
  gradId: string;
  big?: boolean;
}) {
  return (
    <Animated.View style={[styles.bankWrap, style, { transform: [{ rotate: `${tilt}deg` }] }]}>
      <View style={[styles.lampGlow, big && styles.lampGlowBig]} />
      <View style={[styles.lamp, big && styles.lampBig]} />
      <Svg width={130} height={180} style={styles.beam} pointerEvents="none">
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.2} />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.07} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Polygon points="51,0 79,0 122,180 8,180" fill={`url(#${gradId})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: { flex: 1 },
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },

  // Light banks
  lightRow: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
  },
  bankWrap: { alignItems: 'center' },
  lampGlow: {
    position: 'absolute',
    top: -6,
    width: 78,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    opacity: 0.25,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 26,
  },
  lampGlowBig: { width: 104, height: 40, borderRadius: 20, shadowRadius: 38 },
  lamp: {
    width: 56,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  lampBig: { width: 80, height: 22, borderRadius: 11, shadowRadius: 20 },
  beam: { marginTop: 2 },

  // Pool of light behind the ball
  spotPool: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'transparent',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.09,
    shadowRadius: 90,
    borderWidth: 1,
    borderColor: '#ffffff06',
  },

  // Hero
  ballBox: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  sparkRing: {
    position: 'absolute',
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 1.5,
    borderColor: '#ffcc00',
    shadowColor: '#ffcc00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 22,
  },

  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 5,
    marginBottom: 10,
    textAlign: 'center',
  },
  tagline: {
    color: '#22d3ee',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
});
