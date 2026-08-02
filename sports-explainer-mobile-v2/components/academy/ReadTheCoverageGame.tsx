import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Rect, Line, Circle, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { FootballField, LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FOOTBALL_FIELD_RATIO, FIELD, FE } from '../FieldEngine';
import {
  COVERAGES, MOF_ZONE, OFFENSE, verdictTitleFor, verdictBodyFor,
  type Coverage, type Depth,
} from '../../lib/readTheCoverage';

// Read the Coverage — the pre-snap shell, and the one question that unlocks it: how many DEEP
// safeties are back there? Two-high means the middle of the field is OPEN; one-high means it's
// CLOSED. Counting them is an UNGRADED aid (tap the deep men, like Box Count's box) — the graded
// call is only OPEN vs CLOSED. The reveal shades the middle-of-field zone itself (teal open / red
// closed), so the answer is drawn on the grass, not just written in the card.
//
// A static shell — no motion, so no animation owner. The 4-depth COACH'S READ drives BOTH the
// verdict title and the body through the lib's verdictTitleFor / verdictBodyFor (rookie gets the
// simplified count sentence; expert gets the ◆ note appended) — copy is the lib's, verbatim.
// Field = the shared FootballField (680×380, LOS at x=235), module draws every pixel in the overlay.
const F_BOLD = 'SpaceGrotesk_700Bold';
const TEAL = '#14B8A6', RED = '#e24b4a', AMBER = '#F5A623';
const HIT_R = 36;                 // viewBox hit radius → ~44px on-screen at football scale
const LS_HINT_RESERVE = 34;       // navy room reserved UNDER the field for the 👆 hint (never reflows)
const PRESS_MAX = 32;             // a corner within this of the LOS is pressing (computed, not declared)
const HINT_PRE = '👆 Optional: tap the deep safeties to count them';

type Call = 'open' | 'closed';

// Outlined field label (react-native-svg has no paint-order → outline pass, then fill pass).
function fieldLabel(key: string, x: number, y: number, text: string, fill: string, size = 10.5): ReactNode {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <G key={key}>
      <SvgText {...common} fill="none" stroke={FE.labelOutline} strokeWidth={3} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </G>
  );
}

