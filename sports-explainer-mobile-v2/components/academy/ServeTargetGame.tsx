import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import { TennisCanvas, TennisCourtPaint } from './fields/TennisCourt';
import {
  SCENARIOS, bestOption, gradeColor, gradeTag,
  type STOption, type STScenario, type STGrade, type P, type Depth,
} from '../../lib/serveTarget';

// Serve Target — deuce-court serve placement. The teaching device is the RETURNER'S REACH FAN:
// a wedge showing what his feet can cover before the bounce. Pick a box and the serve doesn't stop
// at the bounce — it CARRIES past it into (or away from) him, and the fan compresses (he's jammed /
// in balance) or STRETCHES (he's lunging) to meet where the ball actually arrives. That's the whole
// read: shaded T ⇒ the wide ball lands outside the fan; a crowder ⇒ the body ball lands on top of
// him. The reveal draws the +1 GHOST ZONE the right serve opens (and, on a wrong pick, the door that
// was standing open). This module has an LED BOARD, so it paints its OWN scene (680×494: board strip
// + the tennis court group at y=74) and exports its own ratio, per the landscape port standard.
// Every scenario, verdict and COACH'S READ string is lib data (verbatim) — nothing here re-words it.
const SCENE_W = 680, SCENE_H = 494, COURT_Y = 74;
export const SERVE_TARGET_RATIO = SCENE_W / SCENE_H;

const F_BOLD = 'SpaceGrotesk_700Bold';
const LED_FONT = 'Courier New';
const OUTLINE = '#132743';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a';
const BALL_Y = '#D9E840', BALL_EDGE = '#98A61E';
const RETURNER = '#3B6FE0';
const HINT_IDLE = 'Read his feet first — the fan is what they can cover.';
const HINT_DONE = 'Reset, or serve the next point.';
const PROMPT_DONE = 'You’re not serving for an ace — you’re serving for the <b>geometry.</b>';

