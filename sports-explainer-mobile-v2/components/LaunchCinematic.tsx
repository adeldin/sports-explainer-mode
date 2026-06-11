import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
}

export default function LaunchCinematic({ onComplete }: Props) {
  const light1         = useRef(new Animated.Value(0)).current;
  const light2         = useRef(new Animated.Value(0)).current;
  const light3         = useRef(new Animated.Value(0)).current;
  const spotlight      = useRef(new Animated.Value(0)).current;
  const heroOpacity    = useRef(new Animated.Value(0)).current;
  const heroY          = useRef(new Animated.Value(50)).current;
  const heroScale      = useRef(new Animated.Value(0.7)).current;
  const sparkOpacity   = useRef(new Animated.Value(0)).current;
  const titleOpacity   = useRef(new Animated.Value(0)).current;
  const titleY         = useRef(new Animated.Value(12)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Haptic sync — matches timing map
    const h1 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),   400);
    const h2 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),  800);
    const h3 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),  1600);
    const h4 = setTimeout(() => Haptics.selectionAsync(),                                 2400);

    Animated.sequence([
      // 0.0s — black
      Animated.delay(300),

      // 0.3s — light bank 1 flickers on
      Animated.timing(light1, { toValue: 1, duration: 150, useNativeDriver: true }),

      // 0.5s — light bank 2
      Animated.timing(light2, { toValue: 1, duration: 200, useNativeDriver: true }),

      // 0.8s — light bank 3 + full arc
      Animated.timing(light3, { toValue: 1, duration: 300, useNativeDriver: true }),

      // 1.0s — spotlight cone opens
      Animated.timing(spotlight, { toValue: 1, duration: 300, useNativeDriver: true }),

      // 1.2s — hero drops in
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(heroY,       { toValue: 0, tension: 80, friction: 7, useNativeDriver: true }),
        Animated.spring(heroScale,   { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
      ]),

      // 1.8s — spark pulse
      Animated.sequence([
        Animated.timing(sparkOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(sparkOpacity, { toValue: 0.4, duration: 300, useNativeDriver: true }),
      ]),

      // 2.1s — title reveals
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(titleY,       { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),

      // 2.4s — tagline
      Animated.timing(taglineOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),

      // 2.7s — hold
      Animated.delay(500),

      // 3.2s — dissolve out
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),

    ]).start();

    const done = setTimeout(() => onComplete(), 3800);

    return () => {
      [h1, h2, h3, h4, done].forEach(clearTimeout);
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>

      {/* Stadium light banks — top */}
      <View style={styles.lightRow}>
        <Animated.View style={[styles.light, { opacity: light1 }]} />
        <Animated.View style={[styles.light, styles.lightCenter, { opacity: light2 }]} />
        <Animated.View style={[styles.light, { opacity: light3 }]} />
      </View>

      {/* Spotlight cone */}
      <Animated.View style={[styles.spotlightCone, { opacity: spotlight }]} />

      {/* Spark ring — behind hero */}
      <Animated.View style={[styles.sparkRing, { opacity: sparkOpacity }]} />

      {/* Hero — Speech Bubble */}
      <Animated.View style={[
        styles.heroWrap,
        {
          opacity: heroOpacity,
          transform: [
            { translateY: heroY },
            { scale: heroScale },
          ],
        }
      ]}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleEmoji}>💬</Text>
        </View>
        <View style={styles.bubbleTail} />
      </Animated.View>

      {/* App name */}
      <Animated.Text style={[
        styles.title,
        {
          opacity: titleOpacity,
          transform: [{ translateY: titleY }],
        }
      ]}>
        SPORTS EXPLAINER
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        ⚡ THE SMART PLAY
      </Animated.Text>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightRow: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 24,
  },
  light: {
    width: 72,
    height: 52,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 28,
  },
  lightCenter: {
    width: 110,
    height: 72,
    borderRadius: 55,
    shadowRadius: 45,
  },
  spotlightCone: {
    position: 'absolute',
    top: 110,
    width: 240,
    height: 360,
    borderRadius: 120,
    backgroundColor: 'transparent',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.07,
    shadowRadius: 70,
    borderWidth: 1,
    borderColor: '#ffffff08',
  },
  sparkRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: '#ff6b00',
    shadowColor: '#ff6b00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    marginBottom: 48,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: 48,
  },
  bubble: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#cc0000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff2200',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 40,
  },
  bubbleEmoji: {
    fontSize: 64,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#cc0000',
    marginTop: -3,
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
    color: '#ff6b00',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
});