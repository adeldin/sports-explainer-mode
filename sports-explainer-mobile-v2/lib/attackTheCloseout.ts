// Attack the Closeout — data (backlog RND-41). Every fan-facing string below comes from the
// Scenario Bible Anthony approved on 2026-11-25 (spec page "Spec: Coach's Corner scenario: Attack
// the Closeout (NBA)"): the situation, the four options, each punisher, the verdict copy ideas,
// the one-sentence teaching point and the Four Levels notes. Reworded only to fit the card, never
// re-argued. Prompts/chips carry <b>…</b> emphasis; the component parses it (boldSegments).
//
// Interaction: tap-the-read, FOUR options, exactly ONE correct (the other NBA pieces are three
// options graded good/ok/bad; this one is right/wrong only).
//
// Coordinates share the half-court viewBox (680×460, rim at 340,398, baseline at the bottom,
// three-point arc centred near 340,420 with radius 260). We are on OFFENSE here: YOU is the
// shooter on the right wing. Geometry notes live in comments only, never in fan-facing text.
// Pure data — zero RN imports.

export type Pt = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';

export type CloseoutOpt = 'shoot' | 'baseline' | 'middle' | 'back';
// Offense: you (the shooter), g (guard who made the swing, top of the key), c (our center, weak-side
// dunker spot), sf (left wing), pf (left corner).
// Defense: xc (the closing defender), xg (top defender on g), x5 (their center, near the rim on the
// weak side), xn (the nail defender at the free-throw line), xp (on our left-corner man).
export type CloseoutActorId = 'you' | 'g' | 'c' | 'sf' | 'pf' | 'xc' | 'xg' | 'x5' | 'xn' | 'xp';

export const ATT_IDS: CloseoutActorId[] = ['g', 'c', 'sf', 'pf', 'you'];
export const DEF_IDS: CloseoutActorId[] = ['xg', 'x5', 'xn', 'xp', 'xc'];

/* Start of the film: the ball is with our guard at the top; the closing defender is helping in the
   paint (right half of the key, x 276–404), so he has real runway before the freeze (pre-flight). */
export const BASE: Record<CloseoutActorId, Pt> = {
  g: [340, 150], xg: [342, 184],
  you: [548, 214],                 // right wing, behind the arc (≈293 from the arc centre > 260)
  xc: [392, 302],                  // in the paint, helping
  c: [250, 410], x5: [292, 382],   // our C a step off the paint on the weak side; their C near the rim
  sf: [140, 222], xn: [330, 262],  // left wing; his man sags to the nail (middle of the FT line)
  pf: [112, 420], xp: [150, 402],  // left corner
};
/* The freeze: the catch. The closing defender is two or three steps away, coming from the middle
   (up-left of the shooter), so his body takes away the middle and leaves the baseline side. The top
   defender has jumped toward the ball and sits in the lane back to the guard (≈9 off the line). */
export const FREEZE: Record<CloseoutActorId, Pt> = {
  ...BASE,
  xg: [398, 170],
  xc: [478, 250],
  xn: [338, 258],
};

// On-court labels. Expert drops all but YOU ("remove helpers"); the rest show them.
export const LABELS: Partial<Record<CloseoutActorId, string>> = {
  you: 'YOU', xc: 'closing out', x5: 'their C', c: 'our C', xn: 'nail', g: 'guard', xg: 'top D',
};

// The open baseline lane (shaded for Rookie before the pick; flashed after any wrong pick).
export const LANE_POINTS = '548,232 600,250 602,338 456,414 424,394 540,300';

export const TAB = 'Wing catch';
export const CHIPS = ['<b>Half court</b> · plenty of shot clock', 'Ball swung to <b>the right wing</b>'];
export const FILM_PROMPT = '<b>Watch the swing…</b> your defender was helping in the paint.';
export const PROMPT = 'You just caught it. <b>He is sprinting at you.</b> What is your move?';
export const CLOSE_PROMPT = 'A sprinting closeout <b>cannot stop in time</b>. Read where he came from.';
export const HINT_IDLE = 'Look at which side of you he is coming from.';
export const HINT_DONE = 'Replay, or try another read.';
export const COURT_A11Y = 'You have the ball on the right wing. Your defender is sprinting at you from the middle.';

export const CORRECT: CloseoutOpt = 'baseline';

// Button order: the correct answer is NOT first (spec mock-up order). Same accent style for all four.
export const OPTIONS: { key: CloseoutOpt; label: string; sub: string }[] = [
  { key: 'shoot', label: 'Shoot the three now', sub: 'catch and shoot' },
  { key: 'baseline', label: 'Drive to the baseline', sub: 'one hard dribble past him' },
  { key: 'middle', label: 'Drive to the middle', sub: 'toward the free-throw line' },
  { key: 'back', label: 'Pass back to the top', sub: 'give it to the guard' },
];

export const TAG_TEXT = { right: 'Right read', wrong: 'Not this time' };

// Verdicts: leverage, not just outcome (authoring standard rule 5).
export const GRADE: Record<CloseoutOpt, { t: string; b: string }> = {
  baseline: {
    t: 'Past him on the side he left open',
    b: 'He was sprinting at full speed, so he could not stop and turn in time, and the baseline side was the side he was not covering. It is not free: their center rotates over to meet you. When he comes, our center behind him is open for a short pass at the rim. If he is late, it is a layup.',
  },
  shoot: {
    t: 'A contested three',
    b: 'He was running at you to stop the shot. A sprint closeout with high hands exists to bother the shot, and he arrived as the ball went up, so you got a contested three instead of the open shot the swing was meant to create. Use his speed against him and go past him.',
  },
  middle: {
    t: 'Straight into the help',
    b: 'He closed out on your middle side, which is where the help is. He was already standing in that lane, and the nail defender was waiting right behind him. Two defenders, no room. The open side is the baseline.',
  },
  back: {
    t: 'You gave them time to fix it',
    b: 'The defense was scrambling. The swing already moved them, and passing back lets every defender reset and gives up that advantage while the shot clock keeps running. The top defender was sitting in that passing lane and could reach it too. The open side was the baseline.',
  },
};

// The one-sentence teaching point (rule 4), then more per level (Four Levels wrapper).
export const TEACHING_POINT = 'When a defender sprints at you to stop the shot, he cannot stop in time, so drive past him on the side he left open.';
export const WHY: Record<Depth, string> = {
  rookie: TEACHING_POINT,
  beginner: `${TEACHING_POINT} He is running too fast to stop and turn, and he came from the middle, so the baseline is the open side.`,
  intermediate: `${TEACHING_POINT} Then read their center: he rotates over to meet your drive, which leaves our center open behind him for a short pass at the rim. If he is late, finish it yourself.`,
  expert: `${TEACHING_POINT} Watch his feet first. A closeout that arrives under control, with short choppy steps, takes the drive away, and then the shot is the right play. This one came flying in, so you go past him.`,
};
