import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Level, Language } from '../lib/api';
import { useTheme, Theme, ThemeMode } from '../lib/theme';
import { UI_STRINGS } from '../lib/strings';

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

const LEVELS: { key: Level; emoji: string }[] = [
  { key: 'kid', emoji: '🧒' },
  { key: 'beginner', emoji: '👋' },
  { key: 'intermediate', emoji: '📺' },
  { key: 'expert', emoji: '🎓' },
];

const THEMES: ThemeMode[] = ['system', 'dark', 'light'];

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
  const S = UI_STRINGS[language];
  const LVL: Record<Level, { label: string; desc: string }> = {
    kid: { label: S.lvlKid, desc: S.lvlKidDesc },
    beginner: { label: S.lvlBeginner, desc: S.lvlBeginnerDesc },
    intermediate: { label: S.lvlInter, desc: S.lvlInterDesc },
    expert: { label: S.lvlExpert, desc: S.lvlExpertDesc },
  };
  const THEME_LABEL: Record<ThemeMode, string> = { system: S.tSystem, dark: S.tDark, light: S.tLight };

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
            <Text style={styles.title}>{S.settings}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>{S.secExpertise}</Text>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l.key}
                style={[styles.levelRow, level === l.key && styles.levelRowActive]}
                onPress={() => onLevelChange(l.key)}>
                <View style={styles.levelInfo}>
                  <Text style={styles.levelLabel}>{l.emoji} {LVL[l.key].label}</Text>
                  <Text style={styles.levelDesc}>{LVL[l.key].desc}</Text>
                </View>
                {level === l.key && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>{S.secAppearance}</Text>
            <View style={styles.segment}>
              {THEMES.map(th => (
                <TouchableOpacity
                  key={th}
                  style={[styles.segmentItem, mode === th && styles.segmentItemActive]}
                  onPress={() => setMode(th)}>
                  <Text style={[styles.segmentText, mode === th && styles.segmentTextActive]}>{THEME_LABEL[th]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>{S.secLanguage}</Text>
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

            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>{S.secPreferences}</Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{S.autoRefresh}</Text>
                <Text style={styles.toggleDesc}>{S.autoRefreshDesc}</Text>
              </View>
              <Switch
                style={styles.toggleSwitch}
                value={autoRefresh}
                onValueChange={onAutoRefreshChange}
                trackColor={{ false: theme.borderStrong, true: theme.accent }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.toggleRow, { marginTop: 12 }]}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{S.gameAlerts}</Text>
                <Text style={styles.toggleDesc}>{S.gameAlertsDesc}</Text>
              </View>
              <Switch
                style={styles.toggleSwitch}
                value={notificationsEnabled}
                onValueChange={onNotificationsToggle}
                trackColor={{ false: theme.borderStrong, true: theme.accent }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.versionBox}>
              <Text style={styles.versionText}>Sports Explainer v1.0</Text>
              <Text style={styles.versionText}>{S.poweredBy}</Text>
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
  // Label takes remaining width (wraps) so a long string can't push the Switch off-screen.
  toggleInfo: { flex: 1, paddingRight: 12 },
  toggleSwitch: { flexShrink: 0 },
  toggleLabel: { color: t.textPrimary, fontSize: 15, fontWeight: '700' },
  toggleDesc: { color: t.textSecondary, fontSize: 12, marginTop: 2 },
  versionBox: { marginTop: 40, alignItems: 'center', gap: 4 },
  versionText: { color: t.textMuted, fontSize: 12 },
});
