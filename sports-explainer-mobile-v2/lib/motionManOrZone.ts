// Man or Zone? — pre-snap motion coverage-read data (VERBATIM from motion-man-or-zone.html). The
// tells — the traveler, the bump, the halfway pass-off ("match") — are the tactical content and
// Anthony's review surface; copied exactly, never re-derived. Each scenario carries both verdicts
// (called it / missed it) plus 4-depth COACH'S READ texts. All fan-facing strings are prose only.
// Coordinates share the FootballField viewBox (680×380, LOS at x=235). Pure data — zero RN imports.
//
// Scen 3 note (from the spike): the mid backer's post-motion spot is (302,238) so the halted nickel
// at (300,205) never freezes ON TOP of him (anti-stacking rule).

export interface Pt { x: number; y: number }
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type CoverageCall = 'man' | 'zone';

export interface MotionVerdict { t: string; b: string }
export interface MotionScenario {
  tab: string;
  answer: CoverageCall;
  nickel: { p0: Pt; mid: Pt; end: Pt };  // the candidate traveler: p0 → mid (first 55%) → end (last 45%)
  backers: Pt[]; backersEnd: Pt[];       // underneath backers: shuffle / handoff during the motion
  corners: Pt[]; safeties: Pt[];
  confirm: 'lock' | 'zoneDrop';          // the post-snap beat: lock onto people, or drop to landmarks
  verd: { good: MotionVerdict; bad: MotionVerdict };
  why: Record<Depth, string>;
}

// ── the motion man's orbit (verbatim): bottom slot → top slot BEHIND the backfield ──
// Two quadratic bows around the QB/RB (closest approach to the RB: 28px, both radii clear).
export const M0: Pt = { x: 222, y: 300 };
export const M1: Pt = { x: 222, y: 110 };
export const MC1: Pt = { x: 150, y: 262 };
export const MM: Pt = { x: 150, y: 190 };
export const MC2: Pt = { x: 150, y: 118 };
export function motionPos(f: number): Pt {
  if (f <= 0.5) {
    const t = f / 0.5, mt = 1 - t;
    return { x: mt * mt * M0.x + 2 * mt * t * MC1.x + t * t * MM.x, y: mt * mt * M0.y + 2 * mt * t * MC1.y + t * t * MM.y };
  }
  const t = (f - 0.5) / 0.5, mt = 1 - t;
  return { x: mt * mt * MM.x + 2 * mt * t * MC2.x + t * t * M1.x, y: mt * mt * MM.y + 2 * mt * t * MC2.y + t * t * M1.y };
}

// ── static formation (verbatim) ──
export const OLINE: Pt[] = [{ x: 228, y: 150 }, { x: 228, y: 170 }, { x: 228, y: 190 }, { x: 228, y: 210 }, { x: 228, y: 230 }];
export const DLINE: Pt[] = [{ x: 248, y: 152 }, { x: 248, y: 182 }, { x: 248, y: 212 }, { x: 248, y: 240 }];
export const QB: Pt = { x: 205, y: 190 };
export const RB: Pt = { x: 178, y: 190 };
export const WR_TOP: Pt = { x: 235, y: 70 };
export const WR_BOT: Pt = { x: 235, y: 330 };
export const BALL_AT: Pt = { x: 213, y: 190 };

// ── the post-snap confirmation beat (verbatim) ──
export const WR_REL: Pt[] = [{ x: 330, y: 86 }, { x: 330, y: 318 }];   // receivers release
export const MOT_REL: Pt = { x: 336, y: 146 };                         // the motion man releases
export const LOCK_CORNERS: Pt[] = [{ x: 344, y: 80 }, { x: 344, y: 304 }]; // man: corners lock (bottom 8px high so tags clear)
export const LOCK_NICKEL: Pt = { x: 350, y: 152 };
export const ZONE_LANDMARKS: Pt[] = [{ x: 330, y: 120 }, { x: 330, y: 260 }, { x: 300, y: 190 }];
export const DROP_BK0: Pt = { x: 330, y: 120 };
export const DROP_BK1: Pt = { x: 300, y: 190 };
export const DROP_NICKEL: Pt = { x: 330, y: 260 };

