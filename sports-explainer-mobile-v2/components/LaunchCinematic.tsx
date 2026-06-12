import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, {
  Path,
  Line,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  Rect,
  G,
} from 'react-native-svg';

interface Props {
  onComplete: () => void;
  /** Repeat-launch variant — compresses the whole sequence to ~1.1s. */
  quick?: boolean;
}

// ── Hero geometry (shared viewBox so bubble + seam align exactly) ──
const HERO_W = 140;
const HERO_H = 150;

// Premium squircle speech bubble — body + tail as one crisp path.
const BUBBLE_BODY =
  'M 38 10 L 102 10 Q 128 10 128 36 L 128 86 Q 128 112 102 112 ' +
  'L 70 112 L 52 134 L 44 112 L 38 112 Q 12 112 12 86 L 12 36 Q 12 10 38 10 Z';

/**
 * Launch cinematic — the emotional arc of the product itself:
 *   black (confusion) → stadium lights flicker on + cast beams (clarity arriving) →
 *   red speech bubble rises and HOLDS (the explanation) → stitched seam carves in →
 *   gold spark (the "smart" insight) → title resolves → dissolve.
 *
 * The hero IS the app icon: a premium red sports speech bubble drawn in SVG.
 * There is exactly one exit — the final dissolve's own completion callback fires
 * onComplete. Tapping anywhere fast-forwards into that same dissolve.
 */
