import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const SPORT_ICONS = ['🏈', '⚾', '🏒', '🏀', '⚽', '🏈'];

interface Props {
  onFinish: () => void;
}

export default function SplashAnimation({ onFinish }: Props) {
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.6)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const iconAnims = useRef(SPORT_ICONS.map(() => new Animated.Value(height))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(titleScale, { toValue: 1, damping: 12, stiffness: 100, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      ...iconAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(300 + i * 120),
          Animated.spring(anim, { toValue: 0, damping: 14, stiffness: 120, useNativeDriver: true }),
        ])
      ),
    ]).start();

    setTimeout(() => {
      Animated.timing(containerOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => onFinish());
    }, 2200);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <LinearGradient colors={['#000000', '#0a0a1a', '#000820']} style={StyleSheet.absoluteFill} />
      <View style={styles.iconsContainer}>
        {SPORT_ICONS.map((icon, i) => (
          <Animated.Text
            key={i}
            style={[styles.floatingIcon, { left: (width / 6) * i - 10, transform: [{ translateY: iconAnims[i] }] }]}>
            {icon}
          </Animated.Text>
        ))}
      </View>
      <Animated.View style={[styles.centerContent, { opacity: titleOpacity, transform: [{ scale: titleScale }] }]}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.title}>Sports{'\n'}Explainer</Text>
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Every play. Every level.
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  iconsContainer: { position: 'absolute', bottom: 60, width, height: 80 },
  floatingIcon: { position: 'absolute', fontSize: 36, bottom: 0 },
  centerContent: { alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 52, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 56, letterSpacing: -1 },
  subtitle: { fontSize: 18, color: '#4488ff', marginTop: 16, fontWeight: '500', letterSpacing: 1 },
});