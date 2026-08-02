// Foul Up Three? — data (VERBATIM from coaches-corner-spikes/basketballcorner/foul-up-three.html).
// The endgame bar argument: up three, clock dying, they have the ball — foul on the floor (two FTs,
// max two points, the tying three never exists) or defend the arc. The scenarios, the authored end
// states, the FT-formation choreography spots, the LED board flips and every grade/read string are
// the owner-reviewed tactical content — copied exactly, never re-derived. Prompts keep the spike's
// <b>…</b> emphasis markup; the component parses it (boldSegments) so no tags render.
//
// Scene geometry: this module draws its OWN 680×534 viewBox — LED board band (y 0–70) + the shared
// half-court paint translated to y=74. Court coordinates below are half-court-local (rim at
// 340,398), exactly as in the spike. Pure data — zero RN imports.

export type Pt = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type Grade = 'good' | 'ok' | 'bad';

export type FoulOpt = 'foul' | 'defend';
// The authored resolve choreographies.
export type FoulPlay = 'foulice' | 'nightmare' | 'contest' | 'heave';
// LED-board takeover palettes (screen bg + glyph colour).
export type BoardState = Grade | 'them' | 'you';

// [id, side, x, y, label] — orange = their offense, blue = your defense, purple = YOU.
// Position letters repeat on BOTH teams; colour separates them (owner rule).
export type CastEntry = [string, 'att' | 'def' | 'you', number, number, string];
// [x, y, label, labelX?, labelY?] — the dashed-teal "where the right call would have happened" ring.
export type GhostSpec = [number, number, string, number?, number?];
// [x, y, text, color] — an on-court note.
export type NoteSpec = [number, number, string, string];
// [state, message, sub] — a full-board LED takeover.
export type BoardMsg = [BoardState, string, string];

export interface BoardSpec {
  clock: string; you: number; them: number; to: string; toWarn?: boolean;
  note: { cap: string; val: string; warn?: boolean };
}

export interface FoulEnd {
  k: Grade;
  play: FoulPlay;
  ft1Make?: boolean;                 // did the first free throw drop? (FT 2 is derived: ball.y > 396)
  wrapLbl?: [number, number, string]; // the on-court "this is what a legal foul looks like" tag
  flips?: [BoardMsg, BoardMsg];      // the FT-by-FT board takeovers
  kick?: boolean;                    // the contest gets swung to the corner instead of a step-back
  shotFrom?: Pt;
  make?: boolean;
  pos: Record<string, Pt>;           // authored end state (finish snaps it)
  ball: Pt;
  bmsg: BoardMsg;                    // the final full-board takeover
  ghost?: GhostSpec;
  note?: NoteSpec;
}

export interface FoulScenario {
  tab: string;
  hStart: Pt;
  hLab: string;
  hQual: string;                     // the shooter-quality tag riding above the ball-handler
  five: [string, string][];          // THEIR FIVE — the scout
  board: BoardSpec;
  prompt: string;
  end: Record<FoulOpt, FoulEnd>;
  grade: Record<FoulOpt, { t: string; b: string }>;
  why: Record<Depth, string>;
}

// LED takeover palettes: [screen background, glyph colour].
export const BSTATES: Record<BoardState, [string, string]> = {
  good: ['#0a2a1c', '#3ff0a8'], ok: ['#2a2210', '#ffd23f'], bad: ['#2a0e0e', '#ff6a6a'],
  them: ['#0e1a2a', '#7fa8ff'], you: ['#241203', '#ffb36a'],
};

/* base cast: their five (orange) attacking the rim you protect; YOU on the ball.
   Position letters both ways — color separates the teams. AUDIT MIRROR in audit_basketball.py. */
export function baseCast(s: FoulScenario): CastEntry[] {
  return [
    ['h', 'att', s.hStart[0], s.hStart[1], s.hLab], ['c2', 'att', 62, 416, 'SG'], ['w3', 'att', 570, 330, 'SF'], ['b5', 'att', 400, 300, 'C'],
    ['o4', 'att', 190, 250, 'PF'],
    ['you', 'you', s.hStart[0], s.hStart[1] + 32, 'YOU — on the ball'],
    ['x2', 'def', 110, 396, 'SG'], ['x3', 'def', 538, 338, 'SF'], ['x5', 'def', 340, 330, 'C'], ['x4', 'def', 228, 288, 'PF'],
  ];
}

