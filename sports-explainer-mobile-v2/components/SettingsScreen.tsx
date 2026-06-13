import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Level, Language } from '../lib/api';
import { useTheme, Theme, ThemeMode } from '../lib/theme';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  level: Level;
  language: Language;
  autoRefresh: boolean;
  notificationsEnabled: boolean;
  onClose: () => void;
  onLevelChange: (l: Level) => void;
  onLanguageChange: (l: Language) => void;
  onAutoRefreshChange: (val: boolean) => void;
  onNotificationsToggle: (val: boolean) => void;
}

const LEVELS: { key: Level; label: string; desc: string }[] = [
  { key: 'kid', label: '🧒 Kid Mode', desc: 'Simple analogies, zero jargon' },
  { key: 'beginner', label: '👋 Beginner', desc: 'New fan friendly' },
  { key: 'intermediate', label: '📺 Intermediate', desc: 'Regular viewer' },
  { key: 'expert', label: '🎓 Expert', desc: 'Coaching-level analysis' },
];

const LANGUAGES: { key: Language; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Español' },
  { key: 'fr', label: 'Français' },
  { key: 'pt', label: 'Português' },
  { key: 'de', label: 'Deutsch' },
  { key: 'it', label: 'Italiano' },
  { key: 'ja', label: '日本語' },
  { key: 'zh', label: '中文' },
  { key: 'ko', label: '한국어' },
  { key: 'ar', label: 'العربية' },
];

const THEMES: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'dark', label: 'Dark' },
  { key: 'light', label: 'Light' },
];

export default function SettingsScreen({
  visible,
  level,
  language,
  autoRefresh,
  notificationsEnabled,
  onClose,
  onLevelChange,
  onLanguageChange,
  onAutoRefreshChange,
  onNotificationsToggle
}: Props) {
  const { mode, theme, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <BlurView intensity={40} tint={theme.mode === 'light' ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>EXPERTISE LEVEL</Text>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l.key}
                style={[styles.levelRow, level === l.key && styles.levelRowActive]}
                onPress={() => onLevelChange(l.key)}>
                <View style={styles.levelInfo}>
                  <Text style={styles.levelLabel}>{l.label}</Text>
                  <Text style={styles.levelDesc}>{l.desc}</Text>
                </View>
                {level === l.key && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>APPEARANCE</Text>
            <View style={styles.segment}>
              {THEMES.map(th => (
                <TouchableOpacity
                  key={th.key}
                  style={[styles.segmentItem, mode === th.key && styles.segmentItemActive]}
                  onPress={() => setMode(th.key)}>
                  <Text style={[styles.segmentText, mode === th.key && styles.segmentTextActive]}>{th.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>LANGUAGE</Text>
            <View style={styles.langWrap}>
              {LANGUAGES.map(l => (
                <TouchableOpacity
                  key={l.key}
                  style={[styles.langPill, language === l.key && styles.langPillActive]}
                  onPress={() => onLanguageChange(l.key)}>
                  <Text style={[styles.langText, language === l.key && styles.langTextActive]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>PREFERENCES</Text>

            {/* Auto-Refresh Toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Auto-Refresh</Text>
                <Text style={styles.toggleDesc}>Update every 60 seconds</Text>
              </View>
              <Switch
                value={autoRefresh}
                onValueChange={onAutoRefreshChange}
                trackColor={{ false: theme.borderStrong, true: theme.accent }}
                thumbColor="#fff"
              />
            </View>

            {/* Notifications Toggle */}
            <View style={[styles.toggleRow, { marginTop: 12 }]}>
              <View>
                <Text style={styles.toggleLabel}>Game Alerts</Text>
                <Text style={styles.toggleDesc}>Notify me when favorite teams play</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={onNotificationsToggle}
                trackColor={{ false: theme.borderStrong, true: theme.accent }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.versionBox}>
              <Text style={styles.versionText}>Sports Explainer v1.0</Text>
              <Text style={styles.versionText}>Powered by Groq + ESPN</Text>
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  overlay: { zIndex: 100, backgroundColor: t.scrim },
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '82%', overflow: 'hidden', borderLeftWidth: 1, borderLeftColor: t.border },
  content: { flex: 1, padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { color: t.textPrimary, fontSize: 28, fontWeight: '900' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  closeText: { color: t.textPrimary, fontSize: 16 },
  sectionLabel: { color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  levelRow: { padding: 16, borderRadius: 12, backgroundColor: t.surface, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: t.border },
  levelRowActive: { borderColor: t.accent, backgroundColor: t.surfaceActive },
  levelInfo: { flex: 1 },
  levelLabel: { color: t.textPrimary, fontSize: 15, fontWeight: '700' },
  levelDesc: { color: t.textSecondary, fontSize: 12, marginTop: 2 },
  checkmark: { color: t.accent, fontSize: 18, fontWeight: '900' },
  segment: { flexDirection: 'row', backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentItemActive: { backgroundColor: t.surfaceActive },
  segmentText: { color: t.textSecondary, fontSize: 14, fontWeight: '700' },
  segmentTextActive: { color: t.accentText },
  langWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  langPillActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  langText: { color: t.textSecondary, fontSize: 14, fontWeight: '600' },
  langTextActive: { color: t.accentText },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border },
  toggleLabel: { color: t.textPrimary, fontSize: 15, fontWeight: '700' },
  toggleDesc: { color: t.textSecondary, fontSize: 12, marginTop: 2 },
  versionBox: { marginTop: 40, alignItems: 'center', gap: 4 },
  versionText: { color: t.textMuted, fontSize: 12 },
});
