// Signal Decoder — Rugby bank (v2 rework). World Rugby referee signals only (evergreen,
// rule-based; verified against passport.world.rugby match-official signals).
// 6 scenarios per tier × 4 tiers.
//
// v2 CONTRACT: constant prompt, options are always other rugby signal meanings,
// difficulty = visual closeness. Rugby's expert tier IS the famous one-arm "angle
// ladder": vertical=try, 45°=penalty, bent square=free kick, horizontal=scrum,
// waist-low=advantage. Pure data, zero RN imports.
import type { SignalScenario } from '../signalDecoder';

const P = 'What is the referee signaling?';

export const RUGBY_SIGNAL_SCENARIOS: SignalScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'rug-sig-kid-1', level: 'kid', signal: 'rug-try',
    prompt: P,
    options: ['A try — 5 points!', 'A knock-on', 'A TV replay check'],
    answer: 0,
    title: 'Arm to the sky: try!',
    exp: {
      kid: 'The straight-up arm, held perfectly still, means TRY — a player pressed the ball down on the ground over the goal line. That\'s rugby\'s big score: 5 points!',
      beginner: 'A try requires GROUNDING: downward pressure on the ball, on or over the try line. Five points, plus a conversion kick attempt worth 2 more.',
      intermediate: 'Detail in the pose: the referee faces up the field with his BACK toward the dead-ball line, arm vertical — positioned to mark where the grounding happened for the conversion\'s angle (kicks are taken in line with the grounding spot).',
      expert: 'Grounding is stricter than crossing: carrying the ball over means nothing until it touches down with pressure — held up by defenders = no try (goal-line drop-out under modern law). This is why players stretch to plant the ball and why "held up" reviews stare at daylight between ball and grass.',
    },
  },
  {
    id: 'rug-sig-kid-2', level: 'kid', signal: 'rug-knock-on',
    prompt: P,
    options: ['A knock-on', 'A try', 'A penalty'],
    answer: 0,
    title: 'The overhead wave: knock-on',
    exp: {
      kid: 'The open hand waving back and forth above the head means KNOCK-ON — the ball bounced FORWARD off someone\'s hands or arms. In rugby the ball may only go backward from your hands!',
      beginner: 'Losing the ball forward (hand/arm to ground or another player) is a knock-on. Unless advantage applies, the other team gets a scrum where it happened.',
      intermediate: 'The wave mimics the ball\'s forward journey. Key nuance: forward is judged relative to the DIRECTION OF PLAY, and a ball knocked backward that bounces forward off the ground is fine — hands, not bounce, define the offence.',
      expert: 'Fine print worth knowing: a charge-down of a kick is NOT a knock-on (blocking a kick is legal even if it flies forward), and a juggled ball knocked forward then caught before it lands is play on. Distinguish this waving open hand from the try\'s still, straight arm — motion is the entire difference between a scrum and a celebration.',
    },
  },
  {
    id: 'rug-sig-kid-3', level: 'kid', signal: 'rug-scrum',
    prompt: P,
    options: ['A scrum', 'A try', 'A TV replay check'],
    answer: 0,
    title: 'The level arm: scrum',
    exp: {
      kid: 'The flat, level arm means SCRUM — the big eight-person pushing huddle! The arm points at the team that gets to feed the ball into the tunnel.',
      beginner: 'Scrums restart play after minor errors (knock-ons, forward passes). Eight forwards from each side bind and push; the team the arm points to throws the ball in — a real advantage.',
      intermediate: 'The scrum is a contest, not a formality: a dominant pack can shove the other backward, steal the ball, or win penalties. Watching which way the arm points tells you who just gained that platform.',
      expert: 'Arm HEIGHT is rugby\'s secret code: shoulder-level horizontal = scrum; angled UP at 45° = penalty; bent square at the elbow = free kick; dropped to waist height = advantage. Four heights, four different games about to break out. This game tests you on that ladder at expert.',
    },
  },
  {
    id: 'rug-sig-kid-4', level: 'kid', signal: 'rug-high-tackle',
    prompt: P,
    options: ['A high tackle', 'A knock-on', 'A scrum'],
    answer: 0,
    title: 'Hand across the neck: high tackle',
    exp: {
      kid: 'The flat hand sweeping across the neck means HIGH TACKLE — someone tackled around the head or neck. That\'s dangerous, so it\'s a penalty (and maybe a card).',
      beginner: 'Tackles must be below the line of the shoulders. Contact with the head or neck is foul play: penalty minimum, with yellow or red cards for force and recklessness.',
      intermediate: 'The referee\'s neck-swipe is a foul-play signal that usually precedes a sanction process: penalty → was there head contact? → degree of danger → mitigation (sudden dip?). You\'ll often see the TMO box signal follow it.',
      expert: 'World Rugby\'s head-contact framework made this the most consequential signal in the modern game: head contact + high force + no mitigation = red. The framework\'s decision tree is public — you can genuinely predict the card color by running the same questions the referee verbalizes on the mic.',
    },
  },
  {
    id: 'rug-sig-kid-5', level: 'kid', signal: 'rug-penalty',
    prompt: P,
    options: ['A penalty', 'A try', 'A knock-on'],
    answer: 0,
    title: 'The angled arm: penalty',
    exp: {
      kid: 'The arm slanting UP at an angle means PENALTY — the other team broke a big rule. The pointed-at team gets a free kick and lots of choices!',
      beginner: 'A penalty offers a menu: kick at goal (3 points), kick to touch and KEEP the throw-in, tap and run, or take a scrum. Serious offences (offside, foul play, ruck offences) earn it.',
      intermediate: 'The choice reveals strategy: down by 2 late = shot at goal; chasing a bonus point = corner lineout for a try. Reading the captain\'s decision after this signal is reading the scoreboard math in real time.',
      expert: 'Contrast the bent-arm FREE KICK: no shot at goal allowed and a kick to touch doesn\'t keep the throw. The 45°-vs-bent distinction therefore changes the point-scoring universe — the most valuable single visual discrimination a new rugby fan can learn.',
    },
  },
  {
    id: 'rug-sig-kid-6', level: 'kid', signal: 'rug-tmo',
    prompt: P,
    options: ['A TV replay check (the TMO)', 'A scrum', 'A high tackle'],
    answer: 0,
    title: 'The air rectangle: TMO review',
    exp: {
      kid: 'The big rectangle drawn in the air means "let\'s check the TV!" A special referee watching replays — the TMO — helps decide tricky things, like whether the ball was really touched down for a try.',
      beginner: 'The Television Match Official reviews tries, groundings, touch decisions in the act of scoring, and foul play. The box signal formally opens the review; the big screen shows everyone the replays.',
      intermediate: 'Referees phrase the question precisely — "try or no try?" vs "is there any reason I cannot award the try?" — and the phrasing sets the burden of proof. The second phrasing means the on-field instinct is TRY unless video disproves it.',
      expert: 'Rugby\'s referee-mic transparency makes this the best review system to LEARN from: the whole evidentiary conversation is broadcast. Note the scope: foul play can be reviewed retroactively within the game, and the same rectangle in soccer (VAR) covers a much narrower category list. Same pictogram, different constitutions.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'rug-sig-beg-1', level: 'beginner', signal: 'rug-advantage',
    prompt: P,
    options: ['Advantage — play on', 'A penalty kick at goal', 'A try'],
    answer: 0,
    title: 'The waist-high arm: advantage',
    exp: {
      kid: 'The low arm held out at waist height means ADVANTAGE — the other team broke a rule, but instead of stopping the fun, the referee lets the good team keep playing to see if something better happens!',
      beginner: 'After an infringement, play continues while the non-offending team can gain territory or opportunity. If nothing comes of it, the whistle brings play back for the original scrum/penalty.',
      intermediate: 'Advantage is the only primary signal WITHOUT a whistle first, and it\'s held toward the non-offending team while both possibilities stay alive. "Advantage over" (called aloud) ends the safety net; until then, teams can try risky plays for free.',
      expert: 'Two grades exist: scrum advantage (short — roughly a clean possession) and penalty advantage (long — real territorial/tactical gain required). Teams weaponize the penalty version: a drop-goal attempt or miracle pass with a guaranteed penalty behind it. Watch flyhalves peek at the referee\'s arm before choosing the audacious option.',
    },
  },
  {
    id: 'rug-sig-beg-2', level: 'beginner', signal: 'rug-free-kick',
    prompt: P,
    options: ['A free kick', 'A full penalty', 'A scrum'],
    answer: 0,
    title: 'The bent arm: free kick',
    exp: {
      kid: 'The arm bent square at the elbow (like making a muscle!) means FREE KICK — a smaller prize than a penalty. You can kick or run, but you\'re NOT allowed to kick at the posts for points.',
      beginner: 'Free kicks come from technical offences (scrum early engage, lineout numbers, mark). Options: tap and run, kick, or scrum — but no goal attempt, and a kick to touch doesn\'t keep the throw.',
      intermediate: 'That last limit matters: penalty to touch = YOUR lineout; free kick to touch = the OTHER team throws in. So free kicks are usually tapped quickly or turned into attacking scrums by strong packs.',
      expert: 'The bent arm vs the straight 45° penalty arm is rugby\'s subtlest big distinction — one elbow angle separates "3 points available" from "none." Recent law experiments keep adjusting what free-kick offences exist (scrum infringements especially), but the signal split has been stable for decades: geometry outlives the lawbook.',
    },
  },
  {
    id: 'rug-sig-beg-3', level: 'beginner', signal: 'rug-forward-pass',
    prompt: P,
    options: ['A forward pass', 'A high tackle', 'Obstruction'],
    answer: 0,
    title: 'The mime: forward pass',
    exp: {
      kid: 'The two hands miming a pass drifting ahead mean FORWARD PASS — the ball was thrown toward the other team\'s goal line. Passes must go sideways or backward! Scrum to the other team.',
      beginner: 'Throwing the ball forward (toward the opponents\' dead-ball line) is illegal. Sanction: scrum to the non-offending team where it was thrown, unless advantage runs.',
      intermediate: 'The referee\'s mime re-enacts the crime — rugby\'s secondary signals explain WHY the primary award (the scrum arm) happened. Watch the sequence: level arm (scrum) → passing mime (because: forward pass).',
      expert: 'The physics wrinkle experts argue about: "forward" is judged from the passer\'s hands relative to his running momentum — a ball released backward from a sprinting player can DRIFT forward over the grass and still be legal. Officials watch hand direction, not landing point. TMOs get this wrong less than crowds do, but only barely.',
    },
  },
  {
    id: 'rug-sig-beg-4', level: 'beginner', signal: 'rug-not-release',
    prompt: P,
    options: ['Not releasing the ball', 'A knock-on', 'A forward pass'],
    answer: 0,
    title: 'The chest-clutch: not releasing',
    exp: {
      kid: 'The ball hugged tight to the chest means a tackled player on the ground HELD ON too long. On the floor you must let the ball go so the game keeps flowing — hogging it is a penalty.',
      beginner: 'A tackled player must release the ball (and the tackler must release the player and roll away). Holding on when opponents contest = penalty against the ball carrier.',
      intermediate: 'This is the heart of the breakdown battle: "jackal" defenders latch onto the ball the instant a tackle lands, trying to force this exact signal. Support players must arrive first to protect the ball.',
      expert: 'The referee is adjudicating a race with three clocks: tackler release, carrier release/placement, and the jackal\'s legal entry (through the gate, supporting own weight). The chest-clutch mime tells you which clock expired first. Breakdown penalties swing elite matches more than any other category — learn this mime and its siblings and you can referee the ruck from your couch.',
    },
  },
  {
    id: 'rug-sig-beg-5', level: 'beginner', signal: 'rug-try',
    prompt: P,
    options: ['A try', 'A penalty', 'A TV replay check'],
    answer: 0,
    title: 'Crossing isn\'t scoring',
    exp: {
      kid: 'The vertical arm means TRY — the ball was pressed down on the ground past the line. Being over the line isn\'t enough: if defenders hold the ball up in the air, no try!',
      beginner: '"Held up" means no grounding, no try. Under current law, being held up over the line results in a goal-line drop-out to the defending team — a huge defensive win.',
      intermediate: 'This makes goal-line defense a specific skill: defenders dive UNDER the ball, wedging arms between ball and grass. Attackers counter with pick-and-drives low to the turf where holding up is impossible.',
      expert: 'The law change (held-up = defending drop-out, not an attacking 5m scrum) rebalanced endgames: mauling over from close range got riskier, since a failed grounding now surrenders territory entirely. The absence of the raised arm — and what restart follows — is a live lesson in how lawmakers tune attacking incentives.',
    },
  },
  {
    id: 'rug-sig-beg-6', level: 'beginner', signal: 'rug-obstruction',
    prompt: P,
    options: ['Obstruction', 'A knock-on', 'Not releasing'],
    answer: 0,
    title: 'The scissors: obstruction',
    exp: {
      kid: 'The crossed-arms scissors means OBSTRUCTION — a player without the ball got in a defender\'s way on purpose, like a bodyguard. In rugby you can\'t block for your teammate!',
      beginner: 'Unlike American football, blocking is illegal: teammates can\'t shield the ball carrier or impede chasers. Running interference = penalty to the defense.',
      intermediate: 'Most common sightings: "crossing" (a decoy runner clips the defender marking the real receiver) and blockers screening kick-chasers. Decoy runners are legal only while they could plausibly receive the ball.',
      expert: 'The gray zone is the modern power play: pre-planned "block" lines off the scrum-half, maul formation (legal organized obstruction — the one sanctioned exception, since defenders may attack the maul itself), and escort screens on kick returns. Referees judge whether the blocker CHANGED the defender\'s line. The scissors signal is rugby\'s antitrust law: no illegal shields.',
    },
  },

  // ── intermediate: the ladder starts to matter ───────────────────────────────
  {
    id: 'rug-sig-int-1', level: 'intermediate', signal: 'rug-penalty',
    prompt: P,
    options: ['A penalty', 'A free kick', 'A scrum', 'Advantage'],
    answer: 0,
    title: 'The shot-at-goal election',
    exp: {
      kid: 'The 45° arm means PENALTY — and if the captain points at the posts, his team is choosing to kick for 3 points. Once you ask for the kicking tee, you have to kick!',
      beginner: 'Indicating a kick at goal commits the team: the kick must be attempted within the time limit (60 seconds), from the mark, with the ball on a tee or the ground.',
      intermediate: 'The commitment rule prevents gamesmanship — you can\'t summon the tee to let your forwards rest, then tap and run at a flat-footed defense. Time-wasting around the tee is itself policed.',
      expert: 'The decision matrix behind the point: distance/kicker range, wind, score state, bonus-point math, and forward dominance (a heavy pack may prefer the corner lineout + maul). Analysts grade captains on "points-per-penalty-decision" — that one gesture after the referee\'s 45° arm is the most quantifiable leadership moment in the sport.',
    },
  },
  {
    id: 'rug-sig-int-2', level: 'intermediate', signal: 'rug-advantage',
    prompt: P,
    options: ['Advantage', 'A scrum', 'A penalty', 'A free kick'],
    answer: 0,
    title: 'The free shot',
    exp: {
      kid: 'The low waist-high arm is a safety net! If the attacking team tries something wild — like a drop kick at goal — and misses, no problem: they still get the scrum or penalty they were owed.',
      beginner: 'During advantage, the pending award floors your worst case: miss the droppie, play returns for the scrum/penalty. Make it — 3 points and the advantage is consumed.',
      intermediate: 'Coaches script this: fly-halves drift into the pocket the moment the arm drops to waist height. The same logic powers "miracle plays" — cross-kicks and 30-metre floated passes attempted only under the net.',
      expert: 'Referee counter-craft: an advantage is called OVER once a "tactical opportunity" is exercised — some referees rule a drop-goal ATTEMPT itself as advantage taken (opportunity used), meaning a badly shanked kick may NOT come back. Elite 10s know each referee\'s interpretation. The waist-high arm has micro-jurisprudence attached to it.',
    },
  },
  {
    id: 'rug-sig-int-3', level: 'intermediate', signal: 'rug-knock-on',
    prompt: P,
    options: ['A knock-on', 'A try', 'A forward pass', 'A high tackle'],
    answer: 0,
    title: 'The juggle exception',
    exp: {
      kid: 'The waving hand above the head means KNOCK-ON. But if you bobble the ball forward and CATCH it again before it lands — no knock-on! The wave only comes when the ball escapes.',
      beginner: 'A knock-on completes when the fumbled ball touches ground or another player. Recover your own juggle in the air: play continues. Fail: scrum to the opposition.',
      intermediate: 'For intercepts, referees judge "deliberate knock-on" harshly: slapping the ball down to kill a pass = penalty (and often a yellow if it kills a clear attack). A genuine ATTEMPT TO CATCH that fails = just the scrum.',
      expert: 'The catch-attempt test got explicit in recent law rewrites: one hand reaching to intercept with a realistic catching motion = knock-on (scrum); a cynical volleyball swat = penalty + card exposure. The referee reconstructs finger position at contact. One wave, but the SANCTION depends on a hand-shape judgment made at full speed.',
    },
  },
  {
    id: 'rug-sig-int-4', level: 'intermediate', signal: 'rug-forward-pass',
    prompt: P,
    options: ['A forward pass', 'A knock-on', 'Obstruction', 'Not releasing'],
    answer: 0,
    title: 'The flat pass that\'s legal',
    exp: {
      kid: 'The passing mime means FORWARD PASS. But a pass that just LOOKS flat can be fair! The referee watches the HANDS — if they pushed the ball sideways or backward, it\'s fine, even if it floats forward while everyone runs.',
      beginner: 'The test is the direction of release from the hands, not where the ball lands. Sprinting players carry momentum: a backward-released ball can land ahead of where it left. Legal.',
      intermediate: 'This is why touch judges and TMOs use the passer\'s hand snap on replay, not field markings. The faster the game gets, the more legal "forward-looking" passes exist — physics scales with speed.',
      expert: 'Officially: "thrown forward" means toward the opponents\' dead-ball line RELATIVE to the passer. The momentum doctrine is settled law but eternally contested folklore — expect the mime to stay away on flat screamers unless hand direction clearly broke the plane. Understanding the non-signal here marks you as someone who watches officials, not just outcomes.',
    },
  },
  {
    id: 'rug-sig-int-5', level: 'intermediate', signal: 'rug-high-tackle',
    prompt: P,
    options: ['A high tackle', 'Not releasing', 'Obstruction', 'A knock-on'],
    answer: 0,
    title: 'Rugby\'s yellow: the sin bin',
    exp: {
      kid: 'The neck-swipe means HIGH TACKLE — and in rugby a yellow card isn\'t just a warning: the player must SIT OUT for 10 minutes in the "sin bin," and his team plays a man short!',
      beginner: 'Yellow = 10 minutes in the sin bin, team down to 14. Red = off for good. Cards punish foul play and cynical/repeated infringements (e.g. collapsing a maul near your line).',
      intermediate: 'The 10 minutes are statistically brutal: point-scoring rates jump against 14. That\'s why professional captains ask "who, and why?" — repeated team offences mean the NEXT offender goes, changing how the whole side defends.',
      expert: 'Modern layer: the 20-minute red card (in some competitions) allows a replacement after 20 minutes for non-deliberate dangerous play — and the "bunker" review lets a yellow be upgraded to red off-field while the game continues. So the touchline card ceremony you see may only be the opening bid; the TMO bunker holds the final grade.',
    },
  },
  {
    id: 'rug-sig-int-6', level: 'intermediate', signal: 'rug-scrum',
    prompt: P,
    options: ['A scrum', 'Advantage', 'A penalty', 'A free kick'],
    answer: 0,
    title: 'Reading who the arm favors',
    exp: {
      kid: 'The level arm always points at the team that gets the ball — so if it points at the team you didn\'t expect, the OTHER side must have made the newer mistake!',
      beginner: 'The scrum feed goes to the non-offending team of the LAST ruled offence. Stacked errors resolve in sequence: their knock-on, then your offside — the later/graver offence usually decides.',
      intermediate: 'When both sides infringe, referees weigh order and severity — a penalty offence trumps a scrum offence, and the second offence can\'t profit from the first. The pointing arm is the conclusion of that little adjudication.',
      expert: 'Special case that fools everyone: after an unsuccessful advantage from THEIR offence, the ball comes BACK — arm toward you — even though you just had possession for 20 seconds. The signal marks legal bookkeeping, not the last thing you watched. Reading rugby means tracking the open advantage in your head like the referee does.',
    },
  },

  // ── expert: the angle ladder, pair by pair ──────────────────────────────────
  // Pair A: penalty (straight arm at 45°) vs free kick (arm BENT square) — one
  // elbow angle separates "3 points available" from "none".
  {
    id: 'rug-sig-exp-1', level: 'expert', signal: 'rug-penalty',
    prompt: P,
    options: ['A penalty', 'A free kick', 'A scrum', 'A try'],
    answer: 0,
    title: 'Straight at 45°: points are on the table',
    exp: {
      kid: 'The arm is STRAIGHT, slanting up at 45° — PENALTY. If the elbow were bent square like a muscle-pose, it would only be a free kick, with no shot at the posts allowed!',
      beginner: 'The straight 45° arm unlocks the full menu: kick at goal (3), kick to touch AND keep the throw, tap, or scrum. The bent arm removes the goal option and the touch bonus.',
      intermediate: 'Penalties also escalate: referees track repeated team offences — penalty → captain\'s warning → yellow card to the next offender. Deliberately killing attacks with professional fouls costs a player, not just 3 points.',
      expert: 'The terminal rung is the penalty TRY (7 points, no conversion needed, plus a card) — awarded when foul play prevents a try that probably would have been scored. So the full ladder reads: penalty → warning → yellow → penalty try + card. Elite defenses infringe exactly up to the warning and then stop; reading where a team sits on the ladder explains their sudden discipline.',
    },
  },
  {
    id: 'rug-sig-exp-2', level: 'expert', signal: 'rug-free-kick',
    prompt: P,
    options: ['A penalty', 'A free kick', 'A scrum', 'A try'],
    answer: 1,
    title: 'The square elbow: lesser prize',
    exp: {
      kid: 'Look at the ELBOW — bent square, forearm straight up. That\'s a FREE KICK: you may tap and run or kick, but no shot at the posts. A straight slanted arm would be the full penalty.',
      beginner: 'Free kicks come from technical offences (scrum timing, lineout numbers, calling a mark). No goal attempt, and a kick to touch gives the throw to the OTHER team — so most free kicks are tapped quickly.',
      intermediate: 'Endgame trap: after the clock passes 80:00, play continues until the ball goes dead — so a free kick must still be TAKEN, and matches have been won through multi-minute post-hooter possession chains that started from one bent arm.',
      expert: 'A match cannot end on an un-taken award: penalties and free kicks after the hooter must be played, and scoring chances play out fully. The bent arm at 80:03 isn\'t a formality — it\'s the doorway to the most dramatic law in rugby. One elbow angle decides whether the fly-half can end the game with a shot at goal or must engineer field position first.',
    },
  },
  // Pair B: scrum (arm dead HORIZONTAL at the shoulder) vs advantage (arm at
  // WAIST height) — pure height discrimination on one straight arm.
  {
    id: 'rug-sig-exp-3', level: 'expert', signal: 'rug-scrum',
    prompt: P,
    options: ['A scrum', 'Advantage', 'A penalty', 'A free kick'],
    answer: 0,
    title: 'Shoulder height: stop, scrum time',
    exp: {
      kid: 'The straight arm is LEVEL with the shoulder — SCRUM. Held lower, down at the waist, it would mean advantage and play would keep going. The referee\'s arm is like a clock hand!',
      beginner: 'Rugby\'s primary signals form a ladder on one arm: vertical = try; 45° = penalty; bent square = free kick; horizontal = scrum; waist-low = advantage. Learn five angles and you\'ve learned the game\'s grammar.',
      intermediate: 'Context confirms: the scrum arm follows a whistle and a stoppage; advantage comes WITHOUT a whistle while play continues. Sound + geometry together make the signals unambiguous even from the far stand.',
      expert: 'This ladder is the best-designed signal system in sport — one limb, five meanings, ordered roughly by reward magnitude. Note the pedagogy trap this game exploits: freeze-framed, waist vs shoulder is a pure angle judgment. In live play you\'d also have the whistle channel; officials\' systems are multi-modal, and pictograms test the geometric channel alone.',
    },
  },
  {
    id: 'rug-sig-exp-4', level: 'expert', signal: 'rug-advantage',
    prompt: P,
    options: ['A scrum', 'Advantage', 'A penalty', 'A free kick'],
    answer: 1,
    title: 'Waist height: the game is still alive',
    exp: {
      kid: 'The straight arm is held LOW, down at waist height — ADVANTAGE! No whistle, play keeps going, and the good team gets to try something bold for free.',
      beginner: 'Height is meaning: waist-low = advantage (play on, award pending); shoulder-level = scrum (play stopped). The advantage arm points at the NON-offending team the whole time it runs.',
      intermediate: 'Two grades ride on this one angle: scrum advantage (short — a clean possession ends it) and penalty advantage (long — real gain required). Listen for "advantage over": the arm drops and the safety net is gone.',
      expert: 'The arm-height ladder rewards slow-motion study: try (90°), penalty (45°), scrum (0°), advantage (−30°) — a protractor of outcomes. Referees hold the advantage arm for many seconds mid-sprint, which is exactly why it lives at an angle no other signal uses: it must be readable in your peripheral vision while you follow the ball. Ergonomics is part of signal design.',
    },
  },
  // Pair C: try (arm VERTICAL, held perfectly still) vs knock-on (open hand WAVING
  // overhead) — same raised arm, motion is the only difference.
  {
    id: 'rug-sig-exp-5', level: 'expert', signal: 'rug-try',
    prompt: P,
    options: ['A try', 'A knock-on', 'A penalty', 'A TV replay check'],
    answer: 0,
    title: 'Stillness means five',
    exp: {
      kid: 'The raised arm is perfectly STILL — TRY, five points! If that same hand were waving side to side, it would mean a fumble forward and a scrum instead. Frozen = celebrate!',
      beginner: 'Both signals raise one arm overhead; motion decides everything. A held vertical arm (whistle, referee square to the goal line) = try. An open hand waving = knock-on, play stopping for a scrum.',
      intermediate: 'The stillness is procedural: the try arm stays up while the referee marks the grounding spot — the conversion must be taken in line with it, so the pose doubles as a surveying instrument.',
      expert: 'Design principle worth collecting: rugby reserves STILLNESS for awards that persist (the try stands, the mark matters) and MOTION for transient events (the ball went forward, once). You saw the same still/moving split in baseball\'s infield fly vs home run. Signal systems converge on the same physics of attention — motion grabs the eye for news, stillness holds it for state.',
    },
  },
  {
    id: 'rug-sig-exp-6', level: 'expert', signal: 'rug-knock-on',
    prompt: P,
    options: ['A try', 'A knock-on', 'A penalty', 'A TV replay check'],
    answer: 1,
    title: 'The wave means the ball went forward',
    exp: {
      kid: 'The overhead hand is WAVING back and forth — KNOCK-ON. A frozen vertical arm would be a try. Watch for the wiggle before you cheer!',
      beginner: 'The wave mimes the ball\'s forward escape off the hands. Unless advantage is being played (waist-low arm toward the other team), the restart is a scrum to the opposition.',
      intermediate: 'Sequencing tells the full story: knock-on wave → then either the level scrum arm (advantage never came) or the waist-low advantage arm (the other team may profit first). Rugby referees chain signals into sentences; the wave is usually a clause, not the whole ruling.',
      expert: 'The wave\'s dark twin is the DELIBERATE knock-on: a cynical swat-down of a pass draws the 45° penalty arm (and often a card) instead of the scrum arm. So after the overhead wave, the NEXT angle you see prices the offence — scrum (accident), penalty (cynicism), or advantage (pending). Reading two signals in sequence is genuine rugby fluency.',
    },
  },
];