export const SCEN: MotionScenario[] = [
  {
    tab: 'He gets chased', answer: 'man',
    nickel: { p0: { x: 300, y: 286 }, mid: { x: 300, y: 286 }, end: { x: 300, y: 124 } },   // travels the whole way
    backers: [{ x: 300, y: 170 }, { x: 300, y: 215 }], backersEnd: [{ x: 300, y: 170 }, { x: 300, y: 215 }],
    corners: [{ x: 290, y: 80 }, { x: 290, y: 315 }], safeties: [{ x: 440, y: 140 }, { x: 440, y: 250 }],
    confirm: 'lock',
    verd: {
      good: {
        t: 'Man — the shadow gave it away',
        b: 'That nickel defender crossed the entire formation glued to one player. Zone defenders never abandon their side of the field for one man — only a defender assigned to a PERSON does that.',
      },
      bad: {
        t: 'Look again — somebody followed',
        b: "You called zone, but watch the reveal: the defender ran with the motion man step for step and locks onto him after the snap. Grass doesn't move; that defender's assignment did.",
      },
    },
    why: {
      rookie: "Send a runner across and watch: if one defender chases him the whole way, they're guarding PEOPLE — that's man coverage.",
      beginner: 'The travel is the tell. A defender who follows the motion across the formation has a name on his assignment sheet, not a patch of field. Now the offense knows rubs and crossers will work.',
      intermediate: "Man confirmed changes the call: pick routes, mesh crossers, and isolating your best receiver on their worst cover man all come alive. Motion didn't just move a player — it bought information.",
      expert: "Coordinators know the tell too, so some travel is disguise: a defender trails then buzzes out post-snap. That's why quarterbacks stack clues — travel plus safety depth plus corner leverage — before trusting one.",
    },
  },
  {
    tab: 'They just bump over', answer: 'zone',
    nickel: { p0: { x: 300, y: 286 }, mid: { x: 300, y: 286 }, end: { x: 300, y: 286 } },   // stays home
    backers: [{ x: 300, y: 170 }, { x: 300, y: 215 }], backersEnd: [{ x: 300, y: 148 }, { x: 300, y: 196 }], // shuffle one spot toward motion
    corners: [{ x: 290, y: 80 }, { x: 290, y: 315 }], safeties: [{ x: 440, y: 140 }, { x: 440, y: 250 }],
    confirm: 'zoneDrop',
    verd: {
      good: {
        t: 'Zone — nobody took the bait',
        b: "The motion man ran across and no defender went with him — the underneath players just shuffled over one spot to rebalance. They're splitting the field into patches of grass, and the patches don't move.",
      },
      bad: {
        t: "Nobody chased — that's the tell you missed",
        b: 'You called man, but no defender traveled: the nearest ones bumped one gap over and the two safeties never flinched. After the snap they sink into landmarks, not people. Guarding grass, not names.',
      },
    },
    why: {
      rookie: "If nobody chases your runner — the defenders just scoot over a little — they're each guarding an area of the field. That's zone.",
      beginner: "The 'bump' is the zone signature: motion changes the offense's strength, so the defense re-balances its zones, but no individual leaves his patch. Two deep safeties staying put is a second clue.",
      intermediate: "Zone confirmed means attack the seams between patches: hooks settling in the soft spots, flooding one zone with two receivers, and holding defenders with the quarterback's eyes.",
      expert: 'Count the shell too: two-high safeties that never rotate through the motion lean zone. The full pre-snap read is travel + shell + corner leverage — three clues that lie less often together than alone.',
    },
  },
  {
    tab: 'The half-truth', answer: 'zone',
    nickel: { p0: { x: 300, y: 286 }, mid: { x: 300, y: 205 }, end: { x: 300, y: 205 } },   // travels halfway, passes him off
    backers: [{ x: 300, y: 170 }, { x: 300, y: 215 }], backersEnd: [{ x: 300, y: 132 }, { x: 302, y: 238 }], // top backer takes the handoff
    corners: [{ x: 290, y: 80 }, { x: 290, y: 315 }], safeties: [{ x: 440, y: 140 }, { x: 440, y: 250 }],
    confirm: 'zoneDrop',
    verd: {
      good: {
        t: 'Zone — he handed him off',
        b: 'The tricky one: the nickel started traveling, then stopped and passed the motion man to the next defender like a baton. A true man defender never lets go of his assignment. A handoff means zones with rules — still grass, just smarter grass.',
      },
      bad: {
        t: 'He let go — man never lets go',
        b: 'You called man because he started to chase, but watch the reveal: he stops halfway and the backer picks up the motion man instead. That pass-off is the zone giveaway — a man defender is married to his receiver; this one filed for a trade mid-route.',
      },
    },
    why: {
      rookie: 'Trick one: the defender starts chasing... then stops and lets a teammate take over. A real man-to-man defender never hands his player away.',
      beginner: "The handoff is the tell inside the tell. Following halfway then passing off means the defenders are trading responsibilities by rule — that's zone behavior wearing a man costume.",
      intermediate: "This is 'match' coverage: it starts as zone, then defenders lock onto whoever enters their area. Against it, the offense attacks the handoff moment itself — crossers timed to arrive mid-trade.",
      expert: 'Match zone is the modern default precisely because it muddies this read. The counter-tells: who takes the final third, whether the safety caps the motion side, and whether the pass-off is clean or a beat late — that late beat is the throw.',
    },
  },
];
