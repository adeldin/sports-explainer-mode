// Signal Decoder — NHL bank (v2 rework). Referee/linesman signals only (evergreen,
// rule-based; verified against USA Hockey Appendix 3 / NHL officiating signal charts).
// 6 scenarios per tier × 4 tiers.
//
// v2 CONTRACT: constant prompt, options are always other NHL signal meanings,
// difficulty = visual closeness of the distractor signals. Pure data, zero RN imports.
import type { SignalScenario } from '../signalDecoder';

const P = 'What is the referee signaling?';

export const NHL_SIGNAL_SCENARIOS: SignalScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'nhl-sig-kid-1', level: 'kid', signal: 'nhl-goal',
    prompt: P,
    options: ['Goal!', 'No goal', 'A penalty'],
    answer: 0,
    title: 'The point at the net: goal',
    exp: {
      kid: 'Pointing into the net means GOAL! The puck went all the way across the red line inside the goal. The red light spins and everyone celebrates!',
      beginner: 'A goal counts when the puck FULLY crosses the goal line between the posts. The referee\'s emphatic point confirms it — often paired with the goal judge\'s red light.',
      intermediate: 'The point matters most on scrambles: pucks under pads, bounced off skates, wedged in the crossbar. The referee\'s decision — point (goal) or the two-armed washout (no goal) — is the on-ice verdict replay must overturn.',
      expert: 'Every goal is subject to video review from the situation room, but the on-ice signal sets the presumption: "good goal called on the ice" survives inconclusive video. Kicked in, batted with a high stick, or knocked in after the whistle = washed out. The point is the anchor of hockey\'s most-reviewed decision.',
    },
  },
  {
    id: 'nhl-sig-kid-2', level: 'kid', signal: 'nhl-washout',
    prompt: P,
    options: ['No goal — doesn\'t count', 'Goal', 'A penalty shot'],
    answer: 0,
    title: 'The washout: no goal',
    exp: {
      kid: 'Arms sweeping out wide and flat mean NO GOAL — the puck didn\'t fully cross the line, or something illegal happened first. Keep playing (or face off)!',
      beginner: 'The washout is hockey\'s big NO: no goal on a scramble, or a possible icing/offside waved off by the linesman. Context tells you which "no" it is.',
      intermediate: 'On goal-mouth pileups the washout usually means one of three things: puck never crossed, kicked in with a distinct kicking motion, or the net was dislodged first. The referee often follows with a miming gesture explaining which.',
      expert: 'The washout\'s power is presumption: "no goal on the ice" means replay must find conclusive evidence the puck fully crossed — camera angles into a goalie\'s pads rarely provide it. Identical pileups become goals or non-goals based mostly on which signal came first. On-ice calls are sticky.',
    },
  },
  {
    id: 'nhl-sig-kid-3', level: 'kid', signal: 'nhl-trip',
    prompt: P,
    options: ['Tripping — 2 minutes in the box', 'Goal', 'Misconduct'],
    answer: 0,
    title: 'The low chop: tripping',
    exp: {
      kid: 'The hand sweeping low across the leg means TRIPPING — someone used a stick or leg to knock an opponent down. The tripper sits in the penalty box for 2 minutes!',
      beginner: 'Tripping is a minor penalty: 2 minutes, and the other team plays with an extra skater (a power play). The signal mimics the stick chopping at skates.',
      intermediate: 'Key exception: if the defender clearly plays the PUCK first (a clean poke check) and the attacker falls over the follow-through, no penalty. The referee is judging what was contacted first — puck or feet.',
      expert: 'Tripping a breakaway attacker with no defender between him and the goalie escalates: penalty SHOT instead of 2 minutes (that\'s the crossed-arms-overhead signal). Same act, different geometry, dramatically different price. Where the foul happens on the ice changes which signal you\'ll see.',
    },
  },
  {
    id: 'nhl-sig-kid-4', level: 'kid', signal: 'nhl-slash',
    prompt: P,
    options: ['Slashing', 'Goal', 'No goal'],
    answer: 0,
    title: 'The chop: slashing',
    exp: {
      kid: 'The chopping motion onto the other arm means SLASHING — a player swung his stick at an opponent like an axe. Sticks are for the puck, not people! 2 minutes.',
      beginner: 'Slashing is swinging your stick into an opponent\'s body or hands. Minor penalty (2 min); a hard slash that injures can bring a major. Breaking your stick on someone is nearly automatic.',
      intermediate: 'The modern crackdown targets hand slashes: even light chops at a puck carrier\'s gloves now draw this signal, since broken fingers were epidemic. Defenders had to relearn stick-lifts instead of stick-chops.',
      expert: 'Distinguish the stick-foul trio by referee mime: SLASH = chop to the forearm; CROSS-CHECK = both fists thrusting a shaft forward; HIGH-STICK = stacked fists at head height. Three sticks misused, three distinct pictograms — the mime always re-enacts the crime.',
    },
  },
  {
    id: 'nhl-sig-kid-5', level: 'kid', signal: 'nhl-highstick',
    prompt: P,
    options: ['High-sticking', 'Tripping', 'Goal'],
    answer: 0,
    title: 'Stacked fists at the head: high-sticking',
    exp: {
      kid: 'Two fists stacked up near the forehead mean HIGH-STICKING — a player\'s stick blade hit an opponent above the shoulders. Sticks must stay down! 2 minutes in the box.',
      beginner: 'Contacting an opponent above the shoulders with your stick is a minor penalty (2 minutes). The stacked fists mime holding a stick too high.',
      intermediate: 'Draw BLOOD with a high stick and it doubles to 4 minutes automatically. The referee checks the victim\'s face before choosing the 2-or-4 announcement — same signal, escalating price.',
      expert: 'Two separate rules share this signal family: high-sticking the OPPONENT (penalty) versus playing the PUCK with a stick above the shoulders (no penalty, but play is stopped/goals disallowed). Accidental follow-through on your own shot? Still a penalty — hockey holds you responsible for your blade, full stop.',
    },
  },
  {
    id: 'nhl-sig-kid-6', level: 'kid', signal: 'nhl-penalty-shot',
    prompt: P,
    options: ['A penalty shot', 'Goal', 'No goal'],
    answer: 0,
    title: 'The overhead X: penalty shot',
    exp: {
      kid: 'Arms crossed high above the head mean PENALTY SHOT — the most exciting call in hockey! One player skates in all alone against the goalie for a free chance to score.',
      beginner: 'When a clear breakaway is illegally denied (a trip from behind, a thrown stick, covering the puck in the crease), the referee can award a solo attempt instead of a mere 2-minute penalty.',
      intermediate: 'The classic test for a foul-from-behind award: full control of the puck, beyond the defenders, no opponent between him and the goal, foul from behind denying a shot. Miss any prong and it\'s just the minor.',
      expert: 'Some triggers are automatic regardless of breakaway math — a defender (not the goalie) deliberately covering the puck in the crease, or throwing a stick at the puck carrier. Note the pictogram cousin: a WAVING X above a football referee\'s head means timeout; hockey\'s X is held rigid. Static vs motion again.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'nhl-sig-beg-1', level: 'beginner', signal: 'nhl-delayed-penalty',
    prompt: P,
    options: ['A delayed penalty', 'Goal', 'A misconduct'],
    answer: 0,
    title: 'The raised arm: delayed penalty',
    exp: {
      kid: 'The arm straight up with no whistle means "I saw a penalty!" — but the referee waits to stop play until the naughty team touches the puck. The other team gets to keep attacking!',
      beginner: 'Play continues while the non-offending team has the puck; the whistle comes only when the penalized team gains possession. The fouled team can\'t be punished by a stoppage of its own attack.',
      intermediate: 'Watch what the attacking team does: the goalie SPRINTS to the bench for a sixth skater — risk-free, since the whistle kills play the instant the other team touches the puck. Score during the delay and (for a minor) the penalty is washed out.',
      expert: 'The 6-on-5-with-no-risk mechanic makes delayed calls mini power plays before the power play. Note the subtlety: a goal during delay cancels a MINOR but a major is still served. And "possession" means control, not a deflection — refs let play run through blocked shots. The raised arm is hockey\'s advantage rule, worn on a sleeve.',
    },
  },
  {
    id: 'nhl-sig-beg-2', level: 'beginner', signal: 'nhl-hook',
    prompt: P,
    options: ['Hooking', 'Tripping', 'Goal'],
    answer: 0,
    title: 'The tug: hooking',
    exp: {
      kid: 'The two-handed pulling motion means HOOKING — a player used the curved blade of his stick like a hook to slow someone down. 2 minutes in the box!',
      beginner: 'Hooking = impeding an opponent with the stick blade (typically tugging at hands or midsection from behind). Minor penalty; it\'s the classic "beaten defender panics" foul.',
      intermediate: 'Hooking vs holding vs tripping is a decision about the TOOL: stick-tug = hooking; hands/arms = holding (the wrist clasp); stick-to-skates bringing them down = tripping (the low chop). One chase-down foul, three possible mimes.',
      expert: 'Hooking is a speed tax: it happens when footspeed loses to footspeed. The post-2005 obstruction standard made even one-handed tugs automatic — which re-valued fast skaters league-wide. Count this signal in a game and you\'re literally counting which defensemen can\'t keep up tonight.',
    },
  },
  {
    id: 'nhl-sig-beg-3', level: 'beginner', signal: 'nhl-hold',
    prompt: P,
    options: ['Holding — grabbing an opponent', 'Slashing', 'No goal'],
    answer: 0,
    title: 'Clasping the wrist: holding',
    exp: {
      kid: 'One hand clasping the other wrist means HOLDING — a player grabbed an opponent (or his stick) to slow him down. No grabbing allowed: 2 minutes!',
      beginner: 'Holding is impeding an opponent with hands or arms — a jersey grab, a wrap-up, pinning a stick. Minor penalty: 2 minutes, power play the other way.',
      intermediate: 'The wrist-clasp family: HOLDING (this static clasp) versus HOOKING (the two-fisted tugging motion — using the STICK to pull). Hands = holding; stick-as-tool = hooking. Two neighbors on the restraining-foul spectrum.',
      expert: 'The same clasped-wrist signal means holding in FOOTBALL too — one of the few genuinely cross-sport gestures. Restraining fouls (hold/hook/interference) are hockey\'s "obstruction" package; crackdowns on them are exactly what people mean when they say the league "opened up the game."',
    },
  },
  {
    id: 'nhl-sig-beg-4', level: 'beginner', signal: 'nhl-board',
    prompt: P,
    options: ['Boarding', 'High-sticking', 'A delayed penalty'],
    answer: 0,
    title: 'Fist into palm: boarding',
    exp: {
      kid: 'The fist pounding the open hand means BOARDING — pushing or checking someone dangerously into the wall (the boards). That can really hurt, so it\'s a penalty.',
      beginner: 'Boarding is a check that sends a defenseless player violently into the boards. Severity scales: minor, major, or match penalty depending on violence and injury.',
      intermediate: 'The judgment hinges on the victim\'s position: was he DEFENSELESS (back turned, numbers showing) and was the distance to the boards dangerous? The identical hit in open ice might be perfectly legal.',
      expert: 'Cross-sport note: fist-into-palm means CHARGING in basketball — same pictogram, different crime. In hockey, boarding sits in a player-safety cluster with charging (distance/leaping) and checking-from-behind; the referee\'s choice among those signals tells you which aggravating factor he saw. The mime is the verdict\'s reasoning.',
    },
  },
  {
    id: 'nhl-sig-beg-5', level: 'beginner', signal: 'nhl-interference',
    prompt: P,
    options: ['Interference', 'High-sticking', 'Tripping'],
    answer: 0,
    title: 'Crossed arms: interference',
    exp: {
      kid: 'Arms crossed still at the chest mean INTERFERENCE — you\'re only allowed to check the player who HAS the puck. Blocking or hitting anyone else is unfair. 2 minutes!',
      beginner: 'Only the puck carrier is fair game. Impeding anyone else — picking, blocking a path, finishing a hit long after the pass — is interference: a 2-minute minor.',
      intermediate: 'The gray zone is the JUST-released pass: hitters get a beat to finish a check on a player who moved the puck. Too late = this signal. The window is fractions of a second, judged live.',
      expert: 'Interference also covers goalie protection: contact with the goaltender in his crease routinely wipes out goals (washout + crossed arms). And watch for the pick-play version on zone entries — hockey borrowed screening from basketball, and referees police it with basketball-like positional judgment. Body position legally earned vs a path illegally blocked: that\'s the whole call.',
    },
  },
  {
    id: 'nhl-sig-beg-6', level: 'beginner', signal: 'nhl-crosscheck',
    prompt: P,
    options: ['Cross-checking', 'Hooking', 'Boarding'],
    answer: 0,
    title: 'The push: cross-checking',
    exp: {
      kid: 'The two-handed push means CROSS-CHECKING — using the middle of the stick like a battering ram to shove someone. That\'s not a legal check! 2 minutes.',
      beginner: 'A cross-check is a hit delivered with the stick shaft held in both hands, no part of the stick on the ice. Minor penalty, escalating to a major for violence.',
      intermediate: 'Habitat: the front of the net, where defensemen "move bodies" with shaft shoves between whistles. The crackdown standard is force + location — back and neck cross-checks draw calls that chest-level leverage battles may not.',
      expert: 'The stick-foul mime table completes here: chop-to-forearm = slashing (swing), two-hand tug = hooking (pull), two-fist shaft push = cross-checking (shove), stacked fists high = high-sticking (elevation). Four grips, four verbs, four crimes — hockey\'s referees are mime artists with a complete grammar of stick misuse.',
    },
  },

  // ── intermediate: same-family distractors ──────────────────────────────────
  {
    id: 'nhl-sig-int-1', level: 'intermediate', signal: 'nhl-charge',
    prompt: P,
    options: ['Charging', 'Boarding', 'Cross-checking', 'Slashing'],
    answer: 0,
    title: 'Rotating fists: charging (hockey edition)',
    exp: {
      kid: 'In hockey, the rolling fists mean CHARGING — a player skated a long way or jumped to smash into someone extra hard. Too much run-up! 2 minutes.',
      beginner: 'Charging punishes checks amplified by distance traveled or by leaving the ice. A legal check uses body position; a charge uses a runway.',
      intermediate: 'The referee weighs speed, strides, and elevation at contact. Compare its neighbor boarding (the fist-pound): charging is about the RUN-UP anywhere on the ice; boarding is about the dangerous WALL destination.',
      expert: 'The same rotating-fists gesture means traveling in basketball and false start in football — the most reused pictogram in sports, three sports, three meanings. Within hockey, charging vs a clean finished check is today\'s hardest line: the league permits full-speed hits but not hits WHERE speed was manufactured beyond the play\'s natural flow.',
    },
  },
  {
    id: 'nhl-sig-int-2', level: 'intermediate', signal: 'nhl-misconduct',
    prompt: P,
    options: ['Misconduct — 10 minutes', 'Interference', 'A penalty shot', 'Holding'],
    answer: 0,
    title: 'Hands on hips: misconduct',
    exp: {
      kid: 'Hands on hips mean MISCONDUCT — usually for arguing or bad behavior. That player sits for 10 whole minutes, but his team doesn\'t play short-handed.',
      beginner: 'A misconduct removes the PLAYER for 10 minutes without making his team short-handed — a substitute steps in. It punishes the individual, not the team\'s manpower.',
      intermediate: 'That\'s the key difference from minors/majors: no power play results. Misconducts typically follow abuse of officials or escalating scrums — a cooling-off tool. A "game misconduct" ejects entirely.',
      expert: 'Misconducts often ride on top of other penalties (2+10 combos): the minor creates the power play, the misconduct removes the agitator. Cross-sport echo: hands-on-hips means OFFSIDE in football and BLOCKING in basketball — proof that pictograms only mean anything inside their own sport\'s dictionary.',
    },
  },
  {
    id: 'nhl-sig-int-3', level: 'intermediate', signal: 'nhl-trip',
    prompt: P,
    options: ['Tripping', 'Slashing', 'Hooking', 'Holding'],
    answer: 0,
    title: 'The signal that correctly doesn\'t always come',
    exp: {
      kid: 'The low sweep at the leg means TRIPPING. But if a defender pokes the PUCK away first and the attacker tumbles over him afterward — no signal at all. Puck first is fair!',
      beginner: 'A sweep or poke that clearly contacts the puck before any contact with the opponent\'s body is a legal defensive play, even if the attacker ends up on the ice.',
      intermediate: 'Officials\' sightline decides everything: puck-first-then-legs looks identical to legs-first at full speed from the wrong angle. This is why the trailing referee, not the closest one, often makes the call.',
      expert: 'And the counter-signal exists too: an attacker who exaggerates the tumble may see the referee\'s DIVING/embellishment call — sometimes both a trip AND a dive are called on the same play (matching minors). Reading non-signals is expert literacy: silence after a tumble is itself a ruling that the puck was won cleanly.',
    },
  },
  {
    id: 'nhl-sig-int-4', level: 'intermediate', signal: 'nhl-goal',
    prompt: P,
    options: ['Goal', 'A delayed penalty', 'No goal — washed out', 'A penalty shot'],
    answer: 0,
    title: 'The goal that can be un-pointed',
    exp: {
      kid: 'The point into the net means GOAL — but the goalie has a special safe zone. If an attacker bumped him while the puck went in, the goal can be taken back after a TV check.',
      beginner: 'Goals scored while an attacker impairs the goaltender in his crease are disallowed. Coaches can challenge an on-ice goal call for goaltender interference — the review checks the contact, not the puck.',
      intermediate: 'The test: did contact (or crease presence) actually IMPAIR the goalie\'s ability to play his position? Incidental touches outside the crease, or contact initiated by the goalie, generally let the goal stand.',
      expert: 'This is hockey\'s most protested review category because it\'s judgment stacked on judgment. Decoding tip: watch the referee after review — pointing again re-confirms the goal; the washout after a huddle reverses it. A failed coach\'s challenge costs a delay-of-game minor, so the challenge itself is a wager on how the signal will flip.',
    },
  },
  {
    id: 'nhl-sig-int-5', level: 'intermediate', signal: 'nhl-delayed-penalty',
    prompt: P,
    options: ['A delayed penalty', 'A penalty shot', 'Goal', 'No goal — washed out'],
    answer: 0,
    title: 'The raised arm\'s fine print',
    exp: {
      kid: 'Arm up, no whistle — a DELAYED penalty. But careful: if the attacking team knocks the puck into their OWN empty net during the delay, that goal counts for the other side!',
      beginner: 'During a delayed penalty, the offending team can\'t score (their touch stops play) — but the puck entering the attackers\' own net off an ATTACKER still counts. The safety net has exactly one hole: you.',
      intermediate: 'Precision matters: if the penalized team shoots or deflects it in, no goal — play was dead at their touch/control. Historic own-goals during delayed calls have all come off the attacking team\'s own sticks or skates.',
      expert: 'This is a beautiful rules-lawyering edge: "the whistle blows when the offending team gains POSSESSION" — a puck they never touched that slides 180 feet into the vacated net involved no such possession. The raised arm promises a whistle conditional on THEIR touch, not yours. Reading signals precisely includes reading their conditions.',
    },
  },
  {
    id: 'nhl-sig-int-6', level: 'intermediate', signal: 'nhl-washout',
    prompt: P,
    options: ['Washout — no goal / call waved off', 'Goal', 'A delayed penalty', 'Misconduct'],
    answer: 0,
    title: 'One sweep, several negatives',
    exp: {
      kid: 'The big flat arm sweep is the referee\'s way of saying "NO" — no goal at the net, or a long shoot-away (icing) waved off by the linesman. Same signal, different questions!',
      beginner: 'Icing: shooting the puck from your own half past the other team\'s goal line untouched. It\'s a linesman\'s call — arm up for potential icing, then either a face-off comes back OR the washout waves it off (e.g. the goalie played it).',
      intermediate: 'The washout is context-dependent by role: from a REFEREE at the net = no goal; from a LINESMAN on a long dump = no icing / no offside. Who gives it and where they\'re standing is part of the message.',
      expert: 'NHL icing nuance worth decoding: it\'s "hybrid" — the linesman judges the race to the face-off dots, not the puck touch, and a team SHORT-HANDED may ice freely (no call at all). Plus the offending team can\'t change lines after an icing. One flat-armed sweep thus implies an entire tactical state: who\'s tired, who\'s trapped on the ice, where the face-off goes.',
    },
  },

  // ── expert: confusable pairs ────────────────────────────────────────────────
  // Pair A: hooking (fists gripping a shaft, YANKED in) vs holding (static wrist
  // clasp) — motion vs stillness on nearly the same hands.
  {
    id: 'nhl-sig-exp-1', level: 'expert', signal: 'nhl-hook',
    prompt: P,
    options: ['Hooking', 'Holding', 'Interference', 'Slashing'],
    answer: 0,
    title: 'Moving fists: the stick did the restraining',
    exp: {
      kid: 'The fists are PULLING — yanking an invisible stick in toward the belly. That\'s HOOKING: the stick was the grabbing tool. Frozen clasped hands would mean plain holding instead.',
      beginner: 'The pair decodes by tool and motion: a tugging two-fist pull = hooking (stick blade did it); a still one-hand-on-wrist clasp = holding (hands/arms did it). Both are 2-minute restraining minors.',
      intermediate: 'Why does the distinction exist at all if the price is identical? Bookkeeping and patterns: teams scout which defensemen hook when beaten wide versus hold in front of the net — the two fouls happen in different ice zones and predict different matchup problems.',
      expert: 'Since the obstruction crackdown, hooking is called on stick PRESSURE alone (a blade riding the hands, even without a yank), while holding needs an actual grasp or wrap. The referee\'s mime therefore over-clarifies on purpose: an exaggerated tug tells the penalty box, the scorer, and the coach precisely which standard was applied — even when the real foul was subtle.',
    },
  },
  {
    id: 'nhl-sig-exp-2', level: 'expert', signal: 'nhl-hold',
    prompt: P,
    options: ['Hooking', 'Holding', 'Interference', 'Slashing'],
    answer: 1,
    title: 'Still hands: the 5-on-3 arithmetic',
    exp: {
      kid: 'The hands are frozen — one clasping the other wrist. That\'s HOLDING. And if a team already has one player in the box, this second penalty means skating 3 against 5. Super hard!',
      beginner: 'Penalties run concurrently but each player serves his own: two overlapping minors = 5-on-3 for the overlap. Teams never drop below 3 skaters — additional penalties queue instead.',
      intermediate: 'A 5-on-3 converts at a huge rate, so coaches burn their timeout, ice their four best defenders in rotation, and hunt any excuse to eat clock (freezing pucks along the wall, which itself risks a delay-of-game).',
      expert: 'Queue mechanics are the deep cut: with two already serving, a THIRD penalized player waits — his time starts only when a teammate\'s ends, but he sits immediately and his team stays at 3 skaters with substitution allowed on the ice. Decoding the box math (who returns when, which goal releases whom) is genuine expert literacy that even broadcasters botch.',
    },
  },
  // Pair B: boarding (ONE fist strikes the palm) vs charging (fists ROTATE around
  // each other) — a single strike versus continuous rotation.
  {
    id: 'nhl-sig-exp-3', level: 'expert', signal: 'nhl-board',
    prompt: P,
    options: ['Boarding', 'Charging', 'Cross-checking', 'Slashing'],
    answer: 0,
    title: 'One strike: the wall was the crime',
    exp: {
      kid: 'One fist SMACKS down into the palm — BOARDING: someone was smashed dangerously into the wall. If the fists were rolling around each other instead, it would be charging!',
      beginner: 'Boarding scales: minor (2), major (5 — the team stays short the whole time even if scored on), and game misconduct for reckless hits injuring a defenseless opponent.',
      intermediate: 'The refs\' checklist: numbers-on-back visible? distance to boards? did the hitter have alternatives? injury on the play? Each yes climbs the ladder. The severity announcement, not the pictogram, carries the grade.',
      expert: 'League discipline layers on top: majors for boarding get automatic video review (they can be confirmed or reduced to a minor on the spot), and supplemental suspension follows separately. So this one fist-pound can fork into four institutional processes — on-ice minor, reviewed major, ejection, and a hearing. Signals are the visible tip of a legal system.',
    },
  },
  {
    id: 'nhl-sig-exp-4', level: 'expert', signal: 'nhl-charge',
    prompt: P,
    options: ['Boarding', 'Charging', 'Cross-checking', 'Slashing'],
    answer: 1,
    title: 'Rotation: the runway was the crime',
    exp: {
      kid: 'The fists keep ROLLING around each other — CHARGING: the hitter took a giant running start or jumped into the hit. How you arrive matters as much as where you hit!',
      beginner: 'Charging isolates the delivery: target legal (puck carrier, body contact) but the checker traveled excessive distance or left his feet to maximize impact. The energy, not the target, is the crime.',
      intermediate: 'This is why announcers say "he came from a zip code away." The modern game permits violent collisions that arise from positioning, and punishes identical collisions manufactured by runway. Officials reconstruct strides backward from the impact.',
      expert: 'Doctrinally, hockey checks are licensed force: the license covers contesting the puck, not launching projectiles. Charging, boarding, and interference form a delivery-condition triad — WHERE the victim ends (boards), WHEN rights existed (possession), HOW energy was built (runway). The rotating fists answer only the HOW question. Expert decoding means knowing which question each pictogram answers.',
    },
  },
  // Pair C: interference (arms crossed at the CHEST) vs penalty shot (arms crossed
  // ABOVE THE HEAD) — the same X at two heights.
  {
    id: 'nhl-sig-exp-5', level: 'expert', signal: 'nhl-interference',
    prompt: P,
    options: ['Interference', 'A penalty shot', 'Misconduct', 'Holding'],
    answer: 0,
    title: 'The X at the chest: possession rights',
    exp: {
      kid: 'Arms crossed at the CHEST — INTERFERENCE, a hit on someone without the puck. The exact same X held high above the head would promise a penalty shot instead. Height is everything!',
      beginner: 'A defender may "finish" a check on a player who has just released the puck — beyond that grace beat, the target is a non-puck-carrier and contact is interference: 2 minutes.',
      intermediate: 'The judgment fuses timing and knowledge: did the hitter commit before the release (legal momentum) or accelerate after it (predatory)? The same principle governs late hits on quarterbacks — every collision sport has a "too late" line.',
      expert: 'And there\'s the inverse case: a player WITHOUT the puck who initiates position (setting a pick) draws the same chest-height X in reverse. Interference is really a possession-rights doctrine: rights to hit attach to the puck and detach on release. The signal marks a property-law violation, enforced at 30 km/h.',
    },
  },
  {
    id: 'nhl-sig-exp-6', level: 'expert', signal: 'nhl-penalty-shot',
    prompt: P,
    options: ['Interference', 'A penalty shot', 'Misconduct', 'Holding'],
    answer: 1,
    title: 'The X overhead: theater is coming',
    exp: {
      kid: 'The crossed arms are HIGH above the head — PENALTY SHOT! One skater alone against the goalie. Crossed at the chest it would just be a 2-minute interference call.',
      beginner: 'Certain acts award a penalty shot automatically, no breakaway needed: a skater covering the puck in his own crease, throwing a stick at the puck carrier, and a few others. The crease belongs to goalies.',
      intermediate: 'Logic: these acts steal a near-certain goal in ways a 2-minute minor under-punishes. The rulebook pre-priced them at "one free scoring chance" — the closest thing hockey has to a penalty kick.',
      expert: 'Two roads lead to this X — the automatic triggers (mechanical) and the discretionary breakaway-foul award with its four-prong control test (judged). Which road it was tells you whether the argument at the scorer\'s table is even worth having. And the height coding is deliberate: overhead = extraordinary award; chest = routine minor. Elevation equals escalation.',
    },
  },
];