// Button copy (chrome, not verdict text — every judgement string comes from the lib).
const OPTION_UI: { key: STOption; title: string; sub: string; alt?: boolean }[] = [
  { key: 'wide', title: 'SERVE WIDE', sub: 'out to the sideline — drag him off the court' },
  { key: 't', title: 'SERVE DOWN THE T', sub: 'the shortest serve in tennis' },
  { key: 'body', title: 'SERVE AT THE BODY', sub: 'jam him — take the swing away' },
  { key: 'pace', title: 'HEAVY KICK SERVE', sub: 'height and spin — buy margin', alt: true },
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerpP = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const clampLblX = (x: number, txt: string) => Math.max(16 + txt.length * 2.9, Math.min(664 - txt.length * 2.9, x));

// Quadratic path bowed perpendicular to travel (the tennis spikes' shot geometry).
const qCtrl = (from: P, to: P, bow: number): P => {
  const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1;
  return [mx - (dy / len) * bow, my + (dx / len) * bow];
};
const qPathD = (from: P, to: P, bow: number): string => {
  const c = qCtrl(from, to, bow);
  return `M${from[0].toFixed(1)} ${from[1].toFixed(1)} Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${to[0].toFixed(1)} ${to[1].toFixed(1)}`;
};
const bezAt = (from: P, to: P, bow: number, k: number): P => {
  const c = qCtrl(from, to, bow), mk = 1 - k;
  return [mk * mk * from[0] + 2 * mk * k * c[0] + k * k * to[0], mk * mk * from[1] + 2 * mk * k * c[1] + k * k * to[1]];
};

// The serve CARRIES past the bounce: extend the srv0→tgt ray on to the returner's depth. Where that
// ray arrives relative to his feet IS the read — on his chest (jam) or a stride outside him (lunge).
function carryPoint(s: STScenario, g: STGrade): P {
  const [x0, y0] = s.srv0, [x1, y1] = g.tgt;
  const dx = x1 - x0, dy = y1 - y0;
  const k = dx !== 0 ? (Math.min(650, s.ret0[0] + 6) - x0) / dx : 1.4;
  const kk = Math.max(1.08, k);
  return [Math.min(654, x0 + dx * kk), Math.max(98, Math.min(342, y0 + dy * kk))];
}

type FanState = 'jam' | 'reach' | 'stretch';
interface FanShape { r: number; a1: number; a2: number }
// How the fan ends up: a ball on his chest CRAMPS it, a ball inside it lets him step in and swing,
// a ball beyond it drags it out of shape. One geometry call — no per-scenario special cases.
function fanResolve(s: STScenario, cp: P): { end: FanShape; state: FanState } {
  const f = s.fan;
  const dx = cp[0] - s.ret0[0], dy = cp[1] - s.ret0[1];
  const dist = Math.hypot(dx, dy);
  let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (ang < 0) ang += 360;
  const mid = (f.a1 + f.a2) / 2, span = f.a2 - f.a1;
  if (dist < 38) return { end: { r: 46, a1: mid - span * 0.22, a2: mid + span * 0.22 }, state: 'jam' };
  const inAngle = ang >= f.a1 - 6 && ang <= f.a2 + 6;
  if (inAngle && dist <= f.r + 6) {
    return { end: { r: Math.max(54, dist * 0.9), a1: mid - span * 0.34, a2: mid + span * 0.34 }, state: 'reach' };
  }
  return { end: { r: Math.max(f.r, dist + 12), a1: Math.min(f.a1, ang - 8), a2: Math.max(f.a2, ang + 8) }, state: 'stretch' };
}
const FAN_NOTE: Record<FanState, string> = {
  jam: 'on his body — no swing room',
  reach: 'inside his reach — he swings in balance',
  stretch: 'outside his reach — he’s lunging',
};

function fanPath(c: P, r: number, a1: number, a2: number): string {
  const r1 = (a1 * Math.PI) / 180, r2 = (a2 * Math.PI) / 180;
  const p1: P = [c[0] + r * Math.cos(r1), c[1] + r * Math.sin(r1)];
  const p2: P = [c[0] + r * Math.cos(r2), c[1] + r * Math.sin(r2)];
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  return `M${c[0]} ${c[1]} L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 ${large} 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} Z`;
}

// Beat boundaries (ms). A fault ends the point at the bounce — no carry, no rally.
function times(g: STGrade) {
  return g.fault
    ? { serveEnd: 620, carryEnd: 620, replyStart: 620, replyEnd: 980, fin: 980, ghost: 1440, total: 2140 }
    : { serveEnd: 620, carryEnd: 1140, replyStart: 1340, replyEnd: 2060, fin: 2060, ghost: 2540, total: 3260 };
}

type Phase = 'idle' | 'run' | 'done';

export default function ServeTargetGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<STOption | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [e, setE] = useState(0);
  const rafRef = useRef<number | null>(null);

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const g = chosen ? s.grade[chosen] ?? null : null;
  const answered = phase === 'done';
  const T = g ? times(g) : null;

  // ── one rAF owner — cancelled on reset, on scenario change, on unmount ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => { stopLoop(); setIdx(i); setPhase('idle'); setChosen(null); setE(0); };
  const resetPoint = () => resetTo(idx);
  const nextScenario = () => resetTo((idx + 1) % SCENARIOS.length);

  const choose = (opt: STOption) => {
    if (phase !== 'idle' || !s.grade[opt]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt); setPhase('run'); setE(0);
    const tt = times(s.grade[opt]!);
    let revealed = false;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const el = Math.min(now - t0, tt.total);
      setE(el);
      if (!revealed && el >= tt.fin) { revealed = true; setPhase('done'); }
      if (el < tt.total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── the court layer, a pure function of (scenario, chosen, e) ──
  const carry = g && !g.fault ? carryPoint(s, g) : null;
  const fan = carry ? fanResolve(s, carry) : null;
  const fk = T && fan ? clamp01((e - T.serveEnd) / Math.max(1, T.carryEnd - T.serveEnd)) : 0;
  const fanNow: FanShape = fan
    ? { r: s.fan.r + (fan.end.r - s.fan.r) * fk, a1: s.fan.a1 + (fan.end.a1 - s.fan.a1) * fk, a2: s.fan.a2 + (fan.end.a2 - s.fan.a2) * fk }
    : { r: s.fan.r, a1: s.fan.a1, a2: s.fan.a2 };
  const fanHot = !!fan && fk > 0.55 && fan.state !== 'reach';

  const els: ReactNode[] = [];
  // the deuce service box you're aiming into (net → service line, top half)
  els.push(<Rect key="box" x={326} y={120} width={140} height={90} fill="#F4F4EE" opacity={answered ? 0.05 : 0.1} />);

  // reveal: the +1 ghost zone (and, on a wrong pick, the door that was open)
  const best = bestOption(s);
  const bestG = s.grade[best]!;
  if (T && g && e >= T.ghost) {
    const wrong = g.k !== 'good';
    const zone = wrong ? bestG.zone : g.zone;
    if (zone) {
      els.push(<Rect key="zone" x={zone[0]} y={zone[1]} width={zone[2]} height={zone[3]} fill={TEAL} fillOpacity={0.14}
        stroke={TEAL} strokeWidth={2} strokeDasharray="6 5" opacity={0.95} />);
      if (wrong) els.push(<OutlinedLabel key="zoneL" x={clampLblX(zone[0] + zone[2] / 2, bestG.end.lab[2])} y={zone[1] + zone[3] / 2 + 4} txt={bestG.end.lab[2]} fill="#7be0bf" size={10.5} />);
    }
    if (wrong) {
      els.push(<Circle key="bring" cx={bestG.tgt[0]} cy={bestG.tgt[1]} r={17} fill="none" stroke={TEAL} strokeWidth={2.5} strokeDasharray="5 5" opacity={0.95} />);
    }
  }

  // the returner's reach fan (drawn under the actors) + its label
  els.push(<Path key="fan" d={fanPath(s.ret0, fanNow.r, fanNow.a1, fanNow.a2)} fill={fanHot ? AMBER : RETURNER}
    fillOpacity={0.16} stroke={fanHot ? AMBER : RETURNER} strokeWidth={2} opacity={0.85}
    strokeDasharray={fan?.state === 'stretch' && fk > 0.55 ? '6 5' : undefined} />);
  if (!chosen) {
    els.push(<OutlinedLabel key="fanL" x={clampLblX(s.ret0[0] - fanNow.r * 0.55, s.fanLbl)} y={s.ret0[1] + 44} txt={s.fanLbl} fill="#bcd3ff" size={10} />);
  } else if (fan && fk >= 1) {
    els.push(<OutlinedLabel key="fanN" x={clampLblX(s.ret0[0] - 70, FAN_NOTE[fan.state])} y={s.ret0[1] + 44} txt={FAN_NOTE[fan.state]} fill={fan.state === 'reach' ? '#bcd3ff' : '#ffe1b3'} size={10} />);
  }

  // flight paths + ball
  let ballP: P | null = null, ballS = 1;
  if (T && g) {
    if (e < T.serveEnd) {
      const k = clamp01(e / T.serveEnd);
      ballP = bezAt(s.srv0, g.tgt, -16, k); ballS = 1 + 0.35 * Math.sin(Math.PI * k);
      els.push(<Path key="sp" d={qPathD(s.srv0, g.tgt, -16)} fill="none" stroke="#F4F4EE" strokeWidth={2} opacity={0.4} strokeDasharray="5 6" />);
    } else {
      els.push(<Path key="sp" d={qPathD(s.srv0, g.tgt, -16)} fill="none" stroke="#F4F4EE" strokeWidth={2} opacity={0.4} strokeDasharray="5 6" />);
      if (g.fault) {
        ballP = g.tgt;
        const bp = clamp01((e - T.serveEnd) / 600);
        if (bp < 1) els.push(<Circle key="fb" cx={g.tgt[0]} cy={g.tgt[1]} r={8 + 18 * bp} fill="none" stroke={RED} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
        els.push(<Path key="fx1" d={`M${g.tgt[0] - 11} ${g.tgt[1] - 11} L${g.tgt[0] + 11} ${g.tgt[1] + 11}`} stroke={RED} strokeWidth={3.5} strokeLinecap="round" />);
        els.push(<Path key="fx2" d={`M${g.tgt[0] + 11} ${g.tgt[1] - 11} L${g.tgt[0] - 11} ${g.tgt[1] + 11}`} stroke={RED} strokeWidth={3.5} strokeLinecap="round" />);
      } else if (carry) {
        els.push(<Circle key="bnc" cx={g.tgt[0]} cy={g.tgt[1]} r={6} fill="none" stroke="#F4F4EE" strokeWidth={1.8} opacity={0.75} />);
        els.push(<Path key="cp" d={qPathD(g.tgt, carry, 6)} fill="none" stroke="#F4F4EE" strokeWidth={2} opacity={0.45} strokeDasharray="4 5" />);
        if (e < T.carryEnd) {
          const k = clamp01((e - T.serveEnd) / (T.carryEnd - T.serveEnd));
          ballP = bezAt(g.tgt, carry, 6, k); ballS = 1 + 0.12 * Math.sin(Math.PI * k);
        } else if (e < T.replyStart) {
          ballP = carry;
        } else {
          const k = clamp01((e - T.replyStart) / (T.replyEnd - T.replyStart));
          ballP = bezAt(carry, g.end.ball, 22, k); ballS = 1 + 0.3 * Math.sin(Math.PI * k);
          els.push(<Path key="rp" d={qPathD(carry, g.end.ball, 22)} fill="none" stroke={g.k === 'good' ? '#bfe9da' : '#ffb3ae'} strokeWidth={2} opacity={0.5} strokeDasharray="5 6" />);
        }
        if (e >= T.carryEnd) {
          const bp = clamp01((e - T.carryEnd) / 600);
          if (bp < 1) els.push(<Circle key="cb" cx={carry[0]} cy={carry[1]} r={8 + 16 * bp} fill="none" stroke={fan?.state === 'reach' ? '#dfe5f0' : AMBER} strokeWidth={3} opacity={0.85 * (1 - bp)} />);
        }
        if (e >= T.replyEnd) {
          const bp = clamp01((e - T.replyEnd) / 600);
          const col = gradeColor(g.k);
          if (bp < 1) els.push(<Circle key="rb" cx={g.end.ball[0]} cy={g.end.ball[1]} r={8 + 18 * bp} fill="none" stroke={col} strokeWidth={3} opacity={0.9 * (1 - bp)} />);
        }
      }
    }
  } else {
    ballP = [s.srv0[0] + 12, s.srv0[1] - 10];
  }

  // actors: the returner runs to his end position, you recover to yours
  const oppP: P = T && g && !g.fault ? lerpP(s.ret0, g.end.opp, clamp01((e - T.serveEnd - 120) / 660)) : s.ret0;
  const youP: P = T && g && !g.fault ? lerpP(s.srv0, g.end.you, clamp01((e - T.serveEnd) / 700)) : s.srv0;
  els.push(<Circle key="opp" cx={oppP[0]} cy={oppP[1]} r={11} fill={RETURNER} stroke="#0d1b3e" strokeWidth={2} />);
  els.push(<OutlinedLabel key="oppL" x={oppP[0]} y={oppP[1] - 17} txt="returner" fill="#bcd3ff" size={10.5} />);
  els.push(<Circle key="you" cx={youP[0]} cy={youP[1]} r={11} fill={FE.orange} stroke="#0d1b3e" strokeWidth={2} />);
  els.push(<OutlinedLabel key="youL" x={youP[0]} y={youP[1] - 17} txt="YOU" fill="#fff" size={10.5} />);
  if (ballP) els.push(<TennisBall key="ball" p={ballP} s={ballS} />);

  // the outcome label (lib copy, at its authored coordinates)
  if (T && g && e >= (g.fault ? T.serveEnd : T.replyEnd)) {
    const lab = g.end.lab;
    els.push(<OutlinedLabel key="endL" x={clampLblX(lab[0], lab[2])} y={lab[1]} txt={lab[2]}
      fill={g.k === 'good' ? '#bfe9da' : g.k === 'ok' ? '#ffe1b3' : '#ffb3ae'} size={11} />);
  }

  const boardMsg = T && g && e >= T.fin ? { k: g.k, msg: g.bmsg, npt: g.npt ?? null } : null;
  const field = (
    <TennisCanvas viewW={SCENE_W} viewH={SCENE_H} bg="#3E7A4C">
      <LedBoard s={s} msg={boardMsg} />
      <G y={COURT_Y}>
        <TennisCourtPaint surface="hard" />
        {els}
      </G>
    </TennisCanvas>
  );

  // ── chrome ──
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={k => resetTo(Number(k))} />;
  const promptText = answered ? PROMPT_DONE : s.intro;
  const promptBlock = (
    <View style={styles.prompt}>
      <BoldText text={promptText} style={styles.promptTxt} />
      <Text style={styles.hintTxt}>{answered ? HINT_DONE : HINT_IDLE}</Text>
    </View>
  );
  const judgeBtns = (
    <View style={styles.judgeCol}>
      {OPTION_UI.filter(o => !!s.grade[o.key]).map(o => (
        <TouchableOpacity key={o.key} style={[styles.judgeBtn, o.alt && styles.judgeBtnAlt, phase !== 'idle' && styles.judgeBtnDim]}
          activeOpacity={0.85} disabled={phase !== 'idle'} onPress={() => choose(o.key)}>
          <Text style={styles.judgeTitle}>{o.title}</Text>
          <Text style={styles.judgeSub}>{o.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={styles.legend}>
      {([['You', FE.orange], ['Returner', RETURNER], ['Ball', BALL_Y]] as [string, string][]).map(([l, c]) => (
        <View key={l} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={styles.legendTxt}>{l}</Text></View>
      ))}
      <View style={styles.legendItem}><View style={[styles.legendSq, { backgroundColor: RETURNER, opacity: 0.5 }]} /><Text style={styles.legendTxt}>Reach fan — what his feet cover before the bounce</Text></View>
      <View style={styles.legendItem}><View style={[styles.legendSq, styles.legendDashed, { borderColor: TEAL }]} /><Text style={styles.legendTxt}>Teal = the +1 zone the right serve opens</Text></View>
      <Text style={styles.legendMuted}>the serve carries PAST the bounce — where it reaches him is the read</Text>
    </View>
  );
  const verdictCard = answered && g ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, g.k === 'good' ? styles.vtagGood : g.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>{gradeTag(g.k)}</Text>
      <Text style={styles.vtitle}>{g.t}</Text>
      <Text style={styles.vbody}>{g.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPoint}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{resetBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} /></View>
  ) : undefined;

  // ── LANDSCAPE: court left via the shell; prompt + boxes (pre) / verdict (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={SERVE_TARGET_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={answered ? <>{promptBlock}{verdictCard}{legend}</> : <>{promptBlock}{judgeBtns}{legend}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {field}
      {legend}
      {promptBlock}
      {answered ? verdictCard : judgeBtns}
      {answered && (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPoint}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>
          <NextButton visible variant="filled" label="Next point →" onPress={nextScenario} />
        </View>
      )}
    </ScrollView>
  );
}

// ── small scene pieces ──
// Label with a dark outline (react-native-svg has no paint-order): outline pass, then fill pass.
function OutlinedLabel({ x, y, txt, fill, size }: { x: number; y: number; txt: string; fill: string; size: number }) {
  const common = { x, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <>
      <SvgText {...common} fill="none" stroke={OUTLINE} strokeWidth={3.5} strokeLinejoin="round">{txt}</SvgText>
      <SvgText {...common} fill={fill}>{txt}</SvgText>
    </>
  );
}

function TennisBall({ p, s }: { p: P; s: number }) {
  return (
    <G x={p[0]} y={p[1]} scale={s}>
      <Circle cx={0} cy={0} r={5} fill={BALL_Y} stroke={BALL_EDGE} strokeWidth={1} />
      <Path d="M-4 -2.4 Q0 0 -4 2.4" fill="none" stroke="#fff" strokeWidth={1} />
      <Path d="M4 -2.4 Q0 0 4 2.4" fill="none" stroke="#fff" strokeWidth={1} />
    </G>
  );
}

// Stadium LED board: the score sets the stakes (break point / second serve), so it gets the strip.
// On resolve it flips to the grade's board message + the new score.
function LedBoard({ s, msg }: { s: STScenario; msg: { k: 'good' | 'ok' | 'bad'; msg: string; npt: string | null } | null }) {
  const bx = 20, by = 6, bw = 640, bh = 64;
  const frame = (
    <>
      <Rect x={bx + 60} y={by + bh} width={6} height={22} fill="#3a3a3a" />
      <Rect x={bx + bw - 66} y={by + bh} width={6} height={22} fill="#3a3a3a" />
      <Rect x={bx} y={by} width={bw} height={bh} rx={8} fill="#14181f" stroke="#2b3340" strokeWidth={2} />
    </>
  );
  if (msg) {
    const screen = msg.k === 'good' ? '#0a2a1c' : msg.k === 'ok' ? '#2a2210' : '#2a0e0e';
    const color = msg.k === 'good' ? '#3ff0a8' : msg.k === 'ok' ? '#ffd23f' : '#ff6a6a';
    const hasSub = msg.npt != null;
    return (
      <G>
        {frame}
        <Rect x={bx + 8} y={by + 7} width={bw - 16} height={bh - 14} rx={4} fill={screen} />
        <SvgText x={bx + bw / 2} y={by + (hasSub ? 38 : 44)} textAnchor="middle" fontFamily={LED_FONT} fontSize={msg.msg.length > 12 ? 30 : 38} fontWeight="800" fill={color} letterSpacing={2}>{msg.msg}</SvgText>
        {hasSub && <SvgText x={bx + bw / 2} y={by + 54} textAnchor="middle" fontFamily={LED_FONT} fontSize={9} fontWeight="700" fill="#e8edf5" letterSpacing={1.5}>{`SCORE NOW  ${msg.npt}`}</SvgText>}
      </G>
    );
  }
  const b = s.board;
  const cells: { cap: string; val: string; color: string; screen: string | null }[] = [
    { cap: 'POINT SCORE (YOU FIRST)', val: b.pt, color: '#ffd23f', screen: '#1c1808' },
    { cap: 'GAMES', val: b.games, color: '#e8edf5', screen: null },
    ...(b.sets ? [{ cap: 'SETS', val: b.sets, color: '#e8edf5', screen: null }] : []),
    { cap: 'SERVE', val: b.srv, color: '#e8edf5', screen: null },
    { cap: b.note.cap, val: b.note.val, color: b.note.warn ? '#ff6a6a' : '#e8edf5', screen: b.note.warn ? '#2a0e0e' : null },
  ];
  const inner = bw - 16, gap = 6;
  const cw = (inner - gap * (cells.length - 1)) / cells.length;
  return (
    <G>
      {frame}
      {cells.map((c, i) => {
        const cx0 = bx + 8 + i * (cw + gap), cx = cx0 + cw / 2;
        const fs = c.val.length > 12 ? 10 : c.val.length > 8 ? 12 : 16;
        return (
          <G key={i}>
            <Rect x={cx0} y={by + 7} width={cw} height={bh - 14} rx={4} fill={c.screen ?? '#0c1016'} />
            <SvgText x={cx} y={by + 18} textAnchor="middle" fontFamily={LED_FONT} fontSize={7} fontWeight="800" fill="#5a6b7a" letterSpacing={0.8}>{c.cap}</SvgText>
            <SvgText x={cx} y={by + 45} textAnchor="middle" fontFamily={LED_FONT} fontSize={fs} fontWeight="800" fill={c.color} letterSpacing={fs < 12 ? 0.5 : 1.5}>{c.val}</SvgText>
          </G>
        );
      })}
    </G>
  );
}

// Prompt copy keeps the lib's <b>…</b> markers; render them as amber bold spans.
function BoldText({ text, style }: { text: string; style: object }) {
  const parts = text.split(/<\/?b>/);
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={{ color: AMBER, fontWeight: '800' }}>{p}</Text> : p))}</Text>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  judgeCol: { gap: 8 },
  judgeBtn: { backgroundColor: FE.orange, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  judgeBtnAlt: { backgroundColor: '#2b3f6e' },
  judgeBtnDim: { opacity: 0.4 },
  judgeTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2, textAlign: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendSq: { width: 10, height: 10, borderRadius: 2 },
  legendDashed: { borderWidth: 2, backgroundColor: 'transparent' },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendMuted: { color: t.textSecondaryOnDark, fontSize: 11, opacity: 0.7 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  ghostBtnC: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
