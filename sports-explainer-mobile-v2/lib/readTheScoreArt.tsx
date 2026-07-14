import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Line, Circle, Text as SvgText } from 'react-native-svg';
import type { Board, BoardSide, GolfRow, RugbyTally, TennisRow } from './readTheScore';

// ============================================================================
// Read the Score — ART MODULE. Every scoreboard/scorecard drawing lives HERE and
// only here (build doc §0.4: art is a placeholder, swappable in ONE file). The
// game component renders <ScoreboardArt board={...} /> and knows nothing about
// pixels; designers can replace this whole file without touching data or game.
//
// Conventions (matching FieldEngine):
// - One fixed viewBox for every board: 680×340 (SCOREBOARD_RATIO sizes the <Svg>).
// - A scoreboard is DARK in every app theme (like a field is green in every theme),
//   so the palette below is fixed brand-navy + LED amber/white — not theme tokens.
// - Simple geometric SVG, legible at phone width. No gold-plating.
// ============================================================================

export const SCOREBOARD_VB = { w: 680, h: 340 };
export const SCOREBOARD_RATIO = SCOREBOARD_VB.w / SCOREBOARD_VB.h;

// Fixed scoreboard palette (LED-on-navy look; brand navy family from lib/theme brand).
const SB = {
  bg: '#0a1733',
  panel: '#0f2044',
  line: '#2a3a5e',
  amber: '#F5A623',   // primary LED (clocks, key numbers)
  orange: '#E87722',  // brand accent (badges)
  white: '#ffffff',
  muted: '#9ab4e0',   // labels
  dim: '#5b6a8f',     // inactive lamps / separators
  red: '#FF5A5F',     // outs / wickets / under-par (golf convention)
  green: '#3ECF8E',   // live/positive accents
  blue: '#378ADD',
};

const F_BOLD = 'SpaceGrotesk_700Bold'; // the app's on-device SVG font (as in FieldEngine)

// ── tiny building blocks ─────────────────────────────────────────────────────

function T({ x, y, size, color = SB.white, anchor = 'start', children, opacity = 1 }: {
  x: number; y: number; size: number; color?: string; anchor?: 'start' | 'middle' | 'end';
  children: React.ReactNode; opacity?: number;
}) {
  return (
    <SvgText x={x} y={y} fontSize={size} fill={color} fontFamily={F_BOLD} textAnchor={anchor} opacity={opacity}>
      {children}
    </SvgText>
  );
}

// Panel chrome: background, border, header strip with a small sport label (left)
// and an optional right-side header readout (e.g. the inning / period).
function Frame({ label, right, children }: { label: string; right?: string; children: React.ReactNode }) {
  return (
    <>
      <Rect x={0} y={0} width={680} height={340} fill={SB.bg} />
      <Rect x={8} y={8} width={664} height={324} rx={14} fill={SB.panel} stroke={SB.line} strokeWidth={2} />
      <Line x1={8} y1={56} x2={672} y2={56} stroke={SB.line} strokeWidth={2} />
      <T x={28} y={40} size={17} color={SB.muted}>{label}</T>
      {!!right && <T x={652} y={40} size={17} color={SB.amber} anchor="end">{right}</T>}
      {children}
    </>
  );
}

// A row of indicator lamps (count/outs/timeouts).
function Lamps({ x, y, total, lit, color, r = 7 }: { x: number; y: number; total: number; lit: number; color: string; r?: number }) {
  return (
    <>
      {Array.from({ length: total }, (_, i) => (
        <Circle key={i} cx={x + i * (r * 2 + 8)} cy={y} r={r}
          fill={i < lit ? color : 'transparent'} stroke={i < lit ? color : SB.dim} strokeWidth={2} />
      ))}
    </>
  );
}

// A standard team row: optional possession marker, name, big right-aligned score.
function TeamRow({ y, side, scoreX = 560, nameSize = 24, scoreSize = 44, sub }: {
  y: number; side: BoardSide; scoreX?: number; nameSize?: number; scoreSize?: number; sub?: string;
}) {
  return (
    <>
      {side.possession && <T x={30} y={y} size={nameSize} color={SB.amber}>▸</T>}
      <T x={56} y={y} size={nameSize} color={SB.white}>{side.name.toUpperCase()}</T>
      {!!sub && <T x={56} y={y + 24} size={13} color={SB.muted}>{sub}</T>}
      <T x={scoreX} y={y + 8} size={scoreSize} color={SB.amber} anchor="end">{String(side.score)}</T>
    </>
  );
}

