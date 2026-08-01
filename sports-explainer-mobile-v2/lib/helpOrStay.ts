// Help or Stay? — data (VERBATIM from coaches-corner-spikes/basketballcorner/help-or-stay.html).
// High pick-and-roll; you're the LOW MAN choosing help / stay / stunt. The scenarios, the
// authored end states, every grade/read string, and the personnel-scout strip are the
// owner-reviewed tactical content — copied exactly, never re-derived. Prompts/chips keep the
// spike's <b>…</b> emphasis markup; the component parses it (boldSegments) so no tags render.
// Coordinates share the half-court viewBox (680×460, rim at 340,398). Pure data — zero RN imports.

export type Pt = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type Grade = 'good' | 'ok' | 'bad';

export type HelpOpt = 'help' | 'stay' | 'stunt';
export type HelpActorId = 'h' | 'x1' | 'r' | 'x5' | 'c' | 'you' | 'w' | 'x3' | 'pf' | 'dpf';

// [x, y, label, labelX?, labelY?] — the dashed-teal "where the right call was" ring.
export type GhostSpec = [number, number, string, number?, number?];
// [x, y, text, color] — an on-court outcome note.
export type NoteSpec = [number, number, string, string];

export interface HelpEnd {
  k: Grade;
  pos: Partial<Record<HelpActorId, Pt>>;   // authored end state (finish snaps the rest)
  ball: Pt;
  shot: 'lob' | 'skip3' | 'floater' | 'layup' | 'pullup' | null;  // null = the tag (no shot)
  make?: boolean;
  runway?: boolean;                        // red open-dive-lane wash
  cone?: boolean;                          // teal open-shot wedge from the corner shooter
  burst?: [Pt, string];                    // explicit burst (else: rim if make, ball otherwise)
  ghost?: GhostSpec;
  note?: NoteSpec;
}

export interface HelpScenario {
  tab: string;
  chips: string[];                         // HUD chips (may carry <b> emphasis)
  lab: { c: string; r: string; x5: string; you: string };  // traveling stat-tag labels
  five: [string, string][];                // THEIR FIVE — the scout (position, note)
  prompt: string;
  end: Record<HelpOpt, HelpEnd>;
  grade: Record<HelpOpt, { t: string; b: string }>;
  why: Record<Depth, string>;
}

/* base spots, and the freeze (the moment of the choice).
   SCREEN sits ON the on-ball defender's path; the PG drives around the SAME shoulder. */
export const BASE: Record<HelpActorId, Pt> = {
  h: [400, 120], x1: [392, 150], r: [390, 252], x5: [336, 330], c: [62, 416],
  you: [230, 408], w: [617, 416], x3: [586, 398], pf: [524, 232], dpf: [488, 268],
};
export const FREEZE: Record<HelpActorId, Pt> = {
  h: [300, 242], x1: [320, 210], r: [352, 308], x5: [328, 344], c: [62, 416],
  you: [255, 390], w: [617, 416], x3: [562, 388], pf: [530, 246], dpf: [478, 282],
};
export const SCREEN: Pt = [366, 138];        // planted on the blue PG's shoulder
export const DRIVE_MID: Pt = [352, 122];     // the PG's shoulder-graze past the screen (15–25px off SCREEN)

// Fixed on-court labels (the rest come from each scenario's lab).
export const STATIC_LABELS: Partial<Record<HelpActorId, string>> = {
  h: 'PG', w: 'SF', pf: 'PF', x1: 'PG', x3: 'SF', dpf: 'PF',
};

export const FIVE_CAP = 'THEIR FIVE — the scout';
export const FILM_PROMPT = '<b>Watch the play develop…</b> their C lifts to screen, your C sits in drop.';
export const CLOSE_PROMPT = 'Help defense is a <b>trade</b> — price both shots before you move.';
export const HINT_IDLE = "Rim ≈ 1.30 points a shot. The corner depends on who's standing in it.";
export const HINT_DONE = 'Reset, or pick another possession.';
export const TAG_TEXT: Record<Grade, string> = { good: 'Right read', ok: 'Defensible', bad: 'Wrong read' };

