import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Dimensions, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, Theme } from '../lib/theme';
import { Language } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';

const { width } = Dimensions.get('window');

type Level = 'kid' | 'beginner' | 'intermediate' | 'expert';
type Sport = 'mlb' | 'nfl' | 'nba' | 'nhl';

interface Props {
  language: Language;
  onComplete: (level: Level, sport: Sport) => void;
}

const LEVELS: { key: Level; emoji: string }[] = [
  { key: 'kid', emoji: '🧒' },
  { key: 'beginner', emoji: '👋' },
  { key: 'intermediate', emoji: '📺' },
  { key: 'expert', emoji: '📋' },
];

const SPORTS: { key: Sport; emoji: string; label: string }[] = [
  { key: 'mlb', emoji: '⚾', label: 'MLB' },
  { key: 'nfl', emoji: '🏈', label: 'NFL' },
  { key: 'nba', emoji: '🏀', label: 'NBA' },
  { key: 'nhl', emoji: '🏒', label: 'NHL' },
];

export default function Onboarding({ language, onComplete }: Props) {
  const [screen, setScreen] = useState<0 | 1 | 2>(0);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];
  const LVL: Record<Level, { label: string; sub: string }> = {
    kid: { label: S.lvlKid, sub: S.lvlKidDesc },
    beginner: { label: S.lvlBeginner, sub: S.lvlBeginnerDesc },
    intermediate: { label: S.lvlInter, sub: S.lvlInterDesc },
    expert: { label: S.lvlExpert, sub: S.lvlExpertDesc },
  };
  const SPORT_SUB: Record<Sport, string> = {
    mlb: S.spBaseball, nfl: S.spFootball, nba: S.spBasketball, nhl: S.spHockey,
  };

  async function handleComplete() {
    if (!selectedLevel || !selectedSport) return;
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await AsyncStorage.setItem('user_level', selectedLevel);
    await AsyncStorage.setItem('user_sport', selectedSport);
    onComplete(selectedLevel, selectedSport);
  }

  // ─── Screen 0: Welcome ───────────────────────────────────────────
  if (screen === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={styles.container}>
          <View style={styles.heroSection}>
            <Text style={styles.trophy}>🏆</Text>
            <Text style={styles.appName}>Sports<Text style={styles.appNameAccent}>wise</Text></Text>
            <View style={styles.taglinePill}>
              <Text style={styles.taglineText}>⚡ THE SMART PLAY</Text>
            </View>
            <Text style={styles.heroSub}>{S.heroSub}</Text>
          </View>

          <View style={styles.featureList}>
            <FeatureRow emoji="📡" text={S.feat1} />
            <FeatureRow emoji="🧠" text={S.feat2} />
            <FeatureRow emoji="🎚️" text={S.feat3} />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setScreen(1)}>
            <Text style={styles.primaryBtnText}>{S.getStarted} →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Screen 1: Pick Level ─────────────────────────────────────────
  if (screen === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={theme.statusBar} />
        <View style={styles.container}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepIndicator}>{S.step1}</Text>
            <Text style={styles.stepTitle}>{S.lvlTitle}</Text>
            <Text style={styles.stepSub}>{S.lvlSub}</Text>
          </View>

          <View style={styles.optionList}>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l.key}
                style={[styles.optionRow, selectedLevel === l.key && styles.optionRowActive]}
                onPress={() => setSelectedLevel(l.key)}>
                <Text style={styles.optionEmoji}>{l.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, selectedLevel === l.key && styles.optionLabelActive]}>
                    {LVL[l.key].label}
                  </Text>
                  <Text style={styles.optionSub}>{LVL[l.key].sub}</Text>
                </View>
                {selectedLevel === l.key && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !selectedLevel && styles.primaryBtnDisabled]}
            onPress={() => selectedLevel && setScreen(2)}
            disabled={!selectedLevel}>
            <Text style={[styles.primaryBtnText, !selectedLevel && { color: theme.textMuted }]}>{S.next} →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Screen 2: Pick Sport ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={theme.statusBar} />
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepIndicator}>{S.step2}</Text>
          <Text style={styles.stepTitle}>{S.sportTitle}</Text>
          <Text style={styles.stepSub}>{S.sportSub}</Text>
        </View>

        <View style={styles.sportGrid}>
          {SPORTS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sportTile, selectedSport === s.key && styles.sportTileActive]}
              onPress={() => setSelectedSport(s.key)}>
              <Text style={styles.sportEmoji}>{s.emoji}</Text>
              <Text style={[styles.sportLabel, selectedSport === s.key && styles.sportLabelActive]}>
                {s.label}
              </Text>
              <Text style={styles.sportSub}>{SPORT_SUB[s.key]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (!selectedLevel || !selectedSport) && styles.primaryBtnDisabled]}
          onPress={handleComplete}
          disabled={!selectedLevel || !selectedSport}>
          <Text style={[styles.primaryBtnText, (!selectedLevel || !selectedSport) && { color: theme.textMuted }]}>{S.letsGo} 🚀</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen(1)}>
          <Text style={styles.backBtnText}>← {S.back}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ emoji, text }: { emoji: string; text: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, justifyContent: 'space-between' },

  // Welcome
  heroSection: { alignItems: 'center', marginTop: 20 },
  trophy: { fontSize: 64, marginBottom: 12 },
  appName: { fontSize: 32, fontWeight: '900', color: t.textPrimary, marginBottom: 12 },
  appNameAccent: { color: t.accent },
  taglinePill: { backgroundColor: t.warnBg, borderWidth: 1, borderColor: t.warn, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 20 },
  taglineText: { color: t.warn, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  heroSub: { color: t.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 26 },
  featureList: { gap: 16, marginVertical: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  featureText: { color: t.textSecondary, fontSize: 15, flex: 1, lineHeight: 22 },

  // Steps
  stepHeader: { marginBottom: 8 },
  stepIndicator: { color: t.warn, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  stepTitle: { color: t.textPrimary, fontSize: 26, fontWeight: '900', marginBottom: 6 },
  stepSub: { color: t.textMuted, fontSize: 14 },

  // Level Options
  optionList: { gap: 10, flex: 1, justifyContent: 'center' },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, gap: 14 },
  optionRowActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  optionEmoji: { fontSize: 28 },
  optionText: { flex: 1 },
  optionLabel: { color: t.textPrimary, fontSize: 16, fontWeight: '700' },
  optionLabelActive: { color: t.accentText },
  optionSub: { color: t.textMuted, fontSize: 13, marginTop: 2 },
  checkmark: { color: t.accentText, fontSize: 18, fontWeight: '900' },

  // Sport Grid
  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, flex: 1, alignContent: 'center' },
  sportTile: { width: (width - 60) / 2, alignItems: 'center', padding: 24, borderRadius: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  sportTileActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  sportEmoji: { fontSize: 40, marginBottom: 8 },
  sportLabel: { color: t.textPrimary, fontSize: 18, fontWeight: '800' },
  sportLabelActive: { color: t.accentText },
  sportSub: { color: t.textMuted, fontSize: 12, marginTop: 4 },

  // Buttons
  primaryBtn: { backgroundColor: t.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnDisabled: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  primaryBtnText: { color: t.onAccent, fontSize: 17, fontWeight: '800' },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backBtnText: { color: t.textMuted, fontSize: 15 },
});