export default function ReadTheCoverageGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [level, setLevel] = useState<Level>(appLevel);
  const [tapped, setTapped] = useState<Set<string>>(new Set());
  const [called, setCalled] = useState<Call | null>(null);

  const cov: Coverage = COVERAGES[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;    // app Level → data-lib Depth
  const answered = called != null;
  const correct = called === cov.mof;
  const deep = cov.safeties.length;

  const resetTo = (i: number) => { setIdx(i); setTapped(new Set()); setCalled(null); };
  const resetShell = () => resetTo(idx);
  const selectShell = (i: number) => resetTo(i);
  const nextShell = () => resetTo((idx + 1) % COVERAGES.length);

  const toggleTap = (id: string) => {
    if (answered) return;                                     // counting aid only during the read
    Haptics.selectionAsync();
    setTapped(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const call = (c: Call) => {
    if (answered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCalled(c);
  };

  // ── the on-field overlay (players=[] on the field itself; the module draws everything) ──
  const dyn: ReactNode[] = [];
  // LOS first → it sits UNDER the dots (FootballField's own LOS is suppressed).
  dyn.push(<Line key="los" x1={FIELD.los} y1={FIELD.bandTop} x2={FIELD.los} y2={FIELD.bandBot} stroke={FE.losLine} strokeWidth={2.5} opacity={0.9} />);
  dyn.push(<SvgText key="losL" x={FIELD.los + 5} y={22} fontSize={10.5} fontFamily={F_BOLD} fill={FE.losLabel}>Line of scrimmage</SvgText>);
  // the reveal: the middle of the field itself, shaded by what the safeties said about it
  if (answered) {
    const c = cov.mof === 'open' ? TEAL : RED;
    dyn.push(<Rect key="mof" x={MOF_ZONE.x} y={MOF_ZONE.y} width={MOF_ZONE.w} height={MOF_ZONE.h} rx={10} fill={c} opacity={0.16} />);
    dyn.push(<Rect key="mofr" x={MOF_ZONE.x} y={MOF_ZONE.y} width={MOF_ZONE.w} height={MOF_ZONE.h} rx={10} fill="none" stroke={c} strokeWidth={2} strokeDasharray="7 6" opacity={0.85} />);
    dyn.push(fieldLabel('mofl', MOF_ZONE.x + MOF_ZONE.w / 2, MOF_ZONE.y - 6,
      cov.mof === 'open' ? 'middle of field OPEN' : 'middle of field CLOSED',
      cov.mof === 'open' ? '#bfe9da' : '#ffb3ae', 11));
  }
  // offense — the static look across the ball
  OFFENSE.ol.forEach((p, i) => dyn.push(<Circle key={`ol${i}`} cx={p.x} cy={p.y} r={7} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />));
  dyn.push(<Circle key="qb" cx={OFFENSE.qb.x} cy={OFFENSE.qb.y} r={10} fill={FE.orange} stroke="#fff" strokeWidth={2.5} />);
  dyn.push(fieldLabel('qbl', OFFENSE.qb.x, OFFENSE.qb.y + 23, 'QB', FE.offLabel));
  dyn.push(<Circle key="rb" cx={OFFENSE.rb.x} cy={OFFENSE.rb.y} r={9} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />);
  dyn.push(fieldLabel('rbl', OFFENSE.rb.x, OFFENSE.rb.y + 22, 'RB', FE.offLabel));
  OFFENSE.wr.forEach((p, i) => {
    dyn.push(<Circle key={`wr${i}`} cx={p.x} cy={p.y} r={9} fill={FE.orange} stroke={FE.navy} strokeWidth={1.5} />);
    dyn.push(fieldLabel(`wrl${i}`, p.x, p.y + 22, 'WR', FE.offLabel));
  });
  // defense — the front is small dots (identified via the legend); backers and corners are labeled
  cov.front.forEach((p, i) => dyn.push(<Circle key={`fr${i}`} cx={p.x} cy={p.y} r={7} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />));
  cov.linebackers.forEach((p, i) => {
    dyn.push(<Circle key={`lb${i}`} cx={p.x} cy={p.y} r={9} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />);
    dyn.push(fieldLabel(`lbl${i}`, p.x, p.y + 21, 'LB', FE.defLabel));
  });
  cov.corners.forEach((p, i) => {
    dyn.push(<Circle key={`cb${i}`} cx={p.x} cy={p.y} r={9} fill={FE.blue} stroke={FE.navy} strokeWidth={1.5} />);
    dyn.push(fieldLabel(`cbl${i}`, p.x, p.y + 21, 'CB', FE.defLabel));
    // press is a MEASUREMENT, not a claim: how close is he to the line? Shown on the reveal.
    if (answered && p.x - FIELD.los <= PRESS_MAX && OFFENSE.wr[i]) {
      dyn.push(<Line key={`pr${i}`} x1={p.x} y1={p.y} x2={OFFENSE.wr[i].x} y2={OFFENSE.wr[i].y} stroke={AMBER} strokeWidth={2} strokeDasharray="3 3" opacity={0.9} />);
      dyn.push(fieldLabel(`prl${i}`, (p.x + OFFENSE.wr[i].x) / 2, p.y - 12, 'press', '#ffe1b3', 9.5));
    }
  });
  // THE DEEP SAFETIES — the tell. Tappable aid pre-call, ringed truth post-call.
  cov.safeties.forEach(sf => {
    const on = tapped.has(sf.id);
    const stroke = answered ? (cov.mof === 'open' ? TEAL : RED) : on ? AMBER : FE.navy;
    const sw = answered || on ? 3.5 : 1.5;
    dyn.push(<Circle key={`sf${sf.id}`} cx={sf.x} cy={sf.y} r={10} fill={FE.blue} stroke={stroke} strokeWidth={sw} />);
    dyn.push(fieldLabel(`sfl${sf.id}`, sf.x, sf.y + 22, sf.id, FE.defLabel));
    if (!answered) {
      // two-circle tap pattern: a transparent hit disc big enough for a thumb at field scale…
      dyn.push(<Circle key={`hit${sf.id}`} cx={sf.x} cy={sf.y} r={HIT_R} fill="transparent" onPress={() => toggleTap(sf.id)} />);
      // …plus a visible affordance ring so it's obvious these are the men to count.
      dyn.push(<Circle key={`aff${sf.id}`} cx={sf.x} cy={sf.y} r={19} fill="none" stroke={on ? AMBER : '#e8eef7'} strokeWidth={on ? 2.5 : 1.5} strokeDasharray="4 4" opacity={on ? 0.95 : 0.55} onPress={() => toggleTap(sf.id)} />);
    }
  });
  const field = <FootballField players={[]} overlay={dyn} showLos={false} />;

  // ── the count readout — neutral info, NEVER a grade (Box Count's rule) ──
  const countText = answered
    ? `${deep} deep safet${deep === 1 ? 'y' : 'ies'} · ${cov.name}`
    : `You've marked ${tapped.size}`;
  const countPill = answered || tapped.size > 0
    ? <View style={styles.countPill}><Text style={styles.countPillTxt} numberOfLines={1}>{countText}</Text></View>
    : null;
  const hintUnderField = !answered && tapped.size === 0
    ? <Text style={styles.underHint} numberOfLines={1}>{HINT_PRE}</Text>
    : null;

  // ── control fragments ──
  // Shells are numbered, not named: the coverage NAME is the payoff and lands in the verdict chip.
  const pills = <ScenarioPills wrap={landscape} items={COVERAGES.map((_c, i) => ({ key: String(i), name: `Shell ${i + 1}` }))} currentKey={String(idx)} onSelect={k => selectShell(Number(k))} />;
  const promptNode = (
    <View style={styles.prompt}>
      <Text style={styles.promptTxt}>
        {answered
          ? <>The safeties told you before the ball moved. <Text style={styles.promptB}>Count the deep men first, every time.</Text></>
          : <>Pre-snap. <Text style={styles.promptB}>How many safeties are deep — and what does that say about the middle?</Text></>}
      </Text>
      <Text style={styles.hintTxt}>{answered ? 'Reset, or take another shell.' : 'Two deep = the middle is soft. One deep = it\'s shut.'}</Text>
    </View>
  );
  const callBtn = (opt: Call, title: string, sub: string, alt?: boolean) => (
    <TouchableOpacity key={opt} style={[styles.callBtn, alt && styles.callBtnAlt, landscape && styles.callBtnLs]} activeOpacity={0.85} onPress={() => call(opt)}>
      <Text style={styles.callTitle}>{title}</Text>
      <Text style={styles.callSub}>{sub}</Text>
    </TouchableOpacity>
  );
  const callButtons = !answered ? (
    <View style={landscape ? styles.callCol : styles.callRow}>
      {callBtn('open', 'Middle OPEN', 'two-high — throw it up the middle')}
      {callBtn('closed', 'Middle CLOSED', 'one-high — work outside', true)}
    </View>
  ) : null;
  const legend = (
    <View style={styles.legend}>
      {([['Offense', FE.orange], ['Defense', FE.blue]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendTxt}>{lbl}</Text></View>
      ))}
      <View style={styles.legendItem}><View style={styles.legendRing} /><Text style={styles.legendTxt}>tap to count the deep men</Text></View>
    </View>
  );
  const verdictCard = answered ? (
    <View style={[styles.verdict, landscape && styles.verdictCompact]}>
      <View style={styles.tagRow}>
        <Text style={[styles.tag, correct ? styles.tagGood : styles.tagBad]}>{correct ? 'Good read' : 'Rethink it'}</Text>
        <Text style={[styles.tag, styles.tagMode]}>{cov.name}</Text>
      </View>
      <Text style={styles.vtitle} numberOfLines={landscape ? 2 : undefined}>{verdictTitleFor(cov, depth)}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{verdictBodyFor(cov, depth)}</Text>
    </View>
  ) : null;
  const foot = (
    <Text style={styles.foot}>Everything else is disguise. <Text style={styles.footB}>Count the deep safeties</Text> — one number, and the middle of the field opens or shuts.</Text>
  );
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetShell}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = (
    <View style={styles.lsPostRow}>
      {resetBtnC}
      {answered
        ? <NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextShell} />
        : <Text style={styles.hintTxt} numberOfLines={2}>Four shells. One question.</Text>}
    </View>
  );

  // ── LANDSCAPE: field-left via the shell; the 👆 hint lives UNDER the field (pointing up at the
  // safeties), the count readout rides the top-right slot, calls (pre) / verdict (post) go right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={FOOTBALL_FIELD_RATIO}
        belowFieldReserve={LS_HINT_RESERVE}
        pills={pills}
        topRight={countPill}
        field={field}
        belowField={<View style={styles.underWrap}>{hintUnderField}</View>}
        controls={answered ? <>{verdictCard}{legend}</> : <>{promptNode}{callButtons}{legend}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {field}
      <View style={styles.readoutRow}>
        {hintUnderField}
        {countPill}
      </View>
      {legend}
      {answered ? verdictCard : promptNode}
      {callButtons}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetShell}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>
        {answered && <NextButton visible variant="filled" label="Next shell →" onPress={nextShell} />}
      </View>
      {foot}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  underWrap: { height: LS_HINT_RESERVE, justifyContent: 'center' },
  underHint: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600' },
  readoutRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  countPill: { backgroundColor: FE.modeBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  countPillTxt: { color: FE.mode, fontSize: 12, fontWeight: '700' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptB: { color: t.accentText, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  callRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  callCol: { gap: 8 },
  callBtn: { flexGrow: 1, minWidth: 140, minHeight: 48, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  callBtnLs: { minWidth: 0 },
  callBtnAlt: { backgroundColor: FE.navy, borderWidth: 1, borderColor: '#2b3a5e' },
  callTitle: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  callSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendRing: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: AMBER },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: t.border },
  verdictCompact: { padding: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  tagGood: { backgroundColor: FE.goodBg, color: FE.good },
  tagBad: { backgroundColor: FE.badBg, color: FE.bad },
  tagMode: { backgroundColor: FE.modeBg, color: FE.mode },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  foot: { color: t.textSecondaryOnDark, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  footB: { fontWeight: '800' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
