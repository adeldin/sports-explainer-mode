// Serve +1 — scenario data (VERBATIM from coaches-corner-spikes/tenniscorner/serve-plus-one.html).
// The third shot is tennis's RPO: serve, return, and now what? The tactical content — which +1 the
// returner's RECOVERY TRAIL calls for, the punishment for each wrong call, and the 4-depth COACH'S
// READ — is the owner-reviewed surface; copied exactly, never re-derived. Strings keep the spike's
// <b>…</b> emphasis markers; the module renders them as bold amber spans (display emphasis, not
// internals). Coordinates share the tennis-court viewBox (680×420, TENNIS in fields/TennisCourt):
// your baseline x=66, NET x=326, their baseline x=586. Pure data — zero RN imports.

export type P = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type GradeKind = 'good' | 'ok' | 'bad';
export type SP1Option = 'open' | 'behind' | 'reset';

// [x, y, text] — an outcome label placed on the court.
export type CourtLabel = [number, number, string];

export interface SP1Grade {
  k: GradeKind;
  t: string;                       // verdict title
  end: { ball: P; you: P; opp: P; lab: CourtLabel };   // authored END coordinates
  b: string;                       // verdict body
  via?: P;                         // ball three lands HERE first (his reply then travels to end.ball)
  cause?: string;                  // WHY a hero ball netted/sailed — drawn on the court after the miss
  causeAt?: P;
  causePrompt?: string;            // the in-flight narration for that hero swing
}

export interface SP1Scenario {
  tab: string;
  cp: P;                           // your ball-three contact point
  you0: P;
  trail: P[];                      // recovery trail, oldest → newest (last point = where he stands)
  trailLbl: string;
  trailYou?: boolean;              // the trail is YOURS (you're the dragged-off one)
  chips: string[];                 // HUD chips (<b>…</b> = orange value span)
  intro: string;
  mark?: { p: P; lbl: string };    // where the return landed (the deep-return tell)
  grade: Record<SP1Option, SP1Grade>;
  why: Record<Depth, string>;
}

export const gradeColor = (k: GradeKind): string => (k === 'good' ? '#14B8A6' : k === 'ok' ? '#F5A623' : '#e24b4a');
export const gradeTag = (k: GradeKind): string => (k === 'good' ? 'Right call' : k === 'ok' ? 'Defensible' : 'Wrong call');

// The three calls (button copy, verbatim).
export const OPTIONS: { key: SP1Option; title: string; sub: string; alt?: boolean }[] = [
  { key: 'open', title: 'Hit open court', sub: 'the space he left' },
  { key: 'behind', title: 'Hit behind him', sub: 'reverse him mid-sprint' },
  { key: 'reset', title: 'Reset deep middle', sub: 'buy a new ball', alt: true },
];

// In-flight narration per option (prompt swaps to this on choose).
export const NARRATION: Record<SP1Option, string> = {
  open: 'Ball three, <b>into the space…</b>',
  behind: 'Ball three, <b>back where he came from…</b>',
  reset: 'Ball three, <b>high and deep — reset.</b>',
};

export const HINT_IDLE = 'Read the trail, not the ball.';
export const HINT_DONE = 'Reset, or play the next +1.';
export const PROMPT_DONE = 'Moving man? <b>Hit behind him.</b> Parked man? <b>Hit space — or reset.</b>';
export const SUB = "The third shot is tennis's RPO: serve, return, <b>and now what?</b> Don't watch the ball — watch his <b>recovery trail</b>. Where he's been and how fast he's leaving tells you where ball three goes.";
export const FOOT = 'Coach’s Corner tennis spike · first serves earn an attackable +1 ball on ~58% of points; second serves only ~23% · sometimes the kill shot is where he WAS, not where he isn’t.';

// A hero ball that MISSES (nets or sails) — these two get their CAUSE drawn on the court.
export const isHeroMiss = (idx: number, opt: SP1Option): boolean =>
  (idx === 2 && opt === 'behind') || (idx === 3 && opt === 'open');

