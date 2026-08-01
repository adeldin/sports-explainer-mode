import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { Rect, Line, Circle, Ellipse, Path, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { FootballField, LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FOOTBALL_FIELD_RATIO, FE } from '../FieldEngine';
import {
  SCEN, FDC, NOSE, yardX, goEndX, fgEnd, puntEnd, isTouchdownTry,
  type CallOption, type GradeKind, type Depth, type Pt,
} from '../../lib/fourthDownCall';

// Fourth Down Call — go / field goal / punt judgment module. The situation IS the decision, so it
// gets the big board: a stadium LED scoreboard band ABOVE the field (inside the module's SVG area,
// verbatim from the spike) showing DOWN & DISTANCE · BALL ON · SCORE · CLOCK; on the outcome the
// whole board takes over with one message (TOUCHDOWN! / TURNOVER ON DOWNS / FG IS GOOD / NO GOOD /
// PUNT DOWNED) and the score cell adds the points. The measurement rule is drawn, not told: the
// ball's NOSE decides it — past the amber line or not. Grades + 4-depth reads verbatim (data lib).
//
// The module renders inside the shared FootballField canvas (the coordinate system + shell contract);
// the fourth-down scene needs its own full-100-yard paint (both end zones, goal post, yardX scale) +
// the scoreboard strip, so the overlay repaints the canvas — FootballField stays the sizing/ratio
// owner, the module owns every drawn pixel (players=[], showLos={false}).
const F_BOLD = 'SpaceGrotesk_700Bold';
const F_LED = Platform.OS === 'ios' ? 'Courier New' : 'monospace';
const TEAL = '#14B8A6', AMBER = '#F5A623', RED = '#e24b4a', GREEN = '#16a37f';
const GO_MS = 700, FG_MS = 1000, PUNT_MS = 1100, POST_MS = 1100; // motion + the celebration/flicker window
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const L = (a: Pt, b: Pt, f: number): Pt => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });

type Phase = 'idle' | 'run' | 'done';

// Outlined field label (paint-order:stroke ported as a two-pass draw), with the spike's x clamp so
// long labels never run off the canvas.
function fieldLabel(key: string, x: number, y: number, text: string, fill: string, size = 11): ReactNode {
  const cx = Math.max(30 + text.length * 3.2, Math.min(650 - text.length * 3.2, x));
  const common = { x: cx, y, textAnchor: 'middle' as const, fontSize: size, fontFamily: F_BOLD };
  return (
    <G key={key}>
      <SvgText {...common} fill="none" stroke="#16331b" strokeWidth={3} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </G>
  );
}

// The laced football (FTOM standard — never a white dot). Nose-first when level; kicks tumble.
function lacedBall(key: string, x: number, y: number, ang: number): ReactNode {
  return (
    <G key={key} x={x} y={y} rotation={ang}>
      <Ellipse cx={0} cy={0} rx={8} ry={5} fill="#7a4a1e" stroke="#5a3512" strokeWidth={1} />
      <Line x1={-5} y1={0} x2={5} y2={0} stroke="#f3ead8" strokeWidth={1.4} strokeLinecap="round" />
      {[-2, 0, 2].map(dx => <Line key={`lc${dx}`} x1={dx} y1={-2.2} x2={dx} y2={2.2} stroke="#f3ead8" strokeWidth={1.2} />)}
    </G>
  );
}

// One LED text cell (Courier LED look, letter-spaced).
function led(key: string, x: number, y: number, txt: string, fs: number, fill: string, ls?: string): ReactNode {
  return (
    <SvgText key={key} x={x} y={y} textAnchor="middle" fontFamily={F_LED} fontWeight="800" fontSize={fs} fill={fill} letterSpacing={ls ?? '1'}>
      {txt}
    </SvgText>
  );
}

