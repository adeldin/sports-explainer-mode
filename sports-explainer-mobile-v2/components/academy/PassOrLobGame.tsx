import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Circle, Line, Path, Rect, Defs, ClipPath, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import type { Level } from '../../lib/api';
import { useAppState } from '../../lib/appState';
import { useTheme, Theme } from '../../lib/theme';
import type { AcademyGameProps } from '../../lib/academyGames';
import { LandscapeGameShell, ScenarioPills, DifficultyTabs, NextButton, FE } from '../FieldEngine';
import { TennisCourt, TENNIS_COURT_RATIO } from './fields/TennisCourt';
import {
  SCENARIOS, OPTIONS, NARRATION, DTL, CC, SMASH_R, LOB_APEX,
  PROMPT_START, PROMPT_DONE, HINT_IDLE, HINT_DONE, SUB, FOOT, gradeColor, gradeTag,
  type PLOption, type PLScenario, type P, type Depth,
} from '../../lib/passOrLob';

// Pass or Lob? — defending the net rush. The whole module is ONE geometric see-saw, and both halves
// of it are DRAWN and sized by his distance from the net: the blue volley-REACH circle (grows as he
// crowds the net, clipped to his side — reach can't exist across the net) and the amber SMASH-ZONE
// arc behind him (shrinks as he crowds it). Crowder ⇒ lanes closed, roof open. Service-line camper ⇒
// lanes open, roof farmed. His LEAN then picks which lane. The read layer fades the instant you
// choose so the outcome owns the court, and the teal ghost arrives a BEAT AFTER the outcome resolves
// — never simultaneously, so you watch what happened before you're told what was better.
// Board-less, so it renders the shared 680×420 TennisCourt at TENNIS_COURT_RATIO.
const F_BOLD = 'SpaceGrotesk_700Bold';
const OUTLINE = '#132743';
const TEAL = '#14B8A6', RED = '#e24b4a', AMBER = '#F5A623';
const BALL_Y = '#D9E840', BALL_EDGE = '#98A61E';
const CHALK = '#F4F4EE', SOFT = '#dfe5f0';
const OK_BG = '#fef3e2', OK_C = '#8a5a1c';
const YOU_C = FE.orange, OPP_C = '#3B6FE0';
const GHOST_DELAY = 550;               // the reveal lands a beat AFTER the outcome — owner-driven
const ARC_DIM = 0.16, READ_DIM = 0.2;  // the reads did their job the moment you chose
const CLIP_ID = 'polTheirSide';

const lerpP = (a: P, b: P, k: number): P => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const clampLblX = (x: number, txt: string) => Math.max(14 + txt.length * 2.9, Math.min(666 - txt.length * 2.9, x));
const qCtrl = (from: P, to: P, bow: number): P => {
  const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1;
  return [mx - (dy / len) * bow, my + (dx / len) * bow];
};
const qPathD = (from: P, to: P, bow: number): string => {
  const c = qCtrl(from, to, bow);
  return `M${from[0]} ${from[1]} Q${c[0]} ${c[1]} ${to[0]} ${to[1]}`;
};
const bezAt = (from: P, to: P, bow: number, k: number): P => {
  const c = qCtrl(from, to, bow), mk = 1 - k;
  return [mk * mk * from[0] + 2 * mk * k * c[0] + k * k * to[0], mk * mk * from[1] + 2 * mk * k * c[1] + k * k * to[1]];
};

// ── scene model (mutable ref; one bump/frame re-renders the SVG) ──
interface SceneLabel { x: number; y: number; txt: string; fill: string; size: number }
interface ScenePath { d: string; color: string; op: number }
interface Fx { kind: 'burst' | 'celebrate'; pos: P; color: string; born: number }
interface Scene {
  you: P; opp: P; ball: { p: P; s: number } | null;
  trail: { p: P; born: number }[];
  paths: ScenePath[];
  labels: SceneLabel[];
  ghost: { p: P; txt: string } | null;
  fx: Fx[];
  readsOn: boolean;      // the reads are drawn only once the scene has assembled
  dim: boolean;          // …and fade the moment a call is made
}
const freshScene = (): Scene => ({
  you: [130, 190], opp: [486, 216], ball: null, trail: [], paths: [], labels: [], ghost: null, fx: [],
  readsOn: false, dim: false,
});