// Bottom info strip: evenly spaced label/value cells.
function BottomStrip({ cells }: { cells: { label: string; value: string }[] }) {
  const n = cells.length;
  const w = 664 / n;
  return (
    <>
      <Line x1={8} y1={258} x2={672} y2={258} stroke={SB.line} strokeWidth={2} />
      {cells.map((c, i) => {
        const cx = 8 + w * i + w / 2;
        return (
          <React.Fragment key={i}>
            {i > 0 && <Line x1={8 + w * i} y1={266} x2={8 + w * i} y2={324} stroke={SB.line} strokeWidth={1} opacity={0.6} />}
            <T x={cx} y={288} size={13} color={SB.muted} anchor="middle">{c.label}</T>
            <T x={cx} y={318} size={22} color={SB.amber} anchor="middle">{c.value}</T>
          </React.Fragment>
        );
      })}
    </>
  );
}

// ── per-sport boards ─────────────────────────────────────────────────────────

function BaseballBoard({ b }: { b: Extract<Board, { kind: 'baseball' }> }) {
  const halfMark = b.half === 'top' ? '▲' : '▼';
  // Mini diamond (runners): 2nd top, 1st right, 3rd left. bases = [1st, 2nd, 3rd].
  const cx = 596, cy = 150, off = 34;
  const baseAt = (bx: number, by: number, on: boolean, key: string) => (
    <Rect key={key} x={bx - 11} y={by - 11} width={22} height={22} rx={3}
      fill={on ? SB.amber : 'transparent'} stroke={on ? SB.amber : SB.dim} strokeWidth={2}
      rotation={45} originX={bx} originY={by} />
  );
  return (
    <Frame label="BASEBALL" right={`${halfMark} ${b.inning}`}>
      <TeamRow y={110} side={b.away} scoreX={500} />
      <TeamRow y={190} side={b.home} scoreX={500} />
      {/* runners diamond */}
      {baseAt(cx, cy - off, b.bases[1], 'b2')}
      {baseAt(cx + off, cy, b.bases[0], 'b1')}
      {baseAt(cx - off, cy, b.bases[2], 'b3')}
      {/* count + outs lamps */}
      <T x={36} y={296} size={15} color={SB.muted}>B</T>
      <Lamps x={64} y={290} total={3} lit={Math.min(b.balls, 3)} color={SB.green} />
      <T x={196} y={296} size={15} color={SB.muted}>S</T>
      <Lamps x={224} y={290} total={2} lit={Math.min(b.strikes, 2)} color={SB.amber} />
      <T x={330} y={296} size={15} color={SB.muted}>OUT</T>
      <Lamps x={388} y={290} total={2} lit={Math.min(b.outs, 2)} color={SB.red} />
      <Line x1={8} y1={258} x2={672} y2={258} stroke={SB.line} strokeWidth={2} />
      <T x={652} y={298} size={15} color={SB.muted} anchor="end">{b.half === 'top' ? 'TOP' : 'BOT'} {b.inning}</T>
    </Frame>
  );
}

function FootballBoard({ b }: { b: Extract<Board, { kind: 'football' }> }) {
  return (
    <Frame label="FOOTBALL" right={`${b.quarter} · ${b.clock}`}>
      <TeamRow y={112} side={b.away} />
      {b.timeouts && <Lamps x={58} y={132} total={3} lit={b.timeouts.away} color={SB.amber} r={5} />}
      <TeamRow y={200} side={b.home} />
      {b.timeouts && <Lamps x={58} y={220} total={3} lit={b.timeouts.home} color={SB.amber} r={5} />}
      <BottomStrip cells={[
        { label: 'QTR', value: b.quarter },
        { label: 'CLOCK', value: b.clock },
        { label: 'DOWN & DIST', value: b.downDistance ?? '—' },
        { label: 'BALL ON', value: b.ballOn ?? '—' },
      ]} />
    </Frame>
  );
}

