import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Sport } from '../lib/api';
import { useAppState } from '../lib/appState';
import { UI_STRINGS } from '../lib/strings';
import { useTheme, Theme } from '../lib/theme';
import SportStrip from '../components/SportStrip';
import GameHost from '../components/academy/GameHost';
import CoachesCornerHeader from '../components/CoachesCornerHeader';
import RankCard from '../components/RankCard';
import StrategyTipCard from '../components/StrategyTipCard';
import FormationBrowser from '../components/FormationBrowser';
import CoachSpeakBrowser from '../components/CoachSpeakBrowser';
import MakeTheCallGame from '../components/academy/MakeTheCallGame';
import FormationQuizGame from '../components/academy/FormationQuizGame';
import BoxCountGame from '../components/academy/BoxCountGame';
import OnsideOrOffGame from '../components/academy/OnsideOrOffGame';
import WheresThePlayGame from '../components/academy/WheresThePlayGame';
import FindTheOpenMan from '../components/academy/FindTheOpenMan';
// v1.5 field modules
import FourthDownCallGame from '../components/academy/FourthDownCallGame';
import CountLeverageGame from '../components/academy/CountLeverageGame';
import StealOrStayGame from '../components/academy/StealOrStayGame';
import PressTriggerGame from '../components/academy/PressTriggerGame';
import CounterOrKeepGame from '../components/academy/CounterOrKeepGame';
import PostsCornerOrScrumGame from '../components/academy/PostsCornerOrScrumGame';
import HelpOrStayGame from '../components/academy/HelpOrStayGame';
import ApproachOrStayGame from '../components/academy/ApproachOrStayGame';
import GoOrLayGame from '../components/academy/GoOrLayGame';
import SuckerPinGame from '../components/academy/SuckerPinGame';
import ReviewOrSaveGame from '../components/academy/ReviewOrSaveGame';
// v1.5 wave 2
import RpoGiveOrPullGame from '../components/academy/RpoGiveOrPullGame';
import MotionManOrZoneGame from '../components/academy/MotionManOrZoneGame';
import ReadTheCoverageGame from '../components/academy/ReadTheCoverageGame';
import InfieldInOrBackGame from '../components/academy/InfieldInOrBackGame';
import TagUpGame from '../components/academy/TagUpGame';
import SwitchThePlayGame from '../components/academy/SwitchThePlayGame';
import ServeTargetGame from '../components/academy/ServeTargetGame';
import ThePinchGame from '../components/academy/ThePinchGame';
import SetTheTrapGame from '../components/academy/SetTheTrapGame';
import NumbersOutWideGame from '../components/academy/NumbersOutWideGame';
import DrawAndPassGame from '../components/academy/DrawAndPassGame';
import HowManyInGame from '../components/academy/HowManyInGame';
import WheresTheLineGame from '../components/academy/WheresTheLineGame';
import PickYourPoisonGame from '../components/academy/PickYourPoisonGame';
import TwoForOneGame from '../components/academy/TwoForOneGame';
import FoulUpThreeGame from '../components/academy/FoulUpThreeGame';
import ServePlusOneGame from '../components/academy/ServePlusOneGame';
import PassOrLobGame from '../components/academy/PassOrLobGame';
import EscapeOrHeroGame from '../components/academy/EscapeOrHeroGame';
import PaceTheChaseGame from '../components/academy/PaceTheChaseGame';
import BowlOrChangeGame from '../components/academy/BowlOrChangeGame';
import { coachesCornerSports, piecesForSport, CCPieceId } from '../lib/coachesCorner';
import AppIcon from '../components/AppIcon';