// ── timeline harness (per-module copy — single rafRef owner, per the port standard) ──
type TAnim = { at: number; d: number; f: (k: number, e: number) => void };
type TEv = { at: number; f: () => void };
type Phase = 'intro' | 'ready' | 'run' | 'done';

// The explanation key rides UNDER the field, not at the bottom of the controls scroll: this field is
// WIDTH-bound in landscape, so the shell leaves unused navy height beneath the art. Reserved ALWAYS
// (~58pt, three compact rows at the field width) so the art size never jumps between states, and the
// height it frees is real height back in the controls column.
const LS_LEGEND_RESERVE = 58;

export default function PassOrLobGame(_props: AcademyGameProps) {
  const { level: appLevel } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [level, setLevel] = useState<Level>(appLevel);
  const [chosen, setChosen] = useState<PLOption | null>(null);
  const [, setTick] = useState(0);
  const sceneRef = useRef<Scene>(freshScene());
  const promptRef = useRef<string>(PROMPT_START);
  const hintRef = useRef<string>(HINT_IDLE);
  const clockRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const genRef = useRef(0);                  // generation guard: a stale frame can never write
  const phaseRef = useRef<Phase>('intro');
  phaseRef.current = phase;

  const s = SCENARIOS[idx];
  const depth: Depth = level === 'kid' ? 'rookie' : level;
  const bump = () => setTick(t => (t + 1) % 1000000);
  const stopLoop = () => { genRef.current += 1; if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  useEffect(() => () => stopLoop(), []);

  const runTimeline = (anims: TAnim[], evs: TEv[], total: number) => {
    stopLoop();
    const gen = genRef.current;
    const fired = new Set<TEv>(); const ended = new Set<TAnim>();
    let t0: number | null = null;
    const loop = (now: number) => {
      if (gen !== genRef.current) return;                // stale generation — drop the frame
      if (t0 == null) t0 = now;
      const e = now - t0;
      clockRef.current = e;
      evs.forEach(ev => { if (!fired.has(ev) && e >= ev.at) { fired.add(ev); ev.f(); } });
      anims.forEach(a => {
        if (e >= a.at && !ended.has(a)) {
          const k = Math.min(1, (e - a.at) / a.d);
          a.f(k, e - a.at);
          if (k >= 1) ended.add(a);
        }
      });
      bump();
      if (e >= total) { rafRef.current = null; return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // ── choreography vocabulary ──
  const sc = () => sceneRef.current;
  const addPath = (from: P, to: P, bow: number, color: string, op: number) =>
    sc().paths.push({ d: qPathD(from, to, bow), color, op });
  const addLabel = (x: number, y: number, txt: string, fill: string, size: number) =>
    sc().labels.push({ x: clampLblX(x, txt), y, txt, fill, size });
  const burstAt = (pos: P, color: string) => sc().fx.push({ kind: 'burst', pos, color, born: clockRef.current });
  const celebrateAt = (pos: P) => sc().fx.push({ kind: 'celebrate', pos, color: '#16a37f', born: clockRef.current });
  const mkBallShot = (at: number, from: P, to: P, d: number, bow: number, loft: number): TAnim =>
    ({ at, d, f: (k) => { sc().ball = { p: bezAt(from, to, bow, k), s: 1 + loft * Math.sin(Math.PI * k) }; } });
  const mkMove = (at: number, who: 'you' | 'opp', from: P, to: P, d: number): TAnim =>
    ({ at, d, f: (k) => { sc()[who] = lerpP(from, to, k); } });
  const mkMoveTrail = (at: number, from: P, to: P, d: number): TAnim => {
    let lastDrop = -1000;
    return {
      at, d, f: (k, e) => {
        const p = lerpP(from, to, k);
        sc().opp = p;
        if (e - lastDrop > 80) { lastDrop = e; sc().trail.push({ p, born: clockRef.current }); }
      },
    };
  };

  // ── intro: his approach shot pushes you to the corner while he closes in; then the reads appear ──
  const runIntro = (i: number) => {
    const scn = SCENARIOS[i];
    sceneRef.current = freshScene();
    promptRef.current = PROMPT_START;
    hintRef.current = HINT_IDLE;
    setChosen(null);
    setPhase('intro');
    const from: P = [486, 210];
    sceneRef.current.ball = { p: from, s: 1 };
    addPath(from, scn.you0, 22, SOFT, 0.3);
    const anims: TAnim[] = [
      mkBallShot(0, from, [scn.you0[0] + 10, scn.you0[1] + 8], 1000, 22, 0.3),
      mkMoveTrail(0, [486, 216], scn.net, 950),
      mkMove(0, 'you', [130, 190], scn.you0, 950),
    ];
    const evs: TEv[] = [{
      at: 1000, f: () => { sc().readsOn = true; promptRef.current = scn.intro; setPhase('ready'); },
    }];
    runTimeline(anims, evs, 1120);
  };
  useEffect(() => { runIntro(0); /* mount */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectScenario = (i: number) => { setIdx(i); runIntro(i); };
  const resetScenario = () => runIntro(idx);
  const nextScenario = () => selectScenario((idx + 1) % SCENARIOS.length);

  const showVerdict = () => {
    setPhase('done');
    promptRef.current = PROMPT_DONE;
    hintRef.current = HINT_DONE;
  };

  // ── choose: compile the spike's storyline for (scenario, option) into one timeline ──
  const choose = (opt: PLOption) => {
    if (phaseRef.current !== 'ready') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(opt);
    setPhase('run');
    const scn = s, g = scn.grade[opt], col = gradeColor(g.k), E = g.end;
    sc().dim = true;                                   // the reads fade — the outcome owns the court
    const from: P = [scn.you0[0] + 10, scn.you0[1] + 8];
    const anims: TAnim[] = [];
    const evs: TEv[] = [];
    const ev = (at: number, f: () => void) => evs.push({ at, f });
    let finAt = 0; let ghostAt: number | null = null;
    const fin = (at: number) => { finAt = at; ev(at, showVerdict); };
    // the reveal arrives a BEAT after the outcome — never on the same frame
    const ghost = (at: number) => {
      ghostAt = at + GHOST_DELAY;
      ev(at + GHOST_DELAY, () => {
        const bestKey = (Object.keys(scn.grade) as PLOption[]).find(k => scn.grade[k].k === 'good');
        if (!bestKey) return;
        sc().ghost = {
          p: scn.grade[bestKey].end.ball,
          txt: bestKey === 'lob' ? 'over the top was open' : 'the open lane was here',
        };
      });
    };
    promptRef.current = NARRATION[opt];

    if (opt === 'lob') {
      const apex: P = E.ball[0] > 500 ? E.ball : LOB_APEX;
      ev(0, () => addPath(from, apex, 80, CHALK, 0.4));
      if (g.k === 'bad') {
        // he drifts back while the lob is still climbing, steps INSIDE his smash zone, and kills it
        anims.push(mkBallShot(0, from, LOB_APEX, 1200, 80, 1.1));
        anims.push(mkMoveTrail(200, scn.net, [scn.net[0] + 30, scn.net[1] + 4], 500));
        anims.push(mkMoveTrail(1200, [scn.net[0] + 30, scn.net[1] + 4], E.opp, 260));
        ev(1460, () => { promptRef.current = 'He’s under it — <b>SMASH.</b>'; addPath(E.opp, E.ball, 10, '#ffb3ae', 0.5); });
        anims.push(mkBallShot(1460, E.opp, E.ball, 380, 10, 0.1));
        ev(1840, () => { burstAt(E.ball, RED); addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffb3ae', 12); });
        ghost(1840); fin(1840);
      } else {
        // it clears the arc: he backpedals hard and never gets there
        ev(250, () => { promptRef.current = 'He’s backpedaling…'; });
        anims.push(mkMoveTrail(250, scn.net, E.opp, 1100));
        anims.push(mkBallShot(0, from, E.ball, 1400, 80, 1.1));
        ev(1400, () => {
          burstAt(E.ball, col);
          if (g.k === 'good') celebrateAt(E.ball);
          addLabel(E.lab[0], E.lab[1], E.lab[2], g.k === 'good' ? '#bfe9da' : '#ffe1b3', 12);
        });
        if (g.k === 'ok') ghost(1400);
        anims.push(mkMove(1400, 'you', scn.you0, E.you, 500));
        fin(1900);
      }
    } else if (g.k === 'bad' && g.cut) {
      // cut off INSIDE his reach circle — then the punch volley into the court you left
      const cut = g.cut;
      ev(0, () => addPath(from, cut, 10, CHALK, 0.4));
      anims.push(mkBallShot(0, from, cut, 420, 10, 0.1));
      anims.push(mkMove(420, 'opp', scn.net, E.opp, 160));
      ev(580, () => {
        burstAt(cut, RED);
        addLabel(cut[0] + 8, cut[1] - 22, 'cut off', '#ffb3ae', 10);
        promptRef.current = 'On his strings — <b>punch volley…</b>';
        addPath(cut, E.ball, 14, '#ffb3ae', 0.5);
      });
      anims.push(mkBallShot(580, cut, E.ball, 520, 14, 0.15));
      ev(1100, () => { burstAt(E.ball, RED); addLabel(E.lab[0], E.lab[1], E.lab[2], '#ffb3ae', 11); });
      ghost(1100); fin(1100);
    } else {
      // the pass goes down a lane; his lunge starts as the ball passes the net — and comes up short
      const laneEnd: P = opt === 'dtl' ? DTL : CC;
      ev(0, () => addPath(from, laneEnd, 14, CHALK, 0.4));
      anims.push(mkMoveTrail(260, scn.net, E.opp, 420));
      anims.push(mkBallShot(0, from, laneEnd, 620, 14, 0.12));
      ev(620, () => {
        burstAt(E.ball, col);
        if (g.k === 'good') celebrateAt(E.ball);
        addLabel(E.lab[0], E.lab[1], E.lab[2], g.k === 'good' ? '#bfe9da' : '#ffe1b3', 12);
      });
      if (g.k === 'ok') ghost(620);
      anims.push(mkMove(620, 'you', scn.you0, E.you, 450));
      fin(1070);
    }
    const total = Math.max(finAt + 460, (ghostAt ?? 0) + 100) + 750;
    runTimeline(anims, evs, total);
  };

  // ── SVG scene: court → reads (arc/reach/bracket/lanes) → paths → trail → actors → ball → fx → labels ──
  const scene = sceneRef.current;
  const clock = clockRef.current;
  const arcOp = scene.dim ? ARC_DIM : 1;
  const readOp = scene.dim ? READ_DIM : 1;
  const els: ReactNode[] = [];
  if (scene.readsOn) els.push(<ReadLayer key="reads" s={s} arcOp={arcOp} readOp={readOp} />);
  if (scene.ghost) {
    els.push(<Circle key="ghost" cx={scene.ghost.p[0]} cy={scene.ghost.p[1]} r={17} fill="none" stroke={TEAL} strokeWidth={2.5} strokeDasharray="5 5" opacity={0.95} />);
    els.push(<OutlinedLabel key="ghostL" x={clampLblX(scene.ghost.p[0], scene.ghost.txt)} y={scene.ghost.p[1] + 34} txt={scene.ghost.txt} fill="#8fe6d4" size={10} />);
  }
  scene.paths.forEach((p, i) => els.push(<Path key={`p${i}`} d={p.d} fill="none" stroke={p.color} strokeWidth={2} opacity={p.op} strokeDasharray="5 6" />));
  scene.trail.forEach((d, i) => {
    const op = 0.5 * Math.max(0, 1 - (clock - d.born) / 1400);
    if (op > 0.02) els.push(<Circle key={`tr${i}`} cx={d.p[0]} cy={d.p[1]} r={3.5} fill={OPP_C} opacity={op} />);
  });
  els.push(<Circle key="opp" cx={scene.opp[0]} cy={scene.opp[1]} r={11} fill={OPP_C} stroke="#0d1b3e" strokeWidth={2} />);
  els.push(<OutlinedLabel key="oppL" x={scene.opp[0]} y={scene.opp[1] - 16} txt="net player" fill="#bcd3ff" size={10.5} />);
  els.push(<Circle key="you" cx={scene.you[0]} cy={scene.you[1]} r={11} fill={YOU_C} stroke="#0d1b3e" strokeWidth={2} />);
  els.push(<OutlinedLabel key="youL" x={scene.you[0]} y={scene.you[1] - 16} txt="YOU" fill="#fff" size={10.5} />);
  if (scene.ball) els.push(<TennisBall key="ball" p={scene.ball.p} s={scene.ball.s} />);
  scene.fx.forEach((fx, i) => els.push(<FxEl key={`fx${i}`} fx={fx} clock={clock} />));
  scene.labels.forEach((l, i) => els.push(<OutlinedLabel key={`lbl${i}`} x={l.x} y={l.y} txt={l.txt} fill={l.fill} size={l.size} />));

  const field = <TennisCourt surface="hard">{els}</TennisCourt>;

  // ── control fragments ──
  const pills = <ScenarioPills wrap={landscape} items={SCENARIOS.map((sc2, i) => ({ key: String(i), name: sc2.tab }))} currentKey={String(idx)} onSelect={k => selectScenario(Number(k))} />;
  const hudChips = (
    <View style={styles.hud}>
      {s.chips.map((c, i) => <View key={i} style={styles.chip}><RichText text={c} style={styles.chipTxt} boldStyle={styles.chipVal} /></View>)}
    </View>
  );
  const promptBlock = (
    <View style={[styles.prompt, landscape && styles.promptLs]}>
      <RichText text={promptRef.current} style={[styles.promptTxt, landscape && styles.promptTxtLs]} boldStyle={styles.promptBold} />
      <Text style={[styles.hintTxt, landscape && styles.hintTxtLs]}>{hintRef.current}</Text>
    </View>
  );
  const ready = phase === 'ready';
  const judge = (
    <View style={styles.judgeWrap}>
      {OPTIONS.map(o => (
        <TouchableOpacity key={o.key} style={[styles.judgeBtn, !ready && styles.judgeBtnOff, landscape && styles.judgeBtnLs]}
          disabled={!ready} activeOpacity={0.85} onPress={() => choose(o.key)}>
          <Text style={[styles.judgeTxt, landscape && styles.judgeTxtLs]}>{o.title}</Text>
          <Text style={[styles.judgeSub, landscape && styles.judgeSubLs]}>{o.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const legend = (
    <View style={[styles.legend, landscape && styles.legendLs]}>
      {([['You (baseline)', YOU_C], ['Net player', OPP_C]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: c }]} /><Text style={[styles.legendTxt, landscape && styles.legendTxtLs]}>{lbl}</Text></View>
      ))}
      <Text style={styles.legendBlue}>blue circle = his volley reach</Text>
      <Text style={styles.legendAmber}>amber arc = his smash zone (lobs die inside it)</Text>
      <Text style={styles.legendTeal}>dashed teal = the read you missed</Text>
    </View>
  );
  // The legend, in the shell's under-field strip — a compact wrap row sized to the field width.
  const lsLegendUnder = <View style={styles.lsLegendUnder}>{legend}</View>;
  const g = chosen ? s.grade[chosen] : null;
  const verdict = phase === 'done' && g ? (
    <View style={styles.verdict}>
      <Text style={[styles.vtag, g.k === 'good' ? styles.vtagGood : g.k === 'ok' ? styles.vtagOk : styles.vtagBad]}>{gradeTag(g.k)}</Text>
      <Text style={styles.vtitle}>{g.t}</Text>
      <Text style={styles.vbody}>{g.b}</Text>
      <Text style={styles.readLbl}>COACH'S READ</Text>
      <DifficultyTabs level={level} onSelect={setLevel} compact={landscape} />
      <Text style={styles.vbody}>{s.why[depth]}</Text>
    </View>
  ) : null;
  const subLine = phase !== 'done' ? <RichText text={SUB} style={styles.foot} boldStyle={styles.footBold} /> : null;
  const footLine = <Text style={styles.foot}>{FOOT}</Text>;
  const resetBtn = <TouchableOpacity style={styles.ghostBtn} activeOpacity={0.8} onPress={resetScenario}><Text style={styles.ghostTxt} numberOfLines={1}>↺ Reset</Text></TouchableOpacity>;
  const lsFooter = phase === 'done' ? (
    <View style={styles.lsPostRow}>{resetBtn}<NextButton visible variant="filled" style={styles.lsNextFill} label="Next rush →" onPress={nextScenario} /></View>
  ) : undefined;

  if (landscape) {
    return (
      <LandscapeGameShell
        aspectRatio={TENNIS_COURT_RATIO}
        belowFieldReserve={LS_LEGEND_RESERVE}
        pills={pills}
        field={field}
        belowField={lsLegendUnder}
        controls={phase === 'done' ? <>{verdict}{footLine}</> : <>{hudChips}{promptBlock}{judge}{subLine}</>}
        controlsFooter={lsFooter}
      />
    );
  }
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {pills}
      {hudChips}
      {field}
      {legend}
      {promptBlock}
      {phase === 'done' ? verdict : judge}
      {phase === 'done' && (
        <View style={styles.postRow}>{resetBtn}<NextButton visible variant="filled" label="Next net rush →" onPress={nextScenario} /></View>
      )}
      {subLine}
      {footLine}
    </ScrollView>
  );
}

// ── the READ layer: smash arc + volley reach + distance bracket + the two lanes ──
// Every element is a pure function of the scenario's net position and reach — the see-saw made
// visible. It renders at full strength pre-call and dims (never unmounts) once a call is made.
function ReadLayer({ s, arcOp, readOp }: { s: PLScenario; arcOp: number; readOp: number }) {
  const [cx, cy] = s.net;
  const rad = (d: number) => (d * Math.PI) / 180;
  const p1: P = [cx + SMASH_R * Math.cos(rad(-58)), cy + SMASH_R * Math.sin(rad(-58))];
  const p2: P = [cx + SMASH_R * Math.cos(rad(58)), cy + SMASH_R * Math.sin(rad(58))];
  const arcD = `M${cx} ${cy} L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A${SMASH_R} ${SMASH_R} 0 0 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} Z`;
  const ly = Math.max(cy - s.reach - 28, 104);          // keep the bracket clear of the NET caption
  const lx = cx - 326 < 70 ? 268 : (326 + cx) / 2;      // narrow bracket: label left of the net
  return (
    <G>
      <Defs>
        <ClipPath id={CLIP_ID}><Rect x={326} y={0} width={354} height={420} /></ClipPath>
      </Defs>
      <G opacity={arcOp}>
        {/* his SMASH ZONE: the arc behind him a lob must clear (radius = how far he can retreat) */}
        <Path d={arcD} fill={AMBER} opacity={0.15} stroke={AMBER} strokeWidth={1.5} strokeDasharray="4 5" />
        {/* his VOLLEY REACH: only exists on HIS side of the net */}
        <G clipPath={`url(#${CLIP_ID})`}>
          <Circle cx={cx} cy={cy} r={s.reach} fill={OPP_C} opacity={0.1} />
          <Circle cx={cx} cy={cy} r={s.reach} fill="none" stroke="#bcd3ff" strokeWidth={1.5} strokeDasharray="4 5" opacity={0.8} />
        </G>
        {/* distance bracket: net → his position (the number that decides pass-or-lob) */}
        <Line x1={326} y1={ly} x2={cx} y2={ly} stroke={CHALK} strokeWidth={1.5} opacity={0.8} />
        <Line x1={326} y1={ly - 5} x2={326} y2={ly + 5} stroke={CHALK} strokeWidth={1.5} opacity={0.8} />
        <Line x1={cx} y1={ly - 5} x2={cx} y2={ly + 5} stroke={CHALK} strokeWidth={1.5} opacity={0.8} />
      </G>
      <G opacity={readOp}>
        <OutlinedLabel x={clampLblX(cx + SMASH_R - 26, 'smash zone')} y={cy - SMASH_R * 0.55} txt="smash zone" fill="#ffe1b3" size={9.5} />
        <OutlinedLabel x={clampLblX(lx, `${s.dist} off the net`)} y={ly - 8} txt={`${s.dist} off the net`} fill={SOFT} size={9} />
        <Path d={qPathD(s.you0, DTL, 0)} fill="none" stroke={SOFT} strokeWidth={2} opacity={0.3} strokeDasharray="5 6" />
        <Path d={qPathD(s.you0, CC, 0)} fill="none" stroke={SOFT} strokeWidth={2} opacity={0.3} strokeDasharray="5 6" />
        <OutlinedLabel x={500} y={124} txt="line lane" fill={SOFT} size={9} />
        <OutlinedLabel x={452} y={252} txt="cross lane" fill={SOFT} size={9} />
      </G>
    </G>
  );
}

// ── small scene pieces ──
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

function FxEl({ fx, clock }: { fx: Fx; clock: number }) {
  const prog = Math.min(1, Math.max(0, (clock - fx.born) / 600));
  if (fx.kind === 'burst') {
    if (prog >= 1) return null;
    return <Circle cx={fx.pos[0]} cy={fx.pos[1]} r={8 + 18 * prog} fill="none" stroke={fx.color} strokeWidth={3} opacity={0.9 * (1 - prog)} />;
  }
  const p2 = Math.min(1, Math.max(0, (prog - 0.14) / 0.86));
  const sparks: ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, d = 26 * prog;
    const op = prog < 0.7 ? 1 : Math.max(0, 1 - (prog - 0.7) / 0.3);
    sparks.push(<Circle key={i} cx={fx.pos[0] + Math.cos(a) * d} cy={fx.pos[1] + Math.sin(a) * d} r={3} fill="#2fd39a" opacity={op} />);
  }
  return (
    <G>
      {prog < 1 && <Circle cx={fx.pos[0]} cy={fx.pos[1]} r={2.8 + 23.8 * prog} fill="none" stroke="#16a37f" strokeWidth={4} opacity={0.95 * (1 - prog)} />}
      {p2 < 1 && <Circle cx={fx.pos[0]} cy={fx.pos[1]} r={2.8 + 23.8 * p2} fill="none" stroke="#7be0bf" strokeWidth={2.5} opacity={0.9 * (1 - p2)} />}
      {sparks}
    </G>
  );
}

function RichText({ text, style, boldStyle }: { text: string; style: object; boldStyle: object }) {
  const parts = text.split(/<\/?b>/);
  return (
    <Text style={style}>
      {parts.map((p, i) => (i % 2 === 1 ? <Text key={i} style={boldStyle}>{p}</Text> : p))}
    </Text>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  hud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  chipTxt: { color: t.textPrimary, fontSize: 11, fontWeight: '700' },
  chipVal: { color: t.accentText, fontWeight: '800' },
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptLs: { padding: 9 },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  promptTxtLs: { fontSize: 12.5, lineHeight: 17 },
  promptBold: { color: AMBER, fontWeight: '800' },
  hintTxt: { color: t.textSecondaryOnDark, fontSize: 11.5, marginTop: 6 },
  hintTxtLs: { fontSize: 10.5, marginTop: 4 },
  judgeWrap: { gap: 8 },
  judgeBtn: { backgroundColor: FE.orange, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  judgeBtnLs: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minWidth: 0, minHeight: 44, paddingVertical: 9 },
  // Peer CHOICE buttons share ONE style (accent) — a colour difference would leak the answer key.
  judgeBtnOff: { opacity: 0.4 },
  judgeTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  judgeTxtLs: { fontSize: 13 },
  judgeSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.85, marginTop: 2 },
  judgeSubLs: { fontSize: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 6 },
  legendLs: { gap: 7, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  legendTxtLs: { fontSize: 10 },
  legendBlue: { color: OPP_C, fontSize: 11, fontWeight: '700' },
  legendAmber: { color: OK_C, fontSize: 11, fontWeight: '700' },
  legendTeal: { color: TEAL, fontSize: 11, fontWeight: '700' },
  lsLegendUnder: { minHeight: LS_LEGEND_RESERVE, paddingTop: 4, justifyContent: 'center' },
  verdict: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  vtag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  vtagGood: { backgroundColor: FE.goodBg, color: FE.good },
  vtagBad: { backgroundColor: FE.badBg, color: FE.bad },
  vtagOk: { backgroundColor: OK_BG, color: OK_C },
  vtitle: { color: t.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  vbody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
  readLbl: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginTop: 8 },
  foot: { color: t.textSecondaryOnDark, fontSize: 11, lineHeight: 17, opacity: 0.85 },
  footBold: { color: t.textPrimary, fontWeight: '800' },
  postRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 },
  ghostBtn: { borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ghostTxt: { color: t.textSecondaryOnDark, fontSize: 13, fontWeight: '600' },
  lsPostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border },
  lsNextFill: { flex: 1, alignSelf: 'center', alignItems: 'center', paddingVertical: 10 },
});
