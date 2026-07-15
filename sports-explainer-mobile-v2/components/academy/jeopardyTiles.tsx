import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Circle, Rect } from 'react-native-svg';

import type { Level } from '../../lib/api';
import { useTheme, Theme } from '../../lib/theme';
import {
  FootballField, SoccerPitch, BaseballDiamond, BasketballCourt, HockeyRink,
  TennisCourt, CricketGround, GolfHole, RugbyPitch, LosMarker,
} from '../FieldEngine';
import { markNodes } from './ZoneTapGame';
import type { ZoneScenario, ZoneSpot, ZoneRegion } from '../../lib/zoneTap';
import type { ZoneSurface } from '../../lib/zoneTap';
import type { HLRound } from '../../lib/standings';
import { TeamStatCard, VsBadge } from '../../lib/higherLowerArt';
import type { JeopardyColumn, JeopardyTile } from '../../lib/jeopardy';

// ============================================================================
// Sportswise Jeopardy — PRESENTATION MODULE (build doc §0.4: art is a
// placeholder, swappable in one place). Everything the board LOOKS like lives
// here: the grid, the tile faces, the clue chrome, the tap-option list, the
// zone field wrapper, the two-card table pair, the term panel, the completion
// summary. JeopardyGame.tsx owns state/scoring and passes plain props; a
// designer can restyle this whole file without touching game logic. The
// engine-owned art (ScoreboardArt, SignalArt, CrestHero, TeamStatCard, the
// FieldEngine surfaces) is REUSED, not redrawn — those stay each engine's
// single swap point.
// ============================================================================

const CORRECT = '#34C759';
const WRONG = '#FF3B30';

// Zone-spot hues + hit sizing (the Zone Tap grammar, kept identical so the
// board's zone clues read as the same game).
const AMBER = '#F5A623';
const TEAL = '#14B8A6';
const RED = '#e24b4a';
const HIT_R = 36;
const RECT_HIT_PAD = 14;

export const TIER_LABEL: Record<Level, string> = {
  kid: 'ROOKIE', beginner: 'BEGINNER', intermediate: 'INTERMEDIATE', expert: 'EXPERT',
};

// ── Tile answer state (owned by the game, rendered here) ────────────────────
export interface TileResult { correct: boolean }