// The GameHost-mounted pieces, as local descriptors. GameHost doesn't read `id` (it renders
// icon/title + the Component), so the id is just a local label; `as any` at the call site keeps it off
// the Academy-only AcademyGameId union. Both Components take AcademyGameProps. ('formations' is NOT
// here — it's a visual browser, mounted with its own back bar below.)
const PIECE_GAME = {
  'make-the-call': { id: 'cc-make-the-call', title: 'Make the Call', icon: '📋', blurb: 'Judgment quiz', Component: MakeTheCallGame },
  'read-the-play': { id: 'cc-read-the-play', title: 'Read the Play', icon: '🎯', blurb: 'Name the shape / weakness', Component: FormationQuizGame },
  'box-count':     { id: 'cc-box-count', title: 'Box Count', icon: '🏈', blurb: 'Read the box, call run/pass', Component: BoxCountGame, landscape: true },
  'onside-or-off': { id: 'cc-onside-or-off', title: 'Onside or Off?', icon: '🚩', blurb: 'Judge it live, rewind like a fan', Component: OnsideOrOffGame, landscape: true },
  'wheres-the-play': { id: 'cc-wheres-the-play', title: "Where's the Play?", icon: '⚾', blurb: 'Watch the grounder, read the force', Component: WheresThePlayGame, landscape: true },
  'find-the-open-man': { id: 'cc-find-the-open-man', title: 'Find the Open Man', icon: '🎯', blurb: 'Read the coverage, hit the open receiver', Component: FindTheOpenMan, landscape: true },
  // — v1.5 —
  'fourth-down-call': { id: 'cc-fourth-down-call', title: 'Fourth Down Call', icon: '🏈', blurb: 'Go, kick, or punt — the nose decides it', Component: FourthDownCallGame, landscape: true },
  'count-leverage': { id: 'cc-count-leverage', title: 'Own the Count', icon: '⚾', blurb: "Whose count is it? Pick your pitch", Component: CountLeverageGame, landscape: true },
  'steal-or-stay': { id: 'cc-steal-or-stay', title: 'Steal or Stay?', icon: '🏃', blurb: 'Read the arm, time the jump', Component: StealOrStayGame, landscape: true },
  'press-trigger': { id: 'cc-press-trigger', title: 'Press or Drop', icon: '⚽', blurb: 'Time the trigger — cut it, trap it, or chase', Component: PressTriggerGame, landscape: true },
  'counter-or-keep': { id: 'cc-counter-or-keep', title: 'Counter or Keep?', icon: '⚡', blurb: 'The window is open for five seconds', Component: CounterOrKeepGame, landscape: true },
  'posts-corner-or-scrum': { id: 'cc-posts-corner-or-scrum', title: 'Posts, Corner, or Scrum?', icon: '🏉', blurb: "Penalty won — the captain's menu", Component: PostsCornerOrScrumGame, landscape: true },
  'help-or-stay': { id: 'cc-help-or-stay', title: 'Help or Stay?', icon: '🏀', blurb: "Tag the roller or guard the corner", Component: HelpOrStayGame, landscape: true },
  'approach-or-stay': { id: 'cc-approach-or-stay', title: 'Approach or Stay?', icon: '🎾', blurb: 'Short ball — invitation or trap?', Component: ApproachOrStayGame, landscape: true },
  'go-or-lay': { id: 'cc-go-or-lay', title: 'Go or Lay?', icon: '⛳', blurb: 'Par-5 second shot — closer is better', Component: GoOrLayGame, landscape: true },
  'sucker-pin': { id: 'cc-sucker-pin', title: 'Sucker Pin', icon: '🚩', blurb: "You don't aim a shot — you aim an oval", Component: SuckerPinGame, landscape: true },
  'review-or-save': { id: 'cc-review-or-save', title: 'Review or Save?', icon: '🏏', blurb: 'DRS: challenge the umpire, or bank it', Component: ReviewOrSaveGame, landscape: true },
  // — wave 2 —
  'rpo-give-or-pull': { id: 'cc-rpo-give-or-pull', title: 'Give or Pull?', icon: '🏈', blurb: 'RPO mesh — one defender is wrong either way', Component: RpoGiveOrPullGame, landscape: true },
  'motion-man-or-zone': { id: 'cc-motion-man-or-zone', title: 'Man or Zone?', icon: '🏃', blurb: 'Send him in motion — watch who follows', Component: MotionManOrZoneGame, landscape: true },
  'read-the-coverage': { id: 'cc-read-the-coverage', title: 'Read the Coverage', icon: '🛡️', blurb: 'Count the safeties — middle open or shut?', Component: ReadTheCoverageGame, landscape: true },
  'infield-in-or-back': { id: 'cc-infield-in-or-back', title: 'Infield In or Back?', icon: '🧤', blurb: "Cut the run, or take the outs — not both", Component: InfieldInOrBackGame, landscape: true },
  'tag-up': { id: 'cc-tag-up', title: 'Tag and Go', icon: '⏱️', blurb: 'The first touch is the starting gun', Component: TagUpGame, landscape: true },
  'switch-the-play': { id: 'cc-switch-the-play', title: 'Switch the Play', icon: '🔄', blurb: "They all slid over — where ISN'T the defense?", Component: SwitchThePlayGame, landscape: true },
  'serve-target': { id: 'cc-serve-target', title: 'Serve Target', icon: '🎾', blurb: 'Read his feet — serve the door he left open', Component: ServeTargetGame, landscape: true },
  'the-pinch': { id: 'cc-the-pinch', title: 'The Pinch', icon: '⛳', blurb: 'Safety is a yardage, not a club', Component: ThePinchGame, landscape: true },
  'set-the-trap': { id: 'cc-set-the-trap', title: 'Set the Trap', icon: '🏏', blurb: 'Move a man onto the evidence', Component: SetTheTrapGame, landscape: true },
  'numbers-out-wide': { id: 'cc-numbers-out-wide', title: 'Numbers Out Wide', icon: '🏉', blurb: 'Count shirts, then beat the slide', Component: NumbersOutWideGame, landscape: true },
  'draw-and-pass': { id: 'cc-draw-and-pass', title: 'Draw and Pass', icon: '🤾', blurb: 'Two on one — time the release', Component: DrawAndPassGame, landscape: true },
  'how-many-in': { id: 'cc-how-many-in', title: 'How Many In?', icon: '💥', blurb: 'The ruck is a market — spend wisely', Component: HowManyInGame, landscape: true },
  'wheres-the-line': { id: 'cc-wheres-the-line', title: "Where's the Line?", icon: '📏', blurb: 'Drag the offside fence, lock it in', Component: WheresTheLineGame, landscape: true },
  'pick-your-poison': { id: 'cc-pick-your-poison', title: 'Pick Your Poison', icon: '🏀', blurb: 'Drop, switch or blitz — every coverage sends a bill', Component: PickYourPoisonGame, landscape: true },
  'two-for-one': { id: 'cc-two-for-one', title: 'Two-for-One', icon: '⏱️', blurb: "Shoot early and the ball comes back", Component: TwoForOneGame, landscape: true },
  'foul-up-three': { id: 'cc-foul-up-three', title: 'Foul Up Three?', icon: '🚨', blurb: 'Two free throws can never tie you', Component: FoulUpThreeGame, landscape: true },
  'serve-plus-one': { id: 'cc-serve-plus-one', title: 'Serve +1', icon: '🎾', blurb: 'Read his recovery trail, not the ball', Component: ServePlusOneGame, landscape: true },
  'pass-or-lob': { id: 'cc-pass-or-lob', title: 'Pass or Lob?', icon: '🎾', blurb: 'His distance picks the shot; his lean picks the lane', Component: PassOrLobGame, landscape: true },
  'escape-or-hero': { id: 'cc-escape-or-hero', title: 'Escape or Hero?', icon: '🌲', blurb: 'Gap width vs shot width — the 9-of-10 rule', Component: EscapeOrHeroGame, landscape: true },
  'pace-the-chase': { id: 'cc-pace-the-chase', title: 'Pace the Chase', icon: '🏏', blurb: 'Balls or wickets — which one is scarce?', Component: PaceTheChaseGame, landscape: true },
  'bowl-or-change': { id: 'cc-bowl-or-change', title: 'Bowl or Change?', icon: '🏏', blurb: 'Figures are the past; geometry is the next over', Component: BowlOrChangeGame, landscape: true },
} as const;

