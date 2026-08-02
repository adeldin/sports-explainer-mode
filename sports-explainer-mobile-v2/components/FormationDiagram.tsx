import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle, G, Text as SvgText } from 'react-native-svg';
import { FE } from './FieldEngine';
import { layoutFormation, PlacedPlayer } from '../lib/formationLayout';

// ============================================================================
// FormationDiagram — the team sheet for Formations + Read the Play.
//
// It draws the SAME visual language as every modern module (striped turf, chalk
// boundary, halfway, centre circle, both penalty areas, outlined actors with
// travelling role labels) but on a PORTRAIT pitch attacking UP, not the shared
// landscape SoccerPitch.
//
// Why not reuse SoccerPitch: these two pieces are portrait, and a formation is a
// depth-and-width sheet. Projecting it a quarter-turn onto a 680x420 landscape
// canvas fits the whole pitch into a portrait column's WIDTH, which halves every
// player dot (~27pt across → ~11pt) — jersey numbers at that size are unreadable,
// and legibility is the one thing this screen exists for. A portrait viewBox uses
// the tall axis the layout actually has, so the dots stay the size they were while
// the pitch itself gets the modern treatment. Same reason the landscape modules
// size by height: match the canvas to the axis the content needs.
// ============================================================================

const VB_W = 440, VB_H = 680;
const F_BOLD = 'SpaceGrotesk_700Bold';   // RN-registry family name (loaded in App.tsx)
const GK_C = '#8e44ad';                  // keeper — shared with the modern soccer modules
const LBL_OUT = '#1b3a1b';               // dark outline so a label survives on turf
const CHALK = '#F4F4EE';

// Attacking UP: depth 0 = own goal line (bottom), depth 1 = attacking third (top).
// The band stops short of both goals so keeper and front line stay on the grass, and
// leaves room under the lowest dot for its travelling label.
const DY0 = 622, DY1 = 92;
const LX0 = 44, LX1 = 396;
const R = 16;                            // actor radius in viewBox units (~27pt on a phone — the size it was)
const pitchY = (depth: number) => DY0 + depth * (DY1 - DY0);
const pitchX = (lateral: number) => LX0 + lateral * (LX1 - LX0);

const ROLE_TAG: Record<string, string> = {
  G: 'GK', GK: 'GK',
  SW: 'SW',
  LB: 'LB', RB: 'RB',
  CB: 'CB', CD: 'CB', D: 'CB', CDL: 'CB', CDR: 'CB', CBL: 'CB', CBR: 'CB', LCB: 'CB', RCB: 'CB',
  LWB: 'LWB', RWB: 'RWB', WBL: 'LWB', WBR: 'RWB',
  DM: 'DM', CDM: 'DM', DMC: 'DM', LDM: 'DM', RDM: 'DM', DML: 'DM', DMR: 'DM',
  CM: 'CM', M: 'CM', MC: 'CM', LCM: 'CM', RCM: 'CM', CML: 'CM', CMR: 'CM',
  LM: 'LM', ML: 'LM', RM: 'RM', MR: 'RM',
  AM: 'AM', CAM: 'AM', AMC: 'AM', LAM: 'AM', RAM: 'AM', AML: 'AM', AMR: 'AM',
  F: 'ST', CF: 'ST', ST: 'ST', S: 'ST', LS: 'ST', RS: 'ST', SS: 'SS',
  LF: 'LW', LW: 'LW', FL: 'LW', RF: 'RW', RW: 'RW', FR: 'RW',
};
const roleTag = (abbr: string) => {
  const k = abbr.toUpperCase().replace(/[-\s]/g, '');
  return ROLE_TAG[k] ?? (k || '—');
};

// react-native-svg draws a Text stroke OVER its fill (no CSS paint-order), so an outlined
// label is two passes: outline first, fill on top. Same technique as every modern module.
function OutlinedText({ x, y, text, fill, size = 13, anchor = 'middle', outlineW = 3 }: {
  x: number; y: number; text: string; fill: string;
  size?: number; anchor?: 'middle' | 'start'; outlineW?: number;
}) {
  const common = { x, y, textAnchor: anchor, fontSize: size, fontFamily: F_BOLD };
  return (
    <>
      <SvgText {...common} fill="none" stroke={LBL_OUT} strokeWidth={outlineW} strokeLinejoin="round">{text}</SvgText>
      <SvgText {...common} fill={fill}>{text}</SvgText>
    </>
  );
}

