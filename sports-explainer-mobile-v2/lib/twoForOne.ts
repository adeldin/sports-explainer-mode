// Two-for-One — data (VERBATIM from coaches-corner-spikes/basketballcorner/two-for-one.html).
// End-of-quarter clock management: shoot now / run the set / hold for last. The scenarios, the
// authored end states, the possession-map bands, the LED board messages and every grade/read string
// are the owner-reviewed tactical content — copied exactly, never re-derived. Prompts keep the
// spike's <b>…</b> emphasis markup; the component parses it (boldSegments) so no tags render.
//
// Scene geometry: this module draws its OWN 680×608 viewBox — LED board band (y 0–92) + the
// POSSESSION MAP strip (y 94–142) + the shared half-court paint translated to y=148. Court
// coordinates below are half-court-local (rim at 340,398), exactly as in the spike.
// Pure data — zero RN imports.

export type Pt = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type Grade = 'good' | 'ok' | 'bad';

export type TwoOpt = 'shoot' | 'run' | 'hold';
// The authored resolve choreographies.
export type TwoPlay = 'corner3' | 'setlook' | 'holdforce' | 'pullup2' | 'holdwin' | 'quick3' | 'breaklay' | 'pullout';
// LED-board takeover palettes (screen bg + glyph colour).
export type BoardState = Grade | 'them' | 'you';

// [id, side, x, y, label] — orange = your offense, blue = their defense; the position letters
// repeat on BOTH teams and colour separates them (owner rule).
export type CastEntry = [string, 'att' | 'def', number, number, string];
// [fromSeconds, toSeconds, side, label] — one POSSESSION MAP band.
export type Band = [number, number, 'you' | 'them', string];
// [x, y, label, labelX?, labelY?] — the dashed-teal "the shot you passed up" ring.
export type GhostSpec = [number, number, string, number?, number?];
// [x, y, text, color] — an on-court note / pre-call fact tag.
export type NoteSpec = [number, number, string, string];

export interface BoardSpec {
  clock: string; shot: string; shotWarn?: boolean; you: number; them: number; period: string;
}

export interface TwoEnd {
  k: Grade;
  play: TwoPlay;
  pos: Record<string, Pt>;      // authored end state (finish snaps it)
  ball: Pt;
  shotFrom?: Pt;                // the release spot when it differs from the handler's end spot
  bands: Band[];                // the possession map, resolved band-by-band
  bmsg: [BoardState, string, string];   // the final full-board takeover
  ghost?: GhostSpec;
  note?: NoteSpec;
}

export interface TwoScenario {
  tab: string;
  board: BoardSpec;
  cast: CastEntry[];
  fact?: NoteSpec;              // the pre-call on-court tell (cleared the moment you choose)
  prompt: string;
  T0: number;                   // seconds on the game clock at the freeze — the map's full width
  end: Record<TwoOpt, TwoEnd>;
  grade: Record<TwoOpt, { t: string; b: string }>;
  why: Record<Depth, string>;
}

// LED takeover palettes: [screen background, glyph colour].
export const BSTATES: Record<BoardState, [string, string]> = {
  good: ['#0a2a1c', '#3ff0a8'], ok: ['#2a2210', '#ffd23f'], bad: ['#2a0e0e', '#ff6a6a'],
  them: ['#0e1a2a', '#7fa8ff'], you: ['#241203', '#ffb36a'],
};

export const fmtT = (s: number): string => '0:' + String(s).padStart(2, '0');

/* the shared half-court cast: full 5v5, position letters both ways.
   AUDIT MIRROR: coordinates mirrored in audit_basketball.py. */
export const HALF: CastEntry[] = [
  ['h', 'att', 340, 120, 'PG'], ['c2', 'att', 62, 416, 'SG — 40% 3PT'], ['w3', 'att', 560, 300, 'SF'], ['b5', 'att', 400, 360, 'C'],
  ['o4', 'att', 170, 240, 'PF'],
  ['x1', 'def', 340, 152, 'PG'], ['x3', 'def', 530, 320, 'SF'], ['x5', 'def', 340, 340, 'C'], ['x4', 'def', 222, 278, 'PF'],
];

// The corner the swing/kick finds (the spike's hard-coded corner release spot).
export const CORNER: Pt = [62, 416];

