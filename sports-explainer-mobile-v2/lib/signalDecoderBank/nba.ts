// Signal Decoder — NBA bank (v2 rework). Referee signals only (evergreen, rule-based;
// verified against the shared NBA/FIBA/NFHS officiating signal grammar — differences
// noted in the explanations where relevant). 6 scenarios per tier × 4 tiers.
//
// v2 CONTRACT: constant prompt, options are always other NBA signal meanings,
// difficulty = visual closeness of the distractor signals. Pure data.
import type { SignalScenario } from '../signalDecoder';

const P = 'What is the referee signaling?';

export const NBA_SIGNAL_SCENARIOS: SignalScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'nba-sig-kid-1', level: 'kid', signal: 'nba-travel',
    prompt: P,
    options: ['Traveling — too many steps', 'A technical foul', 'A three-pointer'],
    answer: 0,
    title: 'Rolling fists: traveling',
    exp: {
      kid: 'The rolling fists mean TRAVELING — the player took too many steps without bouncing (dribbling) the ball. The other team gets it.',
      beginner: 'You must dribble while moving. Stop your dribble and you get a pivot foot plus limited steps; move that pivot foot or run without dribbling and the rolling fists come out. Turnover.',
      intermediate: 'The modern rule allows the "gather" plus two steps on a drive — that\'s why some moves look like three steps but are legal. The referee is judging when the gather happened, not just counting footfalls.',
      expert: 'Cross-sport trap: this exact rolling-fists motion means FALSE START in football and CHARGING in hockey. Same pictogram, three sports, three meanings — signal vocabularies are per-sport languages, and traveling is basketball\'s most argued judgment call because the gather is invisible to casual eyes.',
    },
  },
  {
    id: 'nba-sig-kid-2', level: 'kid', signal: 'nba-three-good',
    prompt: P,
    options: ['The three-pointer counts!', 'Jump ball', 'Traveling'],
    answer: 0,
    title: 'Both arms up: three points!',
    exp: {
      kid: 'Both arms in the air means the long shot counts for THREE points — one more than a normal basket, because it came from behind the big curved line.',
      beginner: 'Shots from behind the three-point arc are worth 3; inside it, 2. One arm up = attempt from three-land; both arms up when it drops = confirmed three.',
      intermediate: 'The two-stage mechanic exists for the scorer\'s table: the ATTEMPT signal (one arm, before the shot lands) tells the scorers what\'s at stake; the both-arms confirmation locks in 3 instead of 2.',
      expert: 'The referee is ruling on FEET, not the ball\'s flight: both feet must be completely behind the line at launch — a heel on the line makes it a 2. Toe-on-the-line reviews exist precisely because this signal commits a point of value either way.',
    },
  },
  {
    id: 'nba-sig-kid-3', level: 'kid', signal: 'nba-foul',
    prompt: P,
    options: ['A foul', 'A made basket', 'The game is over'],
    answer: 0,
    title: 'Fist up: foul',
    exp: {
      kid: 'The raised fist means FOUL — a player pushed, hit, or grabbed someone. Basketball is a no-grabbing game!',
      beginner: 'A closed fist stops the clock for a personal foul. What follows tells you the price: free throws if the victim was shooting (or the team is in the bonus), otherwise a sideline inbound.',
      intermediate: 'Players collect fouls: 6 in the NBA (5 in FIBA/college) and you\'re done for the night. Watching the fist plus the number the referee then shows the table tells you who\'s in foul trouble.',
      expert: 'Decoder key: FIST up = foul (someone is charged); OPEN HAND up = violation (just a turnover, nobody charged). That one-hand-shape difference is the fastest way to read a whistle from the cheap seats — and this game will test you on it at expert.',
    },
  },
  {
    id: 'nba-sig-kid-4', level: 'kid', signal: 'nba-technical',
    prompt: P,
    options: ['A technical foul — bad behavior', 'A three-pointer', 'Jump ball'],
    answer: 0,
    title: 'The T: technical foul',
    exp: {
      kid: 'The hands forming a T mean TECHNICAL FOUL — someone was rude, argued too much, or broke a non-playing rule. The other team gets a free shot!',
      beginner: 'Technicals punish conduct, not contact: yelling at officials, taunting, hanging on the rim, delay tricks. Penalty: a free throw for the opponent plus possession-related consequences by level.',
      intermediate: 'Two technicals = automatic ejection. Coaches can get them too — and a technical\'s free throw can be taken by anyone on the floor, making late-game techs pure gifted points.',
      expert: 'Technicals also cover ILLEGAL DEFENSE (NBA defensive three-seconds) and too-many-players — administrative infractions where the T is bookkeeping, not anger. Reading whether a T followed a shouting match or a quiet defensive reset tells you which species you just saw.',
    },
  },
  {
    id: 'nba-sig-kid-5', level: 'kid', signal: 'nba-jump-ball',
    prompt: P,
    options: ['Held ball — jump ball', 'A foul', 'Two free throws'],
    answer: 0,
    title: 'Thumbs up: held ball',
    exp: {
      kid: 'Two thumbs up means both players grabbed the ball at the same time and neither would let go. It\'s nobody\'s ball — so the referee makes it fair!',
      beginner: 'A held ball (two opponents with firm grips) triggers the jump-ball signal. In the NBA the two players actually jump; in college/FIBA the possession arrow at the scorer\'s table decides instead.',
      intermediate: 'Defenders hunt this call on purpose: tying up a rebounder is far better than fouling. The thumbs are a small win for whichever team is more athletic (NBA jump) or holds the arrow (other levels).',
      expert: 'The NBA is the last major level with a live re-jump — everywhere else the alternating-possession arrow made the thumbs a bookkeeping signal. Watch late NBA games: a tie-up with a superior leaper is a designed defensive play, and this signal is its payoff.',
    },
  },
  {
    id: 'nba-sig-kid-6', level: 'kid', signal: 'nba-direction',
    prompt: P,
    options: ['Which team gets the ball — attack that way', 'A player is ejected', 'A three-pointer'],
    answer: 0,
    title: 'The directional point: possession',
    exp: {
      kid: 'The point shows which team gets the ball now. The referee points the way THAT team is attacking — like a traffic sign for basketball.',
      beginner: 'Out-of-bounds calls come with a direction: last touch loses the ball. The arm points toward the basket the awarded team attacks, then the throw-in happens where the ball left.',
      intermediate: 'Deflection scrambles make this the most disputed routine call — hence players instantly pointing the other way like counter-referees. Officials confer or go to replay in crunch time precisely because the point IS the possession ruling.',
      expert: 'Watch mechanics on close ones: the official first signals the stoppage, then the point — sometimes after a crew conference where the referee with the best sightline overrides. In the last two minutes, out-of-bounds touches are replay-reviewable, so the point can flip after the monitor. The gesture is simple; the evidence chain behind it isn\'t.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'nba-sig-beg-1', level: 'beginner', signal: 'nba-violation',
    prompt: P,
    options: ['A violation — no foul charged', 'A personal foul', 'A made basket'],
    answer: 0,
    title: 'Open hand up: violation',
    exp: {
      kid: 'An open hand raised high means a RULE was broken — like stepping out of bounds — but nobody gets in trouble. The other team just gets the ball.',
      beginner: 'Violations (travel, double dribble, out of bounds, 3-in-the-key) cost possession only. No player is charged, no free throws — the open palm stops the clock, then a second signal names the offense.',
      intermediate: 'The open hand is the header of a two-part message: palm = "violation, clock stopped," then rolling fists (travel) or a patting motion (illegal dribble) etc. Learn to wait for the second gesture.',
      expert: 'Fist vs palm is the referee\'s most information-dense binary: it instantly divides the rulebook in half (fouls: charged, may bring free throws, count toward limits — versus violations: uncharged, possession only). Every other signal is a footnote to which hand shape started the sentence.',
    },
  },
  {
    id: 'nba-sig-beg-2', level: 'beginner', signal: 'nba-three-attempt',
    prompt: P,
    options: ['A 3-point attempt is in the air', 'A technical foul', 'Traveling'],
    answer: 0,
    title: 'One arm, three fingers: three-point attempt',
    exp: {
      kid: 'The referee is saying "this shot is from three-land!" while the ball is still flying. If it goes in, everyone already knows it\'s worth 3.',
      beginner: 'The nearest official checks the shooter\'s feet at launch and holds the attempt signal. Make: both arms go up (3 confirmed). Miss: the arm simply drops. The value was decided at takeoff.',
      intermediate: 'Officials divide the floor; the referee "on the line" owns this call. Spotting the raised three-finger arm during a scramble tells you a corner three was launched even when you couldn\'t see the feet.',
      expert: 'Why pre-signal? Because value disputes after the fact are messy: the scorer needs a contemporaneous ruling. Replay can fix 2-vs-3 at limited stoppages, but the attempt arm is the primary record — an on-court paper trail written in the air.',
    },
  },
  {
    id: 'nba-sig-beg-3', level: 'beginner', signal: 'nba-charge',
    prompt: P,
    options: ['Charging — offensive foul', 'A blocked shot', 'A shot-clock violation'],
    answer: 0,
    title: 'Fist into palm: charging',
    exp: {
      kid: 'The fist punching into the open hand means CHARGING — the player WITH the ball ran over a defender who was standing still first. Foul on the ball carrier!',
      beginner: 'If the defender establishes legal position before contact, the collision is the ball carrier\'s fault: an offensive foul. Turnover — and the basket doesn\'t count if the shot went in.',
      intermediate: 'The charge/block decision hangs on split-second geometry: torso-to-torso contact with the defender set = charge; defender still sliding = blocking. Defenders "take charges" deliberately — sacrificing the body to win possession.',
      expert: 'Charging counts as a personal foul on the shooter AND kills any score — which is why late-game rim protectors position for charges instead of blocks. NBA nuance: inside the restricted arc a secondary defender can\'t draw this call, and a defender may always protect against a shooter\'s airborne path he legally owned. This signal ends more highlight dunks than any shot block.',
    },
  },
  {
    id: 'nba-sig-beg-4', level: 'beginner', signal: 'nba-count-basket',
    prompt: P,
    options: ['The basket counts — "and one"', 'The basket is waved off', 'Jump ball'],
    answer: 0,
    title: 'The down-punch: count the basket',
    exp: {
      kid: 'The downward punch means the basket COUNTS even though there was a foul! The shooter also gets one free throw — that\'s the famous "and one."',
      beginner: 'If a player is fouled while shooting and scores anyway: bucket counts + 1 free throw. The down-punch confirms the score; without it, the foul would\'ve meant two fresh free throws instead.',
      intermediate: 'The opposite ruling — foul BEFORE the shooting motion — gets a wave-off: no basket, side-out or two shots. The down-punch versus wave-off pair decides a possible 3-point swing on the same play.',
      expert: 'The judgment inside the signal is "continuation": had the shooting motion begun when the contact occurred? NBA continuation is famously generous (gather-to-finish counts); FIBA cuts it earlier. Same punch, different legal thresholds — knowing which rulebook you\'re watching changes what this signal predicts.',
    },
  },
  {
    id: 'nba-sig-beg-5', level: 'beginner', signal: 'nba-shot-clock',
    prompt: P,
    options: ['Shot-clock violation', 'A technical foul', 'A held ball'],
    answer: 0,
    title: 'The shoulder tap: shot-clock violation',
    exp: {
      kid: 'Fingers tapping the shoulder mean the attacking team took TOO LONG to shoot. You get 24 seconds to try a shot — miss the deadline and the other team gets the ball.',
      beginner: 'The shot must at least hit the rim within 24 seconds. Horn + this signal = violation: turnover at the nearest sideline spot. Rim contact resets the clock (to 14 on an offensive rebound in the NBA).',
      intermediate: 'The 24 defines basketball\'s tempo: defenses win by making teams burn clock, and the last 4 seconds of a possession produce the worst shots in the sport. This signal is the defense\'s reward for 24 seconds of good work.',
      expert: 'Fine points: the ball must LEAVE the hand before the horn and then hit the rim; an airball beaten by the horn is still a violation. The 14-second offensive-rebound reset (adopted to speed up play) means this signal now appears most often after long defensive stands, not lazy offense.',
    },
  },
  {
    id: 'nba-sig-beg-6', level: 'beginner', signal: 'nba-blocking',
    prompt: P,
    options: ['Blocking — a defensive foul', 'Traveling', 'A shot-clock violation'],
    answer: 0,
    title: 'Hands on hips: blocking',
    exp: {
      kid: 'Hands on hips mean BLOCKING — the defender jumped in front of a moving player too late and caused the crash. Foul on the defense!',
      beginner: 'A defender must establish position BEFORE the ball carrier commits. Arrive late and cause contact: blocking foul on the defense — the offense keeps the ball or shoots free throws.',
      intermediate: 'The eternal pairing: blocking (hands on hips, defense\'s fault) versus charging (fist into palm, offense\'s fault). Same crash, opposite verdicts, decided by whether the defender\'s feet were set in time.',
      expert: 'The NBA adds geography: the restricted-area arc under the rim, inside which a secondary defender can NEVER draw a charge. So this signal near the rim often means "legal guarding position, wrong postcode." Block/charge is the fastest whistle in the sport — and the most replay-reviewed.',
    },
  },

  // ── intermediate: same-family distractors ──────────────────────────────────
  {
    id: 'nba-sig-int-1', level: 'intermediate', signal: 'nba-foul',
    prompt: P,
    options: ['A foul — someone is charged', 'A violation', 'A 3-point attempt', 'A technical foul'],
    answer: 0,
    title: 'Signal sentences: foul + shots',
    exp: {
      kid: 'Referees talk in steps: the FIST says a foul happened, then fingers show how many free shots, then a point to the line says go shoot them!',
      beginner: 'A foul on a 2-point shot attempt that misses = 2 free throws; on a 3-point attempt, 3. The finger count relays to the scorer exactly what was awarded and to whom.',
      intermediate: 'If the shot had gone IN, you\'d see the down-punch (count it) and ONE finger instead. Reading fist → count-or-cancel → finger number lets you reconstruct the whole play with your ears off.',
      expert: 'The table communication layer is a distinct grammar: fouler\'s number (shown with fingers), foul type, shots. TV cuts away, but the sequence is contractual — the official scorer can\'t book anything until it\'s signaled. Every free-throw controversy traces back to this choreography.',
    },
  },
  {
    id: 'nba-sig-int-2', level: 'intermediate', signal: 'nba-count-basket',
    prompt: P,
    options: ['Count the basket — "and one"', 'Charging', 'Possession direction', 'A foul, no basket'],
    answer: 0,
    title: 'The four-point play',
    exp: {
      kid: 'The down-punch counts the basket even with a foul! If the shot was a THREE, that\'s 3 points plus 1 free shot — the rare four-point play!',
      beginner: 'And-one math scales with the shot: fouled making a 2 = up to 3 points; fouled making a 3 = up to 4. The down-punch plus the three-confirmation arms stack together.',
      intermediate: 'Four-point plays swing games disproportionately — a 3-point lead becomes even on one whistle. Shooters exaggerate rhythm through contact precisely to buy this signal combination.',
      expert: 'Rarer still: fouled ATTEMPTING a three that misses = 3 free throws (a different signal chain: fist, three fingers, no down-punch). The complete decoding table for perimeter contact — punch+arms = 4-point ceiling; fist+3 fingers = 3 shots — separates fans who watch the ball from fans who watch the officials.',
    },
  },
  {
    id: 'nba-sig-int-3', level: 'intermediate', signal: 'nba-jump-ball',
    prompt: P,
    options: ['Jump ball — a real toss-up settles it', 'The three-pointer counts', 'A technical foul', 'A violation'],
    answer: 0,
    title: 'NBA: a real jump settles it',
    exp: {
      kid: 'In the NBA the two players who tied up the ball JUMP for it — the referee tosses it up between them, just like the start of the game.',
      beginner: 'The tied-up players (no substitutes for the jump) meet at the nearest circle. Win the tip to a teammate, win possession. Other levels use the alternating arrow instead.',
      intermediate: 'This makes tie-ups a skill matchup: a guard who ties up a center regrets it at the circle. Teams angle for held balls only when their jumper wins the matchup — the signal starts a mini-game.',
      expert: 'Jump-ball tactics are genuinely coached: where teammates line up on the circle, tipping to space versus to hands, violating early on purpose. And note the asymmetry with college/FIBA, where this same thumbs-up signal simply reads the arrow — identical gesture, entirely different next 10 seconds. Rulebook context is part of the decode.',
    },
  },
  {
    id: 'nba-sig-int-4', level: 'intermediate', signal: 'nba-blocking',
    prompt: P,
    options: ['Blocking foul', 'Charging', 'Traveling', 'A held ball'],
    answer: 0,
    title: 'The restricted arc: no charges allowed',
    exp: {
      kid: 'Hands on hips — blocking! There\'s a little curved line right under the basket: defenders standing inside it can\'t win a crash, even standing super still. Too close to the hoop!',
      beginner: 'The restricted area (a 4-foot arc under the rim) exists so help defenders can\'t camp beneath a flying finisher. Inside it, a secondary defender\'s "perfect charge" is ruled blocking.',
      intermediate: 'That\'s why you see defenders straddle-checking their heels before contact — an inch decides fist-into-palm versus hands-on-hips. Replay reviews of arc position are standard on crunch-time crashes.',
      expert: 'Rationale: the arc trades a defensive right for player safety and dunk aesthetics — undercutting airborne players caused injuries. Note the exemption: the PRIMARY defender who beat the driver to the spot can still draw a charge in the arc. Geography modifies, never fully replaces, the position-first principle.',
    },
  },
  {
    id: 'nba-sig-int-5', level: 'intermediate', signal: 'nba-travel',
    prompt: P,
    options: ['Traveling', 'Charging', 'A held ball', 'Count the basket'],
    answer: 0,
    title: 'Travel is about the pivot foot, not step-counting',
    exp: {
      kid: 'Rolling fists — traveling! When you stop with the ball, one foot gets glued down: your pivot foot. Spin on it all day, but if it lifts and comes BACK down while you still hold the ball, that\'s the call.',
      beginner: 'Catch with both feet down: either foot may become the pivot. The pivot may lift to shoot or pass — but must not return to the floor before release, and must not lift before a dribble starts.',
      intermediate: 'Post play is where this shows: drop steps, up-and-unders, spin moves — all legal footwork ON a fixed pivot. The rolling fists come when the anchor secretly switched or re-planted. Officials watch the feet, not the fake.',
      expert: 'Why fans miss travels (and see phantom ones): they count steps, but the rule is a state machine — pivot established → allowed transitions (lift-to-release, step-through) → illegal transitions (re-plant, switch). The gather rule adds a pre-pivot state on the move. Referee vision is trained on state transitions; that\'s the whole call.',
    },
  },
  {
    id: 'nba-sig-int-6', level: 'intermediate', signal: 'nba-three-attempt',
    prompt: P,
    options: ['A 3-point attempt', 'A foul', 'A violation', 'The three counts'],
    answer: 0,
    title: 'The signal is evidence, not law',
    exp: {
      kid: 'One arm up with three fingers marks a shot from three-land. If TV later shows the shooter\'s heel was ON the line, the referees fix it — the signal was their best first look.',
      beginner: 'A foot touching the arc line = a 2-point attempt. Free throws match the attempt value, so replay correcting 3→2 also corrects awarded shots from 3→2.',
      intermediate: 'This is a designated reviewable matter: 2-vs-3 (made or fouled) can be checked at the next stoppage or in the last two minutes. The live signal creates the presumption; the monitor can rebut it.',
      expert: 'The philosophical point: signals are contemporaneous EVIDENCE with a correction mechanism, not immutable rulings. Contrast judgment calls (block/charge contact) which replay largely cannot re-open. Knowing which signals are appealable — line calls, clock beats, out-of-bounds — versus which are final is the deepest layer of officiating literacy.',
    },
  },

  // ── expert: confusable pairs ────────────────────────────────────────────────
  // Pair A: foul (arm up, FIST) vs violation (arm up, OPEN HAND) — hand shape only.
  {
    id: 'nba-sig-exp-1', level: 'expert', signal: 'nba-foul',
    prompt: P,
    options: ['A foul', 'A violation', 'A 3-point attempt', 'The three counts'],
    answer: 0,
    title: 'The fist: someone gets charged',
    exp: {
      kid: 'Look at the hand at the top of that arm: a closed FIST. Fist = FOUL — somebody\'s in trouble. An open hand would just mean a broken rule and a switch of the ball.',
      beginner: 'Both arms-up signals stop the clock. The fist opens the door to free throws, team-foul counts, and personal-foul totals; the palm guarantees none of that.',
      intermediate: 'This binary drives strategy: late in games, teams WANT defensive violations (nothing) over fouls (free throws in the bonus). A defender reaching must know which hand shape his mistake will produce.',
      expert: 'The bonus makes the distinction compound: after the team-foul threshold, EVERY fist means free throws, while palms stay free forever. Endgame fouling-to-stop-the-clock is a deliberate purchase of fists; the palm is the one whistle that costs the defense nothing but the ball. Hand shape = economic category.',
    },
  },
  {
    id: 'nba-sig-exp-2', level: 'expert', signal: 'nba-violation',
    prompt: P,
    options: ['A foul', 'A violation', 'A 3-point attempt', 'The three counts'],
    answer: 1,
    title: 'Palm vs fist: the master binary',
    exp: {
      kid: 'The hand is OPEN — five fingers spread. Open hand = a broken rule, ball switches teams, nobody\'s in trouble. A closed fist would put a foul on someone\'s record. Same arm, different hand, different world!',
      beginner: 'Both stop the clock. The palm guarantees: no personal foul charged, no free throws, no team-foul count increase — just possession. The fist opens the door to all three.',
      intermediate: 'Also check the finger count: three fingers = a 3-point attempt marker, not a stoppage at all. One raised arm carries three different messages purely through hand shape.',
      expert: 'The palm/fist binary instantly divides the rulebook in half, and it\'s why officials snap the hand shape crisply even in chaos: the scorer 80 feet away books free-throw eligibility off that silhouette alone. When you can call fouls vs violations from the nosebleeds by hand shape, you\'ve internalized the referee\'s core data structure.',
    },
  },
  // Pair B: blocking (hands on hips, STATIC) vs charging (fist STRIKES the palm)
  // — a still pose versus a strike, for the same collision.
  {
    id: 'nba-sig-exp-3', level: 'expert', signal: 'nba-blocking',
    prompt: P,
    options: ['Blocking', 'Charging', 'Traveling', 'Jump ball'],
    answer: 0,
    title: 'Still hips: the defense arrived late',
    exp: {
      kid: 'Hands resting still on the hips — BLOCKING, the crash was the defender\'s fault. If a fist were smacking into a palm instead, the very same crash would be blamed on the ball carrier!',
      beginner: 'One collision, two possible signals: hips (blocking, on the defense) or fist-into-palm (charging, on the offense). The referee\'s choice decides free throws versus turnover in a blink.',
      intermediate: 'The underlying test: did the defender establish legal guarding position — both feet down, torso facing — BEFORE the offensive player committed to his path? Set in time = charge; still arriving = block.',
      expert: 'Watch elite crews on bang-bang crashes: the signal comes a beat late because the official is replaying the sequencing question (who got there first) plus the geography question (restricted arc). Two nearly simultaneous events, one binary output. Block/charge is the closest officiating gets to a coin with rules.',
    },
  },
  {
    id: 'nba-sig-exp-4', level: 'expert', signal: 'nba-charge',
    prompt: P,
    options: ['Blocking', 'Charging', 'Traveling', 'Jump ball'],
    answer: 1,
    title: 'Legal guarding position can move',
    exp: {
      kid: 'The fist strikes the open palm — CHARGING, the crash is the ball carrier\'s fault. And a defender who got in front FIRST is even allowed to shuffle sideways and still win this call!',
      beginner: 'Legal guarding position = both feet down, facing the opponent, established before contact. After that, the defender may move laterally or backward and STILL draw the charge.',
      intermediate: 'The forbidden vector is toward the offensive player: moving into him transfers fault (blocking). Sliding to mirror the drive maintains rights. Officials track torso direction at the instant of contact.',
      expert: 'This kills the myth "he was moving, so it\'s a block." The real test is sequencing (who established first) plus vector (into vs alongside). Elite charge-takers slide INSIDE the driver\'s path early, then absorb — winning the sequencing question before contact ever happens. The strike signal is a verdict on half a second of footwork.',
    },
  },
  // Pair C: possession direction (arm snaps out to a level POINT and holds) vs
  // count-the-basket (a FIST punched downward) — trajectory + hand shape.
  {
    id: 'nba-sig-exp-5', level: 'expert', signal: 'nba-direction',
    prompt: P,
    options: ['Possession direction', 'Count the basket', 'A foul', 'A 3-point attempt'],
    answer: 0,
    title: 'The level point — and the two-minute review',
    exp: {
      kid: 'The arm snaps out FLAT with a pointing finger and holds — that\'s "this team\'s ball, attacking that way." A fist punching DOWN would mean a basket counts. Angle and hand shape tell them apart!',
      beginner: 'The point stands unless video clearly shows the other team touched last. In the final two minutes (and OT), out-of-bounds possession calls become replay-eligible.',
      intermediate: 'Earlier in the game the same play is NOT reviewable — crews live with the naked-eye point. The rulebook concentrates review capital where possessions are worth the most.',
      expert: 'The "clear and conclusive" standard means the on-court point is sticky: inconclusive frames keep the original call, so the FIRST signal still matters enormously even in the review era. Teams know this — players sprint to sell the point in real time precisely because the tie goes to whatever was signaled.',
    },
  },
  {
    id: 'nba-sig-exp-6', level: 'expert', signal: 'nba-count-basket',
    prompt: P,
    options: ['Possession direction', 'Count the basket', 'A foul', 'A 3-point attempt'],
    answer: 1,
    title: 'The down-punch: the bucket survives the whistle',
    exp: {
      kid: 'A FIST driving DOWN toward the floor — that\'s COUNT IT! The basket scores even though a foul happened. The flat sideways point with a finger is just about who gets the ball.',
      beginner: 'Trajectory is the decode: downward fist = the basket stands plus one free throw ("and one"); a level point with an open finger = possession direction after a stoppage. Both are one-arm signals — read the angle and the hand.',
      intermediate: 'The down-punch encodes a continuation judgment (shooting motion had begun at contact), which is why it often arrives a beat AFTER the ball drops — the official is confirming the sequence, not reacting to the make.',
      expert: 'Broadcast-level reading: down-punch + one finger = and-one; fist up + two/three fingers = shooting foul, no basket; level point = possession only. The three outcomes span a 4-point range on a single possession, and the arm\'s ANGLE is the first bit of information that separates them. Watch angles, not whistles.',
    },
  },
];
