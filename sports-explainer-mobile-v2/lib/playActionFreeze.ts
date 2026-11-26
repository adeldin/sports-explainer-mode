// Play-Action Freeze: scenario data (RND-31, Scenario Bible approved by Anthony). The reads, the
// punisher for each wrong option and the four-level COACH'S READ texts are the tactical content and
// Anthony's review surface; keep them in step with the Scenario Bible, never re-derive them here.
// All fan-facing strings are prose only. Coordinates share the FootballField viewBox (680x380, LOS at
// x=235, offense attacking +x, one 5-yard line every 47 units, so about 9.4 units per yard).
// Facing downfield (+x), the offense's LEFT is the top of the field (small y), its RIGHT the bottom.
// Pure data: zero RN imports.

export interface Pt { x: number; y: number }
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type PafOptionId = 'dig' | 'shallow' | 'go';

// A mover has three spots: pre-snap (start), the frozen moment as the QB turns back (freeze), and
// where he finishes while the ball is in the air (end).
export interface Mover { start: Pt; freeze: Pt; end: Pt }

export interface PafOption {
  id: PafOptionId;
  correct: boolean;
  fieldLabel: string;              // short on-field route label
  buttonTitle: string;             // control-column choice button
  buttonSub: string;
  a11y: string;                    // VoiceOver / TalkBack label (plain words)
  receiver: { start: Pt; freeze: Pt; catch: Pt };
  // The defender who kills a wrong pick (named in the verdict), or null for the correct option.
  punisher: 'will' | 'rightCorner' | null;
  // Where the punisher finishes when this option is thrown (he arrives at the ball).
  punisherEnd?: Pt;
  led: string;                     // short outcome word on the field
  verdict: { title: string; body: string };
}

// ── the fixed picture: 1st and 10 at the offense's own 35, 11 personnel vs a Cover 3 shell ──
export const SITUATION = '1st and 10 at your own 35. Early in the game.';

export const QB: Mover = { start: { x: 205, y: 190 }, freeze: { x: 182, y: 187 }, end: { x: 180, y: 187 } };
export const QB_MESH: Pt = { x: 203, y: 194 };          // where he reaches back for the fake
// The running back: to the mesh for the fake, then he stays in to block (not an option).
export const RB0: Pt = { x: 168, y: 214 };
export const RB_MESH: Pt = { x: 204, y: 200 };
export const RB_BLOCK: Pt = { x: 212, y: 214 };
export const MESH_FRAC = 0.45;                          // share of the develop film spent reaching the mesh

export const OLINE: Pt[] = [
  { x: 218, y: 130 }, { x: 218, y: 160 }, { x: 218, y: 190 }, { x: 218, y: 220 }, { x: 218, y: 250 },
];
export const DLINE: Pt[] = [
  { x: 248, y: 145 }, { x: 248, y: 175 }, { x: 248, y: 205 }, { x: 248, y: 235 },
];
// The slot receiver runs a short route away from the picture; he is not tappable.
export const SLOT: Mover = { start: { x: 230, y: 112 }, freeze: { x: 262, y: 58 }, end: { x: 272, y: 50 } };

// Defense: Cover 3. One free safety deep middle, two corners in the deep outside thirds, four underneath.
export const MIKE: Mover = { start: { x: 313, y: 168 }, freeze: { x: 270, y: 174 }, end: { x: 278, y: 172 } };
export const WILL: Mover = { start: { x: 313, y: 218 }, freeze: { x: 272, y: 212 }, end: { x: 280, y: 210 } };
export const FREE_SAFETY: Mover = { start: { x: 470, y: 190 }, freeze: { x: 440, y: 182 }, end: { x: 406, y: 170 } };
export const LEFT_CORNER: Mover = { start: { x: 290, y: 72 }, freeze: { x: 400, y: 62 }, end: { x: 440, y: 62 } };
export const RIGHT_CORNER: Mover = { start: { x: 290, y: 306 }, freeze: { x: 420, y: 308 }, end: { x: 470, y: 310 } };
export const NICKEL: Mover = { start: { x: 298, y: 116 }, freeze: { x: 306, y: 90 }, end: { x: 300, y: 74 } };
export const SAM: Mover = { start: { x: 300, y: 268 }, freeze: { x: 316, y: 282 }, end: { x: 326, y: 288 } };

export const OPTIONS: PafOption[] = [
  {
    id: 'dig', correct: true,
    fieldLabel: 'dig',
    buttonTitle: 'Dig, behind the linebackers',
    buttonSub: 'left receiver, breaking in about 15 yards deep',
    a11y: 'Left receiver, in-breaking route behind the linebackers',
    receiver: { start: { x: 232, y: 70 }, freeze: { x: 368, y: 96 }, catch: { x: 392, y: 163 } },
    punisher: null,
    led: 'COMPLETE',
    verdict: {
      title: 'Right read: the space behind them',
      body: 'The fake pulled the linebackers forward and left the middle empty behind them. You threw it before the safety could close.',
    },
  },
  {
    id: 'shallow', correct: false,
    fieldLabel: 'shallow',
    buttonTitle: 'Shallow cross to the tight end',
    buttonSub: 'about 5 yards, across the middle',
    a11y: 'Tight end, short crossing route',
    receiver: { start: { x: 220, y: 276 }, freeze: { x: 256, y: 238 }, catch: { x: 292, y: 200 } },
    punisher: 'will',
    punisherEnd: { x: 296, y: 204 },
    led: 'BROKEN UP',
    verdict: {
      title: 'The Will linebacker was waiting',
      body: 'The fake moved the linebackers forward, right into this lane. The Will stepped up into the short middle, exactly where the tight end was crossing, so the fake made this route worse, not better. The open space was behind them.',
    },
  },
  {
    id: 'go', correct: false,
    fieldLabel: 'go',
    buttonTitle: 'Go route down the sideline',
    buttonSub: 'right receiver, 30 yards and more',
    a11y: 'Right receiver, deep route down the sideline',
    receiver: { start: { x: 232, y: 310 }, freeze: { x: 380, y: 314 }, catch: { x: 548, y: 316 } },
    punisher: 'rightCorner',
    punisherEnd: { x: 556, y: 312 },
    led: 'BROKEN UP',
    verdict: {
      title: 'The cornerback stayed on top',
      body: 'Play-action fools the players who watch the backfield. In Cover 3 the cornerback’s job was to stay deeper than the outside receiver, so the run fake did not pull him up. He was on top of the route.',
    },
  },
];

export const correctOption = (): PafOption => OPTIONS.find(o => o.correct)!;

// The one-sentence teaching point (Scenario Bible).
export const TEACHING_POINT =
  'Play-action pulls the linebackers forward, so the open space is right behind them in the middle of the field, not underneath them and not deep outside.';

// COACH'S READ, four levels (Four Levels notes in the Scenario Bible).
export const WHY: Record<Depth, string> = {
  rookie: 'The fake makes the linebackers step toward the line to stop a run. Throw it into the empty space right behind them.',
  beginner: 'Linebackers guard the middle of the field. The run fake moved them forward, so the middle behind them was empty. ' + TEACHING_POINT,
  intermediate: 'The window behind the linebackers is real, but it closes. The free safety drives down from the deep middle toward it. Throw on time and it fits; hold the ball one beat and the safety arrives.',
  expert: TEACHING_POINT + ' Defenders who read their keys (eyes on the offensive linemen, who show pass blocking) bite less, which is why the fake works best when the line blocks like a run.',
};
