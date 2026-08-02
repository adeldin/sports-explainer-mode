// Pick Your Poison — data (VERBATIM from coaches-corner-spikes/basketballcorner/pick-your-poison.html).
// Pick-and-roll coverage: you're the BIG behind the screen choosing drop / switch / blitz. The
// scenarios, the authored end states, every grade/read string are the owner-reviewed tactical content —
// copied exactly, never re-derived. Prompts/chips keep the spike's <b>…</b> emphasis markup; the
// component parses it (boldSegments) so no tags render.
// Coordinates share the half-court viewBox (680×460, rim at 340,398). Pure data — zero RN imports.

export type Pt = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type Grade = 'good' | 'ok' | 'bad';

export type PoisonOpt = 'drop' | 'switch' | 'blitz';
export type PoisonActorId = 'h' | 'x1' | 'scr' | 'you' | 'c' | 'x2' | 'w' | 'x3' | 'pf' | 'dpf';
// The authored resolve choreographies (one per coverage × personnel outcome).
export type PoisonPlay = 'pullup' | 'iso' | 'drive' | 'seal' | 'trap-sail' | 'trap-kick' | 'trap-split';

// [x, y, label, labelX?, labelY?] — the dashed-teal "where the right coverage was" ring.
export type GhostSpec = [number, number, string, number?, number?];
// [x, y, text, color] — an on-court outcome note.
export type NoteSpec = [number, number, string, string];

export interface PoisonEnd {
  k: Grade;
  play: PoisonPlay;
  shotFrom?: Pt;                            // authored release spot (kept from the spike data)
  make?: boolean;
  three?: boolean;                          // a three arcs higher and hangs longer
  lanes?: boolean;                          // the 4-on-3 the pocket pass opens (3 dashed reads)
  cone?: Pt;                                // teal open-shot wedge, apex at this spot
  pos: Partial<Record<PoisonActorId, Pt>>;  // authored end state (finish snaps the rest)
  ball: Pt;
  burst?: [Pt, string];                     // explicit burst (else: rim if make, ball otherwise)
  ghost?: GhostSpec;
  note?: NoteSpec;
}

export interface PoisonScenario {
  tab: string;
  chips: string[];                          // HUD chips (may carry <b> emphasis)
  lab: { h: string; scr: string; you: string; c?: string };  // traveling stat-tag labels
  prompt: string;
  end: Record<PoisonOpt, PoisonEnd>;
  grade: Record<PoisonOpt, { t: string; b: string }>;
  why: Record<Depth, string>;
}

/* AUDIT MIRROR: coordinates + the develop/pullup keyframes are mirrored in audit_basketball.py.
   Their C plants the screen ON your PG's shoulder ([366,138]); on drop coverage their PG
   drives around that SAME shoulder via DRIVE_MID (graze 15–25px off the screen spot). */
export const BASE: Record<PoisonActorId, Pt> = {
  h: [400, 120], x1: [392, 150], scr: [390, 252], you: [348, 270], c: [62, 416],
  x2: [118, 392], w: [617, 416], x3: [586, 398], pf: [146, 242], dpf: [196, 290],
};
export const FREEZE: Record<PoisonActorId, Pt> = {
  h: [388, 118], x1: [390, 158], scr: [366, 138], you: [344, 262], c: [62, 416],
  x2: [118, 392], w: [617, 416], x3: [586, 398], pf: [150, 250], dpf: [200, 300],
};
export const DRIVE_MID: Pt = [352, 124];

// The over-the-top climb their PG's defender makes on drop coverage (spike-verbatim keyframes).
export const OVER_TOP: [Pt, Pt, Pt] = [[378, 146], [372, 122], [354, 114]];
// Where the blitz jumps to before the split (trap-split's first beat).
export const TRAP_SPOT: { you: Pt; x1: Pt; split1: Pt; split2: Pt } = {
  you: [408, 134], x1: [376, 150], split1: [392, 142], split2: [340, 240],
};
// The three reads a short roll opens — the dashed 4-on-3 lanes.
export const LANE_TARGETS: [Pt, Pt, Pt] = [[62, 416], [617, 416], [340, 398]];

// Fixed on-court labels (the rest come from each scenario's lab).
export const STATIC_LABELS: Partial<Record<PoisonActorId, string>> = {
  c: 'SG', w: 'SF', pf: 'PF', x1: 'PG', x2: 'SG', x3: 'SF', dpf: 'PF',
};

