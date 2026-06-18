import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as StoreReview from 'expo-store-review';
import { Level, Language } from '../lib/api';
import { useTheme, Theme, ThemeMode } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { UI_STRINGS } from '../lib/strings';

const APP_ID = '6781028656'; // SportsWise App Store ID (App Store Connect)
const FEEDBACK_EMAIL = 'feedback@sportswise.app';
const PRIVACY_URL = 'https://privacy.sportswise.app';
const SHARE_MESSAGE =
  'Check out SportsWise — it explains sports in real time at your level. Watch and ask why. Download: https://sportswise.app';

// Shared state comes from AppStateProvider; the only prop is the navigation hook
// to push the My Sports editor (the stack owns that route).
interface Props {
  onOpenMySports: () => void;
}

const LEVELS: { key: Level; emoji: string }[] = [
  { key: 'kid', emoji: '👶' },
  { key: 'beginner', emoji: '👋' },
  { key: 'intermediate', emoji: '📺' },
  { key: 'expert', emoji: '🎙️' },
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

export default function SettingsScreen({ onOpenMySports }: Props) {
  const {
    level, language, autoRefresh, notificationsEnabled,
    setLevel, setLanguage, setAutoRefresh, setNotificationsEnabled,
  } = useAppState();
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

  // Rate: prefer the native in-app review sheet; fall back to the App Store
  // "write a review" deep link (modern apps.apple.com host).
  const handleRate = async () => {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      return;
    }
    Linking.openURL(`itms-apps://apps.apple.com/app/id${APP_ID}?action=write-review`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{S.settings}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionLabel}>{S.mySports}</Text>
          <TouchableOpacity style={styles.linkRow} onPress={onOpenMySports}>
            <Text style={styles.linkLabel}>{S.customizeSports}</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionLabel, { marginTop: 30 }]}>{S.secExpertise}</Text>
          {LEVELS.map(l => (
            <TouchableOpacity
              key={l.key}
              style={[styles.levelRow, level === l.key && styles.levelRowActive]}
              onPress={() => setLevel(l.key)}>
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
                onPress={() => setLanguage(l.key)}>
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
              onValueChange={setAutoRefresh}
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
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.borderStrong, true: theme.accent }}
              thumbColor="#fff"
            />
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 30 }]}>{S.secApp}</Text>
          <TouchableOpacity style={styles.linkRow} onPress={handleRate}>
            <Text style={styles.linkLabel}>⭐ {S.rateApp}</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, { marginTop: 8 }]} onPress={() => Share.share({ message: SHARE_MESSAGE }).catch(() => {})}>
            <Text style={styles.linkLabel}>↗ {S.shareApp}</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, { marginTop: 8 }]} onPress={() => Linking.openURL(`mailto:${FEEDBACK_EMAIL}`).catch(() => {})}>
            <Text style={styles.linkLabel}>✉️ {S.sendFeedback}</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.linkRow, { marginTop: 8 }]} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>
            <Text style={styles.linkLabel}>🔒 {S.privacyPolicy}</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.versionBox}>
            <Text style={styles.versionText}>SportsWise v1.0</Text>
            <Text style={styles.versionText}>{S.poweredBy}</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.background },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { color: t.textPrimary, fontSize: 28, fontWeight: '900' },
  scrollContent: { paddingBottom: 24 },
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
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border },
  linkLabel: { color: t.textPrimary, fontSize: 15, fontWeight: '700' },
  linkChevron: { color: t.textMuted, fontSize: 20, fontWeight: '700' },
  versionBox: { marginTop: 40, alignItems: 'center', gap: 4 },
  versionText: { color: t.textMuted, fontSize: 12 },
});
