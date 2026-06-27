import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Sport } from '../lib/api';
import { useAppState } from '../lib/appState';
import { useTheme, Theme } from '../lib/theme';
import SportStrip from '../components/SportStrip';
import GameHost from '../components/academy/GameHost';
import CoachesCornerHeader from '../components/CoachesCornerHeader';
import RankCard from '../components/RankCard';
import StrategyTipCard from '../components/StrategyTipCard';
import FormationBrowser from '../components/FormationBrowser';
import MakeTheCallGame from '../components/academy/MakeTheCallGame';
import FormationQuizGame from '../components/academy/FormationQuizGame';
import { coachesCornerSports, piecesForSport, CCPieceId } from '../lib/coachesCorner';

// The two GameHost-mounted pieces, as local descriptors. GameHost doesn't read `id` (it renders
// icon/title + the Component), so the id is just a local label; `as any` at the call site keeps it off
// the Academy-only AcademyGameId union. Both Components take AcademyGameProps. ('formations' is NOT
// here — it's a visual browser, mounted with its own back bar below.)
const PIECE_GAME = {
  'make-the-call': { id: 'cc-make-the-call', title: 'Make the Call', icon: '📋', blurb: 'Judgment quiz', Component: MakeTheCallGame },
  'read-the-play': { id: 'cc-read-the-play', title: 'Read the Play', icon: '🎯', blurb: 'Name the shape / weakness', Component: FormationQuizGame },
} as const;

const PIECE_META: Record<CCPieceId, { icon: string; title: string }> = {
  'make-the-call': { icon: '📋', title: 'Make the Call' },
  'formations':    { icon: '🗺️', title: 'Formations' },
  'read-the-play': { icon: '🎯', title: 'Read the Play' },
};

export default function CoachesCornerScreen() {
  const { level } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const ccSports = coachesCornerSports(level);          // data-driven sport list (≥ soccer always)
  const [selectedSport, setSelectedSport] = useState<Sport>(ccSports[0]?.key ?? 'soccer');
  const [activePiece, setActivePiece] = useState<CCPieceId | null>(null);
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  // Tap the active Coach's Corner tab while inside a piece → pop back to the landing screen (standard
  // "tap active tab = go to root"). No-op when already on the landing (state null), so a normal tab tap
  // behaves normally and switching to a DIFFERENT tab is untouched.
  useEffect(() => {
    const unsub = navigation.addListener('tabPress', (e) => {
      if (activePiece !== null) {
        e.preventDefault();
        setActivePiece(null);
      }
    });
    return unsub;
  }, [navigation, activePiece]);

  // Guard: if a level change (made inside a piece) dropped the selected sport from the content list,
  // fall back to the first available — keeps the strip highlight + pieces consistent without an effect.
  const activeSport: Sport = ccSports.some(s => s.key === selectedSport) ? selectedSport : (ccSports[0]?.key ?? 'soccer');
  const activeEntry = ccSports.find(s => s.key === activeSport);
  const pieces = piecesForSport(activeSport, level);

  // ── Full-screen piece view (mirrors AcademyScreen's activeGame early-return) ──
  if (activePiece) {
    if (activePiece === 'formations') {
      return (
        <Animated.View key="cc-formations" style={styles.root} entering={SlideInRight.duration(220)}>
          <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle={theme.statusBar} />
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => setActivePiece(null)} style={styles.backBtn} hitSlop={10} activeOpacity={0.7}>
                <Text style={styles.backText}>‹ Coach's Corner</Text>
              </TouchableOpacity>
              <Text style={styles.topTitle} numberOfLines={1}>🗺️ Formations</Text>
              <View style={styles.backBtn} />
            </View>
            <FormationBrowser />
          </SafeAreaView>
        </Animated.View>
      );
    }
    const game = PIECE_GAME[activePiece];
    return (
      <Animated.View key={`cc-${activePiece}`} style={styles.root} entering={SlideInRight.duration(220)}>
        <GameHost
          game={game as any}
          sportKeys={[activeSport]}
          categoryEmoji={activeEntry?.emoji}
          backLabel="Coach's Corner"
          onBack={() => setActivePiece(null)}
        />
      </Animated.View>
    );
  }

  // ── Main view: banner → sport strip → pieces ──
  const selectedLabel = activeEntry?.label ?? '';
  return (
    <Animated.View style={styles.root} entering={FadeIn.duration(200)}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle={theme.statusBar} />
        <CoachesCornerHeader />
        <SportStrip
          items={ccSports.map(s => ({ key: s.key, emoji: s.emoji, label: s.label }))}
          selectedKey={activeSport}
          onSelect={(key) => setSelectedSport(key as Sport)}
        />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Identity/progress — the shared rank card (global points total). */}
          <View style={styles.section}>
            <RankCard kicker="YOUR RANK" />
          </View>

          {/* Today's hook — a featured slot that opens Make the Call. Only when the selected sport has it. */}
          {pieces.includes('make-the-call') && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.heroCard}
                activeOpacity={0.85}
                onPress={() => setActivePiece('make-the-call')}>
                <Text style={styles.heroKicker}>FEATURED</Text>
                <View style={styles.heroRow}>
                  <Text style={styles.heroIcon}>📋</Text>
                  <View style={styles.heroTextCol}>
                    <Text style={styles.heroTitle}>Today's Call</Text>
                    <Text style={styles.heroBlurb}>One scenario — make the right call</Text>
                  </View>
                  <Text style={styles.heroPlay}>▶</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* The full menu — the pieces for this sport. */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {selectedLabel.toUpperCase()} · {pieces.length} {pieces.length === 1 ? 'WAY' : 'WAYS'} TO LEARN
            </Text>
            <View style={styles.pieceGrid}>
              {pieces.map(p => (
                <TouchableOpacity key={p} style={styles.pieceTile} activeOpacity={0.8} onPress={() => setActivePiece(p)}>
                  <Text style={styles.pieceIcon}>{PIECE_META[p].icon}</Text>
                  <Text style={styles.pieceTitle} numberOfLines={1}>{PIECE_META[p].title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* A teaching nugget — the strategy tip for the selected sport. */}
          <View style={styles.section}>
            <StrategyTipCard sport={activeSport} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  safe: { flex: 1, backgroundColor: t.background },
  // Back bar — values copied from GameHost so the formations view matches the GameHost-mounted pieces.
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { minWidth: 120 },
  backText: { color: t.accentText, fontSize: 16, fontWeight: '800' },
  topTitle: { color: t.textPrimary, fontSize: 16, fontWeight: '900', flex: 1, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },
  section: { marginBottom: 20 },
  sectionLabel: { color: t.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10 },
  // Tile grid — copied from AcademyScreen gameGrid/gameTile so pieces match the Academy games visually.
  pieceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pieceTile: { width: '47%', flexGrow: 1, minHeight: 92, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  pieceIcon: { fontSize: 28 },
  pieceTitle: { color: t.textPrimary, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  // "Today's Call" featured hero — copied from AcademyScreen's hero* styles so it matches the Academy FEATURED card.
  heroCard: { backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.accent, padding: 16 },
  heroKicker: { color: t.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { fontSize: 34 },
  heroTextCol: { flex: 1 },
  heroTitle: { color: t.textPrimary, fontSize: 18, fontWeight: '900' },
  heroBlurb: { color: t.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 2 },
  heroPlay: { color: t.accent, fontSize: 20, fontWeight: '900' },
});
