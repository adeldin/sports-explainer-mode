import { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { useTheme, brand } from '../lib/theme';

interface Props {
  onComplete: () => void;
  /** Repeat-launch variant — short ~1.2s version (icon + name only, no float). */
  quick?: boolean;
}

/**
 * Launch cinematic — clean and premium, two beats on deep navy (#0d1b3e):
 *   1. The app icon floats up + scales into center as it fades in (~1.2s).
 *   2. "SportsWise" fades in below it, then "The Smart Play" 300ms later.
 * A 1s hold, then the navy content layer fades out to reveal the app
 * background underneath, handing off to the app.
 *
 * One exit: onComplete fires only from the exit fade's own callback (never a
 * separate timer). Tapping anywhere runs that same exit fade immediately.
 */
export default function MorphCinematic({ onComplete, quick = false }: Props) {
  const { theme } = useTheme();

  // --- Animated values (native driver: opacity + transform only) ---
  // In the quick variant the icon simply fades in at center, so it starts at rest.
  const iconY = useRef(new Animated.Value(quick ? 0 : 24)).current;
  const iconScale = useRef(new Animated.Value(quick ? 1 : 0.8)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // --- Single exit point ---
  const doneRef = useRef(false);
  const handleDone = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  };

  // The exit fade is the ONLY caller of onComplete (its completion callback).
  const runExit = (duration: number) => {
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) handleDone();
    });
  };

  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);

    const anim = quick
      ? Animated.sequence([
          // Icon fades in at center (no float/scale).
          Animated.timing(iconOpacity, { toValue: 1, duration: 250, easing: ease, useNativeDriver: true }),
          // "SportsWise" fades in.
          Animated.timing(titleOpacity, { toValue: 1, duration: 250, easing: ease, useNativeDriver: true }),
          // Short hold.
          Animated.delay(800),
        ])
      : Animated.sequence([
          // Beat 1 — icon floats up + scales up + fades in together (0 → 1.2s).
          Animated.parallel([
            Animated.timing(iconOpacity, { toValue: 1, duration: 1200, easing: ease, useNativeDriver: true }),
            Animated.timing(iconY, { toValue: 0, duration: 1200, easing: ease, useNativeDriver: true }),
            Animated.timing(iconScale, { toValue: 1, duration: 1200, easing: ease, useNativeDriver: true }),
          ]),
          // Beat 2 — "SportsWise" then "The Smart Play" 300ms later (1.2s → 2.0s).
          Animated.stagger(300, [
            Animated.timing(titleOpacity, { toValue: 1, duration: 400, easing: ease, useNativeDriver: true }),
            Animated.timing(taglineOpacity, { toValue: 1, duration: 400, easing: ease, useNativeDriver: true }),
          ]),
          // Hold (2.0s → 3.0s).
          Animated.delay(1100),
        ]);

    animRef.current = anim;
    anim.start(({ finished }) => {
      // Exit (3.0s → 3.5s, or quick 200ms). Only runs on natural completion;
      // a tap-skip stops this sequence and drives its own exit.
      if (finished) runExit(quick ? 200 : 500);
    });

    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = () => {
    if (doneRef.current) return;
    animRef.current?.stop();
    // Snap to the resolved end-state so the exit frame is clean, then fade out.
    iconOpacity.setValue(1);
    iconY.setValue(0);
    iconScale.setValue(1);
    titleOpacity.setValue(1);
    if (!quick) taglineOpacity.setValue(1);
    runExit(250);
  };

  return (
    <Pressable style={[styles.outer, { backgroundColor: theme.background }]} onPress={handleSkip}>
      <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
        {/* Icon — shadow on the wrapper, rounding/clip on the Image (correct on both platforms) */}
        <Animated.View style={{ opacity: iconOpacity, transform: [{ translateY: iconY }, { scale: iconScale }] }}>
          <View style={styles.iconShadow}>
            <Image source={require('../assets/icon-source.png')} style={styles.icon} resizeMode="cover" />
          </View>
        </Animated.View>

        <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>Sports<Text style={styles.titleAccent}>wise</Text></Animated.Text>
        {!quick && (
          <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>The Smart Play</Animated.Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Wrapper carries the drop shadow; the Image inside clips to the rounded corners.
  iconShadow: {
    borderRadius: 22,
    backgroundColor: brand.navy,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 14,
  },
  icon: {
    width: 120,
    height: 120,
    borderRadius: 22,
    overflow: 'hidden',
  },
  title: {
    color: brand.white,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 32,
    textAlign: 'center',
    marginTop: 28,
  },
  titleAccent: {
    color: brand.orange,
  },
  tagline: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 16,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 10,
  },
});