export const SCEN: HelpScenario[] = [
  {
    tab: 'Lob threat diving', chips: ['Corner SG <b>29% 3PT</b>', 'Their C <b>lob threat</b>'],
    lab: { c: 'SG — 29% 3PT', r: 'C — lob threat', x5: 'C', you: 'YOU — low man' },
    five: [['PG', 'handler — turns the corner'], ['SG', '29% 3PT — your man'], ['SF', '34% 3PT — far corner'], ['PF', '19% 3PT — non-shooter'], ['C', 'lob threat — 1.30 at the rim']],
    prompt: "Their PG has turned the corner, their C has a runway, and your man — their SG — shoots <b>29%</b>. You're the low man — what do you give up?",
    end: {
      help: {
        k: 'good', pos: { you: [300, 368], r: [322, 352], x5: [368, 384], h: [296, 258], x1: [318, 224] }, ball: [307, 255], shot: null,
        burst: [[312, 360], '#14B8A6'], note: [230, 318, 'tagged — lob dead', '#bfe9da'],
      },
      stay: {
        k: 'bad', pos: { you: [150, 398], r: [356, 362], x5: [330, 378], h: [298, 252], x1: [318, 222] }, ball: [340, 404], shot: 'lob', make: true,
        runway: true, ghost: [268, 344, 'the tag you owed', 268, 318], note: [480, 322, 'lob finishes — 1.30', '#ffb3ae'],
      },
      stunt: {
        k: 'ok', pos: { you: [128, 394], r: [352, 360], x5: [330, 378], h: [298, 252], x1: [318, 222] }, ball: [340, 404], shot: 'lob', make: true,
        ghost: [268, 344, 'full help lived here', 268, 318], note: [478, 326, 'gathers — scores', '#ffe1b3'],
      },
    },
    grade: {
      help: {
        t: 'Tag made — you traded away their best shot',
        b: "You left a 29% shooter (about 0.87 points a trip) to erase their C's lob at the rim (about 1.30). The bump knocks him off his dive, their PG has to bail out, and if they want that corner now it's a 60-foot skip you have time to chase.",
      },
      stay: {
        t: 'You guarded 0.87 and donated 1.30',
        b: "You hugged a 29% SG while their C walked in a lob. The rim shot is worth about 1.30 a trip; the corner you protected is worth 0.87. The low man's rim duty comes first — that's why the spot has a name.",
      },
      stunt: {
        t: "Half a tag doesn't stop a lob",
        b: "Your jab slowed him a beat, but a lob-threat C needs a body in his path, not a bluff — he gathers and scores anyway. Against an A-threat at the rim you commit fully and live with the 29% corner.",
      },
    },
    why: {
      rookie: 'The shot at the rim is the best shot in basketball — about 1.3 points every try. A 29% corner shooter earns about 0.87. Leave the weak shooter, stop the dunk.',
      beginner: 'Help defense is a trade, so price both sides: rim ≈ 1.30 points per shot, this corner ≈ 0.87 (29% × 3). When the gap is that wide, the low man tags the roller every single time.',
      intermediate: "The tag isn't a block, it's a bump — meet the dive early, around the dotted line, chest to shoulder, then recover. On time it kills the lob AND leaves the corner skip a long rainbow you can close out under.",
      expert: "Untagged PnR dives run 1.25–1.35 points a possession; a real tag drags that under 1.0 because the pocket and lob both die and the handler must reuse his dribble. The 29% corner skip is the shot your coverage is DESIGNED to concede — you're not gambling, you're pricing.",
    },
  },

  {
    tab: 'Flamethrower corner', chips: ['Corner SG <b>43% 3PT</b>', 'Your C <b>already in drop</b>'],
    lab: { c: 'SG — 43% 3PT', r: 'C', x5: 'C — drop, set', you: 'YOU — low man' },
    five: [['PG', 'handler — turns the corner'], ['SG', '43% 3PT — flamethrower'], ['SF', '36% 3PT — far corner'], ['PF', '20% 3PT — non-shooter'], ['C', 'roller — your C waits in drop']],
    prompt: 'Same action — but that corner SG hits <b>43%</b>, and your C is already parked between ball and rim. Help or stay?',
    end: {
      stay: {
        k: 'good', pos: { you: [150, 398], h: [318, 296], x5: [324, 322], r: [366, 352], x1: [330, 266] }, ball: [298, 352], shot: 'floater', make: false,
        burst: [[100, 412], '#14B8A6'], note: [452, 316, 'floater rims out — the 0.85 you wanted', '#bfe9da'],
      },
      help: {
        k: 'bad', pos: { you: [300, 368], r: [322, 352], h: [296, 258], x1: [210, 320], x5: [368, 384] }, ball: [340, 404], shot: 'skip3', make: true,
        cone: true, ghost: [98, 378, 'stay here', 148, 372], note: [168, 344, '1.29 a trip — splash', '#ffb3ae'],
      },
      stunt: {
        k: 'ok', pos: { you: [104, 396], r: [352, 344], h: [298, 252], x1: [318, 222], x5: [322, 372] }, ball: [340, 404], shot: 'skip3', make: true,
        cone: true, note: [190, 336, 'late hand — still 43%', '#ffe1b3'],
      },
    },
    grade: {
      stay: {
        t: 'The corner stays closed — the drop does its job',
        b: "A 43% corner three is about 1.29 a trip — their best shot, better than most rim attempts. Your C was already between ball and rim, so their PG's floater over the drop (~0.85) was always the shot you wanted them to take.",
      },
      help: {
        t: 'You created their best shot',
        b: "The rim was already covered — your C was sitting in the drop. Your rotation doubled a solved problem and opened the one shot that wasn't solved: a 1.29-a-trip corner three from their SG. Help should close doors, not open them.",
      },
      stunt: {
        t: "A gamble you didn't need",
        b: "The jab pulls you one pass-width off a 43% SG, and the skip arrives while you're recovering. The late hand shaves it to maybe 1.1 — still their best offer of the night, and the drop had the rim handled anyway.",
      },
    },
    why: {
      rookie: "Not every shooter is equal. A 43% corner shooter scores more per shot than most layup attempts. Don't leave him — your C is already guarding the rim.",
      beginner: 'Two questions before helping: how good is my man, and is the rim already covered? Here: 43% corner = 1.29 points a trip, and your C in drop turns the drive into a 0.85 floater. Both answers say stay.',
      intermediate: "'Help the helper' has a corollary: don't help the helped. With the drop set, your job flips from protect-the-rim to never-let-1.29-breathe. Stay attached; if their C seals truly deep, decide again one beat later.",
      expert: "The coverage already priced their C: drop concedes floaters (~0.85) precisely to erase rim (1.30) and corner (1.29). A low man leaving an elite shooter to double a covered rim is negative EV twice in the same second — the worst defender on a possession is usually the one solving a solved problem.",
    },
  },

  {
    tab: 'Up 3, 0:14', chips: ['<b>UP 3</b> · 0:14 · Q4', "Any two <b>can't beat you</b>"],
    lab: { c: 'SG — the tying shot', r: 'C — diving', x5: 'C', you: 'YOU — low man' },
    five: [['PG', 'handler'], ['SG', 'the tying shot lives here'], ['SF', '33% 3PT — also ties it'], ['PF', '22% 3PT'], ['C', "diving — a dunk can't beat you"]],
    prompt: "You're up three, fourteen seconds left. Their C is diving hard. <b>Does personnel even matter now?</b>",
    end: {
      stay: {
        k: 'good', pos: { you: [150, 398], h: [322, 372], x5: [296, 344], r: [396, 336], x1: [330, 300] }, ball: [340, 404], shot: 'layup', make: true,
        burst: [[100, 412], '#14B8A6'], note: [482, 368, "two — you're still up one", '#bfe9da'],
      },
      help: {
        k: 'bad', pos: { you: [300, 368], r: [322, 352], h: [296, 258], x1: [210, 320], x5: [368, 384] }, ball: [340, 404], shot: 'skip3', make: true,
        cone: true, ghost: [98, 378, 'up 3 — live here', 154, 372], note: [168, 344, 'TIE GAME', '#ffb3ae'],
      },
      stunt: {
        k: 'bad', pos: { you: [104, 396], r: [352, 344], h: [298, 252], x1: [318, 222], x5: [322, 372] }, ball: [340, 404], shot: 'skip3', make: true,
        cone: true, ghost: [96, 344, 'never leave the arc', 176, 338], note: [190, 308, 'tied — off your fingertips', '#ffb3ae'],
      },
    },
    grade: {
      stay: {
        t: "A two can't beat you — the arc can",
        b: "The scoreboard ended the debate: any two still leaves them behind, so the rim — the best shot in basketball all night — is suddenly worth nothing to them. The only shot that hurts you is the three. Glue yourself to the corner and hand over the layup with a smile.",
      },
      help: {
        t: "You defended a shot that can't hurt you",
        b: "The lob you sprinted to stop was worth zero — a dunk makes it a one-point game with the clock dying and the ball coming to you. The skip to the corner you vacated was the tie. Late-game defense reads the score first and the personnel second.",
      },
      stunt: {
        t: 'Half-off the only shot that matters',
        b: "Up three, any drift off the arc is a freebie — the skip fires the instant your weight shifts inside. There is no 'recover' when one catch-and-shoot ties the game.",
      },
    },
    why: {
      rookie: 'Up three late, a two-pointer cannot tie you. The only dangerous shot is the three — so stand next to the three-point shooters and let the layup go.',
      beginner: 'Shot values flip with the scoreboard. All game the rim (≈1.30) beats the corner (≈1.10). Up three inside twenty seconds, the rim is worth zero to their win chance and the corner three is worth everything. Defend win probability, not points.',
      intermediate: "'No threes' is a called coverage: zero help off the arc, funnel every drive to the rim, and never foul the layup — their two costs you nothing but four seconds of clock, and the clock is on your team.",
      expert: "Price it: conceding the layup trims your win probability a few points; conceding a decent corner look is roughly a one-in-three ticket to overtime — a coin-flip game you were leading by three. Every late-game model lands in the same place: guard the line, gift the rim, and don't bail anyone out with a foul.",
    },
  },

  {
    tab: 'Two threats at once', chips: ['Their C <b>1.30 PPP</b>', 'Corner SG <b>38%</b>'],
    lab: { c: 'SG — 38% 3PT', r: 'C — 1.30 PPP', x5: 'C', you: 'YOU — low man' },
    five: [['PG', 'handler — finds the open man'], ['SG', '38% 3PT — live'], ['SF', '35% 3PT — far corner'], ['PF', '21% 3PT'], ['C', '1.30 PPP roller — elite']],
    prompt: 'Elite C rolling AND a live corner SG. Full help opens a 1.14 shot; staying opens 1.30. <b>Split the difference?</b>',
    end: {
      stunt: {
        k: 'good', pos: { you: [128, 394], r: [348, 338], h: [300, 252], x1: [318, 222], x5: [318, 374] }, ball: [296, 356], shot: 'pullup', make: false,
        burst: [[296, 356], '#14B8A6'], note: [200, 304, 'late-clock pull-up — off', '#bfe9da'],
      },
      help: {
        k: 'ok', pos: { you: [300, 368], r: [322, 352], h: [296, 258], x1: [210, 320], x5: [368, 384] }, ball: [340, 404], shot: 'skip3', make: true,
        cone: true, note: [168, 344, '1.14 — the B-plus bill', '#ffe1b3'],
      },
      stay: {
        k: 'bad', pos: { you: [150, 398], r: [356, 362], x5: [330, 378], h: [298, 252], x1: [318, 222] }, ball: [340, 404], shot: 'lob', make: true,
        runway: true, ghost: [268, 344, 'the stunt lived here', 268, 318], note: [480, 322, '1.30 — on time', '#ffb3ae'],
      },
    },
    grade: {
      stunt: {
        t: 'The fake defended both',
        b: "Two hard steps at the dive made their PG pick up his dribble and their C slow his cut — and you were back out before any skip could land. You never fully left either threat; you made both reads late and ugly. That's the entire art of the stunt.",
      },
      help: {
        t: 'You stopped the A-threat and paid B-plus',
        b: "Full commitment kills the lob, but a 38% corner SG (about 1.14 a trip) is a real bill and this PG will find him. Defensible trade — the stunt just buys most of the tag without ever fully opening the pass.",
      },
      stay: {
        t: '1.30 at the rim, untouched',
        b: "Against an elite rolling C, no tag means the lob arrives on time — about 1.30 a trip. You protected the second-best shot on the floor and conceded the best one.",
      },
    },
    why: {
      rookie: "Sometimes both choices are bad. A 'stunt' is a fake: jump toward the roller to scare the pass, then hurry back to your shooter before he can shoot.",
      beginner: "The stunt works because passers react to your first step, not your assignment. The handler sees help coming and picks up; the roller slows his dive. Two threats, both delayed — and you're home for the skip.",
      intermediate: 'Timing is the skill: stunt AT the pocket-pass window — the beat the handler turns the corner with his eyes down — and recover on his gather. A late stunt is the worst of both worlds: no tag, no closeout.',
      expert: 'Stunts are how modern defenses guard 1.30-PPP rollers without spraying the corners: bluff the tag, kill the first two reads, and force the handler into read number three — a late-clock pull-up around 0.90. The box score never credits the fake; the shot chart does.',
    },
  },
];