export default function LaunchCinematic({ onComplete, quick = false }: Props) {
  // Timeline (ms). Full lets the hero breathe (~4.2s); quick snaps to the payoff.
  const T = quick
    ? {
        flickerDelay: 0,
        flickerStagger: 45,
        spotlight: 80,
        bubble: 160,
        seam: 360,
        spark: 480,
        title: 560,
        tagline: 680,
        dissolve: 840,
        dissolveDur: 240,
      }
    : {
        flickerDelay: 280,
        flickerStagger: 110,
        spotlight: 950,
        bubble: 1150, // slow spring → lands ~1500
        seam: 1600,
        spark: 2000,
        title: 2900, // ~750ms hero hold after the spark settles
        tagline: 3200,
        dissolve: 3850,
        dissolveDur: 380, // → onComplete ~4230ms
      };

  // --- Shared values ---
  const light1 = useSharedValue(0);
  const light2 = useSharedValue(0);
  const light3 = useSharedValue(0);
  const spotlight = useSharedValue(0);
  const bubbleOpacity = useSharedValue(0);
  const bubbleY = useSharedValue(50);
  const bubbleScale = useSharedValue(0.9);
  const seam = useSharedValue(0);
  const sparkScale = useSharedValue(0);
  const sparkOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(12);
  const taglineOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  // --- Single exit point ---
  const doneRef = useRef(false);
  const handleDone = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  };

  // --- Haptics (cosmetic; cleared on skip/unmount) ---
  const hapticTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Real flicker: hard on/off stutter with near-black dips, not a fade.
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

    light1.value = withDelay(T.flickerDelay, flick());
    light2.value = withDelay(T.flickerDelay + T.flickerStagger, flick());
    light3.value = withDelay(T.flickerDelay + 2 * T.flickerStagger, flick());

    spotlight.value = withDelay(T.spotlight, withTiming(1, { duration: quick ? 200 : 500 }));

    // Slow, graceful rise so the eye can land on the hero (no overshoot pop).
    bubbleOpacity.value = withDelay(T.bubble, withTiming(1, { duration: quick ? 160 : 280 }));
    bubbleY.value = withDelay(
      T.bubble,
      withSpring(0, { damping: quick ? 14 : 16, stiffness: quick ? 120 : 70 }),
    );
    bubbleScale.value = withDelay(
      T.bubble,
      withSpring(1, { damping: quick ? 14 : 16, stiffness: quick ? 120 : 70 }),
    );

    // Stitched seam carves in a beat after the bubble settles.
    seam.value = withDelay(
      T.seam,
      withTiming(1, { duration: quick ? 220 : 340, easing: Easing.out(Easing.cubic) }),
    );

    // Gold spark — the insight. Flares bright, then settles to a glow.
    sparkScale.value = withDelay(
      T.spark,
      withSequence(withTiming(1.25, { duration: 200 }), withTiming(1, { duration: 200 })),
    );
    sparkOpacity.value = withDelay(
      T.spark,
      withSequence(withTiming(1, { duration: 180 }), withTiming(0.55, { duration: 320 })),
    );

    titleOpacity.value = withDelay(T.title, withTiming(1, { duration: quick ? 200 : 300 }));
    titleY.value = withDelay(
      T.title,
      withTiming(0, { duration: quick ? 200 : 300, easing: Easing.out(Easing.cubic) }),
    );
    taglineOpacity.value = withDelay(T.tagline, withTiming(1, { duration: quick ? 150 : 280 }));

    // THE single source of truth: when this lands, we're done.
    screenOpacity.value = withDelay(
      T.dissolve,
      withTiming(0, { duration: T.dissolveDur }, (finished) => {
        if (finished) runOnJS(handleDone)();
      }),
    );

    // Schedule haptics on the new beats.
    const beats: [number, () => void][] = quick
      ? [
          [T.bubble, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)],
          [T.spark, () => Haptics.selectionAsync()],
        ]
      : [
          [T.flickerDelay, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)],
          [T.spotlight, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)],
          [T.bubble + 350, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)], // landing
          [T.spark, () => Haptics.selectionAsync()],
        ];
    hapticTimers.current = beats.map(([t, fn]) => setTimeout(fn, t));

    return () => {
      hapticTimers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tap anywhere → fast-forward to the end frame, then run the SAME dissolve.
  const handleSkip = () => {
    if (doneRef.current) return;
    hapticTimers.current.forEach(clearTimeout);

    const all = [
      light1, light2, light3, spotlight, bubbleOpacity, bubbleY, bubbleScale,
      seam, sparkScale, sparkOpacity, titleOpacity, titleY, screenOpacity, taglineOpacity,
    ];
    all.forEach(cancelAnimation);

    // Snap to final values.
    light1.value = 1;
    light2.value = 1;
    light3.value = 1;
    spotlight.value = 1;
    bubbleOpacity.value = 1;
    bubbleY.value = 0;
    bubbleScale.value = 1;
    seam.value = 1;
    sparkScale.value = 1;
    sparkOpacity.value = 0.55;
    titleOpacity.value = 1;
    titleY.value = 0;
    taglineOpacity.value = 1;

    Haptics.selectionAsync();
    screenOpacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) runOnJS(handleDone)();
    });
  };

  // --- Animated styles ---
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const light1Style = useAnimatedStyle(() => ({ opacity: light1.value }));
  const light2Style = useAnimatedStyle(() => ({ opacity: light2.value }));
  const light3Style = useAnimatedStyle(() => ({ opacity: light3.value }));
  const spotlightStyle = useAnimatedStyle(() => ({ opacity: spotlight.value * 0.9 }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ translateY: bubbleY.value }, { scale: bubbleScale.value }],
  }));
  const seamStyle = useAnimatedStyle(() => ({
    opacity: seam.value,
    transform: [{ scale: 0.7 + 0.3 * seam.value }],
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
          <LightBank style={light1Style} tilt={-9} gradId="beam0" />
          <LightBank style={light2Style} tilt={0} gradId="beam1" big />
          <LightBank style={light3Style} tilt={9} gradId="beam2" />
        </View>

        {/* Soft pool of light the hero stands in */}
        <Animated.View style={[styles.spotPool, spotlightStyle]} />

        {/* Hero */}
        <Animated.View style={[styles.heroWrap, bubbleStyle]}>
          <View style={styles.heroBox}>
            {/* Gold spark — the "smart" insight, behind the bubble */}
            <Animated.View style={[styles.sparkRing, sparkStyle]} />

            {/* Premium SVG speech bubble */}
            <HeroBubble />

            {/* Stitched sports seam — carves in a beat after the bubble */}
            <Animated.View style={[styles.seamOverlay, seamStyle]} pointerEvents="none">
              <SeamMark />
            </Animated.View>
          </View>
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[styles.title, titleStyle]}>SPORTS EXPLAINER</Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, taglineStyle]}>⚡ THE SMART PLAY</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ── A single stadium floodlight: bright lens + downward beam cone ──
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
        {/* narrow at the lamp, widening as it falls */}
        <Polygon points="51,0 79,0 122,180 8,180" fill={`url(#${gradId})`} />
      </Svg>
    </Animated.View>
  );
}

