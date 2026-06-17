import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Animated, Dimensions, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Language } from '../lib/api';
import { useTheme, Theme } from '../lib/theme';
import { UI_STRINGS } from '../lib/strings';
import { SPORTS, type SportTab } from '../lib/sports';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  language: Language;
  order: string[];                       // full sport-key order (visible + hidden)
  visibility: Record<string, boolean>;   // missing key = visible
  onClose: () => void;
  onChange: (order: string[], visibility: Record<string, boolean>) => void;
}

const SPORT_BY_KEY = new Map<string, SportTab>(SPORTS.map(s => [s.key, s]));

export default function MySportsScreen({ visible, language, order, visibility, onClose, onChange }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  const translateX = useRef(new Animated.Value(width)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: width, duration: 250, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  const isVisible = (key: string) => visibility[key] !== false;
  const visibleCount = order.filter(isVisible).length;

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next, visibility);
  };

  const toggle = (key: string) => {
    // Guard: never let the user hide the last visible sport.
    if (isVisible(key) && visibleCount <= 1) {
      Alert.alert(S.keepOneSport);
      return;
    }
    onChange(order, { ...visibility, [key]: !isVisible(key) });
  };

  const reset = () => {
    onChange(SPORTS.map(s => s.key), Object.fromEntries(SPORTS.map(s => [s.key, true])));
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <BlurView intensity={40} tint={theme.mode === 'light' ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{S.mySports}</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {order.map((key, i) => {
              const s = SPORT_BY_KEY.get(key);
              if (!s) return null;
              const vis = isVisible(key);
              const isFirst = i === 0;
              const isLast = i === order.length - 1;
              return (
                <View key={key} style={styles.row}>
                  <Text style={styles.emoji}>{s.emoji}</Text>
                  <Text style={[styles.name, !vis && styles.nameHidden]} numberOfLines={1} ellipsizeMode="tail">{s.label}</Text>
                  <View style={styles.arrows}>
                    <TouchableOpacity onPress={() => move(i, -1)} disabled={isFirst} style={styles.arrowBtn}>
                      <Text style={[styles.arrow, isFirst && styles.arrowDisabled]}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => move(i, 1)} disabled={isLast} style={styles.arrowBtn}>
                      <Text style={[styles.arrow, isLast && styles.arrowDisabled]}>↓</Text>
                    </TouchableOpacity>
                  </View>
                  <Switch
                    value={vis}
                    onValueChange={() => toggle(key)}
                    trackColor={{ false: theme.borderStrong, true: theme.accent }}
                    thumbColor="#fff"
                  />
                </View>
              );
            })}

            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <Text style={styles.resetText}>{S.resetDefault}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  overlay: { zIndex: 110, backgroundColor: t.scrim },
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '82%', overflow: 'hidden', borderLeftWidth: 1, borderLeftColor: t.border },
  content: { flex: 1, padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  backText: { color: t.textPrimary, fontSize: 24, lineHeight: 26, marginTop: -2 },
  title: { color: t.textPrimary, fontSize: 22, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, marginBottom: 8, gap: 10 },
  emoji: { fontSize: 20 },
  name: { color: t.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 },
  nameHidden: { color: t.textMuted },
  arrows: { flexDirection: 'row', gap: 2 },
  arrowBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: t.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  arrow: { color: t.textPrimary, fontSize: 16, fontWeight: '800' },
  arrowDisabled: { color: t.textMuted, opacity: 0.4 },
  resetBtn: { marginTop: 20, marginBottom: 40, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  resetText: { color: t.textSecondary, fontSize: 15, fontWeight: '700' },
});