// Where his counter finishes when he beat the ball there (per scenario, spike-verbatim).
export const counterBack = (idx: number): P => (idx === 0 ? [86, 286] : idx === 1 ? [86, 140] : [86, 134]);

export const SCENARIOS: SP1Scenario[] = [
  {
    tab: 'Stranded wide', cp: [150, 190], you0: [100, 214],
    trail: [[612, 150], [617, 131], [620, 112], [622, 92]], trailLbl: 'his lunge — still out there',
    chips: ['Serve: <b>wide, 1st</b>', 'Return: <b>floaty, short</b>', 'His trail: <b>outside the sideline</b>'],
    intro: "Your wide serve dragged him off the court and the return <b>floats back short</b>. His trail says it all: he hasn't even started home. Ball three — where?",
    grade: {
      open: {
        k: 'good', t: 'Open court — more grass than he can cover',
        end: { ball: [556, 286], you: [160, 200], opp: [600, 210], lab: [556, 260, 'winner — never close'] },
        b: "He's a full doubles alley outside the singles line and the entire diagonal is empty. You drive it to the far corner and his sprint dies at the center mark — the serve made this shot before you swung.",
      },
      behind: {
        k: 'bad', t: 'You aimed at the only place he could be',
        end: { ball: [556, 130], you: [160, 200], opp: [580, 120], lab: [520, 104, 'he barely had to move'] },
        b: "'Hit behind him' only exists once he's LEFT. He never started recovering — so your 'behind' ball landed at his feet, and he drove it into the court you'd left open. Read the trail: no movement, no wrong-footing.",
      },
      reset: {
        k: 'ok', t: 'Advantage, politely returned',
        end: { ball: [540, 205], you: [150, 204], opp: [610, 205], lab: [540, 180, 'he walks back in'] },
        b: 'Deep middle is never a disaster — but this was the ~82% ball. He was off the map, the +1 was a tap-in, and the reset let him stroll back to the center hash like nothing happened.',
      },
    },
    why: {
      rookie: "Look where he's standing: off the court. Hit the ball to the far corner — the open side. He can't run that far in time.",
      beginner: "The wide serve's whole job was to create this picture: him stretched outside the line, you with a short ball. The +1 into the open court wins about 8 in 10 times — it's the highest-percentage full swing in tennis.",
      intermediate: "The trail is the decision engine: dots frozen at the sideline mean zero recovery started, so space beats wrong-footing. 'Behind him' is a weapon against a RUNNER, not a statue. Match the shot to the trail, not to a slogan.",
      expert: "First serves buy an attackable +1 on ~58% of points, and converting those at the ~82% open-court rate is what separates holding at 80% from holding at 90%. The +1 isn't a bonus ball — build the serve pattern specifically to manufacture this exact frame, and don't overthink it when it arrives.",
    },
  },
  {
    tab: 'Sprinting home', cp: [150, 210], you0: [104, 216],
    trail: [[622, 96], [608, 128], [590, 160], [566, 190]], trailLbl: 'his sprint — flying back',
    chips: ['Serve: <b>wide, 1st</b>', 'Return: <b>solid, middle</b>', 'His trail: <b>sprinting hard to center</b>'],
    intro: "Better return this time — and look at the trail: he's <b>sprinting hard back to the middle</b>, ready to defend the open court. He's expecting you to hit where he isn't.",
    grade: {
      behind: {
        k: 'good', t: 'Behind him — reversing beats running',
        end: { ball: [556, 130], you: [160, 206], opp: [576, 158], lab: [520, 106, 'wrong-footed'] },
        b: "He's moving at a full sprint toward the center — so the corner he just LEFT is the one he can't get back to. He plants, reverses, and his own momentum does the tackling. Wrong-footing an elite mover beats racing him to space.",
      },
      open: {
        k: 'bad', t: 'You raced a sprinter to the space',
        end: { ball: [556, 280], you: [160, 204], opp: [566, 268], lab: [520, 306, 'arrived early — redirected'] },
        b: 'The open court was exactly where his sprint was taking him. He arrived before your ball did, set his feet, and redirected it into the court YOU had opened by aiming there. Hitting ‘away from him’ fed his recovery.',
      },
      reset: {
        k: 'ok', t: 'Safe — but the plant was free',
        end: { ball: [540, 208], you: [150, 208], opp: [592, 206], lab: [504, 168, 'he settles — even'] },
        b: 'Nothing lost: deep middle against a runner resets to neutral. But a man sprinting one way is a one-time offer — the behind-him ball was there, and those don’t come back once he’s balanced.',
      },
    },
    why: {
      rookie: "He's running hard back to the middle. Hit the ball back to the corner he just came from — he can't stop and turn around in time.",
      beginner: 'A sprinting player has momentum, and momentum can’t reverse instantly: the plant-and-push-back costs two steps. The trail shows you his direction — the kill shot is the corner behind the arrows, not the corner in front of them.',
      intermediate: "'Always hit where they aren't' is the most expensive slogan in tennis: against a fast mover, open court means he arrives WITH the ball, in balance, and your court is now the open one. Behind-the-runner converts his speed — his best asset — into the thing that beats him.",
      expert: 'Elite movers cover the open-court ball so well that tour +1 patterns flip: the behind ball wins MORE against top-10 defenders than the open-court ball, despite the ~82% headline number against average recoveries. The read is binary and it’s all in the trail: moving = behind, parked = space. Speed of decision beats speed of foot.',
    },
  },
  {
    tab: 'Great serve, dead geometry', cp: [60, 206], you0: [60, 206],
    trail: [[590, 200], [568, 206]], trailLbl: 'already home',
    chips: ['Serve: <b>huge, 1st — 128 mph</b>', 'Return: <b>lands 1m from your baseline</b>', 'He is: <b>recovered, balanced</b>'],
    intro: 'Monster serve — but the return comes back <b>DEEP</b>, a meter from your baseline, and he’s already recovered inside the court. The serve was great; <b>the geometry is already dead.</b>',
    mark: { p: [92, 208], lbl: 'return landed HERE' },
    grade: {
      reset: {
        k: 'good', t: 'Reset — the advantage already died',
        end: { ball: [540, 210], you: [76, 208], opp: [574, 208], lab: [540, 184, 'new rally — on your terms'] },
        b: "Attack needs a short ball or a stretched opponent; you have neither — you're behind your own baseline and he's balanced in the middle. The deep-middle reset refuses the bait, and the next short ball will be attacked from balance instead of hope.",
      },
      open: {
        k: 'bad', t: 'You attacked from your heels',
        end: { ball: [556, 286], you: [76, 206], opp: [560, 278], lab: [520, 310, 'covered — countered'] },
        b: "Going big off a ball at your shoelaces, from behind the baseline, at a set opponent: he read it, covered it comfortably, and counter-punched into your corner while you were still recovering your stance. The serve's 128 mph bought nothing — geometry outranks pace.",
      },
      behind: {
        k: 'bad', t: 'The hero ball found the tape',
        cause: 'launched from 2m back, below net height — the tape wins',
        causeAt: [322, 264], causePrompt: 'Swinging <b>uphill</b>, from a meter behind your baseline…',
        end: { ball: [322, 208], you: [70, 206], opp: [568, 206], lab: [322, 238, 'NET — hero ball'] },
        b: "'Behind him' when he hasn't moved is just a low-margin line drive at the highest part of your risk budget. Off a deep skidding return it clipped the tape. The trail showed two dots — he was HOME. There was nobody to wrong-foot.",
      },
    },
    why: {
      rookie: "Your serve was huge, but his return came back deep and he's standing ready. The advantage is gone — hit a safe, deep ball down the middle and start over.",
      beginner: 'Judge the +1 by the ball you’re GIVEN, not the serve you hit. A deep return means late contact, below the net, from behind the baseline — attacking from there donates errors. Deep middle takes every angle away from him at zero risk.',
      intermediate: 'A deep return is how good returners cancel big serves — depth, not pace, is the serve-neutralizer. The trail here is the tell: two dots, both near the hash. No stretch, no sprint, nothing to exploit. Reset, and make him beat you from neutral.',
      expert: 'Down-the-line groundies off deep balls run ~22% winners against ~18% unforced errors — near break-even BEFORE accounting for court position, and you’re starting this one from a meter behind the baseline. The +1 decision tree is serve-agnostic: it reads only return depth and opponent balance. Great servers lose these points by grading the serve instead of the return.',
    },
  },
  {
    tab: "You're the gassed one", cp: [78, 292], you0: [92, 296],
    trail: [[150, 210], [120, 260], [92, 296]], trailLbl: 'YOUR trail — dragged wide', trailYou: true,
    chips: ['The rally: <b>19 shots</b>', 'You are: <b>dragged wide, gassed</b>', 'He is: <b>balanced, center</b>'],
    intro: 'Nineteen shots in, and now YOU’RE the one dragged off the court — <b>your</b> trail, your burning legs. The line ball is screaming your name. Don’t answer it.',
    grade: {
      reset: {
        k: 'good', t: 'The crosscourt reset — live to swing again',
        end: { ball: [556, 262], you: [140, 240], opp: [586, 214], lab: [506, 290, 'deep, safe, recovered'] },
        b: 'High, heavy, crosscourt over the low middle of the net and deep to the big part of the court — the longest flight, the fattest target, and it buys your legs the two seconds they need to get back to the hash. Off balance, margin IS the weapon.',
      },
      open: {
        k: 'bad', t: 'The hero line ball — long',
        cause: 'full stretch, no legs, higher net — it sailed',
        causeAt: [540, 338], causePrompt: 'Off one leg, from the fence, over the <b>high</b> part of the net…',
        end: { ball: [604, 290], you: [92, 296], opp: [590, 202], lab: [566, 314, 'OUT — the hero ball'] },
        b: 'Down the line from a full stretch: the net is 15cm higher there, the court is a meter shorter, and your legs had no base left. It sailed long by a racquet. That shot exists — it’s just priced for players in balance, and you weren’t.',
      },
      behind: {
        k: 'ok', t: 'At him — bought nothing, lost nothing',
        via: [560, 204],
        end: { ball: [100, 170], you: [110, 190], opp: [588, 204], lab: [136, 148, 'his firm reply — running again'] },
        b: "He's balanced in the middle, so 'behind him' is just 'at him' — no wrong-footing a parked man. He leaned on it and sent you chasing again. In play, but the crosscourt reset would have reset your LEGS too — that was the real prize.",
      },
    },
    why: {
      rookie: "You're stretched wide and tired. Hit the ball high and deep to the middle-far side — the safest shot — and use the time to run back into the court.",
      beginner: 'Two reasons the line ball is a trap from the stretch: the net is higher at the sidelines, and down-the-line leaves your court wide open if it comes back. Crosscourt gives you the low net, the long diagonal, and recovery time — three gifts in one swing.',
      intermediate: 'The recovery-trail read applies to YOU too: when your own trail shows a dead sprint to the corner, your +1 menu shrinks to one item. Defensive crosscourt height isn’t surrender — it’s how you make him hit three more balls to win a point he thought was over.',
      expert: 'DTL attempts run ~22% winners vs ~18% errors for players in POSITION — from a stretched, gassed base the error side balloons and the winner side collapses. Fatigue is a court-position multiplier: the pros’ rule is that balance buys rights to the line, and nothing else does. Nineteen shots in, the crosscourt moonball is the highest-EV shot on the menu.',
    },
  },
];