// Explorer pieces — browse-only, portrait, no scoring. Keyed by piece id; anything listed here
// bypasses PIECE_GAME/GameHost entirely (see the mount below). Deliberately a separate table from
// PIECE_GAME rather than a flag on it, because the two have genuinely different shapes: a game takes
// AcademyGameProps and owns a verdict, an explorer takes nothing and owns a scroll view.
type ExplorerPieceId = 'formations' | 'coach-speak';
const EXPLORER_PIECE: Record<ExplorerPieceId, { title: string; icon: string; Component: React.ComponentType }> = {
  'formations':   { title: 'Formations', icon: '🗺️', Component: FormationBrowser },
  'coach-speak':  { title: 'Coach Speak', icon: '🗣️', Component: CoachSpeakBrowser },
};
// A type predicate, not an `in` check inline: this is what lets TS narrow activePiece to the
// GAME-backed ids after the explorer branch returns, so PIECE_GAME[...] stays fully typed and a
// piece added to neither table is still a compile error rather than an undefined at runtime.
const isExplorerPiece = (id: CCPieceId): id is ExplorerPieceId => id in EXPLORER_PIECE;

const PIECE_META: Record<CCPieceId, { icon: string; title: string }> = {
  'make-the-call': { icon: '📋', title: 'Make the Call' },
  'formations':    { icon: '🗺️', title: 'Formations' },
  'coach-speak':   { icon: '🗣️', title: 'Coach Speak' },
  'read-the-play': { icon: '🎯', title: 'Read the Play' },
  'box-count':     { icon: '🏈', title: 'Box Count' },
  'onside-or-off': { icon: '🚩', title: 'Onside or Off?' },
  'wheres-the-play': { icon: '⚾', title: "Where's the Play?" },
  'find-the-open-man': { icon: '🎯', title: 'Find the Open Man' },
  'fourth-down-call': { icon: '🏈', title: 'Fourth Down Call' },
  'count-leverage': { icon: '⚾', title: 'Own the Count' },
  'steal-or-stay': { icon: '🏃', title: 'Steal or Stay?' },
  'press-trigger': { icon: '⚽', title: 'Press or Drop' },
  'counter-or-keep': { icon: '⚡', title: 'Counter or Keep?' },
  'posts-corner-or-scrum': { icon: '🏉', title: 'Posts, Corner, or Scrum?' },
  'help-or-stay': { icon: '🏀', title: 'Help or Stay?' },
  'approach-or-stay': { icon: '🎾', title: 'Approach or Stay?' },
  'go-or-lay': { icon: '⛳', title: 'Go or Lay?' },
  'sucker-pin': { icon: '🚩', title: 'Sucker Pin' },
  'review-or-save': { icon: '🏏', title: 'Review or Save?' },
  'rpo-give-or-pull': { icon: '🏈', title: 'Give or Pull?' },
  'motion-man-or-zone': { icon: '🏃', title: 'Man or Zone?' },
  'read-the-coverage': { icon: '🛡️', title: 'Read the Coverage' },
  'infield-in-or-back': { icon: '🧤', title: 'Infield In or Back?' },
  'tag-up': { icon: '⏱️', title: 'Tag and Go' },
  'switch-the-play': { icon: '🔄', title: 'Switch the Play' },
  'serve-target': { icon: '🎾', title: 'Serve Target' },
  'the-pinch': { icon: '⛳', title: 'The Pinch' },
  'set-the-trap': { icon: '🏏', title: 'Set the Trap' },
  'numbers-out-wide': { icon: '🏉', title: 'Numbers Out Wide' },
  'draw-and-pass': { icon: '🤾', title: 'Draw and Pass' },
  'how-many-in': { icon: '💥', title: 'How Many In?' },
  'wheres-the-line': { icon: '📏', title: "Where's the Line?" },
  'pick-your-poison': { icon: '🏀', title: 'Pick Your Poison' },
  'two-for-one': { icon: '⏱️', title: 'Two-for-One' },
  'foul-up-three': { icon: '🚨', title: 'Foul Up Three?' },
  'serve-plus-one': { icon: '🎾', title: 'Serve +1' },
  'pass-or-lob': { icon: '🎾', title: 'Pass or Lob?' },
  'escape-or-hero': { icon: '🌲', title: 'Escape or Hero?' },
  'pace-the-chase': { icon: '🏏', title: 'Pace the Chase' },
  'bowl-or-change': { icon: '🏏', title: 'Bowl or Change?' },
};

