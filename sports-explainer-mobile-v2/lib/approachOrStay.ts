// Approach or Stay? — scenario data (VERBATIM from coaches-corner-spikes/tenniscorner/
// approach-or-stay.html). The tactical content — which call is right off a short ball, the
// punishment for each wrong call, the LED-board stakes, and the 4-depth COACH'S READ — is the
// owner-reviewed surface; copied exactly, never re-derived. Strings keep the spike's <b>…</b>
// emphasis markers; the module renders them as bold amber spans (they are display emphasis,
// not internals). Coordinates share the tennis-court viewBox (680×420 court group; the module
// draws it under a 74px LED-board strip → 680×494 scene). Pure data — zero RN imports.

export type P = [number, number];
export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type GradeKind = 'good' | 'ok' | 'bad';
export type AOSOption = 'dtl' | 'cc' | 'stay' | 'drop';
export type Surface = 'hard' | 'clay';

// [x, y, text] — an outcome label placed on the court.
export type CourtLabel = [number, number, string];

export interface AOSGrade {
  k: GradeKind;
  bmsg: string;                 // LED-board flip message
  npt?: string;                 // "SCORE NOW" sub-line on the board flip
  t: string;                    // verdict title
  end: { ball: P; you: P; opp: P; lab: CourtLabel };  // authored END coordinates
  b: string;                    // verdict body
}

// The reveal teaches the right SEQUENCE — which road the shot takes and where you stand
// after it — never just a landing spot (targets can be near-identical; the consequences
// aren't). (Spike comment, kept: this is the owner-reviewed reveal design.)
export interface AOSRight {
  path?: [P, P];                // the right road (teal dashed)
  arc?: number;                 // path bow override (default 24)
  plab?: CourtLabel;            // label on the road
  you?: P;                      // …then stand HERE (teal ghost ring)
  ylab?: string;                // ring label (default "…then stand here")
}

export interface AOSBoard {
  pt: string; games: string; sets: string;
  note: { cap: string; val: string; warn?: boolean };
}

export interface AOSScenario {
  tab: string;
  surface: Surface;
  high: boolean;                // contact above net height (the rookie tell)
  cp: P;                        // your contact point
  you0: P; opp0: P;
  oppLab: string;
  right: AOSRight;
  board: AOSBoard;
  intro: string;
  grade: Record<AOSOption, AOSGrade>;
  why: Record<Depth, string>;
}

export const gradeColor = (k: GradeKind): string => (k === 'good' ? '#14B8A6' : k === 'ok' ? '#F5A623' : '#e24b4a');
export const gradeTag = (k: GradeKind): string => (k === 'good' ? 'Right call' : k === 'ok' ? 'Defensible' : 'Wrong call');