function BasketballBoard({ b }: { b: Extract<Board, { kind: 'basketball' }> }) {
  return (
    <Frame label="BASKETBALL" right={`${b.period} · ${b.clock}`}>
      <TeamRow y={112} side={b.away} sub={b.fouls ? `FOULS ${b.fouls.away}${b.bonus === 'away' ? '  ·  BONUS' : ''}` : undefined} />
      <TeamRow y={200} side={b.home} sub={b.fouls ? `FOULS ${b.fouls.home}${b.bonus === 'home' ? '  ·  BONUS' : ''}` : undefined} />
      <BottomStrip cells={[
        { label: 'PERIOD', value: b.period },
        { label: 'GAME CLOCK', value: b.clock },
        { label: 'SHOT CLOCK', value: b.shotClock != null ? String(b.shotClock) : 'OFF' },
      ]} />
    </Frame>
  );
}

function HockeyBoard({ b }: { b: Extract<Board, { kind: 'hockey' }> }) {
  return (
    <Frame label="ICE HOCKEY" right={`${b.period} · ${b.clock}`}>
      <TeamRow y={112} side={b.away} sub={b.sog ? `SOG ${b.sog.away}` : undefined} />
      <TeamRow y={200} side={b.home} sub={b.sog ? `SOG ${b.sog.home}` : undefined} />
      {b.situation && (
        <>
          <Rect x={396} y={90} width={252} height={40} rx={8} fill="transparent" stroke={SB.orange} strokeWidth={2} />
          <T x={522} y={116} size={15} color={SB.orange} anchor="middle">{b.situation}</T>
        </>
      )}
      <BottomStrip cells={[
        { label: 'PERIOD', value: b.period },
        { label: 'CLOCK', value: b.clock },
      ]} />
    </Frame>
  );
}

function SoccerBoard({ b }: { b: Extract<Board, { kind: 'soccer' }> }) {
  return (
    <Frame label="FOOTBALL / SOCCER" right={b.minute}>
      {/* home left, away right, big centered score */}
      <T x={150} y={150} size={24} color={SB.white} anchor="middle">{b.home.name.toUpperCase()}</T>
      <T x={150} y={178} size={14} color={SB.muted} anchor="middle">HOME</T>
      <T x={530} y={150} size={24} color={SB.white} anchor="middle">{b.away.name.toUpperCase()}</T>
      <T x={530} y={178} size={14} color={SB.muted} anchor="middle">AWAY</T>
      <T x={340} y={172} size={64} color={SB.amber} anchor="middle">{`${b.home.score} – ${b.away.score}`}</T>
      {/* minute chip */}
      <Rect x={290} y={196} width={100} height={36} rx={18} fill="transparent" stroke={SB.line} strokeWidth={2} />
      <T x={340} y={220} size={17} color={SB.green} anchor="middle">{b.minute}</T>
      {b.note && (
        <>
          <Line x1={8} y1={258} x2={672} y2={258} stroke={SB.line} strokeWidth={2} />
          <T x={340} y={302} size={16} color={SB.orange} anchor="middle">{b.note}</T>
        </>
      )}
    </Frame>
  );
}

function tallyStr(t: RugbyTally): string {
  return `T${t.t}  C${t.c}  P${t.p}  D${t.d}`;
}

function RugbyBoard({ b }: { b: Extract<Board, { kind: 'rugby' }> }) {
  return (
    <Frame label="RUGBY" right={b.clock}>
      <TeamRow y={112} side={b.home} sub={b.tally ? tallyStr(b.tally.home) : undefined} />
      <TeamRow y={200} side={b.away} sub={b.tally ? tallyStr(b.tally.away) : undefined} />
      {b.tally && <T x={652} y={80} size={12} color={SB.dim} anchor="end">T=TRY C=CON P=PEN D=DROP</T>}
      {b.note ? (
        <>
          <Line x1={8} y1={258} x2={672} y2={258} stroke={SB.line} strokeWidth={2} />
          <T x={340} y={302} size={16} color={SB.orange} anchor="middle">{b.note}</T>
        </>
      ) : (
        <BottomStrip cells={[{ label: 'CLOCK', value: b.clock }]} />
      )}
    </Frame>
  );
}

