// Pass or Lob? — scenario data (VERBATIM from coaches-corner-spikes/tenniscorner/pass-or-lob.html).
// You're the passer against a net rusher. The two reads are GEOMETRIC and both get drawn: his
// DISTANCE from the net (which sizes the amber smash-zone arc AND the blue volley-reach circle —
// they trade off against each other) and his LEAN (which lane his circle has bought). Verdicts,
// stats and the 4-depth COACH'S READ are the owner-reviewed surface; copied exactly, never
// re-derived. Coordinates share the tennis-court viewBox (680×420, TENNIS in fields/TennisCourt):
// your baseline x=66, NET x=326, their baseline x=586. Pure data — zero RN imports.

export type P = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type GradeKind = 'good' | 'ok' | 'bad';
export type PLOption = 'cc' | 'dtl' | 'lob';

// [x, y, text] — an outcome label placed on the court.
export type CourtLabel = [number, number, string];

export interface PLGrade {
  k: GradeKind;
  t: string;                       // verdict title
  end: { ball: P; you: P; opp: P; lab: CourtLabel };   // authored END coordinates
  b: string;                       // verdict body
  cut?: P;                         // where his reach circle intercepted the pass (bad lanes only)
}

export interface PLScenario {
  tab: string;
  you0: P;                         // the corner his approach pushed you to
  net: P;                          // his net position
  reach: number;                   // volley-reach radius — grows as he crowds the net
  dist: string;                    // his distance off the net (the bracket label)
  chips: string[];                 // HUD chips (<b>…</b> = orange value span)
  intro: string;
  grade: Record<PLOption, PLGrade>;
  why: Record<Depth, string>;
}

// The two passing lanes (both end deep on his baseline) and the lob's smash-zone radius.
export const DTL: P = [552, 133];
export const CC: P = [552, 294];
export const SMASH_R = 85;         // a lob must land beyond net.x + 85 to beat the overhead
export const LOB_APEX: P = [532, 205];

export const gradeColor = (k: GradeKind): string => (k === 'good' ? '#14B8A6' : k === 'ok' ? '#F5A623' : '#e24b4a');
export const gradeTag = (k: GradeKind): string => (k === 'good' ? 'Right call' : k === 'ok' ? 'Defensible' : 'Wrong call');

// The three calls (button copy, verbatim).
export const OPTIONS: { key: PLOption; title: string; sub: string; alt?: boolean }[] = [
  { key: 'cc', title: 'Pass crosscourt', sub: 'the long diagonal lane' },
  { key: 'dtl', title: 'Pass down the line', sub: 'the short straight lane' },
  { key: 'lob', title: 'Throw the lob', sub: 'over the top', alt: true },
];

// In-flight narration per option (prompt swaps to this on choose).
export const NARRATION: Record<PLOption, string> = {
  cc: 'You rip it <b>crosscourt…</b>',
  dtl: 'You go <b>down the line…</b>',
  lob: 'You throw it <b>up and over…</b>',
};

export const PROMPT_START = 'He’s coming in off the short ball…';
export const PROMPT_DONE = 'Distance picks <b>pass or lob</b>; the lean picks <b>the lane.</b>';
export const HINT_IDLE = 'Distance says lob or not; lean says which lane.';
export const HINT_DONE = 'Reset, or defend the next net rush.';
export const SUB = "The net is taken and you're the underdog now — net players win ~69% of these. Your reads: his <b>distance from the net</b> (the shaded smash zone) and his <b>lean</b> (the lane he fears). Pick a lane — or go over the top.";
export const FOOT = 'Coach’s Corner tennis spike · overheads win ~81%, ~21% of first passes are clean winners · a STRETCHED one-hander almost always passes cross (~70%) — his shading tells you which lane he fears.';