export default function FourthDownCallGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [chosen, setChosen] = useState<CallOption | null>(null);
  const [level, setLevel] = useState<Level>(appLevel);
  const [e, setE] = useState(0);                     // elapsed ms inside the resolve timeline
  const rafRef = useRef<number | null>(null);
  const revealedRef = useRef(false);

  const s = SCEN[idx];
  const losX = yardX(s.yards), fdX = yardX(s.yards + s.toGo);
  const td = isTouchdownTry(s);
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const answered = phase === 'done';

  // ── one rAF owner — stopLoop cancels it (on reset, on scenario change, on unmount) ──
  const stopLoop = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const resetTo = (i: number) => {
    stopLoop();
    revealedRef.current = false;
    setIdx(i); setPhase('idle'); setChosen(null); setE(0);
  };
  const resetPlay = () => resetTo(idx);
  const selectScenario = (i: number) => resetTo(i);
  const nextScenario = () => resetTo((idx + 1) % SCEN.length);

  // ── the resolve timeline: one loop drives ball motion, the measurement, the board flip, the fx ──
  const motionMs = chosen === 'go' ? GO_MS : chosen === 'fg' ? FG_MS : PUNT_MS;
  const choose = (opt: CallOption) => {
    if (phase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    revealedRef.current = false;
    setChosen(opt); setPhase('run'); setE(0);
    const mMs = opt === 'go' ? GO_MS : opt === 'fg' ? FG_MS : PUNT_MS;
    const total = mMs + POST_MS;
    let t0: number | null = null;
    const loop = (now: number) => {
      if (t0 == null) t0 = now;
      const el = now - t0;
      if (el >= mMs && !revealedRef.current) { revealedRef.current = true; setPhase('done'); } // verdict at the landing
      setE(Math.min(el, total));
      if (el < total) rafRef.current = requestAnimationFrame(loop);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── derive the whole scene from (scenario, chosen, e) — deterministic, no second animation owner ──
  const g = chosen ? s.grade[chosen] : null;
  const col = g ? (g.k === 'good' ? TEAL : g.k === 'ok' ? AMBER : RED) : TEAL;
  const running = chosen != null && phase !== 'idle';
  const k = running ? clamp01(e / motionMs) : 0;
  const landed = running && e >= motionMs;
  const fe = landed ? e - motionMs : 0;

  // Ball path + outcome, per option (geometry verbatim from the spike; the NOSE math lives in the lib).
  let ballPos: Pt = { x: losX, y: FDC.MIDY }, ballAng = 0;
  let outcome: { good: boolean; celebrate: 'good' | 'bad' | 'none'; pulse: { pos: Pt; color: string } | null; label: { pos: Pt; text: string; color: string }; flip: { state: GradeKind; msg: string; newYou: number | null } } | null = null;
  if (chosen === 'go' && g) {
    const works = s.goWorks && s.answer === 'go';
    const end: Pt = { x: goEndX(works, fdX), y: FDC.MIDY };
    ballPos = L({ x: losX, y: FDC.MIDY }, end, k); ballAng = 0;   // the surge: flat, nose-first
    outcome = {
      good: works, celebrate: works ? 'good' : 'bad',
      pulse: { pos: { x: fdX, y: FDC.MIDY }, color: works ? TEAL : RED },   // the measurement, on the line itself
      label: {
        pos: { x: end.x, y: FDC.MIDY - 26 },
        text: works ? (td ? 'TOUCHDOWN — the nose is in' : 'FIRST DOWN — the nose is past') : 'STOPPED — the nose is short',
        color: works ? '#bfe9da' : '#ffb3ae',
      },
      flip: works
        ? { state: 'good', msg: td ? 'TOUCHDOWN!' : '1ST DOWN!', newYou: td ? s.board.you + 6 : null }
        : { state: 'bad', msg: 'TURNOVER ON DOWNS', newYou: null },
    };
  } else if (chosen === 'fg' && g) {
    const makes = s.fgGood;
    const end = fgEnd(makes, losX);
    const from: Pt = { x: losX, y: FDC.MIDY };
    const mx = (from.x + end.x) / 2, my = Math.min(from.y, end.y) - 70;   // kicks tumble END OVER END
    const mk = 1 - k;
    ballPos = { x: mk * mk * from.x + 2 * mk * k * mx + k * k * end.x, y: mk * mk * from.y + 2 * mk * k * my + k * k * end.y };
    ballAng = k * 720;
    outcome = makes
      ? {
          good: g.k !== 'bad', celebrate: g.k === 'good' ? 'good' : 'none',
          pulse: g.k === 'good' ? null : { pos: end, color: AMBER },
          label: { pos: { x: end.x, y: FDC.MIDY - 26 }, text: 'GOOD — +3', color: g.k === 'good' ? '#bfe9da' : '#ffe1b3' },
          flip: { state: g.k === 'ok' ? 'ok' : 'good', msg: 'FG IS GOOD', newYou: s.board.you + 3 },
        }
      : {
          good: false, celebrate: 'bad', pulse: null,
          label: { pos: { x: end.x, y: FDC.MIDY - 26 }, text: 'NO GOOD — their ball at the spot', color: '#ffb3ae' },
          flip: { state: 'bad', msg: 'NO GOOD', newYou: null },
        };
  } else if (chosen === 'punt' && g) {
    const end = puntEnd(losX);
    const from: Pt = { x: losX, y: FDC.MIDY };
    const mx = (from.x + end.x) / 2, my = Math.min(from.y, end.y) - 85;
    const mk = 1 - k;
    ballPos = { x: mk * mk * from.x + 2 * mk * k * mx + k * k * end.x, y: mk * mk * from.y + 2 * mk * k * my + k * k * end.y };
    ballAng = k * 720;
    outcome = {
      good: g.k === 'good', celebrate: g.k === 'good' ? 'good' : 'none',
      pulse: g.k === 'good' ? null : { pos: end, color: g.k === 'ok' ? AMBER : RED },
      label: { pos: { x: end.x, y: FDC.MIDY - 26 }, text: 'downed — their ball here', color: g.k === 'good' ? '#bfe9da' : '#ffe1b3' },
      flip: { state: g.k, msg: 'PUNT DOWNED', newYou: null },
    };
  }

  // ── STADIUM SCOREBOARD (verbatim geometry). Idle: four LED cells. On the outcome: the message
  // takes the WHOLE board, with the real-scoreboard flicker (dim → flip → settle) derived from fe. ──
  const boardEls: ReactNode[] = [];
  {
    const { boardX: bx, boardY: by, boardW: bw, boardH: bh } = FDC;
    const flick = landed
      ? (fe < 90 ? { msg: false, op: 0.35 } : fe < 240 ? { msg: true, op: 1 } : fe < 360 ? { msg: true, op: 0.75 } : { msg: true, op: 1 })
      : { msg: false, op: 1 };
    const inner: ReactNode[] = [];
    inner.push(<Rect key="lgL" x={bx + 60} y={by + bh} width={6} height={FDC.FY - by - bh} fill="#3a3a3a" />);
    inner.push(<Rect key="lgR" x={bx + bw - 66} y={by + bh} width={6} height={FDC.FY - by - bh} fill="#3a3a3a" />);
    inner.push(<Rect key="bd" x={bx} y={by} width={bw} height={bh} rx={8} fill="#14181f" stroke="#2b3340" strokeWidth={2} />);
    if (!flick.msg || !outcome) {
      const b = s.board;
      const cells: { cap: string; val?: string; color?: string; screen?: string; score?: boolean }[] = [
        { cap: 'DOWN & DISTANCE', val: b.dd, color: '#ffd23f', screen: '#1c1808' },
        { cap: 'BALL ON', val: b.spot, color: '#e8edf5' },
        { cap: 'SCORE', score: true },
        { cap: b.note ? `CLOCK · ${b.note}` : 'CLOCK', val: b.clock, color: '#e8edf5' },
      ];
      cells.forEach((c, i) => {
        const cx0 = bx + 8 + i * 157, cw = 150, cx = cx0 + cw / 2;
        inner.push(<Rect key={`cs${i}`} x={cx0} y={by + 7} width={cw} height={bh - 14} rx={4} fill={c.screen ?? '#0c1016'} />);
        inner.push(led(`cc${i}`, cx, by + 18, c.cap, 8, '#5a6b7a'));
        if (c.score) {
          // SCORE on top, numbers big, YOU / THEM under their own numbers
          inner.push(led(`sy${i}`, cx - 34, by + 41, String(b.you), 16, '#e8edf5'));
          inner.push(led(`sd${i}`, cx, by + 40, '–', 13, '#5a6b7a'));
          inner.push(led(`st${i}`, cx + 34, by + 41, String(b.them), 16, '#e8edf5'));
          inner.push(led(`syl${i}`, cx - 34, by + 53, 'YOU', 7, '#5a6b7a'));
          inner.push(led(`stl${i}`, cx + 34, by + 53, 'THEM', 7, '#5a6b7a'));
        } else if (c.val) {
          const fs = c.val.length > 12 ? 10 : c.val.length > 8 ? 13 : 17;
          inner.push(led(`cv${i}`, cx, by + 45, c.val, fs, c.color!, fs < 12 ? '0.5' : '1.5'));
        }
      });
    } else {
      // the outcome takes the WHOLE board — one message across all four screens
      const st = outcome.flip.state;
      const screen = st === 'good' ? '#0a2a1c' : st === 'ok' ? '#2a2210' : '#2a0e0e';
      const color = st === 'good' ? '#3ff0a8' : st === 'ok' ? '#ffd23f' : '#ff6a6a';
      inner.push(<Rect key="ms" x={bx + 8} y={by + 7} width={bw - 16} height={bh - 14} rx={4} fill={screen} />);
      const hasSub = outcome.flip.newYou != null;
      const fs = outcome.flip.msg.length > 12 ? 30 : 38;
      inner.push(led('mm', bx + bw / 2, by + (hasSub ? 38 : 44), outcome.flip.msg, fs, color, '2'));
      if (hasSub) {
        inner.push(
          <SvgText key="msub" x={bx + bw / 2} y={by + 54} textAnchor="middle" fontFamily={F_LED} fontWeight="700" fontSize={9} fill="#e8edf5" letterSpacing="1.5">
            {`SCORE NOW  YOU ${outcome.flip.newYou} – THEM ${s.board.them}`}
          </SvgText>,
        );
      }
    }
    boardEls.push(<G key="board" opacity={flick.op}>{inner}</G>);
  }

  // ── the field overlay: full-100-yard paint (verbatim X geometry) + board + dynamic layer ──
  const dyn: ReactNode[] = [];
  // Repaint the canvas: flat turf, both end zones, 10 stripes at 54.8px, yard lines, boundary, posts.
  dyn.push(<Rect key="bg" x={0} y={0} width={680} height={380} fill={FE.turfD} />);
  dyn.push(<Rect key="ezL" x={20} y={FDC.FY} width={46} height={FDC.FH} fill="#24512f" />);
  dyn.push(<Rect key="ezR" x={614} y={FDC.FY} width={46} height={FDC.FH} fill="#24512f" />);
  for (let i = 0; i < 10; i++) {
    dyn.push(<Rect key={`st${i}`} x={66 + i * 54.8} y={FDC.FY} width={54.8} height={FDC.FH} fill={i % 2 ? FE.turfD : FE.turfL} />);
  }
  for (let i = 0; i <= 10; i++) {
    dyn.push(<Line key={`yd${i}`} x1={66 + i * 54.8} y1={FDC.FY} x2={66 + i * 54.8} y2={FDC.FY + FDC.FH} stroke={FE.chalk} strokeWidth={1.2} opacity={0.7} />);
  }
  dyn.push(<Rect key="bound" x={20} y={FDC.FY} width={640} height={FDC.FH} fill="none" stroke={FE.chalk} strokeWidth={2} opacity={0.7} />);
  dyn.push(<Line key="post" x1={614} y1={FDC.MIDY - 18} x2={614} y2={FDC.MIDY + 18} stroke="#fff" strokeWidth={4} opacity={0.95} />);
  // the two lines that define the decision: blue = line of scrimmage, amber = the line to gain
  dyn.push(<Line key="los" x1={losX} y1={FDC.FY} x2={losX} y2={FDC.FY + FDC.FH} stroke={FE.losLine} strokeWidth={3} opacity={0.95} />);
  dyn.push(<Line key="fd" x1={fdX} y1={FDC.FY} x2={fdX} y2={FDC.FY + FDC.FH} stroke={AMBER} strokeWidth={3} opacity={0.95} />);
  dyn.push(fieldLabel('fdl', fdX, FDC.FY - 4, td ? 'goal line' : 'line to gain', '#ffe1b3', 10));
  boardEls.forEach(n => dyn.push(n));
  // the surge path (go only), drawn under the ball
  if (chosen === 'go' && running) {
    const works = s.goWorks && s.answer === 'go';
    dyn.push(<Line key="path" x1={losX} y1={FDC.MIDY} x2={goEndX(works, fdX)} y2={FDC.MIDY} stroke={col} strokeWidth={5} strokeLinecap="round" opacity={0.9} />);
  }
  // the measurement pulse on the line itself
  if (landed && outcome?.pulse) {
    const p = clamp01(fe / 700);
    if (p < 1) dyn.push(<Circle key="pulse" cx={outcome.pulse.pos.x} cy={outcome.pulse.pos.y} r={6 + 20 * p} fill="none" stroke={outcome.pulse.color} strokeWidth={3} opacity={0.9 * (1 - p)} />);
  }
  dyn.push(lacedBall('ball', ballPos.x, ballPos.y, ballAng));
  // celebration layer
  if (landed && outcome) {
    const pos = chosen === 'go' ? { x: ballPos.x, y: ballPos.y } : outcome.label.pos.y === FDC.MIDY - 26 ? { x: outcome.label.pos.x, y: FDC.MIDY } : ballPos;
    if (outcome.celebrate === 'good') {
      const p = clamp01(fe / 600);
      dyn.push(<Circle key="cr1" cx={pos.x} cy={pos.y} r={14 + 30 * p} fill="none" stroke={GREEN} strokeWidth={4} opacity={0.95 * (1 - p)} />);
      const p2 = clamp01((p - 0.14) / 0.86);
      dyn.push(<Circle key="cr2" cx={pos.x} cy={pos.y} r={14 + 22 * p2} fill="none" stroke="#7be0bf" strokeWidth={2.5} opacity={0.9 * (1 - p2)} />);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, d = 12 + 24 * p;
        dyn.push(<Circle key={`sp${i}`} cx={pos.x + Math.cos(a) * d} cy={pos.y + Math.sin(a) * d} r={3} fill="#2fd39a" opacity={Math.max(0, 1 - p * 1.15)} />);
      }
    } else if (outcome.celebrate === 'bad') {
      const p = clamp01(fe / 500);
      dyn.push(<Circle key="br" cx={pos.x} cy={pos.y} r={12 + 14 * p} fill="none" stroke={RED} strokeWidth={4} opacity={0.9 * (1 - p)} />);
      const xp = clamp01(fe / 1100);
      const xop = xp < 1 / 3 ? xp * 3 : xp < 2 / 3 ? 1 : Math.max(0, 3 * (1 - xp));
      dyn.push(<Path key="bx" d={`M${pos.x - 8} ${pos.y - 8} L${pos.x + 8} ${pos.y + 8} M${pos.x + 8} ${pos.y - 8} L${pos.x - 8} ${pos.y + 8}`} stroke={RED} strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={xop} />);
    }
    dyn.push(fieldLabel('out', outcome.label.pos.x, outcome.label.pos.y, outcome.label.text, outcome.label.color, 12));
  }
  const field = <FootballField players={[]} overlay={dyn} showLos={false} />;

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCEN.map((sc, i) => ({ key: String(i), name: sc.tab }))} currentKey={String(idx)} onSelect={kk => selectScenario(Number(kk))} />;
  const promptNode = (
    <View style={styles.prompt}>
      {phase === 'idle' ? (
        <Text style={styles.promptTxt}>Fourth down. The punt team, the kicker, and the offense are all looking at you. <Text style={styles.promptB}>Your call, coach.</Text></Text>
      ) : phase === 'run' ? (
        <Text style={styles.promptTxt}>{chosen === 'go' ? 'Offense stays on the field…' : chosen === 'fg' ? 'Field-goal unit… the kick is up…' : 'Punt team…'}</Text>
      ) : (
        <Text style={styles.promptTxt}>Fourth down is a <Text style={styles.promptB}>trade</Text>: the drive, the points, or the field.</Text>
      )}
      <Text style={styles.hintTxt}>{answered ? 'Reset, or take another fourth down.' : 'Distance, spot, score, clock — all four vote.'}</Text>
    </View>
  );
  const judgeBtn = (opt: CallOption, title: string, sub: string, alt?: boolean) => (
    <TouchableOpacity key={opt} style={[styles.judgeBtn, alt && styles.judgeBtnAlt]} activeOpacity={0.85} onPress={() => choose(opt)}>
      <Text style={styles.judgeTitle}>{title}</Text>
      <Text style={styles.judgeSub}>{sub}</Text>
    </TouchableOpacity>
  );
  const judgeButtons = phase === 'idle' ? (
    <View style={landscape ? styles.judgeCol : styles.judgeRow}>
      {judgeBtn('go', 'Go for it', 'keep the drive alive')}
      {judgeBtn('fg', 'Field goal', '3 points')}
      {judgeBtn('punt', 'Punt', 'flip the field', true)}
    </View>
  ) : null;
  const verdictCard = answered && g ? (
    <View style={[styles.verdict, landscape && styles.verdictCompact]}>
      <View style={styles.tagRow}>
        <Text style={[styles.tag, g.k === 'good' ? styles.tagGood : g.k === 'ok' ? styles.tagOk : styles.tagBad]}>
          {g.k === 'good' ? "Coach's call" : g.k === 'ok' ? 'Defensible' : 'Wrong call'}
        </Text>
      </View>
      <Text style={styles.vtitle} numberOfLines={landscape ? 1 : undefined} adjustsFontSizeToFit={landscape} minimumFontScale={0.7}>{g.t}</Text>
      <Text style={styles.vbody}>{g.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const foot = (
    <Text style={styles.foot}>Blue line = line of scrimmage, amber = the line to gain · <Text style={styles.footB}>the ball's NOSE decides it</Text> — past the amber line or not.</Text>
  );
  const resetBtnC = <TouchableOpacity style={styles.ghostBtnC} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = answered ? (
    <View style={styles.lsPostRow}>{resetBtnC}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next →" onPress={nextScenario} /></View>
  ) : undefined;

  // ── LANDSCAPE: field-left via the shell; call buttons (pre) / verdict + tabs (post) right. ──
  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={FOOTBALL_FIELD_RATIO}
        belowFieldReserve={0}
        pills={pills}
        field={field}
        controls={answered ? <>{verdictCard}</> : <>{promptNode}{judgeButtons}{foot}</>}
        controlsFooter={lsFooter}
      />
    );
  }

  // ── PORTRAIT: vertical stack. ──
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {field}
      {promptNode}
      {judgeButtons}
      {verdictCard}
      <View style={styles.controls}>
        {answered && <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetPlay}><Text style={styles.ghostTxt}>↺ Reset</Text></TouchableOpacity>}
        {answered && <NextButton visible variant="filled" label="Next fourth down →" onPress={nextScenario} />}
      </View>
      {foot}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptB: { color: t.accentText, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 12, fontWeight: '600', marginTop: 6 },
  judgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  judgeCol: { gap: 8 },
  judgeBtn: { flex: 1, minWidth: 140, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  judgeBtnAlt: { backgroundColor: FE.navy, borderWidth: 1, borderColor: '#2b3a5e' },
  judgeTitle: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: t.border },
  verdictCompact: { padding: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  tagGood: { backgroundColor: FE.goodBg, color: FE.good },
  tagOk: { backgroundColor: '#fef3e2', color: '#8a5a1c' },
  tagBad: { backgroundColor: FE.badBg, color: FE.bad },
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
