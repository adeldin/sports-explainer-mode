// Signal Decoder — Cricket bank (v2 rework). Umpire signals only (evergreen, rule-based;
// verified against MCC Laws of Cricket, Law 2.13 — the most codified signal set in
// sport). 6 scenarios per tier × 4 tiers.
//
// v2 CONTRACT: constant prompt, options are always other cricket signal meanings,
// difficulty = visual closeness of the distractor signals.
// CUT in v2: 'new ball' (a held-up ball doesn't read at phone size) and 'last hour'
// (the wrist-watch tap is too small a glyph) — legibility beats vocabulary size.
import type { SignalScenario } from '../signalDecoder';

const P = 'What is the umpire signaling?';

export const CRICKET_SIGNAL_SCENARIOS: SignalScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'crk-sig-kid-1', level: 'kid', signal: 'crk-out',
    prompt: P,
    options: ['Out — your innings is over', 'Six!', 'Four'],
    answer: 0,
    title: 'The raised finger: out',
    exp: {
      kid: 'The single finger rising means OUT. The batter must walk off, and the next batter comes in. It\'s the most feared finger in sports!',
      beginner: 'The finger answers an APPEAL: fielders shout "Howzat?!" and the umpire raises the finger (out) or shakes his head (not out). Bowled, caught, LBW, run out — one signal covers all dismissals.',
      intermediate: 'Crucial rule: without an appeal, the umpire says nothing — even if the batter is plainly out. The finger is a verdict, and verdicts require the question to be asked.',
      expert: 'Note the theater codified into law: the finger is raised toward the batter, unhurried, often after a deliberate pause. Contrast reviews: after a DRS overturn, the umpire revokes and re-signals. One raised digit carries the same legal weight as a red card — and cricket etiquette demands the batter walk without protest.',
    },
  },
  {
    id: 'crk-sig-kid-2', level: 'kid', signal: 'crk-six',
    prompt: P,
    options: ['Six!', 'Four', 'Out'],
    answer: 0,
    title: 'Both arms up: six!',
    exp: {
      kid: 'Both arms high means SIX — the biggest hit in cricket! The ball flew all the way over the rope without touching the ground. Six runs, no running needed!',
      beginner: 'Clearing the boundary on the full = 6 runs, automatically. The batters don\'t run; the umpire\'s raised arms tell the scorers to add six.',
      intermediate: 'The full-flight test is strict: a ball that bounces even once before the rope is four (the side-to-side wave instead). Fielders leaping at the rope create the borderline cases — touch the rope or ground beyond it while touching the ball, and it\'s six.',
      expert: 'The boundary-catch law is the modern drama: a fielder may parry the ball INSIDE the boundary while airborne, but his last contact with the ground before first touching the ball must be inside the rope. TV umpires re-run those frames constantly. The two-arm signal often waits on that exact geometry.',
    },
  },
  {
    id: 'crk-sig-kid-3', level: 'kid', signal: 'crk-four',
    prompt: P,
    options: ['Four runs', 'Six runs', 'Out'],
    answer: 0,
    title: 'The chest wave: four',
    exp: {
      kid: 'The arm waving across the body means FOUR — the ball rolled or bounced its way past the boundary rope. Four free runs!',
      beginner: 'A ball reaching the boundary along the ground (or after bouncing) scores 4 automatically. The wave finishes with the arm folded across the chest, per the law\'s exact wording.',
      intermediate: 'Four vs six is purely about the bounce: any ground contact before the rope caps it at 4. Watch umpires track the bounce right at the rope\'s edge — that\'s the entire judgment.',
      expert: 'Boundary fours dominate scoring in every format — reading this signal\'s frequency tells you the pitch\'s pace and the outfield\'s speed. Law nuance: overthrows that reach the rope also earn 4, ADDED to runs already completed, which produces cricket\'s odd totals like 7 runs off one delivery.',
    },
  },
  {
    id: 'crk-sig-kid-4', level: 'kid', signal: 'crk-wide',
    prompt: P,
    options: ['Wide', 'Out', 'Six'],
    answer: 0,
    title: 'Arms out level: wide',
    exp: {
      kid: 'BOTH arms stretched out flat like a T mean WIDE — the ball was too far away for the batter to hit it fairly. The batting team gets 1 free run, and the bowler must bowl that ball AGAIN.',
      beginner: 'A wide adds 1 extra to the batting side and does NOT count as one of the over\'s 6 balls. Wides punish bowlers for taking the contest away from the batter.',
      intermediate: 'The width standard is format-dependent in practice: limited-overs cricket calls wides tightly (especially down the leg side), while Test cricket tolerates more. Same signal, different tolerance — context is part of the decode.',
      expert: 'Strategy layer: with fields spread in T20 death overs, bowlers aim inches outside off stump — the wide line polices exactly that margin. A called wide costs 1 run PLUS an extra ball at the death, often worth far more. Umpires\' wide judgments swing tight run-chases as much as any boundary.',
    },
  },
  {
    id: 'crk-sig-kid-5', level: 'kid', signal: 'crk-noball',
    prompt: P,
    options: ['No-ball — an illegal delivery', 'Wide', 'Four'],
    answer: 0,
    title: 'One arm out: no-ball',
    exp: {
      kid: 'Just ONE arm out flat means NO-BALL — the bowler broke a bowling rule, most often stepping past the front line. One free run, and the ball is bowled again!',
      beginner: 'Common causes: front foot fully beyond the popping crease, a full toss above the waist, throwing (elbow straightening). 1 run to the batting side, re-bowled, and the batter can\'t be out bowled/caught/LBW off it.',
      intermediate: 'ONE arm = no-ball, BOTH arms = wide — cricket\'s classic confusable pair, and the exact kind of distinction this game exists to teach. Remember: one rule broken by the bowler\'s BODY (no-ball) vs the ball\'s LINE (wide).',
      expert: 'The no-ball\'s real price in white-ball cricket is the FREE HIT that follows: the next delivery can\'t dismiss the batter by most modes, so batters swing without fear. TV umpires now check front-foot landings on every ball — the one-armed signal increasingly arrives via earpiece.',
    },
  },
  {
    id: 'crk-sig-kid-6', level: 'kid', signal: 'crk-bye',
    prompt: P,
    options: ['Byes — extra runs', 'Six', 'Out'],
    answer: 0,
    title: 'Open palm up: byes',
    exp: {
      kid: 'The open hand raised high means BYES — sneaky runs taken when the ball touched NOTHING! Nobody hit it, the keeper missed it, so the batters just ran.',
      beginner: 'Byes are extras: they count for the team\'s total but not the batter\'s personal score. The wicketkeeper is usually "charged" for them — clean keepers concede almost none.',
      intermediate: 'The signal family matters: open palm up = bye; touching a raised knee = LEG bye (ball hit the batter\'s body first). Bat involved = ordinary runs, no signal at all.',
      expert: 'Byes off fast bowling on bouncy pitches test keepers standing back; byes standing up to spin are rarer and more embarrassing. Scorecard literacy: a high "extras" line with many byes tells you about keeping quality and pitch behavior without watching a single delivery.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'crk-sig-beg-1', level: 'beginner', signal: 'crk-legbye',
    prompt: P,
    options: ['A leg bye', 'A bye', 'A no-ball'],
    answer: 0,
    title: 'Touching the knee: leg bye',
    exp: {
      kid: 'Tapping the raised knee means LEG BYE — the ball bounced off the batter\'s leg (not the bat!) and they ran. The run counts for the team, not the batter.',
      beginner: 'Leg byes are extras credited to the team when the ball deflects off the batter\'s body. Condition: the batter must have TRIED to hit it (or dodged it) — pure pad-kicking for runs isn\'t allowed.',
      intermediate: 'Knee-tap vs open-palm-up is the classic pairing: body deflection (leg bye) vs clean miss past everything (bye). If the umpire judges NO shot was attempted, leg byes are disallowed — dead ball, runs canceled.',
      expert: 'Interlock with LBW: pad first + no shot offered widens LBW\'s scope, so the same pad-strike can produce a knee-tap (runs), a disallowed dead ball, or a raised finger — three outcomes from one thud, decided by shot-attempt judgment and ball trajectory. That decision tree is peak umpire-craft.',
    },
  },
  {
    id: 'crk-sig-beg-2', level: 'beginner', signal: 'crk-dead',
    prompt: P,
    options: ['Dead ball', 'A free hit', 'Four'],
    answer: 0,
    title: 'Crossed wrists low: dead ball',
    exp: {
      kid: 'The wrists crossing and uncrossing low mean DEAD BALL — the game freezes! No runs, no outs, nothing counts until the bowler starts again.',
      beginner: 'Umpires kill the ball for distractions, injuries, the ball lodging in equipment, or a batter not ready. Anything mid-play is voided — runs in progress don\'t count.',
      intermediate: 'Dead ball is also the correction tool: bowler stops mid-run-up, sightscreen movement, a pigeon on the pitch. Cricket\'s default state between deliveries IS dead — this signal marks the unusual cases where it dies mid-action.',
      expert: 'Sharp edge cases: a batter pulling away as the bowler delivers (dead ball, re-bowled), the ball striking a helmet lying on the field (dead + 5 penalty runs to the batters), the modern "double bounce" delivery. Umpires call it aloud AND sign it — the only signal defined to be both shouted and shown, because a live/dead mistake corrupts everything downstream.',
    },
  },
  {
    id: 'crk-sig-beg-3', level: 'beginner', signal: 'crk-free-hit',
    prompt: P,
    options: ['A free hit', 'Six', 'Out'],
    answer: 0,
    title: 'The overhead circle: free hit',
    exp: {
      kid: 'The arm circling above the head means FREE HIT — the batter gets one delivery where he can swing as hard as he likes and (almost) can\'t be out! It\'s the punishment for the bowler\'s no-ball.',
      beginner: 'On a free hit the batter can\'t be bowled, caught, LBW, or stumped — only run out (and rare oddities). White-ball cricket only. Expect a giant swing.',
      intermediate: 'Field restrictions apply too: for the same batter, the field can\'t change from the no-ball delivery. Bowlers aim yorkers; batters premeditate. A free hit swings T20 win probability more than most boundaries.',
      expert: 'Delicious rule detail: bowled off a free hit = ball stays LIVE — batters can run "bowled byes" as the ball ricochets off the stumps, a sight that breaks new fans\' brains. And if the free-hit delivery is ITSELF a no-ball or wide, the free hit carries over. The circle signal is a one-ball constitutional amendment.',
    },
  },
  {
    id: 'crk-sig-beg-4', level: 'beginner', signal: 'crk-tv',
    prompt: P,
    options: ['A third-umpire referral', 'A substitution', 'Dead ball'],
    answer: 0,
    title: 'The TV box: sent upstairs',
    exp: {
      kid: 'The rectangle drawn in the air means "ask the TV umpire!" A third umpire watching replays makes the call, and the big screen shows OUT or NOT OUT. The crowd holds its breath!',
      beginner: 'For line decisions (run outs, stumpings, boundary calls), the on-field umpire can refer straight to the third umpire. The drawn box is the formal referral.',
      intermediate: 'Distinguish this from DRS: the TV box is the UMPIRE choosing help; a player review (the "T" made with forearms by batter or captain) challenges a decision already made. Two review roads, two different gestures.',
      expert: 'The run-out replay grammar is precise: the frame where bails are fully removed vs the batter\'s grounded bat/body behind the crease line — and "benefit of the doubt" formally belongs to the batter. Note DRS\'s "umpire\'s call" only exists for ball-tracking judgments (LBW), not line decisions; line calls are binary. Knowing which review regime you\'re watching tells you what the screen can even say.',
    },
  },
  {
    id: 'crk-sig-beg-5', level: 'beginner', signal: 'crk-noball',
    prompt: P,
    options: ['No-ball', 'Wide', 'A leg bye'],
    answer: 0,
    title: 'One arm out — for more than foot faults',
    exp: {
      kid: 'One arm out flat means NO-BALL. It\'s not just about feet — a ball that flies at the batter\'s body WITHOUT bouncing is scary and dangerous, so it\'s automatically a no-ball too!',
      beginner: 'Any full toss above the batter\'s waist (the "beamer") is a no-ball for dangerous bowling. Repeated offences can get the bowler banned from bowling for the innings.',
      intermediate: 'The one-armed signal covers a whole family: foot faults, throwing, dangerous deliveries, breaking the return crease, even the keeper collecting in front of the stumps. The arm says "illegal delivery"; the cause varies.',
      expert: 'Note the escalation regime unique to dangerous bowling: warnings are tracked per bowler, and a second beamer (in many playing conditions) removes the bowler from the attack — a sanction structure no other no-ball type carries. Umpire safety judgments literally subtract a team\'s best weapon.',
    },
  },
  {
    id: 'crk-sig-beg-6', level: 'beginner', signal: 'crk-revoke',
    prompt: P,
    options: ['Revoking the last signal', 'Out', 'A free hit'],
    answer: 0,
    title: 'Both shoulders crossed: revoke',
    exp: {
      kid: 'Crossing arms to touch both shoulders means "CANCEL THAT!" — the umpire is taking back his last signal, like pressing undo. Even umpires fix mistakes!',
      beginner: 'The revoke signal formally withdraws the previous signal to the scorers — perhaps a four signaled before realizing the fielder saved it, or a wide canceled after seeing an edge. It\'s then followed by the corrected signal.',
      intermediate: 'It exists because scorers act on signals immediately and must be told to reverse the entry — the signal system is a real-time data protocol between field and scorebook, complete with an error-correction code.',
      expert: 'Modern usage spike: DRS overturns. When a review reverses OUT to NOT OUT, the umpire revokes and re-signals the correct outcome (including any runs that now count). Cricket formalized "undo" a century before software did — and it remains the only major sport with a dedicated retraction gesture in its laws.',
    },
  },

  // ── intermediate: same-family distractors ──────────────────────────────────
  {
    id: 'crk-sig-int-1', level: 'intermediate', signal: 'crk-short-run',
    prompt: P,
    options: ['A short run — one run disallowed', '5 penalty runs to the batting side', 'A leg bye', 'Dead ball'],
    answer: 0,
    title: 'Same-shoulder tap: short run',
    exp: {
      kid: 'Fingers tapping his OWN near shoulder mean SHORT RUN — a batter turned around WITHOUT touching his bat down behind the line. That run doesn\'t count! Cheating the turn costs you.',
      beginner: 'Each run requires bat or body grounded beyond the popping crease before turning back. Fail, and the umpire signals short: that run is deducted from what was run.',
      intermediate: 'Precisely: "the run in which the short running occurred" doesn\'t count — run 2 but turn short after run 1, and only 1 counts. Deliberate short running is a 5-penalty-run offence — a different, harsher regime.',
      expert: 'MCC drafting detail worth savoring: this signal is fingertips to the SAME-side shoulder — while the 5-penalty-run signals use the OPPOSITE shoulder (tapping = to batting side, placed hand = to fielding side). Three shoulder-touch signals, distinguished by same/opposite and tap/rest. Law 2.13 is a masterclass in gesture design economy.',
    },
  },
  {
    id: 'crk-sig-int-2', level: 'intermediate', signal: 'crk-wide',
    prompt: P,
    options: ['Wide', 'No-ball', 'Six', 'Dead ball'],
    answer: 0,
    title: 'Wide is relative to the batter',
    exp: {
      kid: 'Both arms out in a T mean WIDE. And a wide isn\'t just about lines on the ground — it\'s about whether THAT batter, standing where he was, could reach the ball with a normal swing.',
      beginner: 'The law defines wide as out of reach for a normal cricket shot, judged from the batter\'s position (and where he\'s moved to). The crease guide-lines are aids, not the law.',
      intermediate: 'Batters moving around the crease complicate it: step to off and a leg-side ball you vacated may NOT be wide (you made it unreachable). Umpires re-anchor the judgment to the batter\'s actual and original stance.',
      expert: 'T20 arms race: batters shuffle to manufacture reach, bowlers follow them with wide-line precision, and playing conditions have added protected-line rules (a leg-side wide behind original leg stump stays wide in some competitions even if the batter moved). The two flat arms encode a genuinely moving target — the most context-dependent boundary judgment in cricket.',
    },
  },
  {
    id: 'crk-sig-int-3', level: 'intermediate', signal: 'crk-out',
    prompt: P,
    options: ['Out', 'A bye', 'Six', 'A free hit'],
    answer: 0,
    title: 'The finger vs the T',
    exp: {
      kid: 'The slow-rising finger means OUT. But the batter can challenge with TV technology — cameras check if the ball really would have hit the stumps. If the umpire was wrong, the out is canceled!',
      beginner: 'Teams get limited reviews (typically 2–3 per innings, kept if successful). DRS checks: legal delivery? edge (UltraEdge)? pitching/impact/hitting zones (ball-tracking)? The third umpire relays; the on-field umpire re-signals.',
      intermediate: '"Umpire\'s call" is the pivot: if ball-tracking is marginal (clipping the stumps), the ORIGINAL decision stands and the review isn\'t lost in most conditions. The raised finger thus carries weight even into the machine age.',
      expert: 'Umpire\'s call is sport\'s most explicit epistemology: technology has error bars, so marginal predictions defer to the human ruling — the same anchoring principle as rugby\'s "any reason I cannot award" and hockey\'s on-ice call. Cricket just quantified the deference zone in millimetres. The finger→T→finger-or-revoke choreography is a complete judicial appeal, performed in 90 seconds.',
    },
  },
  {
    id: 'crk-sig-int-4', level: 'intermediate', signal: 'crk-bye',
    prompt: P,
    options: ['Byes', 'A leg bye', 'Six', 'Out'],
    answer: 0,
    title: 'Four byes: the anonymous boundary',
    exp: {
      kid: 'The open palm raised high means BYES. If the missed ball races all the way to the rope, the team gets 4 runs — but no player gets credit. Free team runs!',
      beginner: 'Byes reaching the boundary = 4 byes: the umpire signals bye THEN four. They appear in extras; the batter\'s score and the bowler\'s runs-conceded column are both untouched.',
      intermediate: 'That bookkeeping is meaningful: a bowler\'s economy rate survives byes (blamed on the keeper, informally), while wides and no-balls DO count against the bowler. The signal sequence tells scorers which column bleeds.',
      expert: 'Signal-sequencing is a real protocol: bye + four = two signals in order; leg bye + four likewise. Scorers acknowledge each (umpires wait for the wave back). Extras taxonomy — byes (keeper), leg byes (neutral), wides/no-balls (bowler) — is the accounting system that makes bowling analyses comparable across a century of scorebooks.',
    },
  },
  {
    id: 'crk-sig-int-5', level: 'intermediate', signal: 'crk-dead',
    prompt: P,
    options: ['Dead ball', 'Wide', 'A short run', 'Revoke last signal'],
    answer: 0,
    title: 'Dead means the four never happened',
    exp: {
      kid: 'The crossing wrists mean DEAD BALL — and it can erase things! If something silly interrupts the game mid-delivery, even a big hit to the rope doesn\'t count. The bowler bowls it again.',
      beginner: 'A dead ball voids the delivery\'s outcomes: no runs, no dismissals, delivery re-bowled (it doesn\'t count in the over). Fairness demands neither side profits from a disrupted ball.',
      intermediate: 'Timing subtleties: umpires judge WHEN the distraction occurred — before the shot (dead, re-bowl) vs after the outcome was settled. A boundary already completed before the interruption stands.',
      expert: 'The deep principle: cricket\'s laws treat each delivery as an atomic transaction — dead ball is the ROLLBACK. Compare baseball\'s dead-ball awards (placements by rule): cricket voids and replays; baseball freezes and compensates. Two dead-ball philosophies, visible entirely through their signals.',
    },
  },
  {
    id: 'crk-sig-int-6', level: 'intermediate', signal: 'crk-six',
    prompt: P,
    options: ['Six', 'Wide', 'Byes', 'Out'],
    answer: 0,
    title: 'The boundary-rider\'s tightrope',
    exp: {
      kid: 'Both arms straight up mean SIX! Even when a fielder catches it at the rope — if he stepped on the wrong side of the boundary while touching the ball, it\'s not out, it\'s SIX!',
      beginner: 'A catch is only fair if the fielder never touches the ground beyond the boundary while in contact with the ball. Parry it up, step out, jump back in… the rules track every touch.',
      intermediate: 'The modern rule: a fielder who is airborne beyond the rope may only touch the ball if his final ground contact BEFORE first touching the ball was inside. Relay catches (throw to a partner inside) live on exactly this clause.',
      expert: 'Recent law tightening: after acrobatic "bunny-hop" saves strained credulity, conditions now require the fielder, after first touching the ball while airborne beyond the boundary, to land fully inside — repeated outside-the-rope juggles are out… of bounds: six. The two raised arms at the end of a three-minute review are the umpire compressing a multi-clause geometry proof into one pictogram.',
    },
  },

  // ── expert: confusable pairs ────────────────────────────────────────────────
  // Pair A: bye (OPEN PALM raised, held) vs out (single INDEX FINGER raised) —
  // the same raised arm, decoded purely by hand glyph.
  {
    id: 'crk-sig-exp-1', level: 'expert', signal: 'crk-bye',
    prompt: P,
    options: ['Byes', 'Out', 'Six', 'A free hit'],
    answer: 0,
    title: 'Five fingers: nobody touched it',
    exp: {
      kid: 'Count the fingers up there: ALL FIVE spread wide — that\'s BYES, sneaky runs when the ball touched nothing. One single finger would end the batter\'s whole innings!',
      beginner: 'The raised arm is cricket\'s highest-stakes silhouette: open palm = byes (a bookkeeping note); index finger = out (a dismissal). Umpires splay the palm deliberately so 22 yards away nobody\'s heart stops by mistake.',
      intermediate: 'The palm also chains: bye then the four wave, or bye then... nothing (runs run). It\'s always about extras — the batter\'s average is untouched, the keeper\'s pride is not.',
      expert: 'Design analysis: Law 2.13 needed two "arm up" signals and separated them by hand SHAPE rather than angle — because the umpire signals byes while play may still be live-ish and can\'t hold a pose long. Shape reads faster than angle at a glance; angle reads better held. Match the encoding to the dwell time: that\'s professional-grade signal engineering, in a law written before radio.',
    },
  },
  {
    id: 'crk-sig-exp-2', level: 'expert', signal: 'crk-out',
    prompt: P,
    options: ['Byes', 'Out', 'Six', 'A free hit'],
    answer: 1,
    title: 'One finger: the innings ends',
    exp: {
      kid: 'One single finger, rising slowly and holding high — OUT. Five spread fingers would just mean byes. One finger changes everything; five change almost nothing!',
      beginner: 'The finger only ever answers an appeal, and it\'s deliberately unhurried — the pause is the umpire re-running the evidence (line, edge, height) before committing to the most consequential gesture in the sport.',
      intermediate: 'The finger\'s slow rise is also practical theater: scorers, players, and the pavilion all need one unambiguous beat. Compare the bye palm, flashed quickly — dwell time tracks consequence.',
      expert: 'Etiquette layer the laws never wrote down: the finger is raised toward the batter, never pumped; some umpires add a quiet "that\'s out." The dismissal signal is the only one with a social contract attached — the batter walks. When DRS overturns it, the revoke (both shoulders crossed) formally un-rings the bell. Finger, T, revoke: a complete appellate system in three gestures.',
    },
  },
  // Pair B: 5 penalty runs to the BATTING side (opposite shoulder, TAPPING) vs to
  // the FIELDING side (opposite shoulder, hand PLACED still) — motion vs stillness.
  {
    id: 'crk-sig-exp-3', level: 'expert', signal: 'crk-penalty-bat',
    prompt: P,
    options: ['5 penalty runs to the batting side', '5 penalty runs to the fielding side', 'A short run', 'Revoke last signal'],
    answer: 0,
    title: 'The repeated tap: runs to the batters',
    exp: {
      kid: 'The hand crosses the chest and TAPS the far shoulder — tap-tap-tap! That means 5 FREE RUNS for the batting team, like when the ball hits a helmet the fielders left lying on the grass.',
      beginner: 'Penalty runs punish conduct/equipment offences: ball hitting a fielder\'s parked helmet, deliberate fielding with clothing, illegal ball-tampering. Five runs, signaled by repeatedly tapping the opposite shoulder.',
      intermediate: 'The REPEATED TAPPING = batting side benefits; a hand simply PLACED on the opposite shoulder = fielding side benefits. Motion versus stillness is the entire difference — the hardest discrimination in Law 2.13, and exactly why this game animates.',
      expert: 'Full context: penalty runs also attach to time-wasting and mock fielding under modern laws, and they\'re added as extras immediately, even mid-over. Five runs without a ball bowled is the laws\' bluntest behavioural lever — and the umpire\'s moving hand is the only thing telling the scorers WHICH team just got paid.',
    },
  },
  {
    id: 'crk-sig-exp-4', level: 'expert', signal: 'crk-penalty-field',
    prompt: P,
    options: ['5 penalty runs to the batting side', '5 penalty runs to the fielding side', 'A short run', 'Revoke last signal'],
    answer: 1,
    title: 'The placed hand: runs to the fielders',
    exp: {
      kid: 'The hand crosses the chest and RESTS quietly on the far shoulder — no tapping. The 5 free runs go the other way, to the fielding team, because the BATTERS broke a rule this time.',
      beginner: 'Batting-side offences: deliberately running short, damaging the protected pitch area after warnings, deliberate distraction. The 5 runs are added to the fielding side\'s total.',
      intermediate: 'The mnemonic: TAPPING is "applause" for the batters (runs to them); a STILL hand is a stop sign against them. And the third shoulder signal — same-side fingertip tap = short run — completes the shoulder trilogy.',
      expert: 'Design analysis: Law 2.13 packs three distinct meanings onto shoulder contact using two axes (same/opposite side, moving/static) — a two-bit encoding on one body part. When scorers 70 metres away must never mis-book a 5-run swing, gesture orthogonality is a legal requirement. This pair is the expert exam of cricket signal literacy, and now you pass it.',
    },
  },
  // Pair C: short run (fingers tap the NEAR shoulder — arm does NOT cross) vs
  // revoke (BOTH hands crossed to the opposite shoulders) — arm count + crossing.
  {
    id: 'crk-sig-exp-5', level: 'expert', signal: 'crk-short-run',
    prompt: P,
    options: ['A short run', 'Revoke last signal', '5 penalty runs to the batting side', 'Dead ball'],
    answer: 0,
    title: 'One arm, near shoulder: a run comes off',
    exp: {
      kid: 'ONE hand tapping its OWN side\'s shoulder — the arm never crosses the chest. That\'s SHORT RUN: a batter turned without grounding his bat, so one run is scrubbed.',
      beginner: 'The decode has two checks: how many arms (one), and does it cross the body (no). Cross-body contact means penalty runs; both arms crossed means a revoked signal. Near-shoulder, one arm = short run.',
      intermediate: 'Short runs are rare enough that crowds routinely miss them — the total just quietly drops by one. Watch the scorers\' acknowledgment wave: umpires hold shoulder signals until the scorebook confirms receipt.',
      expert: 'Deliberate short running (stealing ground on the turn) upgraded in modern laws to the 5-penalty-run regime AGAINST the batting side — meaning the same physical act can produce the near-shoulder tap (accident, minus one run) or the placed opposite-shoulder hand (cheating, minus five the other way). Intent, judged live, selects between two shoulder signals. That\'s the deepest cut in the trilogy.',
    },
  },
  {
    id: 'crk-sig-exp-6', level: 'expert', signal: 'crk-revoke',
    prompt: P,
    options: ['A short run', 'Revoke last signal', '5 penalty runs to the batting side', 'Dead ball'],
    answer: 1,
    title: 'Both arms crossed: the undo',
    exp: {
      kid: 'BOTH hands cross the chest to touch BOTH shoulders at once — that\'s the umpire\'s UNDO button: "cancel my last signal!" One tapping hand would mean something completely different.',
      beginner: 'Arm count is the decode: two crossed arms held still = revoke; one arm = the short-run/penalty-runs family. After revoking, the umpire immediately shows the corrected signal so the scorebook can be fixed.',
      intermediate: 'The revoke exists because signals are TRANSACTIONS with the scorers, executed on sight. There\'s no shouting across 70 metres — the error-correction protocol had to be a gesture, and it had to be impossible to confuse with any scoring signal.',
      expert: 'Notice how the whole shoulder family stays orthogonal: one arm/near/tap (short run), one arm/opposite/tap (penalty: batting), one arm/opposite/still (penalty: fielding), two arms/crossed/still (revoke). Two positions × motion × arm count = four meanings with maximum mutual distance. Cricket\'s Victorian lawmakers invented error-corrected signaling before information theory had a name.',
    },
  },
];