export const SCENARIOS: AOSScenario[] = [
  {
    tab: 'Backhand corner', surface: 'hard', high: true,
    cp: [114, 150], you0: [100, 236], opp0: [566, 134], oppLab: 'opponent — backhand corner',
    right: { path: [[114, 150], [556, 148]], you: [282, 160], plab: [336, 124, 'the right road — deep at HIS corner'], ylab: '…then stand here, lane closed' },
    board: { pt: '30–15', games: '4–3 YOU', sets: '1–1', note: { cap: 'SURFACE', val: 'HARD' } },
    intro: "The rally drags him into his <b>backhand corner</b> — and his reply lands two meters inside your baseline. Height chip says you'll meet it <b>above the net</b>.",
    grade: {
      dtl: {
        k: 'good', bmsg: 'POINT YOU', npt: '40–15', t: 'Follow the ball — the line is covered',
        end: { ball: [472, 288], you: [282, 160], opp: [560, 148], lab: [472, 262, 'put away'] },
        b: 'You drive it deep at the corner he\'s stuck in and follow the ball to the net spot that bisects his two passing lanes. His stretched reply floats, and the open crosscourt is yours to volley away.',
      },
      cc: {
        k: 'bad', bmsg: 'PASSED', t: 'You opened the court — for him',
        end: { ball: [84, 290], you: [282, 238], opp: [516, 278], lab: [110, 266, 'passed clean'] },
        b: 'The crosscourt approach gave him a ball he could run to — and moved you across with it. The down-the-line corridor behind you was never covered, and his pass threaded it. Approach behind the ball, not away from it.',
      },
      stay: {
        k: 'ok', bmsg: 'RESET', t: 'Invitation declined',
        end: { ball: [520, 208], you: [96, 208], opp: [576, 196], lab: [520, 184, 'he resets'] },
        b: 'Nothing lost — but nothing won. A high ball, mid-court, opponent parked in a corner: that picture is why approach stats sit near 69%. He walks back to the middle and the door closes.',
      },
      drop: {
        k: 'bad', bmsg: 'FLICKED AWAY', t: 'A drop from too deep',
        end: { ball: [96, 282], you: [114, 150], opp: [352, 158], lab: [122, 262, 'flicked past you'] },
        b: 'From six meters behind the net the drop hangs in the air for a full second. He reads it off your racquet, arrives before the second bounce, and flicks it past you. Drops are for short balls and dead legs — not this one.',
      },
    },
    why: {
      rookie: "You'll hit this ball above net height — that's the green light. Hit it deep to the corner he's already in, then go to the net behind it.",
      beginner: 'Approach DOWN THE LINE because you follow your shot: the ball and you travel the same road, so when you arrive at the net you\'re already standing between his two passing lanes — the straight one is short and covered, the crosscourt one is long and slow.',
      intermediate: 'The net spot matters more than the approach shot: stand where you bisect his angles, shaded to the line side. About 73% of first passing attempts go in but only ~21% are clean winners — a well-placed volleyer eats the other half.',
      expert: 'Approach points are won at ~69% tour-wide, elite netters 72%+. The edge comes from shot selection: short-HIGH approaches win around 70% vs ~40% for short-LOW. High contact, opponent pinned, line covered — this is the exact profile the model says to cash.',
    },
  },
  {
    tab: 'Stranded wide', surface: 'hard', high: true,
    cp: [196, 152], you0: [110, 210], opp0: [570, 88], oppLab: 'opponent — dragged off court',
    right: { path: [[196, 152], [452, 296]], plab: [298, 246, 'the short angle — gone before a pass exists'] },
    board: { pt: '15–30', games: '2–3', sets: '0–1', note: { cap: 'SURFACE', val: 'HARD' } },
    intro: 'He threw everything at a wide ball and it came back <b>short — near your service line</b> — with him standing outside the sideline. Contact will be above the net.',
    grade: {
      cc: {
        k: 'good', bmsg: 'POINT YOU', npt: '30–30', t: 'The angle ends it before a pass exists',
        end: { ball: [452, 296], you: [232, 190], opp: [512, 180], lab: [452, 270, 'gone — no reply'] },
        b: "From on top of the service line the short crosscourt angle lands in the box and sprints away from him. He's a full court away — the point is over before he can even imagine a passing shot.",
      },
      dtl: {
        k: 'bad', bmsg: 'PASSED', t: 'You hit it to the only man in the county',
        end: { ball: [84, 278], you: [282, 166], opp: [552, 120], lab: [112, 256, 'ripped past you'] },
        b: "Down the line is exactly where he's stranded. He barely had to move, took it early, and drove the crosscourt pass behind you while you were still closing. The open court was the other way.",
      },
      stay: {
        k: 'bad', bmsg: 'LET OFF', t: 'The sitter got away',
        end: { ball: [86, 142], you: [110, 180], opp: [566, 170], lab: [116, 120, 'now HE attacks'] },
        b: "You pushed it back down the middle and let him walk back into the court. Two shots later he's the one dictating — that deep drive into your corner is the bill for declining a service-line sitter.",
      },
      drop: {
        k: 'ok', bmsg: 'IT WORKED', t: 'A winner — the expensive way',
        end: { ball: [344, 150], you: [196, 152], opp: [438, 120], lab: [344, 124, 'double bounce'] },
        b: "It works — he's too far away. But a drop needs perfect touch over the highest-risk part of the court, and the huge crosscourt angle was sitting there with triple the margin. Right result, second-best call.",
      },
    },
    why: {
      rookie: "He's standing off the court. Hit the ball short and sideways to the far side — he can't run that far. You don't even need the net for this one.",
      beginner: 'When the opponent is stranded wide, the crosscourt angle from a short ball finishes into space no one is defending. Down the line feels aggressive but it\'s the one shot that goes TO him.',
      intermediate: 'Angle beats depth when the court is open: a short crosscourt from the service line exits the sideline in under a second of flight. A deep drive gives him a full second more to recover — the angle takes recovery off the table entirely.',
      expert: "This is 'hit where they aren't' with geometry: from at or inside the service line you can create an exit angle that literally cannot be run down — the ball leaves the court before his first three steps. That's why coaches drill short-angle put-aways as the highest-EV finisher off any wide stretch.",
    },
  },
  {
    tab: 'Not that short', surface: 'clay', high: false,
    cp: [78, 206], you0: [90, 240], opp0: [566, 204], oppLab: 'opponent — balanced, centered',
    right: { you: [96, 208], ylab: 'stay back was the call' },
    board: { pt: '30–30', games: '5–5', sets: '1–0 YOU', note: { cap: 'SURFACE', val: 'CLAY' } },
    intro: "Everyone yells 'SHORT BALL!' — but look: it lands <b>half a meter inside your baseline</b>, dipping, and you'll meet it <b>below the cord</b>. He's balanced in the middle. On clay.",
    grade: {
      stay: {
        k: 'good', bmsg: 'SMART RESET', t: 'Short-ish is not short',
        end: { ball: [508, 214], you: [96, 208], opp: [572, 210], lab: [508, 190, 'neutral kept'] },
        b: "You'd be approaching from eleven meters out, hitting up on a dipping ball, on the slowest surface. You loop it deep middle instead, give the point a new start, and wait for an invitation that's real.",
      },
      dtl: {
        k: 'bad', bmsg: 'PASSED', t: 'Passed while you were still running',
        end: { ball: [88, 288], you: [250, 180], opp: [552, 150], lab: [112, 268, 'dipped past you'] },
        b: 'From the baseline you had eleven meters to cover; the ball beat you to the net. He was balanced, saw you coming the whole way, and rolled the dip pass into the corridor you hadn\'t reached yet. You approached from a zip code away.',
      },
      cc: {
        k: 'bad', bmsg: 'LOBBED', t: 'The other door: the lob',
        end: { ball: [92, 196], you: [255, 235], opp: [528, 264], lab: [120, 176, 'it dies on your baseline'] },
        b: 'Same problem, second answer: from balance he has BOTH the dip pass and the lob. Your low approach floated a beat, he stepped around and threw the lob — on clay it lands on your baseline and you\'re watching it from mid-court.',
      },
      drop: {
        k: 'bad', bmsg: 'FLICKED AWAY', t: 'It sat up begging',
        end: { ball: [90, 132], you: [86, 206], opp: [360, 202], lab: [116, 114, 'flicked past you'] },
        b: 'A drop hit from your own baseline travels forever, and on clay it sits up when it lands. He jogged in, waited for it, and flicked the winner. The drop needs a short launch pad — this wasn\'t one.',
      },
    },
    why: {
      rookie: "Not every 'short' ball is short. This one lands close to your baseline and you'd hit it below the net. Both lights are red — stay back and rally.",
      beginner: 'Two tells, both wrong: contact BELOW the cord (you must hit up, which means a slow, attackable approach) and depth (you\'d start the charge from eleven meters out). Add clay — slower court, easier passes and lobs — and the answer is patience.',
      intermediate: "A balanced opponent with time has both counters: the dipping pass at your feet and the lob over your head. You can't cover both from a late approach. Short-LOW approaches win only ~40% — you'd be volunteering for a coin flip you're on the wrong side of.",
      expert: "The pros' filter is contact height first, depth second, opponent's balance third — three greens or no charge. Here it's three reds. On clay the passing shot dips harder (heavy topspin) and the lob is a percentage play, which is why approach frequency drops sharply on dirt. Discipline IS the weapon: the ~69% approach number only holds for the right invitations.",
    },
  },
  {
    tab: 'Break point', surface: 'hard', high: true,
    cp: [216, 258], you0: [130, 240], opp0: [668, 224], oppLab: 'opponent — 4m behind baseline',
    right: { path: [[216, 258], [556, 266]], you: [286, 258], plab: [486, 298, 'the rehearsed save — deep down the line'], ylab: '…and in behind it' },
    board: { pt: '30–40', games: '4–4', sets: '1–1', note: { cap: 'BREAK POINT', val: 'ON YOUR SERVE', warn: true } },
    intro: 'Break point against you — and there it is: a <b>genuinely short ball</b>, sitting up above the net, with him camped <b>four meters deep</b>. Your nerve or your legs?',
    grade: {
      dtl: {
        k: 'good', bmsg: 'BREAK SAVED', npt: 'DEUCE', t: "Approach anyway — pressure doesn't shrink the court",
        end: { ball: [472, 150], you: [286, 258], opp: [576, 280], lab: [472, 126, 'volleyed away'] },
        b: "The scoreboard raised the stakes, not his reach. You drove it deep down the line, closed in, and his lunging reply floated — open-court volley, break point erased. The short ball doesn't know the score.",
      },
      cc: {
        k: 'ok', bmsg: 'BREAK SAVED', npt: 'DEUCE', t: 'In behind it — the line was cleaner',
        end: { ball: [460, 278], you: [286, 196], opp: [524, 172], lab: [460, 254, 'volleyed away'] },
        b: 'You came in, which is the decision that matters, and the volley finished it. Crosscourt just makes your net position a longer walk — the line approach covers the shortest passing lane with fewer steps.',
      },
      stay: {
        k: 'bad', bmsg: 'BROKEN', npt: 'GAME THEM', t: 'Playing scared is a choice too',
        end: { ball: [86, 144], you: [120, 230], opp: [560, 228], lab: [112, 122, 'corner painted — broken'] },
        b: 'You pushed the gift back, he strolled forward off his 4-meter perch, and painted your corner two balls later. On break point the passive miss and the brave miss cost exactly the same — one of them just never wins.',
      },
      drop: {
        k: 'ok', bmsg: 'BREAK SAVED', npt: 'DEUCE', t: 'It worked — off the practice court',
        end: { ball: [344, 244], you: [216, 258], opp: [392, 240], lab: [344, 218, 'double bounce'] },
        b: 'From that far back he was never getting there, and today it paid. But under the most pressure you faced all set, you chose the highest-touch shot in the game on a hard court. The rehearsed approach was the percentage save.',
      },
    },
    why: {
      rookie: "Break point makes your heart loud, but the ball is truly short and he's standing four meters back. Short ball + far-away opponent = go. The score doesn't change that.",
      beginner: "Pressure tempts you to play safe, but 'safe' hands a deep-camped opponent the free walk forward. The approach forces HIM to hit the hard shot — a passing winner on the stretch — exactly when his nerves are working too.",
      intermediate: 'Flip the seats: if you stay back, you need to win a neutral rally from defense; if you approach, he needs a clean pass off a deep skidding ball. First passes are in play ~73% of the time but only ~21% win cleanly — a controlled first volley wins you ~60% of these points. The math didn\'t move because the score did.',
      expert: "Elite servers' approach rate barely drops on break points — that's trained, not natural. The model logic: decision quality is measured against the ball you're given, not the scoreboard; introducing score-fear as a variable is how 30–40 becomes a break. Same inputs, same call, every time — that's what 'clutch' statistically is.",
    },
  },
  {
    tab: 'Camped deep (clay)', surface: 'clay', high: true,
    cp: [206, 196], you0: [120, 220], opp0: [664, 200], oppLab: 'opponent — camped 4m deep',
    right: { path: [[206, 196], [346, 182]], arc: 46, plab: [258, 152, 'the drop — a 15m footrace he loses'] },
    board: { pt: '40–30', games: '3–2 YOU', sets: '0–0', note: { cap: 'SURFACE', val: 'CLAY' } },
    intro: "Clay-court standoff: he's camped <b>four meters behind the baseline</b>, happy to grind — and gives you a soft, sitting short ball. There's a whole runway in front of him.",
    grade: {
      drop: {
        k: 'good', bmsg: 'GAME YOU', npt: 'GAMES 4–2', t: "The footrace he can't win",
        end: { ball: [346, 182], you: [206, 196], opp: [420, 190], lab: [346, 156, 'double bounce'] },
        b: 'Fifteen meters of runway between him and the ball, on the surface where sprinting is hardest. The drop dies just over the net, bounces twice before he\'s even close, and his deep camp — his whole game plan — is what killed him.',
      },
      dtl: {
        k: 'ok', bmsg: 'GAME YOU', npt: 'GAMES 4–2', t: 'Won it — the long way',
        end: { ball: [462, 282], you: [282, 172], opp: [566, 156], lab: [462, 258, 'volleyed away'] },
        b: 'The approach works, but clay gives a deep camper exactly what he wants: time. He dug your approach back from the fence and you needed an extra volley to finish. The drop shot ends the same point in one ball.',
      },
      cc: {
        k: 'ok', bmsg: 'GAME YOU', npt: 'GAMES 4–2', t: 'Fine — but the runway was the story',
        end: { ball: [468, 140], you: [282, 240], opp: [560, 250], lab: [468, 116, 'volleyed away'] },
        b: 'Coming in crosscourt gets it done eventually, but every extra meter of flight is recovery time for a retriever. You beat him with volleys; the drop would have beaten him with geography.',
      },
      stay: {
        k: 'bad', bmsg: 'NO PRESSURE', t: 'You let him camp',
        end: { ball: [500, 204], you: [140, 210], opp: [660, 204], lab: [500, 180, 'he never had to move'] },
        b: "Deep-middle rally balls are his home address. He didn't take a single step, and the soft short ball — the one lever that breaks a deep camper — went unused. The rally restarts on his terms.",
      },
    },
    why: {
      rookie: "He's standing four meters behind the line. Drop the ball just over the net — by the time he runs all that way it will have bounced twice.",
      beginner: 'Position creates the answer: a deep camper owns the baseline but donates the front of the court. A soft short ball plus fifteen meters of runway is a footrace he loses every time — especially on clay, where sprinting and stopping are slowest.',
      intermediate: "The drop here isn't a touch gamble, it's a percentage play: his split-step starts 4m behind the baseline, so his time-to-ball roughly doubles. Even a mediocre drop wins; a good one is unanswerable. Save approaches for when he's close enough to make passing hard.",
      expert: "Drop-shot usage on clay has climbed steadily at tour level precisely as return positions got deeper — it's the counter that keeps deep camping honest. The equilibrium logic: every meter he retreats buys him rally margin but sells you the short court. Punish it reliably and he must move up, which buys your serve +1 easier targets all match.",
    },
  },
];