export default function CoachesCornerScreen() {
  const { level, language } = useAppState();
  const S = UI_STRINGS[language];
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const ccSports = coachesCornerSports(level);          // ALL candidates, each tagged enabled (≥ soccer always enabled)
  const [selectedSport, setSelectedSport] = useState<Sport>(ccSports.find(s => s.enabled)?.key ?? 'soccer');
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

  // (The bottom-tab-bar hide for full-screen landscape pieces now lives in GameHost, tied to the same
  // `game.landscape` flag as the orientation lock — so every landscape piece inherits it centrally.)

  // Guard: if a level change (made inside a piece) dropped the selected sport from the content list,
  // fall back to the first available — keeps the strip highlight + pieces consistent without an effect.
  // Only treat selectedSport as active if it's present AND enabled; otherwise fall back to the first
  // enabled sport — so a DISABLED (greyed) sport can never become active and open an empty pieces area.
  const activeSport: Sport = ccSports.some(s => s.key === selectedSport && s.enabled)
    ? selectedSport
    : (ccSports.find(s => s.enabled)?.key ?? 'soccer');
  const activeEntry = ccSports.find(s => s.key === activeSport);
  const pieces = piecesForSport(activeSport, level);

  // ── Full-screen piece view (mirrors AcademyScreen's activeGame early-return) ──
  if (activePiece) {
    // Explorers mount here rather than through GameHost: they're portrait, scrolling, and have no
    // call to make, so they need none of GameHost's orientation lock, tab-bar hide or verdict
    // plumbing — just a back bar. Formations was the first and lived here as a hardcoded branch;
    // Coach Speak is the second, so the branch became a table. A third costs one line.
    if (isExplorerPiece(activePiece)) {
      const explorer = EXPLORER_PIECE[activePiece];
      const Explorer = explorer.Component;
      return (
        <Animated.View key={`cc-${activePiece}`} style={styles.root} entering={SlideInRight.duration(220)}>
          <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle={theme.statusBar} />
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => setActivePiece(null)} style={styles.backBtn} hitSlop={10} activeOpacity={0.7}>
                <Text style={styles.backText}>‹ Coach's Corner</Text>
              </TouchableOpacity>
              <Text style={styles.topTitle} numberOfLines={1}>{explorer.icon} {explorer.title}</Text>
              <View style={styles.backBtn} />
            </View>
            <Explorer />
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
          items={ccSports.map(s => ({ key: s.key, emoji: s.emoji, label: s.label, disabled: !s.enabled }))}
          selectedKey={activeSport}
          onSelect={(key) => setSelectedSport(key as Sport)}
        />
        {/* Hint: when a sport is greyed out (no scenarios at this level), name it + point to where it's available. */}
        {ccSports.some(s => !s.enabled) && (
          <Text style={styles.ccLevelHint}>
            {ccSports.filter(s => !s.enabled).map(s => s.label).join(' & ')}{' '}{S.ccMoreAtLevels}
          </Text>
        )}
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
                  <AppIcon emoji={PIECE_META[p].icon} size={28} style={styles.pieceIcon} />
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
  ccLevelHint: { color: t.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8, marginHorizontal: 16 },
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
