// Find the Open Man — play data (VERBATIM from find-the-open-man.html). The reads — which receiver is
// open and WHY (the Cover-2 flat, Cover-3 curl, Mesh-rub, and the leverage notes) — are the tactical
// content and Anthony's review surface (D1 authority); copied exactly, never re-derived. Each receiver
// carries explanations at four depths (rookie/beginner/intermediate/expert); the tier selector reveals
// the deeper read + (Intermediate+) the leverage arrow. All fan-facing strings are prose only — route
// names + position letters (X/Z/H, like QB/RB) are football labels, not internals; no coordinates leak.
// Coordinates share the FootballField viewBox (680×380, LOS at x=235). Pure data — zero RN imports.
// (One fix vs. the prototype: a mojibake "cloud/âsky" in the Curl-Go expert note is restored to the
// real Cover-3 term "cloud/sky rules" — an encoding glitch, not a content change.)

export interface Pt { x: number; y: number }
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';

export interface Receiver {
  id: string;                     // X / Y / Z / H — position letter (on-field label prefix, not shown alone)
  label: string;                  // e.g. "Z (flat)"; routeName() strips to the fan-facing "flat"
  start: Pt;                      // pre-snap alignment
  win: Pt;                        // post-snap catch window
  open: boolean;                  // the one open receiver per play (the correct answer)
  exp: Record<Depth, string>;     // explanation at each tier (fan-facing prose)
}
export interface Defender {
  role: string;                   // CB / LB / S (on-field label)
  lev: string;                    // coverage level (deep / middle / trail / man / press) — drives nothing graded
  x: number; y: number;           // pre-snap spot
  to: Pt;                         // post-snap spot
}
export interface Play {
  key: string;
  name: string;                   // scenario-pill label (fan-facing prose)
  qb: { x: number; y: number; drop?: Pt };
  receivers: Receiver[];
  defenders: Defender[];
}

// The one open receiver (the correct pick), and the fan-facing route name from a label ("Z (flat)" → "flat").
export const openReceiver = (p: Play): Receiver | undefined => p.receivers.find(r => r.open);
export const routeName = (label: string): string => label.replace(/^[A-Z]+ \(/, '').replace(/\)$/, '');