export const WATCH_PROMPT = '<b>Watch the play develop…</b>';
export const CLOSE_PROMPT = 'Read the possession map — <b>count who shoots, and when.</b>';
export const HINT_IDLE = 'Game clock vs shot clock — they vote together.';
export const HINT_DONE = 'Reset, or try another clock.';
export const STRIP_CAP = 'POSSESSION MAP';
export const STRIP_IDLE = '— your call plays out here —';
export const TAG_TEXT: Record<Grade, string> = { good: 'Right call', ok: 'Defensible', bad: 'Wrong call' };

export const SCEN: TwoScenario[] = [
  {
    tab: '0:41 — corner open', board: { clock: '0:41', shot: '18', you: 54, them: 52, period: 'Q3' },
    cast: HALF.concat([['x2', 'def', 180, 350, 'SG']]),
    fact: [180, 318, 'their SG sags off — your corner is open', '#bcd3ff'],
    prompt: "0:41, and your SG's corner look is <b>already there</b>. Shoot it now, work for better, or hold?",
    T0: 41,
    end: {
      shoot: {
        k: 'good', play: 'corner3',
        pos: { h: [340, 120], c2: [62, 416], x2: [98, 404] }, ball: [340, 404],
        bands: [[41, 36, 'you', 'SHOT 1 ✓'], [36, 9, 'them', 'their possession'], [9, 0, 'you', 'SHOT 2 — the free one']],
        bmsg: ['good', '2-FOR-1 BANKED', 'SHOT 1 +3 · SHOT 2 AT 0:09'],
        note: [186, 368, '1.20 — and the ball comes back', '#bfe9da'],
      },
      run: {
        k: 'ok', play: 'setlook',
        pos: { h: [300, 250], x2: [240, 330], c2: [62, 416], x1: [316, 222], o4: [164, 252], x4: [214, 296] }, ball: [340, 404],
        bands: [[41, 26, 'you', 'the set — clean look ✓'], [26, 0, 'them', 'they hold — last shot']],
        bmsg: ['ok', 'EVEN TRADE', '+3 AT 0:26 · THEY GET LAST SHOT'],
        note: [150, 352, 'good shot — extra possession gone', '#ffe1b3'],
      },
      hold: {
        k: 'bad', play: 'holdforce',
        pos: { h: [340, 115], x1: [346, 146] }, ball: [292, 344],
        bands: [[41, 24, 'you', 'held… shot clock forces it'], [24, 0, 'them', 'THEIR 2-for-1']],
        bmsg: ['bad', 'CLOCK TURNOVER', 'FORCED AT 0:24 · THEIR 2-FOR-1'],
        ghost: [92, 380, "your SG's open corner, at 0:38", 92, 356],
        note: [210, 180, "you can't hold — 18 on the shot clock", '#ffb3ae'],
      },
    },
    grade: {
      shoot: {
        t: 'Shot 1 banked — and the clock still owes you one',
        b: "The corner look was already there — about 1.20 a trip — and releasing by 0:36 means their answer can't run the quarter dry: the ball is back around 0:09. Two shots for you, one for them. That's the entire trade, executed.",
      },
      run: {
        t: 'Good shot — you just paid the surcharge',
        b: 'The set bought a clean look, but it cashed at 0:26, past the ~0:33 line where the extra possession survives. They hold, and the quarter ends one-for-one. Quality was already standing in the corner; you shopped for it anyway.',
      },
      hold: {
        t: 'The shot clock was always going to vote',
        b: "You can't hold for the last shot at 0:41 — the shot clock forces yours at 0:24 no matter what. So you jacked a forced shot AND handed them the ball at 0:24: the exact two-for-one you were supposed to run, now running against you.",
      },
    },
    why: {
      rookie: "End of a quarter: shoot with about 35 seconds left and you'll get the ball back one more time before the horn. Two chances for you, one for them — that's the 'two-for-one'.",
      beginner: 'An average possession is worth about 1.14 points, so an extra one is nearly a free point a quarter. The catch: shot 1 must be up by roughly 0:33, and it must be a real shot. An open corner three (~1.20) clears both bars.',
      intermediate: "The release line comes from THEIR ledger: shoot at 0:36 and even a full 24-second milk returns the ball near 0:09 — a live possession. Shoot at 0:28 and the same milk kills it. That's why the call goes out at 0:40, not 0:30.",
      expert: "Two constraints define the window — your shot clock (can't wait past it) and their 24 of milk. The solution set is a release between roughly 0:42 and 0:33; inside it, any league-average look is +EV because possession count beats marginal quality: 1.20 now plus a ~0.9-equity bonus possession beats any single 1.25 you could hunt.",
    },
  },

  {
    tab: '0:35 — nothing on', board: { clock: '0:35', shot: '16', you: 44, them: 46, period: 'Q2' },
    cast: HALF.concat([['x2', 'def', 95, 400, 'SG']]),
    fact: [210, 182, "everything's guarded — no early look", '#bcd3ff'],
    prompt: "0:35 — the window's open but their defense is set: your PG's only quick option is a <b>contested pull-up</b>. Force it?",
    T0: 35,
    end: {
      run: {
        k: 'good', play: 'setlook',
        pos: { h: [300, 250], x2: [150, 372], c2: [62, 416], x1: [316, 222], o4: [164, 252], x4: [214, 296] }, ball: [340, 404],
        bands: [[35, 25, 'you', 'the set — clean look ✓'], [25, 0, 'them', 'they hold — last shot']],
        bmsg: ['good', 'QUALITY KEPT', 'CLEAN +3 AT 0:25 · THEY GET ONE'],
        note: [196, 338, 'the drive bent the floor — corner opened', '#bfe9da'],
      },
      shoot: {
        k: 'ok', play: 'pullup2',
        pos: { h: [330, 190], x1: [334, 168] }, ball: [296, 348],
        bands: [[35, 33, 'you', 'brick'], [33, 9, 'them', 'their possession'], [9, 0, 'you', 'SHOT 2']],
        bmsg: ['ok', 'TWO SHOTS, ONE BRICK', '0.80 BANKED · SHOT 2 AT 0:09'],
        note: [200, 240, 'contested — under 0.90 a trip', '#ffe1b3'],
      },
      hold: {
        k: 'bad', play: 'holdforce',
        pos: { h: [340, 115], x1: [346, 146] }, ball: [292, 344],
        bands: [[35, 19, 'you', 'held… forced at 0:19'], [19, 0, 'them', 'their last shot']],
        bmsg: ['bad', 'WORST OF BOTH', 'FORCED AT 0:19 · THEY HOLD'],
        note: [210, 180, 'shot clock 16 — holding was never real', '#ffb3ae'],
      },
    },
    grade: {
      run: {
        t: 'Quality still outranks the clock',
        b: "Rushing bought nothing — the only early option was a contested pull-up under 0.90. The set found a real shot at 0:25: you traded the phantom 'free' possession for a certain upgrade. The two-for-one is a bonus, not a command.",
      },
      shoot: {
        t: 'You banked a brick',
        b: "The arithmetic worked — shot at 0:33, ball back at 0:09 — but shot 1 was a contested pull-up worth maybe 0.80. Two mediocre possessions don't beat one clean look plus a defended last shot. Volume without quality is just noise that looks busy.",
      },
      hold: {
        t: 'Worst of both worlds',
        b: 'Holding at 0:35 runs into your own shot clock at 0:19 — a forced shot ANYWAY, now late enough that they inherit the good timing. You skipped the decent shot, took the bad one, and gifted the schedule.',
      },
    },
    why: {
      rookie: "The 'free' extra shot only counts if it's a real shot. A guarded, off-balance heave is worth less than two more passes for an open one.",
      beginner: 'Late-clock forced attempts fall under 0.90 points a trip; a clean set look runs 1.05–1.15. The two-for-one adds equity ONLY when shot 1 is near your normal quality — 0.80 now plus the bonus still loses to 1.10 clean.',
      intermediate: "Read the defense before the clock: early look there (corner open, cross-match, big retreating) — take it, bank the extra possession. Defense set — the possession's job reverts to normal: generate quality. Clock tactics never override shot creation.",
      expert: "The threshold isn't 'any shot by 0:33' — it's 'any AVERAGE-or-better shot by 0:33'. Model both branches: forced 0.80 plus a ~0.9-equity return possession, against a clean 1.10 conceding them one reply — the clean branch nets higher whenever the early look is bottom-decile. Coaches who chant 'two-for-one' without a quality floor are optimizing the wrong variable.",
    },
  },

  {
    tab: '0:22 — clock off', board: { clock: '0:22', shot: 'OFF', shotWarn: true, you: 71, them: 71, period: 'Q4' },
    cast: HALF.concat([['x2', 'def', 95, 400, 'SG']]),
    fact: [210, 182, 'under 0:24 — the shot clock is OFF', '#ffb3ae'],
    prompt: 'Tie game, 0:22, and the shot clock is <b>off</b> — whoever shoots first gives the other team the last word. Your call.',
    T0: 22,
    end: {
      hold: {
        k: 'good', play: 'holdwin',
        pos: { h: [310, 290], x1: [318, 262], x5: [330, 336] }, ball: [340, 404],
        bands: [[22, 0, 'you', "the game's ONLY possession — shot at 0:02 ✓"]],
        bmsg: ['good', 'BALLGAME', 'YOU 73 – THEM 71 · NO TIME LEFT'],
        note: [190, 318, 'they never touch it again', '#bfe9da'],
      },
      shoot: {
        k: 'bad', play: 'quick3',
        pos: { h: [320, 160], x1: [326, 138], x5: [300, 352] }, ball: [292, 344],
        bands: [[22, 18, 'you', 'rushed 3 — miss'], [18, 0, 'them', 'they hold for the horn']],
        bmsg: ['bad', 'THEY HOLD NOW', 'MISS AT 0:18 · THEIR LAST SHOT'],
        ghost: [340, 300, 'patience lived here', 340, 268],
        note: [200, 220, 'you gave the last word away', '#ffb3ae'],
      },
      run: {
        k: 'ok', play: 'setlook',
        pos: { h: [300, 250], x2: [150, 372], c2: [62, 416], x1: [316, 222], o4: [164, 252], x4: [214, 296] }, ball: [340, 404],
        bands: [[22, 7, 'you', 'the set ✓'], [7, 0, 'them', '6 seconds — live']],
        bmsg: ['ok', 'GOOD — NOT AIRTIGHT', 'YOU 74 – THEM 71 · 6s LIVE'],
        note: [196, 338, 'made it — but they get 6 seconds', '#ffe1b3'],
      },
    },
    grade: {
      hold: {
        t: 'You deleted their possession',
        b: "Under 24 seconds the shot clock is off, so this was the game's only remaining possession — and it belonged to whoever was patient. You held to 0:04, attacked a flat defense, and make or miss, they never touch the ball again. The one time 'hold for last' is absolute.",
      },
      shoot: {
        t: 'You handed them the hold',
        b: 'With the shot clock off, whoever shoots first donates the last word. Your quick three at 0:18 — make or miss — left THEM eighteen seconds to do what you should have done: hold, and shoot at the horn. You played their side of the board.',
      },
      run: {
        t: 'Right idea, leaky timing',
        b: 'A set that ends at 0:07 is close — but six seconds is a live possession: a push, a foul, a heave. Holding to 0:04 costs nothing when the clock is off, and shrinks their answer to zero. When delay is free, buy all of it.',
      },
    },
    why: {
      rookie: "When the game clock drops under 24 seconds, the shot clock turns off. Whoever has the ball can wait as long as they like — so wait, and take the game's very last shot.",
      beginner: "The deny: tied, one possession left, no shot clock. Shoot at 0:02 and the worst case is overtime — they can never lead. Shoot at 0:18 and you've created a possession for them that didn't have to exist.",
      intermediate: "The drill: mirror the dribble to about 0:06, start the action at 0:05, ball out of the hand by 0:02 so even a long rebound can't become a runout. The target isn't the make — it's making their possession count equal zero.",
      expert: "Win-probability accounting: hold-to-horn ≈ your make% plus (1 − make%) × ~50% of overtime — strictly above a coin flip, guaranteed no loss in regulation. Any earlier release hands back reply seconds against a scrambled defense. It's the one spot in basketball where shot TIMING dominates shot quality.",
    },
  },

  {
    tab: '0:30 — 3-on-1!', board: { clock: '0:30', shot: '21', you: 22, them: 20, period: 'Q1' },
    cast: [
      ['h', 'att', 340, 90, 'PG'], ['r2', 'att', 140, 140, 'SG'], ['r3', 'att', 540, 140, 'SF'],
      ['o4', 'att', 258, 52, 'PF'], ['o5', 'att', 424, 50, 'C'],
      ['xb', 'def', 340, 290, 'PG — last man'], ['t1', 'def', 240, 30, 'PF — trailing'], ['t2', 'def', 430, 26, 'C — trailing'],
      ['d2', 'def', 150, 24, 'SG'], ['d3', 'def', 532, 26, 'SF'],
    ],
    fact: [520, 80, 'numbers! 3 on 1', '#ffd9b8'],
    prompt: "You're flying 3-on-1 at 0:30 — and somebody on the bench is yelling <b>'TWO-FOR-ONE!'</b> Does the clock outrank a layup?",
    T0: 30,
    end: {
      shoot: {
        k: 'good', play: 'breaklay',
        pos: {
          h: [340, 220], r2: [326, 382], r3: [560, 240], xb: [334, 250], t1: [270, 120], t2: [400, 130],
          o4: [280, 100], o5: [420, 105], d2: [160, 66], d3: [525, 66],
        }, ball: [340, 404],
        bands: [[30, 27, 'you', 'LAYUP ✓'], [27, 6, 'them', 'their possession'], [6, 0, 'you', 'SHOT 2 — bonus']],
        bmsg: ['good', 'LAYUP + 2-FOR-1', '+2 FAST · SHOT 2 AT 0:06'],
        note: [196, 330, '1.30 — and the clock math still works', '#bfe9da'],
      },
      run: {
        k: 'bad', play: 'pullout',
        pos: {
          h: [380, 80], r3: [480, 200], r2: [100, 380], xb: [340, 340], t1: [300, 320], t2: [462, 222],
          o4: [300, 90], o5: [430, 60], d2: [236, 168], d3: [430, 120],
        }, ball: [300, 344],
        shotFrom: [480, 200],
        bands: [[30, 12, 'you', 'pulled out — 5-on-5 again'], [12, 0, 'them', 'their last shot']],
        bmsg: ['bad', '1.30 TRADED FOR 0.90', 'WAVED OFF · THE DEFENSE GOT HOME'],
        ghost: [340, 368, 'the layup was here', 340, 432],
        note: [210, 120, 'watch their trailers sprint back in', '#ffb3ae'],
      },
      hold: {
        k: 'bad', play: 'pullout',
        pos: {
          h: [340, 140], r3: [560, 240], r2: [100, 380], xb: [340, 340], t1: [308, 178], t2: [402, 196],
          o4: [180, 200], o5: [520, 120], d2: [280, 220], d3: [402, 240],
        }, ball: [372, 340],
        shotFrom: [340, 140],
        bands: [[30, 3, 'you', 'held vs a SET defense — heave'], [3, 0, 'them', 'runout']],
        bmsg: ['bad', 'AESTHETICS ≠ POINTS', 'HEAVE AT 0:03 · OVER 5 DEFENDERS'],
        ghost: [340, 368, 'the layup was here', 340, 432],
        note: [210, 120, 'five defenders home by 0:20', '#ffb3ae'],
      },
    },
    grade: {
      shoot: {
        t: 'The layup IS the clock play',
        b: 'About 1.30 points at the rim, right now — and at 0:28 the two-for-one survives anyway: their reply dies near 0:06 and the ball comes back. You never had to choose between the break and the clock. The break WAS the clock play.',
      },
      run: {
        t: 'You waved off 1.30 for 0.90',
        b: "Pulling out a 3-on-1 turned the best shot in basketball into a half-court possession against a defense you allowed to rebuild — the trailers sprinted home the moment you hesitated. No clock schedule is worth that trade; the 'set' cashed a contested 0.90.",
      },
      hold: {
        t: 'Clock aesthetics, zero points',
        b: "You held a 3-on-1. By the time the 'last shot' came, five defenders were home and the heave went up over a set wall. The two-for-one exists to ADD a possession to good shots — it is never a reason to subtract the best shot you'll see all night.",
      },
    },
    why: {
      rookie: "A wide-open layup is always the right shot — no clock rule ever says pass one up. Score it fast, and you'll probably still get the last shot of the quarter too.",
      beginner: 'Transition looks run 1.20–1.30 points a possession — the most valuable shots in the sport. The two-for-one line is ~0:33, so a layup at 0:28 banks the points AND keeps the extra possession. There was no trade-off to manage.',
      intermediate: "End-of-quarter order of operations: 1) take any A-grade shot immediately; 2) if none, check the 2-for-1 window; 3) only then think 'last shot'. It's scripted in that order because players who invert it turn 1.30s into 0.90s to feel clever.",
      expert: 'Clock management OPTIMIZES shot selection; it never overrides it. Possession-count tactics move EV by tenths of a point; shot-grade differences move it by halves. When they collide, grade wins — and a 3-on-1 sits at the top of the grade scale, so every clock consideration is a rounding error.',
    },
  },
];