function TennisRowArt({ y, p, serving }: { y: number; p: TennisRow; serving: boolean }) {
  return (
    <>
      {serving && <Circle cx={36} cy={y - 7} r={6} fill={SB.green} />}
      <T x={56} y={y} size={22} color={SB.white}>{p.name.toUpperCase()}</T>
      {p.sets.map((s, i) => (
        <T key={i} x={396 + i * 52} y={y} size={26} color={i === p.sets.length - 1 ? SB.white : SB.muted} anchor="middle">{String(s)}</T>
      ))}
      <Rect x={572} y={y - 30} width={76} height={42} rx={8} fill="transparent" stroke={SB.line} strokeWidth={2} />
      <T x={610} y={y} size={24} color={SB.amber} anchor="middle">{p.points}</T>
    </>
  );
}

function TennisBoard({ b }: { b: Extract<Board, { kind: 'tennis' }> }) {
  const setCount = Math.max(b.p1.sets.length, b.p2.sets.length);
  return (
    <Frame label="TENNIS">
      {Array.from({ length: setCount }, (_, i) => (
        <T key={i} x={396 + i * 52} y={92} size={13} color={SB.dim} anchor="middle">{`S${i + 1}`}</T>
      ))}
      <T x={610} y={92} size={13} color={SB.dim} anchor="middle">PTS</T>
      <TennisRowArt y={148} p={b.p1} serving={b.server === 1} />
      <Line x1={24} y1={176} x2={656} y2={176} stroke={SB.line} strokeWidth={1} opacity={0.6} />
      <TennisRowArt y={228} p={b.p2} serving={b.server === 2} />
      {b.note && (
        <>
          <Line x1={8} y1={258} x2={672} y2={258} stroke={SB.line} strokeWidth={2} />
          <T x={340} y={302} size={16} color={SB.orange} anchor="middle">{b.note}</T>
        </>
      )}
      <T x={36} y={318} size={12} color={SB.dim}>● = SERVING</T>
    </Frame>
  );
}

function golfParColor(toPar: string): string {
  if (toPar.startsWith('-')) return SB.red;      // broadcast convention: under par = red
  if (toPar === 'E') return SB.white;
  return SB.blue;                                // over par
}

function GolfLeaderboard({ b }: { b: Extract<Board, { kind: 'golf' }> }) {
  return (
    <Frame label="GOLF · LEADERBOARD">
      <T x={40} y={92} size={13} color={SB.dim}>POS</T>
      <T x={110} y={92} size={13} color={SB.dim}>PLAYER</T>
      <T x={470} y={92} size={13} color={SB.dim} anchor="end">TO PAR</T>
      <T x={620} y={92} size={13} color={SB.dim} anchor="end">THRU</T>
      {b.rows.map((r: GolfRow, i: number) => {
        const y = 134 + i * 46;
        return (
          <React.Fragment key={i}>
            <T x={40} y={y} size={20} color={SB.muted}>{r.pos}</T>
            <T x={110} y={y} size={22} color={SB.white}>{r.name.toUpperCase()}</T>
            <T x={470} y={y} size={24} color={golfParColor(r.toPar)} anchor="end">{r.toPar}</T>
            <T x={620} y={y} size={20} color={SB.muted} anchor="end">{r.thru}</T>
          </React.Fragment>
        );
      })}
      {b.note && <T x={340} y={318} size={14} color={SB.orange} anchor="middle">{b.note}</T>}
    </Frame>
  );
}