export const PLAYS: Play[] = [
  {
    key: 'slantFlat', name: 'Slant-Flat vs Cover 2',
    qb: { x: 205, y: 190, drop: { x: 180, y: 190 } },
    receivers: [
      {
        id: 'X', label: 'X (slant)', start: { x: 235, y: 80 }, win: { x: 345, y: 150 }, open: false,
        exp: {
          rookie: "Covered. A defender was sitting right where this ball would go.",
          beginner: "The slant breaks inside, but that's right into the middle of the defense. A linebacker and a safety are both there.",
          intermediate: "In Cover 2 the middle is patrolled by the linebackers underneath and safeties over the top. A slant runs straight into that traffic — the window shuts fast.",
          expert: "Slant vs Cover 2 is a classic trap: the backer walls the inside break and the half-field safety drives downhill. Unless the throw is on time and low, it's a jump-ball for the defense.",
        },
      },
      {
        id: 'Z', label: 'Z (flat)', start: { x: 235, y: 305 }, win: { x: 300, y: 330 }, open: true,
        exp: {
          rookie: "Open! The nearest defender ran deep and left this spot empty.",
          beginner: "The corner dropped back to guard the deep sideline, so nobody's left to cover the short flat. Easy throw.",
          intermediate: "Cover 2 corners sink to protect the deep half. That vacates the flat underneath — the back leaks out into grass the corner just left.",
          expert: "The flat is the Cover 2 answer: the corner's deep-half responsibility pulls him off the underneath, and the near safety can't cover both the seam and the flat. Throw it before the corner can drive back down.",
        },
      },
      {
        id: 'H', label: 'H (sit)', start: { x: 235, y: 190 }, win: { x: 310, y: 200 }, open: false,
        exp: {
          rookie: "Covered. A linebacker dropped right onto this spot.",
          beginner: "The hook route sits down in the middle — which is exactly where the linebacker drops in this coverage.",
          intermediate: "The middle hook window belongs to the linebackers in Cover 2. Sitting there just settles into their zone.",
          expert: "The hook is late to open against two-deep because the Mike carries it and the Will sinks under the dig. It can come open vs. a blitz, but not against this base drop.",
        },
      },
    ],
    defenders: [
      { role: 'CB', lev: 'deep', x: 290, y: 95, to: { x: 340, y: 75 } },
      { role: 'CB', lev: 'deep', x: 290, y: 300, to: { x: 355, y: 285 } },
      { role: 'LB', lev: 'middle', x: 300, y: 175, to: { x: 322, y: 188 } },
      { role: 'LB', lev: 'middle', x: 300, y: 130, to: { x: 340, y: 158 } },
      { role: 'S', lev: 'deep', x: 430, y: 130, to: { x: 440, y: 120 } },
      { role: 'S', lev: 'deep', x: 430, y: 250, to: { x: 440, y: 260 } },
    ],
  },
  {
    key: 'curlGo', name: 'Curl-Go vs Cover 3',
    qb: { x: 205, y: 190, drop: { x: 180, y: 190 } },
    receivers: [
      {
        id: 'X', label: 'X (go)', start: { x: 235, y: 80 }, win: { x: 415, y: 90 }, open: false,
        exp: {
          rookie: "Covered. The defender ran deep right with him.",
          beginner: "The corner is sprinting to guard the deep part of the field — he's right on top of the go route.",
          intermediate: "Cover 3 corners bail to their deep thirds. A go route runs straight into that deep-third responsibility. Contested.",
          expert: "Vs a spot-drop Cover 3 corner, the vertical is covered by leverage and depth. You'd need an outside release and a back-shoulder throw — not a first read.",
        },
      },
      {
        id: 'Z', label: 'Z (curl)', start: { x: 235, y: 305 }, win: { x: 340, y: 300 }, open: true,
        exp: {
          rookie: "Open! The defender ran deep and this receiver stopped underneath him.",
          beginner: "The corner ran to the deep zone, and the receiver curled back underneath into the space he left. Open grass.",
          intermediate: "The curl settles in the void underneath a bailing Cover 3 corner, before the flat defender can widen to it. That soft spot is the Cover 3 beater.",
          expert: "Curl-flat stresses the cloud/sky rules: the corner's deep-third bail plus a late-widening hook defender leaves the 12-15 yard curl window open in front of the corner's eyes.",
        },
      },
      {
        id: 'H', label: 'H (seam)', start: { x: 235, y: 190 }, win: { x: 370, y: 150 }, open: false,
        exp: {
          rookie: "Covered. There's a defender deep in the middle waiting.",
          beginner: "The seam runs up the middle — straight into the single deep safety.",
          intermediate: "In Cover 3 the free safety owns the deep middle. A seam runs right at him unless something holds him.",
          expert: "The seam can bend away from the middle-field safety vs Cover 3, but with no divider route holding him, he sits over the top. Covered.",
        },
      },
    ],
    defenders: [
      { role: 'CB', lev: 'deep', x: 300, y: 90, to: { x: 435, y: 78 } },
      { role: 'CB', lev: 'deep', x: 300, y: 300, to: { x: 400, y: 300 } },
      { role: 'LB', lev: 'middle', x: 300, y: 210, to: { x: 340, y: 230 } },
      { role: 'LB', lev: 'middle', x: 300, y: 165, to: { x: 350, y: 175 } },
      { role: 'S', lev: 'deep', x: 430, y: 190, to: { x: 450, y: 155 } },
    ],
  },
  {
    key: 'mesh', name: 'Mesh vs Man',
    qb: { x: 205, y: 190, drop: { x: 180, y: 190 } },
    receivers: [
      {
        id: 'X', label: 'X (cross)', start: { x: 235, y: 95 }, win: { x: 360, y: 230 }, open: true,
        exp: {
          rookie: "Open! His defender got stuck behind traffic and couldn't keep up.",
          beginner: "Two receivers crossed right past each other. This one's defender got caught behind the other and fell a step behind.",
          intermediate: "The mesh crossers create a natural rub. X's man gets picked and ends up trailing — in man coverage that half-step is separation.",
          expert: "The mesh point forces a switch-or-trail decision; the trailing defender is beaten across his face. In man-free, the QB reads the rub and hits the crosser away from the safety's leverage.",
        },
      },
      {
        id: 'Y', label: 'Y (cross)', start: { x: 235, y: 285 }, win: { x: 360, y: 150 }, open: false,
        exp: {
          rookie: "Covered. His defender stayed right with him.",
          beginner: "This crosser's defender went over the top of the mesh and never lost him.",
          intermediate: "Y's man took the over-path at the mesh and stayed attached — no rub, no separation.",
          expert: "The defender who goes over the mesh avoids the pick; without separation this crosser is a throwaway read behind the open one.",
        },
      },
      {
        id: 'Z', label: 'Z (corner)', start: { x: 235, y: 70 }, win: { x: 430, y: 55 }, open: false,
        exp: {
          rookie: "Covered. A defender is right there with help behind.",
          beginner: "Press coverage on the outside with a safety leaning that way. Tightly contested.",
          intermediate: "Press-man on the corner route with free-safety help over the top — low-percentage, not the primary read.",
          expert: "The corner route is the clear-out that widens the safety and opens the mesh underneath. It's a decoy here, not the answer.",
        },
      },
    ],
    defenders: [
      { role: 'CB', lev: 'trail', x: 290, y: 110, to: { x: 340, y: 215 } },
      { role: 'CB', lev: 'man', x: 290, y: 280, to: { x: 352, y: 158 } },
      { role: 'CB', lev: 'press', x: 280, y: 75, to: { x: 410, y: 60 } },
      { role: 'S', lev: 'deep', x: 445, y: 120, to: { x: 430, y: 110 } },
    ],
  },
];