// ── Premium red speech bubble (the app icon), drawn in SVG ──
function HeroBubble() {
  return (
    <Svg width={HERO_W} height={HERO_H} viewBox={`0 0 ${HERO_W} ${HERO_H}`}>
      <Defs>
        <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ff3b3b" />
          <Stop offset="0.55" stopColor="#d21111" />
          <Stop offset="1" stopColor="#a60000" />
        </LinearGradient>
        <LinearGradient id="topHi" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="botSh" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000000" stopOpacity={0} />
          <Stop offset="1" stopColor="#3a0000" stopOpacity={0.28} />
        </LinearGradient>
        <ClipPath id="bodyClip">
          <Path d={BUBBLE_BODY} />
        </ClipPath>
      </Defs>

      {/* solid red body with vertical depth gradient */}
      <Path d={BUBBLE_BODY} fill="url(#bodyGrad)" />

      {/* depth: top sheen + bottom inner shadow, clipped to the body */}
      <G clipPath="url(#bodyClip)">
        <Rect x="0" y="0" width={HERO_W} height="62" fill="url(#topHi)" />
        <Rect x="0" y="78" width={HERO_W} height="72" fill="url(#botSh)" />
      </G>

      {/* crisp lit top rim */}
      <Path d={BUBBLE_BODY} fill="none" stroke="#ff8f8f" strokeOpacity={0.45} strokeWidth={1} />
    </Svg>
  );
}

// ── Stitched baseball seam: two facing arcs + precise cross-laces ──
function SeamMark() {
  const seamColor = '#ffffff';
  return (
    <Svg width={HERO_W} height={HERO_H} viewBox={`0 0 ${HERO_W} ${HERO_H}`}>
      {/* two thin facing arcs */}
      <Path
        d="M 52 26 Q 72 70 52 114"
        stroke={seamColor}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M 88 26 Q 68 70 88 114"
        stroke={seamColor}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      {/* precise cross-laces (the stitching) */}
      <G stroke={seamColor} strokeOpacity={0.85} strokeWidth={1.6} strokeLinecap="round">
        <Line x1="57" y1="37" x2="83" y2="41" />
        <Line x1="60" y1="53" x2="80" y2="49" />
        <Line x1="62" y1="70" x2="78" y2="70" />
        <Line x1="60" y1="87" x2="80" y2="91" />
        <Line x1="57" y1="103" x2="83" y2="99" />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  pressable: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  bankWrap: {
    alignItems: 'center',
  },
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
  beam: {
    marginTop: 2,
  },

  // Pool of light behind the hero
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
  heroWrap: {
    alignItems: 'center',
    marginBottom: 44,
  },
  heroBox: {
    width: HERO_W,
    height: HERO_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkRing: {
    position: 'absolute',
    top: -10, // centered on the bubble body (not the tail)
    width: 184,
    height: 184,
    borderRadius: 92,
    borderWidth: 1.5,
    borderColor: '#ffcc00',
    shadowColor: '#ffcc00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 22,
  },
  seamOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#ffcc00',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
});
