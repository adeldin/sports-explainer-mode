// FormationDiagram — on-device react-native-svg render of the formation diagram. Same approved
// visual as the standalone lib/formationSvg.ts string renderer, but emitted as <Svg> primitives so it
// draws in Expo Go. Pure presentational: reuses lib/formationLayout (coords) + lib/formationExplanations
// (text) + lib/formationSvg's wrap() (line-wrap w/ ellipsis). No data fetching here — pass a rosters[]
// team entry (has .roster, .formation, .team.displayName) + the difficulty level.

import { View } from 'react-native';
import Svg, { Rect, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { layoutFormation, PlacedPlayer } from '../lib/formationLayout';
import { FORMATION_EXPLANATIONS } from '../lib/formationExplanations';
import { wrap } from '../lib/formationSvg';
import type { Level } from '../lib/api';

// Fonts — RN-registry family names (loaded in App.tsx via @expo-google-fonts/space-grotesk).
const F_BOLD = 'SpaceGrotesk_700Bold';
const F_SEMI = 'SpaceGrotesk_600SemiBold';
const F_MED = 'SpaceGrotesk_500Medium';
const NAVY = '#0d1b3e', TEAL = '#14B8A6', ORANGE = '#E87722', WHITE = '#ffffff', MUTED = '#cbd5e1';

// Geometry — MIRRORS lib/formationSvg.ts (keep in sync). EXPL_H 170 fits up to 7 Coach-tier lines.
const MARGIN = 24, TITLE_H = 64, PITCH_W = 380, PITCH_H = 560, GAP = 18, EXPL_H = 170, TOP = 18;
const PAD = 34, R = 16;
const pitchLeft = MARGIN, pitchTop = TOP + TITLE_H, pitchRight = pitchLeft + PITCH_W, pitchBottom = pitchTop + PITCH_H;
const SVG_W = PITCH_W + MARGIN * 2;          // 428
const explTop = pitchBottom + GAP;           // 660
const SVG_H = explTop + EXPL_H + MARGIN;      // 854
const innerLeft = pitchLeft + PAD, innerRight = pitchRight - PAD, innerTop = pitchTop + PAD, innerBottom = pitchBottom - PAD;
const cx = (pitchLeft + pitchRight) / 2, cy = (pitchTop + pitchBottom) / 2;

const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
// normalized (x lateral, depth y=0 own end) → pixels (own end at BOTTOM, attack UP)
const px = (x: number) => innerLeft + x * (innerRight - innerLeft);
const py = (depth: number) => innerTop + (1 - depth) * (innerBottom - innerTop);

interface Props {
  team: any;            // a summary.rosters[] entry
  level: Level;
  // Quiz mode (additive; both default false → existing behavior UNCHANGED). hideFormationLabel hides
  // the formation title + team subtitle (so name-the-formation doesn't reveal the answer);
  // hideExplanation drops the COACH'S READ slot (and crops the now-unused bottom space).
  hideFormationLabel?: boolean;
  hideExplanation?: boolean;
}

export default function FormationDiagram({ team, level, hideFormationLabel = false, hideExplanation = false }: Props) {
  const formation: string = team?.formation ?? '';
  const teamName: string = team?.team?.displayName ?? '';
  const players: PlacedPlayer[] = layoutFormation(team);
  const explanation = (FORMATION_EXPLANATIONS as Record<string, Record<string, string>>)[formation]?.[level];
  const lines = explanation ? wrap(explanation, 58, 7) : [];

  // pitch markings (subtle teal)
  const boxW = PITCH_W * 0.55, boxH = PITCH_H * 0.14, boxX = cx - boxW / 2;
  const gaW = PITCH_W * 0.28, gaH = PITCH_H * 0.06, gaX = cx - gaW / 2;
  const ccR = PITCH_W * 0.13;
  const mark = { stroke: TEAL, strokeWidth: 1.5, strokeOpacity: 0.32, fill: 'none' as const };
  // When the explanation slot is hidden, crop the canvas to the pitch (no empty bottom band). Full
  // mode (hideExplanation=false) keeps SVG_H → viewBox/aspectRatio byte-identical to before.
  const bottom = hideExplanation ? pitchBottom + MARGIN : SVG_H;

  return (
    <View style={{ width: '100%', aspectRatio: SVG_W / bottom }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${SVG_W} ${bottom}`}>
        {/* ground */}
        <Rect x={0} y={0} width={SVG_W} height={bottom} fill={NAVY} />

        {/* title + team — hidden in name-the-formation quiz mode (would reveal the answer) */}
        {hideFormationLabel ? (
          <SvgText x={pitchLeft} y={TOP + 30} fontFamily={F_BOLD} fontSize={26} fill={MUTED} fillOpacity={0.5}>?</SvgText>
        ) : (
          <>
            <SvgText x={pitchLeft} y={TOP + 30} fontFamily={F_BOLD} fontSize={26} fill={ORANGE}>{formation || '—'}</SvgText>
            <SvgText x={pitchLeft} y={TOP + 50} fontFamily={F_MED} fontSize={13} fill={MUTED}>{`${teamName} · starting XI`}</SvgText>
          </>
        )}

        {/* pitch markings */}
        <Rect x={pitchLeft} y={pitchTop} width={PITCH_W} height={PITCH_H} rx={6} fill="none" stroke={TEAL} strokeWidth={1.5} strokeOpacity={0.4} />
        <Line x1={pitchLeft} y1={cy} x2={pitchRight} y2={cy} {...mark} />
        <Circle cx={cx} cy={cy} r={ccR} {...mark} />
        <Circle cx={cx} cy={cy} r={2} fill={TEAL} fillOpacity={0.4} />
        <Rect x={boxX} y={pitchBottom - boxH} width={boxW} height={boxH} {...mark} />
        <Rect x={gaX} y={pitchBottom - gaH} width={gaW} height={gaH} {...mark} />
        <Rect x={boxX} y={pitchTop} width={boxW} height={boxH} {...mark} />
        <Rect x={gaX} y={pitchTop} width={gaW} height={gaH} {...mark} />

        {/* players */}
        {players.map((p, i) => {
          const X = px(p.x), Y = py(p.y);
          return (
            <G key={`${p.jersey}-${i}`}>
              <Circle cx={X} cy={Y} r={R} fill={ORANGE} stroke={NAVY} strokeWidth={1.5} />
              <SvgText x={X} y={Y + 5} fontFamily={F_BOLD} fontSize={14} fill={WHITE} textAnchor="middle">{p.jersey}</SvgText>
              <SvgText x={X} y={Y + R + 11} fontFamily={F_MED} fontSize={8} fill={WHITE} textAnchor="middle">{trunc(p.shortName, 16)}</SvgText>
            </G>
          );
        })}

        {/* COACH'S READ slot — suppressed in quiz mode (would reveal the answer) */}
        {!hideExplanation && (
          <>
            <Rect x={pitchLeft} y={explTop} width={PITCH_W} height={EXPL_H} rx={8} fill={WHITE} fillOpacity={0.03} stroke={TEAL} strokeWidth={1} strokeOpacity={0.3} strokeDasharray="4 4" />
            <SvgText x={pitchLeft + 12} y={explTop + 20} fontFamily={F_SEMI} fontSize={10} fill={TEAL}>{`COACH'S READ · ${formation}`}</SvgText>
            {lines.length > 0 ? (
              lines.map((ln, i) => (
                <SvgText key={`l${i}`} x={pitchLeft + 12} y={explTop + 42 + i * 17} fontFamily={F_MED} fontSize={11} fill={MUTED}>{ln}</SvgText>
              ))
            ) : (
              <SvgText x={pitchLeft + 12} y={explTop + 46} fontFamily={F_MED} fontSize={11} fill={MUTED} fillOpacity={0.5}>— no read for this formation —</SvgText>
            )}
          </>
        )}
      </Svg>
    </View>
  );
}
