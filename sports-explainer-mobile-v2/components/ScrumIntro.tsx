import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useTheme, Theme } from '../lib/theme';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width - 48; // 24px container padding each side

interface Props {
  onComplete: () => void;
}

// The three explanation beats revealed after "What's going on?". Each fades +
// slides up in sequence, ~400ms apart.
const BEATS: { label: string; body: string }[] = [
  {
    label: 'WHAT JUST HAPPENED',
    body: "A scrum restarts play after a small mistake, like a dropped ball. Instead of just handing the ball over, the two packs fight for it.",
  },
  {
    label: 'WHY IT MATTERS',
    body: "It's a reset and a contest at once. The team that messed up still gets a fair chance to win the ball back — by pushing harder.",
  },
  {
    label: 'THE RULE, SIMPLY',
    body: "The ball goes into the tunnel between the packs. No hands — they hook it back with their feet. Win the shove, win the ball.",
  },
];

const LANDING = "That's it. That's a scrum. And that's SportsWise — every play, any sport, explained at your level.";

// A single revealed block (beat or landing line): fades + slides up after `delay`.
function Reveal({ delay, style, children }: { delay: number; style?: any; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(14);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
    ty.value = withDelay(delay, withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: ty.value }] }));
  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>;
}

// First-run "what's a scrum?" onboarding screen. State A poses the question over a
// scrum photo; tapping "What's going on?" reveals a three-beat explanation, a
// landing line, and swaps the CTA to continue to setup. Styled to match Onboarding.
export default function ScrumIntro({ onComplete }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [revealed, setRevealed] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  // Set when the user taps "What's going on?" so the NEXT content-size change
  // (the reveal section mounting + laying out) scrolls the explanation into view,
  // rather than the initial mount.
  const pendingScroll = useRef(false);

  const handleReveal = () => {
    pendingScroll.current = true;
    setRevealed(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={theme.statusBar} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          // Fires once the revealed beats have laid out — animate down so the
          // explanation (and the changed CTA) ease into view as they fade in.
          if (pendingScroll.current) {
            pendingScroll.current = false;
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}>
        <Text style={styles.opener}>Ever watched a game and had no idea what just happened?</Text>

        {/* Scrum image */}
        <View style={styles.imageWrap}>
          <Image source={require('../assets/onboarding-scrum.jpg')} style={styles.image} resizeMode="cover" />
        </View>

        <Text style={styles.caption}>
          Two teams just slammed together into one giant huddle and started shoving. Sixteen players, all bound up, pushing for a ball you can't even see. It looks like chaos.
        </Text>

        {/* State B — staged explanation */}
        {revealed && (
          <View style={styles.revealSection}>
            {BEATS.map((b, i) => (
              <Reveal key={b.label} delay={i * 400} style={styles.beat}>
                <Text style={styles.beatLabel}>{b.label}</Text>
                <Text style={styles.beatBody}>{b.body}</Text>
              </Reveal>
            ))}
            <Reveal delay={BEATS.length * 400} style={styles.landingWrap}>
              <Text style={styles.landing}>{LANDING}</Text>
            </Reveal>
          </View>
        )}

        {/* Primary CTA — changes label + action between states */}
        {revealed ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={onComplete}>
            <Text style={styles.primaryBtnText}>Let's set you up →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleReveal}>
            <Text style={styles.primaryBtnText}>What's going on?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28 },

  opener: {
    color: t.textPrimary,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 20,
  },

  imageWrap: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    alignSelf: 'center',
  },
  image: { width: '100%', height: '100%' },

  caption: {
    color: t.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 20,
  },

  revealSection: { marginTop: 8 },
  beat: { marginTop: 20 },
  beatLabel: {
    color: t.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  beatBody: { color: t.textPrimary, fontSize: 15, lineHeight: 23 },
  landingWrap: { marginTop: 24 },
  landing: {
    color: t.textPrimary,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 18,
    lineHeight: 27,
  },

  primaryBtn: { backgroundColor: t.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  primaryBtnText: { color: t.onAccent, fontSize: 17, fontWeight: '800' },
  skipBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  skipText: { color: t.textMuted, fontSize: 15 },
});