/* free-throw formation: defense owns both LOW lane slots (and the right THIRD slot) —
   assembled by jogging, never spawned. Their PF stays high as the kick-out safety. */
export const FTPOS: Record<string, Pt> = {
  h: [340, 272], b5: [300, 318], w3: [380, 318], x5: [300, 360], x3: [380, 360],
  x4: [380, 284], o4: [470, 140], c2: [180, 150], x2: [206, 168], you: [420, 170],
};

// The free-throw release spot (the shooter's hands at the line) and the two authored miss spots.
export const FT_RELEASE: Pt = [351, 264];
export const FT1_MISS: Pt = [322, 360];
export const FT2_MISS: Pt = [312, 346];

export const FIVE_CAP = 'THEIR FIVE — who would you rather see at the line?';
export const CLOSE_PROMPT = "The foul question is never 'points' — it's <b>which branches you let exist.</b>";
export const HINT_IDLE = "Clock, timeouts, and who'd shoot the free throws — all three vote.";
export const HINT_DONE = 'Reset, or defend another lead.';
export const TAG_TEXT: Record<Grade, string> = { good: 'Right call', ok: 'Defensible', bad: 'Wrong call' };

export const SCEN: FoulScenario[] = [
  {
    tab: '0:08 — no timeouts', hStart: [340, 110], hLab: 'PG', hQual: 'their closer · 39% from deep',
    five: [['PG', 'their closer · 39% 3PT · 85% FT'], ['SG', '37% 3PT · 79% FT'], ['SF', '41% 3PT · 90% FT'], ['PF', '31% 3PT · 74% FT'], ['C', '68% FT — crashes hard']],
    board: { clock: '0:08', you: 78, them: 75, to: 'NONE', note: { cap: 'YOU LEAD BY', val: '3' } },
    prompt: "Up three, 0:08, and they're out of timeouts. Their best shooters are spotting up. <b>Whistle, or hands up?</b>",
    end: {
      foul: {
        k: 'good', play: 'foulice', ft1Make: true,
        wrapLbl: [222, 96, 'foul — on the floor, before any shot'],
        flips: [['them', 'FT 1 GOOD', 'YOU 78 – THEM 76 · 0:06'], ['them', 'FT 2 — MISSED ON PURPOSE', 'BOX OUT…']],
        pos: { h: [340, 272], b5: [322, 332], w3: [380, 318], x5: [306, 350], x3: [380, 360], x4: [380, 284], o4: [470, 140], c2: [180, 150], x2: [206, 168], you: [420, 170] },
        ball: [312, 346],
        bmsg: ['good', 'GAME OVER', 'YOU 78 – THEM 76 · FINAL'],
        note: [210, 330, 'your board — horn', '#bfe9da'],
      },
      defend: {
        k: 'ok', play: 'contest', kick: true, shotFrom: [598, 394], make: true,
        pos: { h: [320, 240], you: [330, 270], w3: [598, 394], x3: [576, 372], x5: [340, 330], b5: [400, 300], c2: [62, 416], x2: [110, 396] },
        ball: [340, 404],
        bmsg: ['bad', 'OVERTIME', '78 – 78 · THE DOUBLE-CLUTCH DROPPED'],
        ghost: [372, 120, 'the foul lived here — before any shot'],
        note: [500, 330, 'pump, clutch — down it goes', '#ffb3ae'],
      },
    },
    grade: {
      foul: {
        t: 'Two points max — the three never exists',
        b: 'Eight seconds, no timeouts, up three: wrap their PG on the floor and the worst case is two free throws. They cut it to one, missed the second on purpose — and your C was standing where the rebound came down. The tying shot never got to exist.',
      },
      defend: {
        t: 'Defensible — you just offered the branch',
        b: "Straight defense wins this most nights too. But 'most nights' includes the one where the swing finds their SF for a double-clutch corner three over the closeout — and tonight it did. Fouling deletes that branch entirely; defending merely makes it unlikely.",
      },
    },
    why: {
      rookie: "Up three late, foul BEFORE they shoot: they only get two free throws, worth at most two points. From the line they literally cannot tie you. That's why the bench is screaming 'foul!'",
      beginner: 'The rule that powers it: a foul on the floor — before any shooting motion — gives two FTs, max two points. Even make-make leaves you up one with THEM needing to foul back. Endgame studies have fouling winning roughly 94% against high-80s for defending.',
      intermediate: "Execution is the play: foul around 0:06–0:08 so there's no time to repeat the cycle, wrap the ARMS so no shot can go up, and expect the intentional miss on FT 2 — box out the crash. 'No timeouts' seals it: after your rebound they can't even stop the clock.",
      expert: 'Why 94 beats 88: defending concedes a ~30–35% catch-and-shoot plus the foul-the-shooter disaster branch; fouling converts the possession into a chain that still leaves them trailing after its BEST outcome. The counter-cases — FT-miss putback, lightning two plus steal — price out around half the risk of letting the three fly. The bar argument ends there.',
    },
  },

  {
    tab: '0:02 — ball live', hStart: [340, 70], hLab: 'PG', hQual: 'a 40-footer ≈ 3% — even for a star',
    five: [['PG', 'the ball — a 40-footer ≈ 3%'], ['SG', "82% FT — can't touch it in 0:02"], ['SF', '86% FT'], ['PF', '74% FT'], ['C', '61% FT']],
    board: { clock: '0:02', you: 91, them: 88, to: 'NONE', note: { cap: 'BALL', val: 'LIVE' } },
    prompt: '0:02, live dribble at midcourt, down three. All their PG can manage is a heave. <b>Foul the dribble, or let it fly?</b>',
    end: {
      foul: {
        k: 'good', play: 'foulice', ft1Make: true,
        wrapLbl: [222, 56, 'foul the dribble — no shot motion'],
        flips: [['them', 'FT 1 GOOD', 'YOU 91 – THEM 89 · 0:01.5'], ['them', 'FT 2 — MISSED ON PURPOSE', 'SCRAMBLE…']],
        pos: { h: [340, 272], b5: [322, 332], w3: [380, 318], x5: [306, 350], x3: [380, 360], x4: [380, 284], o4: [470, 140], c2: [180, 150], x2: [206, 168], you: [420, 170] },
        ball: [312, 346],
        bmsg: ['good', 'GAME OVER', 'YOU 91 – THEM 89 · FINAL'],
        note: [210, 330, '1.5 seconds — nothing left', '#bfe9da'],
      },
      defend: {
        k: 'bad', play: 'heave', shotFrom: [340, 90], make: true,
        pos: { h: [340, 90], you: [340, 122], w3: [570, 330], b5: [400, 300], c2: [62, 416], x2: [110, 396], x3: [538, 338], x5: [340, 330] },
        ball: [340, 404],
        bmsg: ['bad', 'OVERTIME', '91 – 91 · THE PRAYER BANKED'],
        ghost: [340, 70, 'the right call: wrap HIM — the heave never exists', 176, 64],
        note: [492, 38, 'forty feet — bank — in', '#ffb3ae'],
      },
    },
    grade: {
      foul: {
        t: 'No prayer allowed',
        b: "Two seconds means their whole possession is one catch-and-heave. Foul the live dribble — before any gather — and the heave never happens: two FTs with 1.5 on the clock, an intentional miss into your box-out, horn. You traded a miracle's tiny odds for zero.",
      },
      defend: {
        t: 'You left the door cracked for a miracle',
        b: 'All you had to concede was two free throws. Instead the forty-footer got to leave his hand — and it banked. A ~5% shot you could have deleted for free is still a 5% loss you volunteered for.',
      },
    },
    why: {
      rookie: "With two seconds left, the only shot they have is a long prayer. Foul before the throw and even the prayer is gone — free throws can't tie you when you're up three.",
      beginner: 'Two FTs burn about half a second of game action; the intentional miss on the second forces a rebound scramble nobody can turn into a shot in 1.5 seconds. The one rule to respect: foul BEFORE the gather — a foul during a three-point attempt is three shots and a live nightmare.',
      intermediate: "'Ball live' is why the wrap is safe: against a live dribble mid-floor there's no shooting motion to collide with. On a catch near the arc, coaches teach body-not-arms the instant the ball touches his hands — referees can't call a shooting foul on a player who hasn't started shooting.",
      expert: 'The EV table at 0:02: defending a deep heave loses maybe 3–5% of the time. Fouling loses only through a parlay — make, intentional-miss offensive rebound, putback — that prices under 1%. When your losing branch requires three consecutive low-probability events, you take it over one clean biased coin flip. Every time.',
    },
  },

  {
    tab: '0:12 — they have a TO', hStart: [340, 110], hLab: 'PG', hQual: 'their closer · 39% from deep',
    five: [['PG', 'their closer · 39% 3PT · 85% FT'], ['SG', '37% 3PT · 79% FT'], ['SF', '41% 3PT — the inbound trigger'], ['PF', '31% 3PT · 74% FT'], ['C', '68% FT']],
    board: { clock: '0:12', you: 84, them: 81, to: '1 LEFT', toWarn: true, note: { cap: 'PENALTY', val: '2 SHOTS' } },
    prompt: "Up three at 0:12 — but they have a <b>timeout left</b>, and you're in the penalty. Does the foul trick still work with this much runway?",
    end: {
      defend: {
        k: 'good', play: 'contest', shotFrom: [438, 172], make: false,
        pos: { h: [438, 172], you: [432, 200], x5: [308, 346], b5: [400, 300], w3: [570, 330], x3: [538, 338], c2: [62, 416], x2: [110, 396] },
        ball: [300, 350],
        bmsg: ['good', 'GAME OVER', 'YOU 84 – THEM 81 · FINAL'],
        note: [548, 140, 'step-back at 0:04 — over a hand', '#bfe9da'],
      },
      foul: {
        k: 'bad', play: 'nightmare',
        wrapLbl: [222, 96, 'foul at 0:10 — the parade begins'],
        pos: { w3: [660, 308], h: [516, 208], c2: [62, 416], b5: [420, 286], you: [494, 236], x3: [612, 320], x5: [360, 330], x2: [110, 396], o4: [210, 250], x4: [248, 282] },
        ball: [340, 404],
        bmsg: ['bad', 'OVERTIME', '86 – 86 · THREE EXTRA LIFELINES'],
        ghost: [560, 258, 'a hand, not a whistle'],
        note: [560, 150, 'the timeout cashed — tied', '#ffb3ae'],
      },
    },
    grade: {
      defend: {
        t: 'No whistle, no lifeline',
        b: 'Twelve seconds plus a timeout is too much runway for the foul game — every stoppage lets them reset, advance, and reload. So you switched everything, stayed down, and made the step-back come over a hand at 0:04. Rebound, horn. The clock did the strangling.',
      },
      foul: {
        t: 'You fed the machine you feared',
        b: 'Foul at 0:10 and the parade starts: two made FTs, an instant foul back, your FTs — and then the TIMEOUT: ball advanced, fresh sideline set, catch-and-shoot, tied. Each stoppage was a lifeline and they held the ticket for the last one. With twelve seconds and a timeout banked, the foul stops deleting their chances and starts manufacturing them.',
      },
    },
    why: {
      rookie: 'The foul trick has a weakness: time. With 12 seconds AND a timeout left, fouling starts a free-throw parade that hands them chance after chance. Here you just play defense.',
      beginner: 'Count the stoppages fouling creates: their FTs, their instant foul back, your FTs, then their timeout to advance the ball to half court. Every one of them resets their offense and stops the clock they were dying by. Defending gives them ONE possession and zero resets.',
      intermediate: "The threshold most staffs teach: foul up three under about 7–8 seconds, or whenever they're out of timeouts; defend above that. The timeout is the hinge — 'advance the ball' turns your defensive rebound into their sideline catch-and-shoot. At 0:12 with a TO banked, the parade math flips against you.",
      expert: "Each foul cycle returns them ~4–5 seconds of stopped clock plus a live inbound, and the surviving timeout upgrades their worst branch (long rebound, backcourt) into a frontcourt set. Endgame simulations flip from foul-dominant to defend-dominant right around 8–10 seconds when a timeout survives. 'Always foul up three' is the bar version; the real rule has a clock and a timeout column.",
    },
  },

  {
    tab: '0:07 — 58% at the line', hStart: [340, 110], hLab: 'PG — 58% FT', hQual: 'their WORST free-throw shooter',
    five: [['PG', '58% FT — foul HIM'], ['SG', '81% FT'], ['SF', '88% FT — their closer'], ['PF', '77% FT'], ['C', '62% FT']],
    board: { clock: '0:07', you: 66, them: 63, to: 'NONE', note: { cap: 'THEIR PG FT%', val: '58%' } },
    prompt: 'Up three at 0:07 — and their PG on the ball shoots <b>58% from the line</b>. Does that change the argument?',
    end: {
      foul: {
        k: 'good', play: 'foulice', ft1Make: false,
        wrapLbl: [222, 96, 'wrap the 58% shooter — he shoots, not their closer'],
        flips: [['them', 'FT 1 — CLANK', '58% DOING 58% THINGS'], ['them', 'FT 2 GOOD', 'YOU 66 – THEM 64 · 0:05']],
        pos: { h: [340, 272], b5: [300, 318], w3: [380, 318], x5: [300, 360], x3: [380, 360], x4: [380, 284], o4: [470, 140], c2: [180, 150], x2: [206, 168], you: [420, 170] },
        ball: [340, 404],
        bmsg: ['good', 'GAME OVER', 'YOU 66 – THEM 64 · FINAL'],
        note: [210, 330, 'down 2, no timeouts — horn', '#bfe9da'],
      },
      defend: {
        k: 'ok', play: 'contest', shotFrom: [434, 168], make: false,
        pos: { h: [434, 168], you: [428, 196], x5: [310, 344], b5: [400, 300], w3: [570, 330], x3: [538, 338], c2: [62, 416], x2: [110, 396] },
        ball: [296, 348],
        bmsg: ['ok', 'GAME OVER', 'SURVIVED · YOU 66 – THEM 63'],
        ghost: [304, 128, 'the cheap foul lived here', 240, 168],
        note: [544, 138, 'rims out at the horn', '#ffe1b3'],
      },
    },
    grade: {
      foul: {
        t: 'Send the brick-layer to the line',
        b: "The math is doubly lovely: fouling up three already wins about 94% of the time, and tonight the man you're wrapping shoots 58% from the line — barely 1.2 expected points for your two-point budget. He clanked the first; your lead never got smaller than two.",
      },
      defend: {
        t: "You survived a branch you didn't need",
        b: 'The contest worked and the rim said no — fine. But you let a tying three exist against a team whose ball-handler hands you 1.16 expected points at the line. When the foul is this cheap, you buy it.',
      },
    },
    why: {
      rookie: "Extra reason to foul: the man with the ball makes only 58 of 100 free throws. Sending HIM to the line is the cheapest two points you'll ever concede.",
      beginner: "Price the branches: fouling him = 2 × 0.58 ≈ 1.16 expected points, and even the make-make case leaves you ahead. Defending = a tying three that erases your lead about 3 times in 10. Points aren't the currency — win probability is.",
      intermediate: "Foul selection is a scouting play: wrap the weak shooter BEFORE the swing pass reaches their closer. It's hack-a-big logic sharpened by the endgame — YOU choose who shoots. His 42% miss chance per attempt is your rebound-and-horn button.",
      expert: 'Compound it: P(make both) = 0.58² ≈ 34%, so two-thirds of the time your lead stays at two-plus with the clock nearly dead — and even make-make forces another full foul cycle they have no timeouts to run. Fouling up three runs ~94% baseline; against a 58% shooter it pushes toward the high 90s. The scout report is free basis points — collect them.',
    },
  },
];