export const FILM_PROMPT = '<b>Watch the play develop…</b> their C walks up to plant the screen on your PG.';
export const CLOSE_PROMPT = 'Coverage is <b>choosing which bill to pay</b> — the scout sets the prices.';
export const HINT_IDLE = 'Scout the screener, not just the handler.';
export const HINT_DONE = 'Reset, or call the next coverage.';
export const TAG_TEXT: Record<Grade, string> = { good: 'Right coverage', ok: 'Defensible', bad: 'Wrong coverage' };

export const SCEN: PoisonScenario[] = [
  {
    tab: "He can't shoot", chips: ['Their PG <b>28% 3PT</b>', 'Dare the pull-up'],
    lab: { h: 'PG — 28% 3PT', scr: 'C', c: 'SG — 29% 3PT', you: 'YOU — big' },
    prompt: "Their C's screen is arriving on your PG — and their PG shoots <b>28%</b>. Call your coverage, big.",
    end: {
      drop: {
        k: 'good', play: 'pullup', shotFrom: [310, 250], make: false,
        pos: { you: [336, 330], h: [310, 250], x1: [326, 226], scr: [360, 300] }, ball: [302, 352],
        burst: [[302, 352], '#14B8A6'], note: [200, 300, '28% pull-up — clank', '#bfe9da'],
      },
      switch: {
        k: 'ok', play: 'drive', shotFrom: [330, 300], make: true,
        pos: { you: [368, 262], h: [330, 300], x1: [380, 282], scr: [372, 318] }, ball: [340, 404],
        note: [210, 252, 'big beaten off the dribble', '#ffe1b3'],
      },
      blitz: {
        k: 'ok', play: 'trap-kick', make: false, lanes: true,
        pos: { you: [408, 134], x1: [376, 150], h: [386, 104], scr: [368, 252], x2: [280, 356] }, ball: [310, 348],
        note: [180, 318, '4-on-3 — but 29% misses', '#ffe1b3'],
      },
    },
    grade: {
      drop: {
        t: 'The shot he hates, on a platter',
        b: "You sank, walled the paint, and dared a 28% shooter to prove it. The pull-up their PG settled for is worth about 0.85 a trip, and the drive and the roll both died in front of you. Drop looks passive — it's a dare with math behind it.",
      },
      switch: {
        t: 'Fine — but you volunteered for an island',
        b: 'Switching survives a non-shooter, but now you — the C — are guarding their PG thirty feet from the rim for no schematic reason, and one crossover puts him downhill. Drop gave you the same wall without the island.',
      },
      blitz: {
        t: 'You paid double for a single-coverage problem',
        b: "Two defenders sprinting at a man who can't shoot: the trap 'worked', the pocket pass still escaped, and your defense played 4-on-3 behind it. Their 29% corner SG clanked this time — the process was still backwards.",
      },
    },
    why: {
      rookie: "That defender sagging way back isn't lazy — it's a coverage called 'drop'. Against a handler who can't shoot, back up and dare him. His miss is your rebound.",
      beginner: "Coverage is pricing: PnR handlers average about 0.90–1.00 points a possession, and a 28% shooter's pull-up is worth about 0.85. Drop concedes exactly that shot while protecting the rim and the roll — the things worth 1.20+.",
      intermediate: 'Drop mechanics: the big guards TWO men — wall the drive, stay attached to the roll — while the guard fights over the screen so the pull-up is at least trailed. Against a non-shooter you sag a step deeper and erase the pocket pass too.',
      expert: "The blitz is the expensive coverage: it spends two defenders and opens a 4-on-3 rotation behind the ball. You pay that only for a shooter who breaks drop (1.10+ PPP on pull-ups). Paying it for a 28% shooter is buying insurance on a house that isn't burning.",
    },
  },

  {
    tab: 'Flamethrower handler', chips: ['Their PG <b>elite pull-up</b>', 'Their C <b>shaky passer</b>'],
    lab: { h: 'PG — elite pull-up', scr: 'C — shaky passer', you: 'YOU — big' },
    prompt: "Their PG shoots the pull-up at an elite clip — but their C <b>can't pass</b>. Coverage?",
    end: {
      blitz: {
        k: 'good', play: 'trap-sail',
        pos: { you: [408, 134], x1: [376, 150], h: [386, 104], scr: [372, 240] }, ball: [654, 282],
        burst: [[640, 282], '#14B8A6'], note: [540, 246, 'pocket pass sails — turnover', '#bfe9da'],
      },
      drop: {
        k: 'bad', play: 'pullup', shotFrom: [338, 158], make: true, three: true,
        pos: { you: [336, 330], h: [338, 158], x1: [382, 112], scr: [368, 136] }, ball: [340, 404],
        cone: [338, 158], ghost: [420, 120, 'the blitz lived here', 500, 146], note: [478, 224, '1.15+ behind the screen', '#ffb3ae'],
      },
      switch: {
        k: 'ok', play: 'iso', shotFrom: [438, 164], make: true, three: true,
        pos: { you: [416, 204], h: [438, 164], x1: [384, 278], scr: [368, 300] }, ball: [340, 404],
        ghost: [386, 128, 'two on the ball was on the menu', 300, 102], note: [520, 238, "tough — but he's elite", '#ffe1b3'],
      },
    },
    grade: {
      blitz: {
        t: 'Take the ball out of his hands',
        b: "The trap arrived with the screen, their PG picked up his dribble, and the only escape was a pocket pass their C throws badly — it sailed out of bounds. Elite pull-up shooters break drop coverage, so you don't play drop. You make someone else beat you.",
      },
      drop: {
        t: 'You gave a flamethrower his runway',
        b: "Drop concedes the pull-up — that's the deal. Against a 28% shooter it's a dare; against this PG it's a donation: he walked into 1.15-plus a trip behind his C's screen, untouched. The coverage wasn't wrong in general. It was wrong for THIS handler.",
      },
      switch: {
        t: 'A real answer — the second-best one',
        b: "The switch kills the pull-up but hands their PG an iso against you, and elite shooters hunt exactly that step-back. Call it 1.0 a possession — versus the turnovers and chaos the blitz buys when the release valve can't pass. Defensible, not optimal.",
      },
    },
    why: {
      rookie: 'Some handlers are so good at the pull-up jumper that letting them shoot is the worst option on the table. Send BOTH defenders at the ball and make anyone else make the play.',
      beginner: 'A blitz trades a 1.10–1.20 pull-up for a 4-on-3 behind the ball — a good trade only when the escape valve is broken. Here the roller is the man they hide: the trap forces their worst passer to play quarterback.',
      intermediate: 'Blitz mechanics: spring it AS the screen lands, so his airspace is gone before the rhythm dribble. Guard takes the split, big takes the retreat, weak-side low man tags the first pass. Every second the ball is stuck, your rotation gets a step back home.',
      expert: "Coverage EV against elite handlers: drop ≈ 1.10–1.20 (his pull-up), switch ≈ 0.95–1.05 (the hunted iso), blitz ≈ 0.85–0.95 when the short-roll passer is below average — the turnovers and resets pay for the rotation risk. The blitz isn't aggression; it's re-routing the possession through their worst decision-maker.",
    },
  },

  {
    tab: 'Late clock, iso star', chips: ['<b>SHOT CLOCK 0:06</b>', 'Your big is <b>mobile</b>'],
    lab: { h: 'PG — iso star', scr: 'C', you: 'YOU — big, mobile' },
    prompt: "Six on the shot clock. Their PG is calling for their C's screen — <b>he wants you switched onto him.</b> Give it to him?",
    end: {
      switch: {
        k: 'good', play: 'iso', shotFrom: [446, 172], make: false,
        pos: { you: [424, 216], h: [446, 172], x1: [382, 278], scr: [368, 300] }, ball: [292, 346],
        burst: [[292, 346], '#14B8A6'], note: [520, 212, 'horn — clank', '#bfe9da'],
      },
      drop: {
        k: 'ok', play: 'pullup', shotFrom: [326, 238], make: true,
        pos: { you: [336, 330], h: [326, 238], x1: [338, 214], scr: [360, 300] }, ball: [340, 404],
        note: [204, 266, 'his rhythm shot, on schedule', '#ffe1b3'],
      },
      blitz: {
        k: 'bad', play: 'trap-split', make: true,
        pos: { you: [372, 196], x1: [348, 176], h: [326, 360], scr: [368, 252], x2: [200, 380] }, ball: [340, 404],
        ghost: [430, 190, 'the switch lived here'], note: [220, 300, 'split — downhill 4-on-3', '#ffb3ae'],
      },
    },
    grade: {
      switch: {
        t: 'Trade it — and let the clock defend with you',
        b: "Six seconds is your ally: switch, stay square, and there's no time to attack your feet twice. The step-back came over a real contest with the horn coming — hero ball runs about 0.90 a possession, and that's a shot a defense is happy to sell.",
      },
      drop: {
        t: 'The gap he wanted',
        b: 'Drop leaves the pull-up window open, and a late-clock star needs exactly one rhythm dribble into it. Not a disaster — just his plan, executed. The switch takes the rhythm shot away entirely.',
      },
      blitz: {
        t: 'You opened the floor with six on the clock',
        b: 'The trap is the one coverage that can turn six dead seconds into a live 4-on-3: he split it, and your rim was unguarded at the worst possible moment. Late clock, the boring call — switch, stay down, contest — was the right one.',
      },
    },
    why: {
      rookie: "With only six seconds to shoot, the clock is on defense's side. Switch the screen so nobody is ever open, and make the star beat a fresh defender in a hurry.",
      beginner: "Iso possessions average about 0.90–1.00 points — hero ball is bad offense. The switch removes the free rhythm shot (drop's weakness) without opening rotations (blitz's weakness). You concede one hard shot and nothing else.",
      intermediate: 'Switching has costs on other nights — mismatches to punish, second chances. With six on the clock those costs vanish: no time to post your big or attack twice. Situational switching is free defense late in the clock.',
      expert: "Why not blitz the star? Because a trap's failure mode (split or skip into 4-on-3) produces the only good outcomes the offense has left, while its success — a reset — is worth almost nothing with six seconds. The switch compresses the outcome distribution to one contested one-on-one at the horn, the exact 0.90 shot you're happy to sell.",
    },
  },

  {
    tab: "Don't leave two", chips: ['Their C <b>1.30 PPP</b>', 'Corner SG <b>38%</b>', 'Shooters in <b>both corners</b>'],
    lab: { h: 'PG — elite pull-up', scr: 'C — 1.30 PPP', you: 'YOU — big', c: 'SG — 39% 3PT' },
    prompt: 'Elite pull-up PG — but their C runs <b>1.30 a possession</b> and both corners are live. Still want to trap?',
    end: {
      drop: {
        k: 'good', play: 'pullup', shotFrom: [338, 158], make: false, three: true,
        pos: { you: [336, 330], h: [338, 158], x1: [362, 184], scr: [356, 296] }, ball: [306, 352],
        burst: [[306, 352], '#14B8A6'], note: [478, 224, 'contested — rims out', '#bfe9da'],
      },
      blitz: {
        k: 'bad', play: 'trap-kick', make: true, lanes: true,
        pos: { you: [408, 134], x1: [376, 150], h: [386, 104], scr: [368, 248], x2: [262, 338] }, ball: [340, 404],
        cone: [62, 416], ghost: [312, 352, 'drop lived here', 258, 384], note: [168, 314, '39% corner — splash', '#ffb3ae'],
      },
      switch: {
        k: 'bad', play: 'seal', make: true,
        pos: { you: [386, 190], h: [408, 168], x1: [330, 310], scr: [350, 378] }, ball: [340, 404],
        ghost: [312, 338, 'drop lived here', 236, 318], note: [478, 300, 'mismatch inside — sealed', '#ffb3ae'],
      },
    },
    grade: {
      drop: {
        t: 'The least-bad door, chosen on purpose',
        b: 'Yes, their PG can shoot the pull-up — about 1.15 a trip behind the screen. But the blitz activates a 1.30 C into a 4-on-3 with 39% corners waiting, and the switch feeds that same C a mismatch. Drop concedes the best shot ONE man can create and refuses the better ones five men can. He rose over a trailing hand and missed; take that all night.',
      },
      blitz: {
        t: 'You fed the exact monster you feared',
        b: "The trap did its job on their PG — and the pocket pass did its job on you: a 1.30-PPP C downhill, your low man dragged in, corner splash at 39%. Against a great roller AND live corners, the blitz doesn't take the ball out of their hands; it hands the possession to their best math.",
      },
      switch: {
        t: 'The mismatch was the second trap',
        b: 'Your PG on their 1.30 C is a seal and a lob — the switch you made to stop one great shot created a better one at the rim. When the screener and the spacing both punish rotation, the coverage that rotates least wins.',
      },
    },
    why: {
      rookie: 'Sometimes every choice gives up something. The rule: give up the shot ONE player can make by himself, not the shots that come from your whole defense scrambling.',
      beginner: 'Count what each coverage opens. Drop: his pull-up, about 1.15. Blitz: a 1.30 roller playing 4-on-3 with corner shooters spotted up. Switch: that same roller sealing your guard at the rim. The pull-up is the cheapest item on the menu — buy it.',
      intermediate: "This is the flip of 'blitz the flamethrower', and the hinge is the ROLLER: a shaky passer makes the blitz cheap; a 1.30-PPP short-roll hub makes it catastrophic. Scout the second man — the screener decides the coverage more often than the handler does.",
      expert: "Elite offenses are EV networks: trap the handler and the possession re-routes through the roller at 1.25–1.35 with corners at 1.15+. Drop pins the possession in its lowest-value branch — a trailed pull-up, around 1.05 even for elite shooters. Coverage isn't about stopping their best player; it's about capping the possession's best available branch.",
    },
  },
];