function Actor({ x, y, num, role, gk }: { x: number; y: number; num: string; role: string; gk: boolean }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={R} fill={gk ? GK_C : FE.orange} stroke={FE.navy} strokeWidth={2.5} />
      <SvgText x={x} y={y + 5.5} textAnchor="middle" fontSize={15} fontFamily={F_BOLD} fill="#ffffff">{num}</SvgText>
      <OutlinedText x={x} y={y + R + 14} text={role} fill="#ffffff" size={12} />
    </G>
  );
}

// The pitch itself — the modern paint, rotated to portrait. Stripes run across the
// short axis so they read as the mown bands a broadcast camera shows.
function PortraitPitch() {
  const stripeH = VB_H / 10;
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => (
        <Rect key={`s${i}`} x={0} y={i * stripeH} width={VB_W} height={stripeH}
          fill={i % 2 ? FE.turfD : FE.turfL} />
      ))}
      <Rect x={6} y={6} width={VB_W - 12} height={VB_H - 12} fill="none" stroke={CHALK} strokeWidth={2} opacity={0.7} />
      <Line x1={6} y1={VB_H / 2} x2={VB_W - 6} y2={VB_H / 2} stroke={CHALK} strokeWidth={2} opacity={0.6} />
      <Circle cx={VB_W / 2} cy={VB_H / 2} r={58} fill="none" stroke={CHALK} strokeWidth={2} opacity={0.6} />
      <Circle cx={VB_W / 2} cy={VB_H / 2} r={3} fill={CHALK} opacity={0.7} />
      {/* attacking end (top) and own end (bottom): penalty area, 6-yard box, goal */}
      <Rect x={110} y={6} width={220} height={86} fill="none" stroke={CHALK} strokeWidth={2} opacity={0.7} />
      <Rect x={165} y={6} width={110} height={34} fill="none" stroke={CHALK} strokeWidth={2} opacity={0.7} />
      <Rect x={190} y={0} width={60} height={6} fill={CHALK} opacity={0.85} />
      <Rect x={110} y={VB_H - 92} width={220} height={86} fill="none" stroke={CHALK} strokeWidth={2} opacity={0.7} />
      <Rect x={165} y={VB_H - 40} width={110} height={34} fill="none" stroke={CHALK} strokeWidth={2} opacity={0.7} />
      <Rect x={190} y={VB_H - 6} width={60} height={6} fill={CHALK} opacity={0.85} />
    </>
  );
}

interface Props {
  team: any;                      // a summary.rosters[]-shaped entry (real team OR canonicalFormations.synthTeam)
  // Quiz mode: hide the formation name, which IS the answer to a name-the-shape question.
  hideFormationLabel?: boolean;
  fill?: 'width' | 'height';      // kept for call-site compatibility; portrait sizes by width
}

export default function FormationDiagram({ team, hideFormationLabel = false }: Props) {
  const formation: string = team?.formation ?? '';
  const players: PlacedPlayer[] = layoutFormation(team);

  return (
    <View style={styles.wrap}>
      <Svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={styles.svg}>
        <PortraitPitch />
        {/* Formation name — an on-pitch callout, hidden (→ "?") when the name is the answer. */}
        <OutlinedText
          x={20} y={34} anchor="start" size={22} outlineW={4}
          text={hideFormationLabel ? '?' : (formation || '—')}
          fill={hideFormationLabel ? '#dbe4f2' : FE.orange}
        />
        <OutlinedText x={VB_W - 18} y={34} anchor="middle" size={11} text="attacking ↑" fill="#dbe4f2" />
        {players.map((p, i) => {
          const role = roleTag(p.abbr);
          return (
            <Actor
              key={`${p.jersey}-${p.abbr}-${i}`}
              x={pitchX(p.x)}
              y={pitchY(p.y)}
              num={p.jersey}
              role={role}
              gk={role === 'GK'}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, overflow: 'hidden', backgroundColor: FE.turfD },
  svg: { width: '100%', aspectRatio: VB_W / VB_H },
});