// ── The board grid ───────────────────────────────────────────────────────────
// Column headers (icon + tiny title) over 5 value tiles each. Width adapts by
// flex: a 3-column tennis board gets broad tiles, a 6-column NFL board narrow
// ones — never a broken fixed-width grid.
export function BoardGrid({ columns, results, onOpen }: {
  columns: JeopardyColumn[];
  results: Record<string, TileResult>;
  onOpen: (tile: JeopardyTile) => void;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={s.grid}>
      {columns.map(col => (
        <View key={col.id} style={s.column}>
          <View style={s.header}>
            <Text style={s.headerIcon}>{col.icon}</Text>
            <Text style={s.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {col.title.toUpperCase()}
            </Text>
          </View>
          {col.tiles.map(tile => {
            const res = results[tile.key];
            return (
              <TouchableOpacity
                key={tile.key}
                style={[s.tile, res && (res.correct ? s.tileDone : s.tileMissed)]}
                activeOpacity={0.8}
                disabled={!!res}
                onPress={() => onOpen(tile)}>
                {res ? (
                  <Text style={[s.tileMark, { color: res.correct ? CORRECT : WRONG }]}>
                    {res.correct ? '✓' : '✗'}
                  </Text>
                ) : (
                  <Text style={s.tileValue} adjustsFontSizeToFit numberOfLines={1}>{tile.value}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Clue chrome: which tile am I answering? ──────────────────────────────────
export function ClueChip({ icon, title, value, tier }: {
  icon: string; title: string; value: number; tier: Level;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={s.chipRow}>
      <View style={s.chip}>
        <Text style={s.chipText}>{icon} {title.toUpperCase()} · {value}</Text>
      </View>
      <View style={[s.chip, s.chipTier]}>
        <Text style={s.chipText}>{TIER_LABEL[tier]}</Text>
      </View>
    </View>
  );
}

// ── Generic tap-option list (score / signal / crest / term clues) ────────────
// Same judged-color grammar as every Academy game (QuizGame lineage).
export function OptionList({ options, chosen, answer, judged, onChoose }: {
  options: string[];
  chosen: number | null;
  answer: number;
  judged: boolean;
  onChoose: (i: number) => void;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={s.options}>
      {options.map((opt, i) => {
        const isAnswer = i === answer;
        const isChosen = chosen === i;
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={0.85}
            disabled={judged}
            onPress={() => onChoose(i)}
            style={[
              s.option,
              judged && isAnswer && s.optionCorrect,
              judged && isChosen && !isAnswer && s.optionWrong,
            ]}>
            <Text
              style={[
                s.optionText,
                judged && (isAnswer || (isChosen && !isAnswer)) && s.optionTextJudged,
              ]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Term panel: the term shown BIG (the Terms column's "visual") ─────────────
export function TermPanel({ term }: { term: string }) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={s.termPanel}>
      <Text style={s.termText} adjustsFontSizeToFit numberOfLines={2}>{term}</Text>
    </View>
  );
}

// ── Zone clue: the sport's FieldEngine surface + tappable regions ────────────
// The Zone Tap render grammar in miniature: context marks under transparent
// oversized hit targets under visible rings (the two-circle pattern); judged →
// answer teal, wrong tap red, decoys dim. No burst animation in the tile —
// the tile flip + verdict carry the feedback.
export function ZoneClueField({ scenario, surface, chosen, onChoose }: {
  scenario: ZoneScenario;
  surface: ZoneSurface;
  chosen: string | null;
  onChoose: (spot: ZoneSpot) => void;
}) {
  const judged = chosen !== null;
  const hitNodes: ReactNode[] = [];
  const visNodes: ReactNode[] = [];
  scenario.spots.forEach(spot => {
    const isAnswer = spot.key === scenario.answer;
    const isChosen = spot.key === chosen;
    const color = !judged ? AMBER : isAnswer ? TEAL : isChosen ? RED : AMBER;
    const fillOpacity = !judged ? 0.12 : isAnswer ? 0.2 : isChosen ? 0.18 : 0.05;
    const ringOpacity = !judged ? 1 : isAnswer || isChosen ? 1 : 0.25;
    const onPress = judged ? undefined : () => onChoose(spot);
    const r: ZoneRegion = spot.region;
    if (r.kind === 'circle') {
      if (!judged) {
        hitNodes.push(
          <Circle key={`hit-${spot.key}`} cx={r.cx} cy={r.cy} r={Math.max(r.r + 10, HIT_R)} fill="transparent" onPress={onPress} />,
        );
      }
      visNodes.push(
        <Circle
          key={`vis-${spot.key}`} cx={r.cx} cy={r.cy} r={r.r}
          fill={color} fillOpacity={fillOpacity}
          stroke={color} strokeWidth={2.5} strokeOpacity={ringOpacity}
          onPress={onPress}
        />,
      );
    } else {
      if (!judged) {
        hitNodes.push(
          <Rect
            key={`hit-${spot.key}`} x={r.x - RECT_HIT_PAD} y={r.y - RECT_HIT_PAD}
            width={r.w + RECT_HIT_PAD * 2} height={r.h + RECT_HIT_PAD * 2}
            fill="transparent" onPress={onPress}
          />,
        );
      }
      visNodes.push(
        <Rect
          key={`vis-${spot.key}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={8}
          fill={color} fillOpacity={fillOpacity}
          stroke={color} strokeWidth={2.5} strokeOpacity={ringOpacity} strokeDasharray="7 5"
          onPress={onPress}
        />,
      );
    }
  });
  const contextNodes = scenario.marks ? markNodes(scenario.marks, surface) : [];
  const spotNodes: ReactNode[] = [...contextNodes, ...hitNodes, ...visNodes];

  if (surface === 'football') {
    // LOS via overlay so spots render above it (the documented showLos={false}
    // pattern — same as ZoneTapGame).
    return (
      <FootballField players={[]} showLos={false} overlay={<><LosMarker />{spotNodes}</>} />
    );
  }
  if (surface === 'soccer') return <SoccerPitch>{spotNodes}</SoccerPitch>;
  if (surface === 'baseball') return <BaseballDiamond>{spotNodes}</BaseballDiamond>;
  if (surface === 'basketball') return <BasketballCourt>{spotNodes}</BasketballCourt>;
  if (surface === 'hockey') return <HockeyRink>{spotNodes}</HockeyRink>;
  if (surface === 'tennis') return <TennisCourt>{spotNodes}</TennisCourt>;
  if (surface === 'cricket') return <CricketGround>{spotNodes}</CricketGround>;
  if (surface === 'golf') {
    const ownPin = !!scenario.marks?.some(m => m.kind === 'flag');
    return <GolfHole showPin={!ownPin}>{spotNodes}</GolfHole>;
  }
  return <RugbyPitch>{spotNodes}</RugbyPitch>;
}

// ── Table clue: the Higher-or-Lower two-card compare ─────────────────────────
export function TablePair({ round, chosen, onChoose }: {
  round: HLRound;
  chosen: number | null;
  onChoose: (i: 0 | 1) => void;
}) {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const judged = chosen !== null;
  return (
    <View style={s.compareRow}>
      <TouchableOpacity style={s.cardTouch} activeOpacity={0.85} disabled={judged} onPress={() => onChoose(0)}>
        <TeamStatCard
          name={round.a.displayName} abbr={round.a.abbr} logo={round.a.logo}
          judged={judged} isAnswer={round.answer === 0} isChosen={chosen === 0}
          statValue={round.aDisplay}
        />
      </TouchableOpacity>
      <VsBadge />
      <TouchableOpacity style={s.cardTouch} activeOpacity={0.85} disabled={judged} onPress={() => onChoose(1)}>
        <TeamStatCard
          name={round.b.displayName} abbr={round.b.abbr} logo={round.b.logo}
          judged={judged} isAnswer={round.answer === 1} isChosen={chosen === 1}
          statValue={round.bDisplay}
        />
      </TouchableOpacity>
    </View>
  );
}

// ── Crest option grid variant is unnecessary (board clues are crest → name),
// but crest CLUE art needs the light panel treatment — reuse CrestHero from
// lib/crestKitArt at the call site; nothing to add here.

// ── The completion summary (the lesson payoff — no other game has one) ───────
export function BoardSummary({
  banked, maxBank, correct, total, bestStreak, xpEarned,
  rankEmoji, rankName, pointsNow, nextRankName, nextRankIn, onPlayAgain,
}: {
  banked: number;
  maxBank: number;
  correct: number;
  total: number;
  bestStreak: number;
  xpEarned: number;
  rankEmoji: string;
  rankName: string;
  pointsNow: number;
  nextRankName: string | null;  // null at Legend (top rank)
  nextRankIn: number;           // pts remaining to next rank (0 when at top)
  onPlayAgain: () => void;
}) {
  const { theme } = useTheme();
  const s = useMemoStyles(theme);
  const clean = correct === total;
  const headline =
    clean ? 'CLEAN SWEEP! 🏆'
    : correct >= Math.ceil(total * 0.7) ? 'BOARD CLEARED! 🎉'
    : 'BOARD CLEARED';
  return (
    <View style={s.summaryCard}>
      <Text style={s.summaryEmoji}>🎪</Text>
      <Text style={s.summaryHeadline}>{headline}</Text>
      <Text style={s.summaryScore}>{banked}</Text>
      <Text style={s.summaryScoreSub}>points banked of {maxBank}</Text>

      <View style={s.statRow}>
        <View style={s.statBox}>
          <Text style={s.statBig}>{correct}/{total}</Text>
          <Text style={s.statLabel}>TILES WON</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statBig}>🔥 {bestStreak}</Text>
          <Text style={s.statLabel}>BEST STREAK</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statBig}>+{xpEarned}</Text>
          <Text style={s.statLabel}>XP EARNED</Text>
        </View>
      </View>

      <View style={s.rankRow}>
        <Text style={s.rankText}>{rankEmoji} {rankName} · {pointsNow} pts</Text>
        {nextRankName ? (
          <Text style={s.rankNext}>{nextRankIn} pts to {nextRankName}</Text>
        ) : (
          <Text style={s.rankNext}>Top rank — legend status 🐐</Text>
        )}
      </View>

      <TouchableOpacity style={s.againBtn} activeOpacity={0.85} onPress={onPlayAgain}>
        <Text style={s.againText}>New board →</Text>
      </TouchableOpacity>
    </View>
  );
}

// Small hook wrapper so BoardSummary reads like the rest of the file.
function useMemoStyles(theme: Theme) {
  return useMemo(() => makeStyles(theme), [theme]);
}

// ── Crest option list with names is just OptionList; the crest hero art comes
// from lib/crestKitArt (engine-owned). One extra piece: a tiny broken-crest
// fallback panel used if the hero image can't load mid-clue.
export function CrestFallback() {
  const { theme } = useTheme();
  const s = useMemoStyles(theme);
  return (
    <View style={s.termPanel}>
      <Text style={s.summaryEmoji}>🛡️</Text>
      <Text style={s.crestFallbackText}>Crest unavailable — answer from the options.</Text>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // grid
  grid: { flexDirection: 'row', gap: 6 },
  column: { flex: 1, gap: 6 },
  header: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.surface, borderRadius: 10, borderWidth: 1, borderColor: t.border,
    paddingVertical: 6, minHeight: 46,
  },
  headerIcon: { fontSize: 16 },
  headerTitle: { color: t.textMuted, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.5, marginTop: 2 },
  tile: {
    height: 52, borderRadius: 10, borderWidth: 1.5, borderColor: t.accent,
    backgroundColor: t.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  tileDone: { borderColor: t.border, backgroundColor: t.surface, opacity: 0.55 },
  tileMissed: { borderColor: t.border, backgroundColor: t.surface, opacity: 0.55 },
  tileValue: { color: t.accent, fontSize: 17, fontWeight: '900' },
  tileMark: { fontSize: 18, fontWeight: '900' },
  // clue chrome
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: t.surface, borderRadius: 8, borderWidth: 1, borderColor: t.border,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  chipTier: { backgroundColor: t.surfaceAlt },
  chipText: { color: t.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  // options
  options: { marginTop: 14, gap: 10 },
  option: {
    borderRadius: 14, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surfaceAlt,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  optionCorrect: { borderColor: CORRECT, backgroundColor: CORRECT },
  optionWrong: { borderColor: WRONG, backgroundColor: WRONG },
  optionText: { color: t.textPrimary, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  optionTextJudged: { color: '#ffffff', fontWeight: '800' },
  // term panel
  termPanel: {
    backgroundColor: t.surface, borderRadius: 18, borderWidth: 1, borderColor: t.border,
    height: 120, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  termText: { color: t.textPrimary, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  crestFallbackText: { color: t.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6 },
  // table pair
  compareRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  cardTouch: { flex: 1 },
  // summary
  summaryCard: {
    backgroundColor: t.surface, borderRadius: 22, borderWidth: 1, borderColor: t.border,
    padding: 22, alignItems: 'center',
  },
  summaryEmoji: { fontSize: 40 },
  summaryHeadline: { color: t.textPrimary, fontSize: 20, fontWeight: '900', letterSpacing: 1, marginTop: 6 },
  summaryScore: { color: t.accent, fontSize: 46, fontWeight: '900', marginTop: 10 },
  summaryScoreSub: { color: t.textMuted, fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' },
  statBox: {
    flex: 1, backgroundColor: t.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: t.border,
    alignItems: 'center', paddingVertical: 12,
  },
  statBig: { color: t.textPrimary, fontSize: 17, fontWeight: '900' },
  statLabel: { color: t.textMuted, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, marginTop: 3 },
  rankRow: { alignItems: 'center', marginTop: 16 },
  rankText: { color: t.accentText, fontSize: 15, fontWeight: '900' },
  rankNext: { color: t.textMuted, fontSize: 12.5, fontWeight: '600', marginTop: 3 },
  againBtn: {
    marginTop: 18, borderRadius: 14, backgroundColor: t.accent,
    paddingHorizontal: 26, paddingVertical: 13,
  },
  againText: { color: t.onAccent, fontSize: 15, fontWeight: '800' },
});
