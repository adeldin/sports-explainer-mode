import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Dimensions, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

type Level = 'kid' | 'beginner' | 'intermediate' | 'expert';
type Sport = 'mlb' | 'nfl' | 'nba' | 'nhl';

interface Props {
  onComplete: (level: Level, sport: Sport) => void;
}

const LEVELS = [
  { key: 'kid' as Level,          emoji: '🧒', label: 'Kid Mode',     sub: 'Simple analogies, zero jargon' },
  { key: 'beginner' as Level,     emoji: '👋', label: 'Beginner',     sub: 'New fan friendly' },
  { key: 'intermediate' as Level, emoji: '📺', label: 'Intermediate', sub: 'Regular viewer' },
  { key: 'expert' as Level,       emoji: '📋', label: 'Expert',       sub: 'Coaching-level analysis' },
];

const SPORTS = [
  { key: 'mlb' as Sport, emoji: '⚾', label: 'MLB', sub: 'Baseball' },
  { key: 'nfl' as Sport, emoji: '🏈', label: 'NFL', sub: 'Football' },
  { key: 'nba' as Sport, emoji: '🏀', label: 'NBA', sub: 'Basketball' },
  { key: 'nhl' as Sport, emoji: '🏒', label: 'NHL', sub: 'Hockey' },
];

export default function Onboarding({ onComplete }: Props) {
  const [screen, setScreen] = useState<0 | 1 | 2>(0);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);

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
        <StatusBar barStyle="light-content" />
        <View style={styles.container}>
          <View style={styles.heroSection}>
            <Text style={styles.trophy}>🏆</Text>
            <Text style={styles.appName}>Sports Explainer</Text>
            <View style={styles.taglinePill}>
              <Text style={styles.taglineText}>⚡ THE SMART PLAY</Text>
            </View>
            <Text style={styles.heroSub}>
              Never feel lost watching sports again.{'\n'}
              We explain every play, in real time,{'\n'}
              at your level.
            </Text>
          </View>

          <View style={styles.featureList}>
            <FeatureRow emoji="📡" text="Live game explanations as they happen" />
            <FeatureRow emoji="🧠" text="Powered by AI — not just stats" />
            <FeatureRow emoji="🎚️" text="Your level: Kid to Coaching-level Expert" />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => setScreen(1)}>
            <Text style={styles.primaryBtnText}>Get Started →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Screen 1: Pick Level ─────────────────────────────────────────
  if (screen === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <View style={styles.container}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepIndicator}>Step 1 of 2</Text>
            <Text style={styles.stepTitle}>How do you watch sports?</Text>
            <Text style={styles.stepSub}>You can always change this in Settings.</Text>
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
                    {l.label}
                  </Text>
                  <Text style={styles.optionSub}>{l.sub}</Text>
                </View>
                {selectedLevel === l.key && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !selectedLevel && styles.primaryBtnDisabled]}
            onPress={() => selectedLevel && setScreen(2)}
            disabled={!selectedLevel}>
            <Text style={styles.primaryBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Screen 2: Pick Sport ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepIndicator}>Step 2 of 2</Text>
          <Text style={styles.stepTitle}>What's your sport?</Text>
          <Text style={styles.stepSub}>We'll open here by default.</Text>
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
              <Text style={styles.sportSub}>{s.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (!selectedLevel || !selectedSport) && styles.primaryBtnDisabled]}
          onPress={handleComplete}
          disabled={!selectedLevel || !selectedSport}>
          <Text style={styles.primaryBtnText}>Let's Go 🚀</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen(1)}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, justifyContent: 'space-between' },

  // Welcome
  heroSection: { alignItems: 'center', marginTop: 20 },
  trophy: { fontSize: 64, marginBottom: 12 },
  appName: { fontSize: 32, fontWeight: '900', color: '#fff', marginBottom: 12 },
  taglinePill: { backgroundColor: '#1a0a00', borderWidth: 1, borderColor: '#ff6b00', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 20 },
  taglineText: { color: '#ff6b00', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  heroSub: { color: '#666', fontSize: 16, textAlign: 'center', lineHeight: 26 },
  featureList: { gap: 16, marginVertical: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  featureText: { color: '#aaa', fontSize: 15, flex: 1, lineHeight: 22 },

  // Steps
  stepHeader: { marginBottom: 8 },
  stepIndicator: { color: '#ff6b00', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  stepTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 6 },
  stepSub: { color: '#555', fontSize: 14 },

  // Level Options
  optionList: { gap: 10, flex: 1, justifyContent: 'center' },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', gap: 14 },
  optionRowActive: { backgroundColor: '#001133', borderColor: '#0055ff' },
  optionEmoji: { fontSize: 28 },
  optionText: { flex: 1 },
  optionLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  optionLabelActive: { color: '#4488ff' },
  optionSub: { color: '#555', fontSize: 13, marginTop: 2 },
  checkmark: { color: '#4488ff', fontSize: 18, fontWeight: '900' },

  // Sport Grid
  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, flex: 1, alignContent: 'center' },
  sportTile: { width: (width - 60) / 2, alignItems: 'center', padding: 24, borderRadius: 16, backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  sportTileActive: { backgroundColor: '#001133', borderColor: '#0055ff' },
  sportEmoji: { fontSize: 40, marginBottom: 8 },
  sportLabel: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sportLabelActive: { color: '#4488ff' },
  sportSub: { color: '#555', fontSize: 12, marginTop: 4 },

  // Buttons
  primaryBtn: { backgroundColor: '#0055ff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnDisabled: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222' },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backBtn: { alignItems: 'center', paddingVertical: 12 },
  backBtnText: { color: '#444', fontSize: 15 },
});