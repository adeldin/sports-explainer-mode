// Signal Decoder — Soccer bank (v2 rework). Referee + assistant-referee signals only
// (evergreen, rule-based; verified against the IFAB Laws of the Game and standard AR
// signal guides). 6 scenarios per tier × 4 tiers.
//
// v2 CONTRACT: constant prompt (varied only by WHICH official is shown — referee vs
// flag-carrying assistant), options are always other soccer signal meanings,
// difficulty = visual closeness of the distractor signals. Pure data.
import type { SignalScenario } from '../signalDecoder';

const P = 'What is the referee signaling?';
const PA = 'What is the assistant referee signaling?';

export const SOCCER_SIGNAL_SCENARIOS: SignalScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'soc-sig-kid-1', level: 'kid', signal: 'soc-yellow',
    prompt: P,
    options: ['A warning — behave, or you\'re off!', 'A goal', 'A substitution'],
    answer: 0,
    title: 'Yellow card: the official warning',
    exp: {
      kid: 'A yellow card is a WARNING for breaking the rules — like a reckless tackle or arguing. It says: one more and you\'re out of the game!',
      beginner: 'A caution (yellow) is booked for reckless fouls, dissent, time-wasting, shirt-off celebrations and more. Two yellows in one match = a red card = off you go.',
      intermediate: 'The card system is cumulative pressure: a cautioned defender must tackle more carefully for the rest of the match — managers often substitute booked players before a second yellow becomes inevitable.',
      expert: 'Why cards exist at all: they were invented so sanctions cross language barriers — a signal system precisely because referees and players often share no language. Yellow\'s tactical layer: accumulating cautions across matches triggers suspensions in most competitions, so a "cheap" yellow in a safe win still has a price next week.',
    },
  },
  {
    id: 'soc-sig-kid-2', level: 'kid', signal: 'soc-red',
    prompt: P,
    options: ['Sent off for the match', 'A penalty kick', 'A corner kick'],
    answer: 0,
    title: 'Red card: sent off',
    exp: {
      kid: 'RED means OFF! The player must leave the field for the whole game, and his team plays with one fewer player. Red is for really bad fouls.',
      beginner: 'A sending-off (red) follows serious foul play, violent conduct, denying an obvious goal chance, or a second yellow. The team plays the rest a player short — no substitute allowed.',
      intermediate: 'Playing 10 v 11 changes everything: the short team usually drops deep and defends. That\'s why late reds effectively decide matches even at 0-0 — the numerical advantage compounds every minute.',
      expert: 'Decoding detail: a straight red for denying a goal-scoring opportunity (DOGSO) depends on distance to goal, direction of play, defenders present, and control of the ball — the four-factor test. In the box, a genuine attempt to play the ball downgrades DOGSO to yellow + penalty. One card, an entire jurisprudence.',
    },
  },
  {
    id: 'soc-sig-kid-3', level: 'kid', signal: 'soc-penalty',
    prompt: P,
    options: ['Penalty kick!', 'A goal', 'Offside'],
    answer: 0,
    title: 'Pointing at the spot: penalty!',
    exp: {
      kid: 'The point at the little white dot means PENALTY — a free shot at goal from 12 yards, just the kicker against the goalie. Fouls in the box are expensive!',
      beginner: 'A direct-free-kick foul by defenders inside their own penalty area = penalty kick from the spot. Only the goalkeeper may defend it; everyone else waits outside the area.',
      intermediate: 'Penalties convert at roughly three in four, so the whistle-and-point is close to awarding a goal. It\'s why defenders keep arms behind their backs in the box — handball risk changes everything inside those lines.',
      expert: 'Precision points: the keeper needs one foot on (or level with) the line at the kick; encroachment matters only if it interferes; and a penalty can be retaken for violations. The referee\'s emphatic run-and-point exists to be unmistakable amid protest — this is the single most contested pointing gesture in sport.',
    },
  },
  {
    id: 'soc-sig-kid-4', level: 'kid', signal: 'soc-offside-flag',
    prompt: PA,
    options: ['Offside', 'A goal', 'The end of the match'],
    answer: 0,
    title: 'Flag up: offside',
    exp: {
      kid: 'The raised flag means OFFSIDE — an attacker was hiding too close to the goal (past the last defender) when a teammate passed the ball. Free kick to the defense!',
      beginner: 'A player is offside if, when the ball is played FORWARD to them, they\'re nearer the goal than both the second-last defender and the ball. The flag goes up when they get involved.',
      intermediate: 'Two-step signal: flag straight up = offence spotted; after the whistle, the AR points the flag to near/middle/far side to show WHERE the offside was. Also key: it\'s judged at the moment the pass is struck, not received.',
      expert: 'Modern nuance: assistants are trained to DELAY the flag on tight scoring chances (letting VAR check the completed play) — so a late flag isn\'t a slow assistant, it\'s protocol. And "offside position" alone is legal; the offence needs involvement: touching the ball, obstructing the keeper\'s view, or gaining advantage from a rebound.',
    },
  },
  {
    id: 'soc-sig-kid-5', level: 'kid', signal: 'soc-corner',
    prompt: P,
    options: ['A corner kick', 'A penalty', 'A substitution'],
    answer: 0,
    title: 'Pointing at the corner: corner kick',
    exp: {
      kid: 'That upward point at the little flag means CORNER KICK — the defending team knocked the ball over their own goal line, so the attackers get to cross it in from the corner. Great chance to score!',
      beginner: 'Ball out over the goal line, last touched by the defense (and no goal) = corner. Last touched by the attack = goal kick instead. The angled point to the arc settles which.',
      intermediate: 'Corners are set-piece currency: teams score a meaningful share of goals from them, which is why you\'ll see goalkeepers sprint forward for last-minute corners — the award converts a dead ball into a scoring lottery.',
      expert: 'Reading the paired signals: referee points up to the corner arc = corner; a horizontal arm toward the goal area = goal kick. On deflections neither team agrees who touched last — watch the ASSISTANT\'s flag (pointed at the arc vs extended toward the goal area); the referee usually mirrors the AR\'s read on these.',
    },
  },
  {
    id: 'soc-sig-kid-6', level: 'kid', signal: 'soc-sub-flag',
    prompt: PA,
    options: ['A substitution is ready', 'Offside', 'A goal'],
    answer: 0,
    title: 'Flag overhead in both hands: substitution',
    exp: {
      kid: 'Held flat overhead with two hands, the flag means SUBSTITUTION — a fresh player is ready to come on. The referee will stop play at the next chance.',
      beginner: 'Substitutions happen at stoppages with the referee\'s permission: the leaving player exits (at the nearest boundary in most competitions), then the new one enters at halfway. The AR\'s two-handed flag alerts the referee it\'s pending.',
      intermediate: 'The fourth official usually runs the actual swap with the number board; the AR\'s flag is the attention-getter. Teams get a limited number of subs and stoppage windows — burn them wisely.',
      expert: 'Why the distinct two-handed pose? A one-handed vertical flag = offside, an angled flag = throw-in; the substitution signal had to be unmistakably different from both since it carries no ruling about play. It\'s pure administrative semaphore — the only AR signal that never affects the ball.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'soc-sig-beg-1', level: 'beginner', signal: 'soc-indirect',
    prompt: P,
    options: ['An indirect free kick', 'A direct free kick', 'A penalty'],
    answer: 0,
    title: 'The held-up arm: indirect free kick',
    exp: {
      kid: 'The arm raised straight up and HELD there means INDIRECT — you can\'t score straight from this kick! The ball must touch another player first. That\'s why the arm stays up: it\'s a reminder.',
      beginner: 'Indirect free kicks follow non-physical offences (offside, dangerous play, keeper handling a back-pass). The referee\'s arm stays raised until the ball touches a second player or goes out.',
      intermediate: 'Shoot an indirect kick straight in and the "goal" becomes a goal kick for the defense. Teams therefore build two-touch routines — one tap, then the strike — to legalize the shot.',
      expert: 'This is soccer\'s classic paired-signal exam: raised-and-HELD arm = indirect; a mere directional point (arm then lowered) = direct. The most theatrical version is the indirect kick INSIDE the box (back-pass offence): the defending wall lines up on the goal line, and the two-touch choreography plays out at point-blank range.',
    },
  },
  {
    id: 'soc-sig-beg-2', level: 'beginner', signal: 'soc-direct',
    prompt: P,
    options: ['A direct free kick', 'An indirect free kick', 'A corner kick'],
    answer: 0,
    title: 'Point and lower: direct free kick',
    exp: {
      kid: 'The quick point toward goal means DIRECT free kick — the fouled team can shoot straight at goal from the spot of the foul. No held-up arm = shoot away!',
      beginner: 'Direct free kicks follow physical/handball offences: kicks, trips, pushes, holds, handballs. The signal is just a directional point; the arm doesn\'t stay up.',
      intermediate: 'The direct/indirect split is about offence TYPE, not location: contact and handball offences = direct (and become penalties in the box); technical offences = indirect (never a penalty, even in the box).',
      expert: 'Free-kick geometry is a science: within ~25 yards of goal, a direct award spawns the wall ritual (10 yards, vanishing spray, jostling for rebounds). Decode the absence: fans often can\'t tell why a dangerous kick wasn\'t shot at goal — the answer is usually an arm you didn\'t notice staying up.',
    },
  },
  {
    id: 'soc-sig-beg-3', level: 'beginner', signal: 'soc-throwin-flag',
    prompt: PA,
    options: ['A throw-in', 'Offside', 'A corner kick'],
    answer: 0,
    title: 'The angled flag: throw-in',
    exp: {
      kid: 'The tilted flag means THROW-IN — and it points the way the team who gets the ball is attacking. The other team touched it last before it went out!',
      beginner: 'Ball fully over the touchline = throw-in against whoever touched it last. The AR\'s flag angle shows direction; both hands, over the head, feet on the ground for the thrower.',
      intermediate: 'Illegal throws (lifted foot, one-handed, from the wrong spot) hand the throw to the opponents. Watch how the flag\'s direction sometimes flips after referee–AR eye contact: last-touch is genuinely hard on deflections.',
      expert: 'A rule everyone forgets, encoded in no signal: you cannot score directly from a throw-in (into the opponents\' goal = goal kick; comically, into your OWN = corner to them). And there\'s no offside from a throw-in — which is why long-throw specialists turn every deep throw into a de-facto corner.',
    },
  },
  {
    id: 'soc-sig-beg-4', level: 'beginner', signal: 'soc-advantage',
    prompt: P,
    options: ['Advantage — play on, the foul is noted', 'A direct free kick', 'A substitution'],
    answer: 0,
    title: 'Arms sweeping on: advantage',
    exp: {
      kid: 'The referee saw a foul but the fouled team STILL has the ball and a good attack — so the sweeping arms say keep going! Stopping would only help the team that fouled.',
      beginner: 'Advantage: play continues if the offended team benefits more from possession than from a free kick. If the promised advantage dies within seconds, the referee whistles the original foul after all.',
      intermediate: 'The referee runs a value calculation in real time: position on pitch, attack\'s momentum, chance of the free kick being better. Near the box the free kick is often WORTH more — advantage is rarer there.',
      expert: 'Cards survive advantage: a caution-worthy foul played through gets the yellow at the next stoppage; a red-card offence too (with the nuance that the offender\'s further involvement can be curtailed). One more decode: modern law allows the signal with one OR both arms — but the both-arm sweep remains the canonical classroom image.',
    },
  },
  {
    id: 'soc-sig-beg-5', level: 'beginner', signal: 'soc-var',
    prompt: P,
    options: ['A VAR review', 'A substitution', 'An indirect free kick'],
    answer: 0,
    title: 'The TV-screen rectangle: VAR',
    exp: {
      kid: 'The air-rectangle means TV CHECK! Referees watching video replays are helping to make sure a big decision — like a goal or red card — is right.',
      beginner: 'VAR only touches four match-changing categories: goals, penalties, straight red cards, and mistaken identity. The rectangle announces either an on-field review or an overturned decision.',
      intermediate: 'Protocol grammar: finger-to-ear = a check is running (play may quietly wait); the drawn rectangle = the referee is formally reviewing or announcing the outcome. Only the referee may make the TV sign — a player demanding one with the same gesture earns a yellow.',
      expert: 'The standard is "clear and obvious error" — VAR isn\'t a re-refereeing service, it\'s an error-catching net, and factual calls (offside position) are corrected outright while subjective ones go to the pitch-side monitor. Decoding tip: rectangle WITHOUT a monitor visit = factual overturn; rectangle + jog to the screen = the referee is re-judging his own call.',
    },
  },
  {
    id: 'soc-sig-beg-6', level: 'beginner', signal: 'soc-corner',
    prompt: P,
    options: ['A corner kick', 'A goal kick', 'A penalty'],
    answer: 0,
    title: 'The save that concedes a corner',
    exp: {
      kid: 'The point at the corner flag means CORNER — and any defender\'s touch counts, even the goalie\'s great save! Touch it last before it crosses your goal line and the attackers get the corner.',
      beginner: 'The rule is purely about last touch and which line: over the goal line, last touched by defense (keeper included) = corner. The quality or intent of the touch is irrelevant.',
      intermediate: 'This creates the goalkeeper\'s dilemma on shots drifting near the frame: tip it over (concede a dangerous corner) or trust it\'s going wide (risk a goal). Elite keepers make that read in a tenth of a second.',
      expert: 'Deflection chains complicate the read: shot → defender\'s shin → keeper\'s glove → over. Still a corner (all defensive touches). Attacker\'s toe last = goal kick. The referee is doing touch-forensics at full speed, often deferring to the AR\'s flag or, in elite matches, goal-line-adjacent camera checks for the near-impossible calls.',
    },
  },

  // ── intermediate: same-family distractors ──────────────────────────────────
  {
    id: 'soc-sig-int-1', level: 'intermediate', signal: 'soc-offside-flag',
    prompt: PA,
    options: ['Offside', 'A throw-in', 'A substitution', 'A corner kick'],
    answer: 0,
    title: 'Offside without touching the ball',
    exp: {
      kid: 'The straight-up flag means OFFSIDE — and you can be offside without even touching the ball! Standing where the goalie can\'t see past you counts as joining the play.',
      beginner: 'Offside needs position AND involvement. Involvement includes: playing the ball, blocking an opponent\'s line of vision, challenging for the ball, or gaining advantage from a rebound.',
      intermediate: 'This is the "phantom offside" that confuses stadiums: the goal-scorer was onside, but a teammate lurking offside in the keeper\'s eyeline poisons the goal. The flag is for the lurker, not the scorer.',
      expert: 'The line-of-vision test is deliberately narrow: the attacker must be in the keeper\'s sightline to the BALL and clearly impact his ability to play it — merely standing offside in the box is legal. VAR reviews of disallowed goals now hinge on frame-by-frame sightline reconstruction. When a whole crowd asks "offside on WHO?", you now know the answer.',
    },
  },
  {
    id: 'soc-sig-int-2', level: 'intermediate', signal: 'soc-advantage',
    prompt: P,
    options: ['Advantage — play on', 'A direct free kick', 'A VAR review', 'A penalty'],
    answer: 0,
    title: 'Advantage has a return policy',
    exp: {
      kid: 'The sweeping arms give the attackers a chance — but if their attack fizzles right away, the referee rewinds! Free kick where the foul happened, AND the fouler still gets his card.',
      beginner: 'If the anticipated advantage doesn\'t develop within a few seconds, the referee brings play back for the original offence. The card, when deserved, is shown either now or at the next stoppage.',
      intermediate: 'The "few seconds" window is real refereeing craft: too quick a whistle wastes real advantages; too slow and the foul becomes unenforceable (you can\'t rewind after a full new phase of play). Watch top referees hold the sweep with the whistle already at their lips.',
      expert: 'One critical asymmetry: if the advantage DOES develop, the free kick is gone forever, but misconduct is not — the yellow comes at the stoppage, and a DOGSO red played under advantage that ends in a goal downgrades to yellow (the denial evaporated). Advantage trades the restart, never the discipline.',
    },
  },
  {
    id: 'soc-sig-int-3', level: 'intermediate', signal: 'soc-penalty',
    prompt: P,
    options: ['A penalty kick', 'A direct free kick', 'A corner kick', 'An indirect free kick'],
    answer: 0,
    title: 'Handball: position, not just contact',
    exp: {
      kid: 'The firm point DOWN at the spot means PENALTY. But remember — a ball touching an arm isn\'t automatically a foul! It matters where the arm WAS: stuck out wide, or held in close.',
      beginner: 'Handball requires the arm to make the body "unnaturally bigger," to move toward the ball, or a deliberate play. An arm pinned to the chest is a natural position — normally no offence.',
      intermediate: 'The judgment axis is silhouette: outstretched or raised arms extend your blocking area and get punished regardless of intent; arms in a natural running/falling shape don\'t. That\'s why box defenders adopt the "arms behind back" insurance posture.',
      expert: 'The law has oscillated for years (accidental handball before a goal, arm-above-shoulder presumptions), which is exactly why VAR reviews cluster on this call. Decode the sequence: point-to-spot → rectangle → monitor jog = the referee is re-checking silhouette, proximity (no time to react?), and whether the arm moved to ball or ball to arm.',
    },
  },
  {
    id: 'soc-sig-int-4', level: 'intermediate', signal: 'soc-red',
    prompt: P,
    options: ['A sending-off', 'A caution', 'A substitution', 'A penalty'],
    answer: 0,
    title: 'Yellow + yellow = red, shown in order',
    exp: {
      kid: 'The red card means OFF — and when it comes right after a second yellow, the referee shows the yellow first, THEN the red, so everyone knows it\'s two warnings adding up.',
      beginner: 'A player\'s second caution triggers a mandatory sending-off, always displayed as yellow-then-red so the record shows accumulation, not violent conduct.',
      intermediate: 'The distinction matters beyond the day: a two-yellow red usually carries a lighter suspension than a straight red for serious foul play. The card choreography IS the paper trail.',
      expert: 'Referee craft: managing a match means knowing who\'s "on a yellow" — players bait booked opponents into second-yellow situations, and referees consciously raise the bar for a second caution to avoid deciding matches on trifles. The two-card flourish looks bureaucratic; it\'s actually the visible tip of game-management strategy on both sides.',
    },
  },
  {
    id: 'soc-sig-int-5', level: 'intermediate', signal: 'soc-var',
    prompt: P,
    options: ['A VAR review', 'A substitution', 'An indirect free kick', 'Advantage'],
    answer: 0,
    title: 'The bar for the overturn',
    exp: {
      kid: 'The rectangle means the TV check is on. It doesn\'t redo every decision — it only fixes CLEAR mistakes. The replay must basically shout "that was wrong!" before the call changes.',
      beginner: 'VAR\'s threshold is "clear and obvious error" (or a serious missed incident). Marginal, debatable calls stay with the on-field decision — the referee\'s original ruling has weight.',
      intermediate: 'That\'s why identical-looking penalties get opposite outcomes: one was CALLED on-field and survives review (not clearly wrong); the other wasn\'t called and isn\'t clearly right either. The initial signal sets the default.',
      expert: 'Structural insight: the monitor visit is reserved for SUBJECTIVE reversals (the referee must own the new judgment); factual matters — offside geometry, ball out of play, wrong player identified — are corrected without a review, no rectangle jog needed. Decode the two workflows and every VAR delay becomes legible: monitor = judgment; no monitor = math.',
    },
  },
  {
    id: 'soc-sig-int-6', level: 'intermediate', signal: 'soc-yellow',
    prompt: P,
    options: ['A caution', 'A sending-off', 'A substitution', 'An indirect free kick'],
    answer: 0,
    title: 'The captain-accountability yellow',
    exp: {
      kid: 'The yellow card is a warning — and when lots of players surround the referee shouting, the CAPTAIN can get the warning for the whole group. He\'s the boss, so he answers for his teammates\' manners!',
      beginner: 'Modern protocols route dissent through captains: only the captain may approach the referee on major decisions, and mobbing officials draws cautions — with the captain as the accountable card-bearer.',
      intermediate: 'The design goal is de-escalation economics: one predictable yellow beats five heat-of-the-moment ones. Captains now physically herd teammates away — an on-pitch compliance role created by a card policy.',
      expert: 'Signal-reading level: a yellow shown AWAY from any tackle, with the referee\'s other arm sweeping the crowd of players back, is a conduct-management card — it will appear in the book as dissent, and it resets the tolerance threshold for the rest of the match. Referees spend cards to buy control; that\'s match management, visible in card choreography.',
    },
  },

  // ── expert: confusable pairs ────────────────────────────────────────────────
  // Pair A: indirect (arm raised VERTICAL and held) vs direct (arm swings out to a
  // LEVEL point, then holds) — arm angle + the hold.
  {
    id: 'soc-sig-exp-1', level: 'expert', signal: 'soc-indirect',
    prompt: P,
    options: ['An indirect free kick', 'A direct free kick', 'Advantage', 'A penalty'],
    answer: 0,
    title: 'Vertical and held: the un-goal warning',
    exp: {
      kid: 'The arm points straight at the SKY and stays there — INDIRECT free kick. Score straight from it without another touch and the goal doesn\'t count!',
      beginner: 'Straight in from an indirect kick = no goal, goal kick to the defense. Had it deflected off ANY player (either team) on the way, it would count.',
      intermediate: 'The arm coming DOWN is your live indicator: watch the referee during the kick — the moment a second player touches the ball, the arm drops and a subsequent goal is good.',
      expert: 'Mirror case for completeness: an indirect kick straight into your OWN goal = corner to the opponents (the ball technically can\'t score unassisted in either direction). These restart tables — who touched, which line, which restart — are the deep grammar the raised arm compresses into one held pose.',
    },
  },
  {
    id: 'soc-sig-exp-2', level: 'expert', signal: 'soc-direct',
    prompt: P,
    options: ['An indirect free kick', 'A direct free kick', 'Advantage', 'A penalty'],
    answer: 1,
    title: 'The level point: shoot away',
    exp: {
      kid: 'The arm swings out LEVEL, pointing the attacking way, then drops — DIRECT free kick. The fouled team may blast it straight at goal, no extra touch needed!',
      beginner: 'Angle is the entire decode: vertical-and-held = indirect (two touches to score); a level directional point = direct (shoot freely). A keeper picking up a deliberate back-pass earns the vertical arm — even deep inside his own box.',
      intermediate: 'The distinction is offence type: physical/handball offences threaten opponents (direct, penalties in the box); technical offences only break procedure (indirect, never a penalty). Header or chest back to the keeper: perfectly legal to catch — no arm at all.',
      expert: 'The box-indirect is the collector\'s item this pair produces: eleven defenders lawfully packed on their own goal line against a two-touch missile from eight yards. The full back-pass test: deliberate KICK (not a miskick), by a TEAMMATE, handled by the keeper in his own area — and circumventions (the flick-up-and-head trick) are booked as unsporting. One elbow angle, two universes of restart law.',
    },
  },
  // Pair B: offside flag (pole VERTICAL) vs throw-in flag (pole at 45°) — one angle.
  {
    id: 'soc-sig-exp-3', level: 'expert', signal: 'soc-offside-flag',
    prompt: PA,
    options: ['Offside', 'A throw-in', 'A substitution', 'A corner kick'],
    answer: 0,
    title: 'The deliberate late flag',
    exp: {
      kid: 'The flag pole is perfectly VERTICAL — OFFSIDE. And sometimes the assistant raises it late ON PURPOSE: if he flagged too early and was wrong, a real goal would be lost forever!',
      beginner: 'Instruction to ARs: on close offsides leading directly to a scoring chance, keep the flag down, let the attack conclude, THEN flag. VAR can cancel a wrong goal — but can\'t resurrect an attack killed by a wrong early flag.',
      intermediate: 'The asymmetry drives the protocol: a wrong "onside" is fully correctable (disallow the goal); a wrong "offside" whistle is irreversible. So doubt = delay. Defenders must play to the whistle even when certain.',
      expert: 'Consequences ripple: defenders can no longer stop on a raised arm (there isn\'t one), collision risk shifts, and semi-automated offside tech now often replaces the judgment entirely at top level. The late flag is the perfect case study of how review systems reshape live signals — the gesture\'s TIMING became part of its meaning.',
    },
  },
  {
    id: 'soc-sig-exp-4', level: 'expert', signal: 'soc-throwin-flag',
    prompt: PA,
    options: ['Offside', 'A throw-in', 'A substitution', 'A corner kick'],
    answer: 1,
    title: 'Forty-five degrees: the ball just changed hands',
    exp: {
      kid: 'The flag is TILTED at a slant, not straight up — THROW-IN, pointing the way the throwing team attacks. Straight up would mean offside. One angle, totally different call!',
      beginner: 'The AR\'s flag is a one-pole semaphore: vertical = offside (stop play); 45° up = throw-in direction (routine restart); held horizontally overhead with both hands = substitution. Angle carries the entire message.',
      intermediate: 'Direction disputes are the daily grind of this signal: on deflected balls the AR and referee sometimes disagree, and you\'ll see the flag angle flip after eye contact — the referee\'s view overrides, and the crowd howls either way.',
      expert: 'Complete AR semaphore for the collector: up = offside; angled = throw-in; both hands overhead = sub; flag pointed at the corner arc vs extended toward the goal area = corner vs goal kick; a quick wag then stillness = "ball out and back in, play on." Assistants speak a full flag language — learn the angles and you can officiate from behind the goal.',
    },
  },
  // Pair C: corner (point angled UP at the corner flag) vs penalty (point angled
  // DOWN at the spot) — the same arm, opposite angles, different props.
  {
    id: 'soc-sig-exp-5', level: 'expert', signal: 'soc-corner',
    prompt: P,
    options: ['A corner kick', 'A penalty kick', 'A direct free kick', 'An indirect free kick'],
    answer: 0,
    title: 'Pointing up: to the arc',
    exp: {
      kid: 'The arm points UP toward the little flag in the field\'s corner — CORNER KICK. Pointing DOWN at a spot on the grass would be a penalty. Up or down changes everything!',
      beginner: 'Both calls are emphatic points; the target separates them. Corner: ball over the goal line off a defender — attackers cross from the arc. Penalty: a foul inside the box — a free shot from the spot.',
      intermediate: 'Confusing the two on a scramble near the byline is a real broadcast moment: a shot deflected wide (corner) versus a clipped attacker (penalty) can look identical live. Watch the referee\'s ARM ANGLE before believing the crowd\'s roar.',
      expert: 'Officiating mechanics resolve the ambiguity deliberately: the penalty point is made while RUNNING toward the spot (unmistakable commitment amid protest), while the corner point is made standing, angled to the arc. Posture + angle + target — three redundant channels, because these two rulings differ by roughly 0.7 expected goals.',
    },
  },
  {
    id: 'soc-sig-exp-6', level: 'expert', signal: 'soc-penalty',
    prompt: P,
    options: ['A corner kick', 'A penalty kick', 'A direct free kick', 'An indirect free kick'],
    answer: 1,
    title: 'Pointing down: to the spot',
    exp: {
      kid: 'The arm drives DOWN at the little white dot — PENALTY! And penalties have their own rules of politeness: the kicker can do trick steps during the run-up, but can\'t fully stop at the end to fool the goalie.',
      beginner: 'Law: feinting in the run-up is permitted; feinting to kick once the run-up is COMPLETED is an offence — caution, and the kick is retaken or reversed per the outcome table.',
      intermediate: 'The line is the final planting step: hesitation rhythm upstream = art; a full stop at the ball = illegal. Keepers, meanwhile, must keep part of one foot on/level with the line — both sides have choreography laws.',
      expert: 'The outcome matrix is the expert layer: illegal feint + goal = retake + yellow; illegal feint + miss = indirect free kick to the defense + yellow; keeper off the line early + save = retake; both offend = context decides. Every penalty is a tiny procedural courtroom, and the point-to-the-spot is just its opening gavel.',
    },
  },
];