function GolfHoleBoard({ b }: { b: Extract<Board, { kind: 'golf-hole' }> }) {
  return (
    <Frame label="GOLF · HOLE CARD">
      <T x={340} y={130} size={40} color={SB.white} anchor="middle">{`HOLE ${b.hole}`}</T>
      <Rect x={272} y={148} width={136} height={44} rx={10} fill="transparent" stroke={SB.amber} strokeWidth={2} />
      <T x={340} y={178} size={24} color={SB.amber} anchor="middle">{`PAR ${b.par}`}</T>
      <T x={340} y={238} size={22} color={SB.muted} anchor="middle">
        {`${b.player.toUpperCase()} — ${b.strokes > 0 ? `${b.strokes} STROKE${b.strokes === 1 ? '' : 'S'}` : 'ON THE TEE'}`}
      </T>
      {b.note && (
        <>
          <Line x1={8} y1={258} x2={672} y2={258} stroke={SB.line} strokeWidth={2} />
          <T x={340} y={302} size={16} color={SB.orange} anchor="middle">{b.note}</T>
        </>
      )}
    </Frame>
  );
}

function GolfMatchBoard({ b }: { b: Extract<Board, { kind: 'golf-match' }> }) {
  return (
    <Frame label="GOLF · MATCH PLAY">
      <T x={340} y={120} size={24} color={SB.white} anchor="middle">{`${b.p1.toUpperCase()}  vs  ${b.p2.toUpperCase()}`}</T>
      <T x={340} y={186} size={42} color={SB.amber} anchor="middle">{b.status}</T>
      <Rect x={280} y={206} width={120} height={36} rx={18} fill="transparent" stroke={SB.line} strokeWidth={2} />
      <T x={340} y={230} size={16} color={SB.green} anchor="middle">{`THRU ${b.thru}`}</T>
      {b.note && (
        <>
          <Line x1={8} y1={258} x2={672} y2={258} stroke={SB.line} strokeWidth={2} />
          <T x={340} y={302} size={16} color={SB.orange} anchor="middle">{b.note}</T>
        </>
      )}
    </Frame>
  );
}

function CricketBoard({ b }: { b: Extract<Board, { kind: 'cricket' }> }) {
  const oversLine = b.oversLimit ? `OVERS ${b.batting.overs} / ${b.oversLimit}` : `OVERS ${b.batting.overs}`;
  return (
    <Frame label="CRICKET">
      <T x={340} y={96} size={18} color={SB.muted} anchor="middle">{(b.header ?? `${b.batting.name.toUpperCase()} BATTING`)}</T>
      <T x={340} y={182} size={68} color={SB.amber} anchor="middle">{`${b.batting.runs}/${b.batting.wickets}`}</T>
      <T x={340} y={226} size={20} color={SB.white} anchor="middle">{oversLine}</T>
      <Line x1={8} y1={258} x2={672} y2={258} stroke={SB.line} strokeWidth={2} />
      {b.target != null && <T x={36} y={302} size={18} color={SB.green}>{`TARGET ${b.target}`}</T>}
      {b.note && <T x={652} y={302} size={15} color={SB.orange} anchor="end">{b.note}</T>}
    </Frame>
  );
}

// ── the public renderer ──────────────────────────────────────────────────────

function BoardArt({ board }: { board: Board }) {
  switch (board.kind) {
    case 'baseball': return <BaseballBoard b={board} />;
    case 'football': return <FootballBoard b={board} />;
    case 'basketball': return <BasketballBoard b={board} />;
    case 'hockey': return <HockeyBoard b={board} />;
    case 'soccer': return <SoccerBoard b={board} />;
    case 'rugby': return <RugbyBoard b={board} />;
    case 'tennis': return <TennisBoard b={board} />;
    case 'golf': return <GolfLeaderboard b={board} />;
    case 'golf-hole': return <GolfHoleBoard b={board} />;
    case 'golf-match': return <GolfMatchBoard b={board} />;
    case 'cricket': return <CricketBoard b={board} />;
  }
}

// Width-sized SVG wrapper (same sizing idiom as FieldEngine's FieldCanvas fill='width').
export function ScoreboardArt({ board }: { board: Board }) {
  return (
    <View style={{ borderRadius: 14, overflow: 'hidden' }}>
      <Svg viewBox={`0 0 ${SCOREBOARD_VB.w} ${SCOREBOARD_VB.h}`}
        style={{ width: '100%', aspectRatio: SCOREBOARD_RATIO, backgroundColor: SB.bg }}>
        <BoardArt board={board} />
      </Svg>
    </View>
  );
}