export const SCENARIOS: PLScenario[] = [
  {
    tab: 'Shading the line', you0: [96, 150], net: [352, 150], reach: 59.6, dist: '1.2m',
    chips: ['His approach: <b>to your forehand corner</b>', 'Distance: <b>1.2m off the net</b>', 'His lean: <b>shading YOUR line</b>'],
    intro: 'He approached to your corner and camped <b>on the line side</b> — his reach circle is sitting in the straight lane. The bigger gap beats the longer reach. Which lane?',
    grade: {
      cc: {
        k: 'good', t: "Crosscourt — the gap he can't lean out of",
        end: { ball: [552, 294], you: [96, 150], opp: [366, 178], lab: [552, 268, 'through the cross lane'] },
        b: "His circle covers the line, so the crosscourt diagonal is the lane his reach doesn't touch. The ball crosses the net a full stride beyond his lunge and runs away into the open half. Bigger gap beats longer reach, every time.",
      },
      dtl: {
        k: 'bad', t: 'You passed into his reach',
        cut: [351.7, 140.5],
        end: { ball: [250, 296], you: [96, 150], opp: [352, 144], lab: [276, 274, 'cut off — volleyed away'] },
        b: 'His shading WAS the message: the line lane runs straight through his volley reach. He barely moved — one step, stick volley into your open court. You challenged the covered lane because it was the shorter one. Short isn’t open.',
      },
      lob: {
        k: 'ok', t: "Over him — it worked, it wasn't the read",
        end: { ball: [532, 205], you: [96, 150], opp: [430, 192], lab: [532, 180, 'over him — it worked'] },
        b: "He's tight-ish to the net, so the lob clears his smash zone and drops in. Fine outcome — but with a whole uncovered crosscourt lane and you in balance, the full-swing pass was the higher-percentage winner. The lob is the escape hatch, not the first choice.",
      },
    },
    why: {
      rookie: 'He’s guarding the straight lane — look at his circle sitting on it. Hit the diagonal one instead: the court is much wider that way.',
      beginner: 'A net player can only cover one lane plus a lunge. His lean tells you which lane he’s bought — so you sell it to him and hit the other. Crosscourt also crosses the net at its lowest point and has the longest court behind it: margin stacked on margin.',
      intermediate: 'Only ~21% of first passes are clean winners, so lane choice is about forcing a HARD volley, not just any volley: a crosscourt dipping past his backhand-side lunge makes him volley up from below the tape. That’s how the second pass — the easy one — gets created.',
      expert: 'The reveal inside his lean: coaches teach net players to overplay the line because a STRETCHED passer almost has to go cross — about 70% of emergency one-handed passes do. His shading tells you what he fears AND what he expects: a balanced passer beats the line-shade cross; a stretched one feeds it. Your balance is the variable he’s misread.',
    },
  },
  {
    tab: 'Leaning crosscourt', you0: [96, 150], net: [360, 200], reach: 50, dist: '1.6m',
    chips: ['His approach: <b>deep, to your corner</b>', 'Distance: <b>1.6m off the net</b>', 'His lean: <b>drifting crosscourt</b>'],
    intro: 'Same corner, different lean: he’s <b>drifting toward the crosscourt lane</b>, betting on the percentage pass. The straight lane behind his lean is open — for one swing.',
    grade: {
      dtl: {
        k: 'good', t: 'Down the line — behind the lean',
        end: { ball: [552, 133], you: [110, 160], opp: [382, 172], lab: [552, 160, 'behind his lean'] },
        b: 'He committed his circle to the diagonal, which un-guards the straight lane. The line pass is the thinner window — higher net, shorter court — but against a leaner it’s the EMPTY window. You hit behind his weight and he can only wave.',
      },
      cc: {
        k: 'bad', t: 'You fed the lean',
        cut: [350.5, 230.4],
        end: { ball: [240, 292], you: [96, 150], opp: [352, 234], lab: [266, 270, 'his lean ate it'] },
        b: "The percentage lane was the one he was standing in. He read cross the whole way — one shuffle, and his volley angled into the court you'd already left. When the net player leans, the 'safe' pass becomes the covered one.",
      },
      lob: {
        k: 'ok', t: 'Over him — decent, second-best',
        end: { ball: [532, 205], you: [96, 150], opp: [436, 198], lab: [532, 180, 'over him — it worked'] },
        b: 'At 1.6m off the net his smash zone still doesn’t protect the deep court, so the lob lands. But the wide-open line lane was a clean winner with a full swing — the lob wins the point slower and lets a faster net player make it a footrace.',
      },
    },
    why: {
      rookie: 'He’s drifting toward the diagonal — so hit it straight, into the lane he just walked away from.',
      beginner: 'Net players lean toward the pass they expect. The lean is a bet, and bets can be punished: whichever lane his circle slides into, the other lane opens. Read the lean at his split-step, then hit behind it.',
      intermediate: 'The line pass carries real costs — the net is ~15cm higher there and the court a meter shorter — so it needs a reason. His lean IS the reason: an uncovered straight lane flips the risk math. No lean, no line ball; that’s the discipline.',
      expert: 'This is the same wrong-footing logic as groundstroke rallies: momentum can’t reverse. A leaning volleyer has pre-committed his first step, and the behind-the-lean pass converts at rates the raw ~21% winner stat hides. Elite passers don’t pick lanes pre-swing — they hold the ball an extra beat, read the drift, and punish the commitment.',
    },
  },
  {
    tab: 'Crowding the net', you0: [96, 150], net: [344, 196], reach: 69.2, dist: '0.8m',
    chips: ['His approach: <b>heavy, he’s CLOSED IN</b>', 'Distance: <b>0.8m off the net</b>', 'You: <b>balanced, set</b>'],
    intro: 'He’s crawled <b>right on top of the net</b> — 0.8m. That close, his circle swallows BOTH lanes… and his smash zone shrinks to nothing behind him. You’re balanced. Over the top?',
    grade: {
      lob: {
        k: 'good', t: "The lob — he can't retreat in time",
        end: { ball: [532, 205], you: [120, 180], opp: [424, 196], lab: [538, 236, 'lands behind him — winner'] },
        b: 'Tight to the net he cuts every angle — and defends none of the sky. The lob floats over his backpedal and lands three meters beyond his smash zone. His greed for the volley paid for your winner. Distance from net is the lob’s green light.',
      },
      dtl: {
        k: 'bad', t: 'Picked off — he owns that lane',
        cut: [342, 140.8],
        end: { ball: [236, 290], you: [96, 150], opp: [344, 146], lab: [262, 268, 'picked off — put away'] },
        b: 'From 0.8m his reach circle covers the line lane with room to spare. The pass never got past his strings — stick volley, open court, done. Against a net-crowder the lanes aren’t narrow, they’re CLOSED.',
      },
      cc: {
        k: 'bad', t: 'Cut off — the angle was his, not yours',
        cut: [334.7, 225.4],
        end: { ball: [230, 124], you: [96, 150], opp: [336, 230], lab: [230, 100, 'cut off at the net'] },
        b: 'Same story on the diagonal: that close, he touches the crosscourt lane too, and the closer he stands the more angle HIS volley gets to use. He redirected it short to your top corner while you watched. Both doors were locked; the roof was open.',
      },
    },
    why: {
      rookie: 'He’s almost touching the net — nobody that close can run backward in time. Throw the ball high over his head and let it land behind him.',
      beginner: 'Distance from the net is a see-saw: crowding the net grows his volley circle over BOTH passing lanes but shrinks the court he can defend behind him. When the circle covers the lanes, the smash zone is small — that’s the lob’s moment, by geometry, not by desperation.',
      intermediate: "~72% of lobs against MID-COURT opponents turn into smash chances — that's why the lob has a bad reputation. But the stat flips on net-crowders: the backpedal overhead from 1m off the net is one of the hardest moves in tennis. The lob isn't one shot; it's two, priced by his feet.",
      expert: "Model each option as lanes vs. arc: reach radius scales UP as net distance shrinks, smash-zone coverage scales DOWN. At 0.8m both lanes sit inside his circle and the lob's landing window is maximal — the decision inverts entirely from the mid-court picture. Reading that inversion instantly is what separates a lob 'thrown' from a lob PLAYED.",
    },
  },
  {
    tab: 'Parked at the service line', you0: [96, 150], net: [466, 190], reach: 44, dist: '6.4m',
    chips: ['His approach: <b>then he STOPPED</b>', 'Distance: <b>6.4m — the service line</b>', 'His overhead: <b>ELITE — 82%</b>'],
    intro: 'The flip: he approaches… and <b>stops at the service line</b>. His overhead wins 82%. That depth is an <b>invitation</b> — the lob is the shot he’s farming. Don’t take the bait.',
    grade: {
      cc: {
        k: 'good', t: 'Pass anyway — his depth is the bait',
        end: { ball: [552, 294], you: [96, 150], opp: [490, 242], lab: [552, 268, 'passed — the invitation declined'] },
        b: 'From 6.4m his volley circle can’t reach either lane — the crosscourt dips past him and he’s volleying up from no-man’s land, if he touches it at all. He parked deep to farm lobs with that 82% overhead. You made him play the shot he was AVOIDING: the low volley.',
      },
      dtl: {
        k: 'ok', t: 'Threads it — the thinner version',
        end: { ball: [552, 133], you: [96, 150], opp: [474, 160], lab: [552, 160, 'threads it — thinner lane'] },
        b: 'Also past him — a man at the service line covers neither lane. But the line pass spends its smaller margin (higher net, shorter court) with no lean to justify it. Same idea as the crosscourt with less room for error.',
      },
      lob: {
        k: 'bad', t: 'SMASH — you fed the farm',
        end: { ball: [210, 290], you: [96, 150], opp: [510, 200], lab: [236, 314, 'SMASH — he farmed that lob'] },
        b: 'His whole positioning was a trap for exactly this ball. Two easy steps back, and the 82% overhead came down on your shoes. He kept the deep court ON PURPOSE — a lob into a service-line player isn’t a lob, it’s a feed.',
      },
    },
    why: {
      rookie: 'He stopped far from the net — so a lob can’t go over him, he’s already back there waiting. Hit the passing shot instead; he’s too far away to cut it off.',
      beginner: 'Flip the see-saw from the last scenario: deep net position shrinks his volley circle off both lanes but parks his smash zone over the whole lob landing area. Same two reads, opposite answer. His distance from the net decides pass-or-lob BEFORE his lean decides which lane.',
      intermediate: 'A player who stops at the service line is telling you his plan: he wants overheads (81% tour-wide, 82% his) and dipping passes are what he fears — mid-court volleys from below net height are the worst shot he owns. Give him a steady diet of exactly that.',
      expert: "Depth-as-invitation is a bluffing structure: his EV peaks if you lob (82% smash) and craters if you pass at his feet, so his 'weak' position is a farmed harvest. The counter-strategy is strict: never lob a mid-court player — the ~72% lob-to-smash-chance number lives in this exact picture. Attack the transition zone until he's forced to close — THEN the lob comes back onto the menu.",
    },
  },
];
