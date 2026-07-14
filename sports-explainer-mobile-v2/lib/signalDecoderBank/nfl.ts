// Signal Decoder — NFL bank (v2 rework). Referee signals only (evergreen, rule-based;
// verified against the NFL official signal chart). 6 scenarios per tier × 4 tiers.
//
// v2 CONTRACT: constant prompt, options are always other NFL signal meanings,
// difficulty = visual closeness of the distractor signals. Pure data.
import type { SignalScenario } from '../signalDecoder';

const P = 'What is the referee signaling?';

export const NFL_SIGNAL_SCENARIOS: SignalScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'nfl-sig-kid-1', level: 'kid', signal: 'nfl-touchdown',
    prompt: P,
    options: ['Touchdown!', 'Timeout', 'Incomplete pass'],
    answer: 0,
    title: 'Arms up = score!',
    exp: {
      kid: 'Both arms straight up means TOUCHDOWN — someone carried or caught the ball in the end zone. Six points!',
      beginner: 'This is the score signal: a touchdown (6 points). The same raised arms also confirm a successful field goal or extra point — any time the ball legally crosses for points.',
      intermediate: 'One signal, several scores: touchdown, field goal, extra point, and a successful two-point try all get the raised arms. Context (where the ball was) tells you which one it was.',
      expert: 'On field goals, watch for TWO officials under the uprights — both must agree the kick passed inside the posts before signaling. If they wave their arms across instead (the incomplete/no-good wave), the kick missed.',
    },
  },
  {
    id: 'nfl-sig-kid-2', level: 'kid', signal: 'nfl-timeout',
    prompt: P,
    options: ['Timeout — stop the clock', 'Touchdown', 'First down'],
    answer: 0,
    title: 'The overhead crisscross: timeout',
    exp: {
      kid: 'Arms waving in a big X above the head mean TIME OUT. Everything stops — the clock, the play, everyone takes a break.',
      beginner: 'Each team gets 3 timeouts per half. The signal stops the game clock; you\'ll see it after a team calls one, or when officials need a stoppage.',
      intermediate: 'Height is the clue: the crisscross wave ABOVE the head = timeout; a similar sweep at SHOULDER level = incomplete pass. Two different calls that beginners often mix up.',
      expert: 'When the referee follows the crisscross by placing one hand on the cap, it\'s a REFEREE\'S timeout — an official stoppage (injury, measurement, replay) that costs neither team a charged timeout.',
    },
  },
  {
    id: 'nfl-sig-kid-3', level: 'kid', signal: 'nfl-incomplete',
    prompt: P,
    options: ['Incomplete pass — no catch', 'Touchdown', 'Safety'],
    answer: 0,
    title: 'The wave-off: incomplete pass',
    exp: {
      kid: 'The criss-cross wave in front of the body means the pass was NOT caught. The ball hit the ground, so the play is over — no catch.',
      beginner: 'An incomplete pass stops the clock and the ball returns to the previous spot. The down is used up: 2nd down becomes 3rd down.',
      intermediate: 'The same wave-off also means "no good" on a missed kick and "penalty declined." It is the referee\'s all-purpose NO — nothing counts.',
      expert: 'A catch requires control + two feet (or another body part) in bounds + a football move. When a replay overturns a catch, the referee ends the announcement with this exact signal — the wave is the legal ruling, not just decoration.',
    },
  },
  {
    id: 'nfl-sig-kid-4', level: 'kid', signal: 'nfl-first-down',
    prompt: P,
    options: ['First down', 'Touchdown', 'Timeout'],
    answer: 0,
    title: 'Pointing the way: first down',
    exp: {
      kid: 'The arm swinging out to point down the field means FIRST DOWN! The team with the ball moved far enough (10 yards), so they get a fresh set of 4 tries.',
      beginner: 'The offense gets 4 downs to gain 10 yards. Make it, and the referee points toward the defense\'s goal: a new set of downs, counted from 1st again.',
      intermediate: 'The arm always points in the direction the OFFENSE is going. After a change of possession the point flips direction — a quick way to read a turnover from far away.',
      expert: 'Listen for pairing with the clock: an awarded first down near the sideline often comes with a winding signal to restart the game clock. The chain crew resets on the point — the signal literally moves the sticks.',
    },
  },
  {
    id: 'nfl-sig-kid-5', level: 'kid', signal: 'nfl-safety',
    prompt: P,
    options: ['Safety — 2 points for the defense', 'Touchdown', 'Timeout'],
    answer: 0,
    title: 'Palms together overhead: safety',
    exp: {
      kid: 'Palms pressed together straight above the head — that\'s a SAFETY! The defense trapped the ball carrier in his own end zone and gets 2 points!',
      beginner: 'A safety scores 2 points for the DEFENSE — the only way the team without the ball scores on a tackle. It happens when the offense is downed in its own end zone.',
      intermediate: 'After a safety comes a double prize: 2 points AND the ball — the conceding team must free-kick from its own 20. That swing is why teams avoid running plays from their own goal line.',
      expert: 'Safeties also come from penalties enforced in the offense\'s own end zone (e.g. holding there) — no tackle required. The joined-palms signal is deliberately unlike the touchdown\'s two separate raised arms, so a stadium can\'t misread 2 points as 6.',
    },
  },
  {
    id: 'nfl-sig-kid-6', level: 'kid', signal: 'nfl-false-start',
    prompt: P,
    options: ['False start', 'Touchdown', 'First down'],
    answer: 0,
    title: 'Rolling fists: false start',
    exp: {
      kid: 'The rolling fists mean FALSE START — someone on the offense jumped before the ball was snapped. Everyone goes back and tries again.',
      beginner: 'Offensive players must be totally still before the snap. Flinch early and it\'s a false start: 5 yards backward, replay the down. The whistle kills the play immediately.',
      intermediate: 'False start is a DEAD-ball foul — the play never happens. Compare offside/encroachment on the defense, where the play may continue. The rolling forearms also signal an illegal formation.',
      expert: 'Why blow it dead? Because a false start, unlike defensive offside, gives the offense an unfair jump on the pass rush — the league removes any possibility of advantage by canceling the snap outright. Watch for it on hard counts in loud stadiums.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'nfl-sig-beg-1', level: 'beginner', signal: 'nfl-holding',
    prompt: P,
    options: ['Holding', 'False start', 'Timeout'],
    answer: 0,
    title: 'Grasping the wrist: holding',
    exp: {
      kid: 'One hand grabbing the other wrist means HOLDING — a player grabbed and held an opponent instead of blocking him fairly.',
      beginner: 'Blockers may push with their hands but not grab, hook, or tackle a defender. Offensive holding costs 10 yards; defensive holding costs 5 and an automatic first down.',
      intermediate: 'Watch the wrist-grab\'s context: on a long run called back, holding is the usual culprit. The penalty is enforced from the spot or the line of scrimmage depending on where it happened.',
      expert: 'Don\'t confuse the wrist-GRAB tugged downward (holding) with the ROLLING forearms (false start) — one is a live-ball foul that lets the play finish under a flag, the other kills the snap instantly. That live/dead distinction decides whether a spectacular play can stand.',
    },
  },
  {
    id: 'nfl-sig-beg-2', level: 'beginner', signal: 'nfl-offside',
    prompt: P,
    options: ['Offside or encroachment', 'Holding', 'Pass interference'],
    answer: 0,
    title: 'Hands on hips: offside',
    exp: {
      kid: 'Hands resting on the hips mean a DEFENDER was on the wrong side of the ball when the play started. 5 yards for the offense.',
      beginner: 'The neutral zone is the ball\'s length between the teams. A defender in it at the snap is offside (5 yards). Touch an opponent early and it\'s encroachment — play stops at once.',
      intermediate: 'Offside can be a FREE PLAY: if the defender jumps but the snap goes off, the offense knows a 5-yard penalty is banked — quarterbacks launch deep shots with nothing to lose.',
      expert: 'Three cousins share this signal: offside (in the zone at the snap, play runs), encroachment (contact before the snap, dead ball), and neutral-zone infraction (a lunge that MAKES a blocker flinch — charged to the defense, not a false start). Reading which one happened tells you why the whistle did or didn\'t blow.',
    },
  },
  {
    id: 'nfl-sig-beg-3', level: 'beginner', signal: 'nfl-delay',
    prompt: P,
    options: ['Delay of game', 'Touchdown', 'First down'],
    answer: 0,
    title: 'Folded arms: delay of game',
    exp: {
      kid: 'Folded arms mean DELAY OF GAME — the team took too long to start the play. They lose 5 yards.',
      beginner: 'The offense has a 40-second play clock between plays. If it hits zero before the snap: delay of game, 5 yards, replay the down.',
      intermediate: 'Teams sometimes take this penalty ON PURPOSE — e.g. backing up 5 yards to give the punter more room rather than burning a timeout. A cheap penalty can be a tactical purchase.',
      expert: 'Watch the interplay with timeouts late in halves: a team out of timeouts facing a dying play clock must snap something or eat this flag — that pressure is exactly what the two-minute defense is counting on when it declines to substitute.',
    },
  },
  {
    id: 'nfl-sig-beg-4', level: 'beginner', signal: 'nfl-pass-interference',
    prompt: P,
    options: ['Pass interference', 'Safety', 'First down'],
    answer: 0,
    title: 'The push: pass interference',
    exp: {
      kid: 'The two open hands pushing forward mean PASS INTERFERENCE — a player shoved or grabbed someone who was trying to catch a pass. Not allowed!',
      beginner: 'Once the ball is in the air, defenders may play the BALL but not the receiver. Grab an arm or shove early and it\'s interference — the offense gets the ball at the foul spot.',
      intermediate: 'Defensive PI is a SPOT foul in the NFL — a 45-yard bomb interfered with is a 45-yard penalty. That is why deep desperation throws are dangerous for defenses even when incomplete.',
      expert: 'It cuts both ways: OFFENSIVE pass interference (a receiver shoving off) is 10 yards backward from the previous spot, not a spot foul. And contact within one yard of the line, or when both players are "playing the ball," is legal — the judgment is about advantage, not touch.',
    },
  },
  {
    id: 'nfl-sig-beg-5', level: 'beginner', signal: 'nfl-personal-foul',
    prompt: P,
    options: ['Personal foul — 15 yards', 'Delay of game', 'Incomplete pass'],
    answer: 0,
    title: 'Wrist strike overhead: personal foul',
    exp: {
      kid: 'One wrist striking the other above the head means PERSONAL FOUL — a hit that was too rough or dangerous. The team that did it loses 15 big yards.',
      beginner: 'Personal fouls are the serious class: late hits, hits on defenseless players, roughing the passer. They cost 15 yards, and many carry an automatic first down.',
      intermediate: 'The wrist-strike is a PREFIX: the referee follows it with a second gesture naming the specific act — e.g. a throwing motion for roughing the passer, or a facemask pull. Read it as "15-yarder, details incoming."',
      expert: 'Flagrant, unnecessary contact can also bring disqualification — and two unsportsmanlike-conduct fouls eject automatically. Note the officiating logic: yardage penalties deter tactical fouls, but 15-yard personal fouls exist to deter INJURY, so they\'re enforced even after the whistle.',
    },
  },
  {
    id: 'nfl-sig-beg-6', level: 'beginner', signal: 'nfl-facemask',
    prompt: P,
    options: ['Facemask', 'Holding', 'False start'],
    answer: 0,
    title: 'The grab-and-pull: facemask',
    exp: {
      kid: 'A fist gripping in front of the face and yanking down means FACEMASK — a player grabbed the cage on someone\'s helmet. That can hurt necks, so it\'s a big 15-yard penalty.',
      beginner: 'Grasping and twisting, turning, or pulling an opponent\'s facemask is a personal foul: 15 yards. Tacklers must aim for the body, never the helmet\'s bars.',
      intermediate: 'The referee mirrors the act — a grip at face height pulled downward. It usually appears right after the personal-foul wrist strike, which classes it as a 15-yard safety-of-players foul.',
      expert: 'The modern rule removed the old 5-yard "incidental" grade: ANY grasp-and-pull is 15. On a ball carrier, watch for it called against the DEFENSE mid-tackle; against the OFFENSE, stiff-arms to the mask draw the same flag — symmetry many fans miss.',
    },
  },

  // ── intermediate: same-family distractors ──────────────────────────────────
  {
    id: 'nfl-sig-int-1', level: 'intermediate', signal: 'nfl-unsportsmanlike',
    prompt: P,
    options: ['Unsportsmanlike conduct', 'Incomplete pass', 'Timeout', 'Delay of game'],
    answer: 0,
    title: 'Outstretched arms, held still: unsportsmanlike',
    exp: {
      kid: 'Arms straight out and perfectly STILL mean UNSPORTSMANLIKE CONDUCT — someone was rude or taunted the other team. Football punishes bad manners: 15 yards.',
      beginner: 'This covers non-contact bad behavior: taunting, abusive language, prolonged celebrations aimed at an opponent. It costs 15 yards even though nobody was touched.',
      intermediate: 'STATIC arms = unsportsmanlike; the same arms SWEEPING = incomplete pass. Motion is the difference between a conduct foul and a routine ruling — watch the movement, not just the pose.',
      expert: 'Two unsportsmanlike fouls on the same player = automatic ejection, and these fouls are enforced as "between downs" — tacked on after the play result, which is why a touchdown can stand but the kickoff gets moved 15 yards back.',
    },
  },
  {
    id: 'nfl-sig-int-2', level: 'intermediate', signal: 'nfl-safety',
    prompt: P,
    options: ['Safety', 'Touchdown', 'Timeout', 'Personal foul'],
    answer: 0,
    title: 'Safety = points AND possession',
    exp: {
      kid: 'Palms joined above the head — SAFETY! And after a safety, the other team has to KICK the ball away too. The defense gets 2 points and then gets the ball. Double win!',
      beginner: 'Post-safety, the conceding team free-kicks from its own 20-yard line. The scoring team gets 2 points plus excellent field position — the most lopsided exchange in football.',
      intermediate: 'That double reward is why intentional safeties exist as strategy: a team pinned at its own 1, leading late, may concede 2 on purpose to earn a free kick from the 20 rather than risk a blocked punt for a touchdown.',
      expert: 'Rare corners: the free kick after a safety may be a punt (unique in the game), and a "one-point safety" technically exists on conversion attempts. The joined palms exist to be unmistakably different from the touchdown\'s two separate arms — 2 points must never read as 6.',
    },
  },
  {
    id: 'nfl-sig-int-3', level: 'intermediate', signal: 'nfl-timeout',
    prompt: P,
    options: ['Timeout', 'Touchdown', 'Incomplete pass', 'Safety'],
    answer: 0,
    title: 'The cap tap: referee\'s timeout',
    exp: {
      kid: 'The waving X above the head means TIMEOUT. And when the referee touches his hat right after it, HE is calling the timeout — not the teams. Nobody loses one of their 3 timeouts.',
      beginner: 'Officials stop play for injuries, measurements, equipment issues, and replay reviews. The crisscross + cap touch marks it as administrative — team timeout counts are untouched.',
      intermediate: 'This matters most inside two minutes, where team timeouts are gold. An injury stoppage that costs the injured player\'s team nothing (except the player leaving for a play) is a very different resource event than a charged timeout.',
      expert: 'Clock literacy: after an official\'s timeout the game clock restarts per the prior situation (running play in-bounds = wind on ready; incomplete = on snap). Coaches game this — feigning confusion near a measurement can buy a free huddle. The cap tap tells you whether strategy or rest just happened.',
    },
  },
  {
    id: 'nfl-sig-int-4', level: 'intermediate', signal: 'nfl-personal-foul',
    prompt: P,
    options: ['Personal foul', 'Timeout', 'Facemask', 'False start'],
    answer: 0,
    title: 'Signal grammar: prefix + suffix',
    exp: {
      kid: 'Referees talk in two parts! First the wrist strike says "this was a rough play," then a SECOND gesture explains how — like a leg swing when someone crashed into the kicker.',
      beginner: 'Personal-foul signals compound: wrist strike + throwing motion = roughing the passer; + leg swing = roughing the kicker; + face grab = facemask. First the class, then the specific act.',
      intermediate: 'Roughing the kicker is 15 yards + automatic first down; the lighter "running into the kicker" (5 yards) gets a different, softer treatment. The distinction is force and contact point — block the kick itself and all contact is excused.',
      expert: 'Why kickers get special protection: mid-swing they are defenseless with a planted leg — career-ending injury territory. Officiating grammar mirrors the rulebook\'s structure: family (personal foul) → species (roughing) → enforcement (15 + auto first). Once you hear signals as sentences, no announcement is needed.',
    },
  },
  {
    id: 'nfl-sig-int-5', level: 'intermediate', signal: 'nfl-delay',
    prompt: P,
    options: ['Delay of game', 'Offside', 'Holding', 'Unsportsmanlike conduct'],
    answer: 0,
    title: 'Buying space with a 5-yard flag',
    exp: {
      kid: 'Folded arms mean DELAY OF GAME. Sometimes a team WANTS this little penalty — moving back 5 steps gives their kicker more room to punt safely!',
      beginner: 'Delay of game is only 5 yards and a replayed down. Near your own goal line, that trade can be worth it: more operating room for the punter, and the clock kept running during the delay.',
      intermediate: 'The real currency is CLOCK + SPACE: letting the play clock die burns ~40 game seconds pre-snap while the leading team backs up for a safer punt — two wins for one cheap flag.',
      expert: 'Officiating wrinkle: inside the final two minutes, deliberate delay tactics can trigger a 10-second runoff conversation, and repeated intentional fouling invites an unsportsmanlike escalation. The folded arms look mundane — but late-game, this signal is often the visible tip of a clock-management chess move.',
    },
  },
  {
    id: 'nfl-sig-int-6', level: 'intermediate', signal: 'nfl-offside',
    prompt: P,
    options: ['Offside / encroachment', 'Delay of game', 'Holding', 'Timeout'],
    answer: 0,
    title: 'The free play, decoded',
    exp: {
      kid: 'Hands on hips mean the defense jumped early. If nobody touched anybody, the offense gets a FREE try — if something great happens, they keep it; if not, they take the penalty!',
      beginner: 'A defender offside at the snap (no contact) doesn\'t stop the play. The offense effectively plays with a safety net: worst case, accept 5 free yards; best case, keep the big gain.',
      intermediate: 'Quarterbacks are coached to spot the jump and immediately go deep or take a shot into tight coverage — an interception on a free play usually doesn\'t count, since the offense just accepts the flag instead.',
      expert: 'Contrast encroachment: the instant a defender TOUCHES a blocker pre-snap, the play is dead — no free play. So the same hands-on-hips signal follows two different timelines: silent flag + full play (offside) versus immediate whistle (encroachment). Whether you saw 6 seconds of football first IS the decode.',
    },
  },

  // ── expert: confusable pairs ────────────────────────────────────────────────
  // Pair A: holding (FIST grasped, tugged DOWNWARD) vs illegal use of hands
  // (grasped wrist but an OPEN PALM rising toward the face) — hand shape + direction.
  {
    id: 'nfl-sig-exp-1', level: 'expert', signal: 'nfl-holding',
    prompt: P,
    options: ['Holding', 'Illegal use of hands', 'False start', 'Facemask'],
    answer: 0,
    title: 'Fist down: holding',
    exp: {
      kid: 'Look at the hands: a closed FIST held at the wrist and tugged DOWN means HOLDING. If the free hand were open and rising up, it would be a different foul!',
      beginner: 'Holding = grabbing cloth or body to restrain. Accepted offensive holding wipes the play\'s gain AND marks off 10 yards from the previous spot — a huge play can vanish because one blocker grabbed a jersey.',
      intermediate: 'This is why you never celebrate until you scan for flags: penalties are enforced from the previous spot on most live-ball offensive fouls, so a 60-yard run was provisional the moment the flag flew.',
      expert: 'Enforcement nuance: holding BEHIND the line is marked from the previous spot; beyond the line during a run, spot-of-foul rules can apply. And defensive holding is a different animal — 5 yards plus automatic first down, which is why DBs\' grabs on 3rd-and-long are drive-extending gold for the offense.',
    },
  },
  {
    id: 'nfl-sig-exp-2', level: 'expert', signal: 'nfl-illegal-hands',
    prompt: P,
    options: ['Holding', 'Illegal use of hands', 'False start', 'Facemask'],
    answer: 1,
    title: 'Open palm up: illegal use of hands',
    exp: {
      kid: 'Same wrist-grab — but the free hand is an OPEN PALM pushing up toward the face. That\'s ILLEGAL USE OF HANDS: pushing an opponent\'s head or face. Hands off the helmet!',
      beginner: 'Illegal use of hands covers hands to the face and illegal blocks with the hands: 10 yards on the offense, 5 and an automatic first down when the defense does it to a blocker or receiver.',
      intermediate: 'The signal pair is a masterclass in hand-shape coding: fist + downward tug = restraining (holding); open palm + upward push = striking/pushing (hands to the face). Same grasped wrist, opposite verbs.',
      expert: 'Officials separate the two because the RULES separate them: holding restrains movement (advantage foul), hands-to-the-face endangers (safety-adjacent foul, and a personal foul when forcible to the helmet). When you can name which of these two nearly identical signals you saw, you\'re reading officiating at broadcast-analyst level.',
    },
  },
  // Pair B: incomplete (flat arms SWEEPING at shoulder height) vs unsportsmanlike
  // (the same span held STATIC) — motion is the only difference.
  {
    id: 'nfl-sig-exp-3', level: 'expert', signal: 'nfl-incomplete',
    prompt: P,
    options: ['Incomplete pass / no good', 'Unsportsmanlike conduct', 'Timeout', 'Safety'],
    answer: 0,
    title: 'One wave, many "no"s',
    exp: {
      kid: 'The arms are MOVING — sweeping apart again and again. That\'s the big NO: incomplete pass, missed kick, or "no penalty counts." Frozen-still arms would mean a conduct foul instead!',
      beginner: 'Fouled teams may DECLINE penalties. If the play gained more than the penalty would, taking the result is smarter — and the referee wipes the flag away with this same sweeping wave.',
      intermediate: 'The wave-off is context-driven: after a pass, incomplete; after a kick, no good; after a flag discussion, penalty declined. Same grammar, three sentences — the game situation is the decoder.',
      expert: 'Decline decisions are real strategy: a defense offside on 3rd-and-8 that gives up a 6-yard completion faces 4th down if the offense declines… so the offense takes the 5 yards and replays 3rd-and-3 instead. Watching which option the captain picks tells you how coaches value downs vs distance.',
    },
  },
  {
    id: 'nfl-sig-exp-4', level: 'expert', signal: 'nfl-unsportsmanlike',
    prompt: P,
    options: ['Incomplete pass / no good', 'Unsportsmanlike conduct', 'Timeout', 'Safety'],
    answer: 1,
    title: 'The frozen span: a conduct foul',
    exp: {
      kid: 'The arms stretch out and FREEZE — no waving. That stillness means UNSPORTSMANLIKE CONDUCT: taunting or rudeness, 15 yards, even though nobody was touched.',
      beginner: 'Motion is the entire difference in this pair: sweeping arms erase a play (incomplete); the same arms held rigid announce a 15-yard conduct foul. Officials train the freeze deliberately so the two can\'t blur.',
      intermediate: 'Unsportsmanlike conduct is a "between downs" foul — enforced after the play result stands. That\'s why a touchdown can count while the ensuing kickoff moves 15 yards back: the score and the sanction live on different plays.',
      expert: 'League-discipline layer: two unsportsmanlike fouls eject a player automatically, and taunting points of emphasis shift season to season. Reading the static span correctly also tells you the CLOCK treatment — conduct fouls don\'t stop a running clock the way an incompletion does. Stillness versus sweep changes everything downstream.',
    },
  },
  // Pair C: touchdown (two separate arms straight up) vs safety (palms JOINED
  // overhead) — one narrow join distinguishes 6 points from 2.
  {
    id: 'nfl-sig-exp-5', level: 'expert', signal: 'nfl-touchdown',
    prompt: P,
    options: ['Touchdown', 'Safety', 'Timeout', 'Personal foul'],
    answer: 0,
    title: 'Same arms, different points',
    exp: {
      kid: 'TWO separate arms straight up — TOUCHDOWN! If the palms were pressed together into one point, it would be a safety worth only 2. Count the arms!',
      beginner: 'Raised arms confirm ANY successful score by ball placement — touchdown (6), field goal (3), extra point (1), two-point try (2). The play type, not the signal, sets the number.',
      intermediate: 'On kicks the ruling belongs to the two officials stationed under each upright; the referee relays it. Inside the posts and over the crossbar = good — even if the ball passes above the top of an upright, as long as it\'s inside the inner edge.',
      expert: 'Decoding tip: signal + spot = score. Arms up from under the uprights after a snap-hold-kick = 3. Arms up in the end zone during a scrimmage play = 6. Arms up after a conversion snap = 1 or 2 depending on kick vs run/pass. One gesture, four point values — the scoreboard reader\'s classic trap.',
    },
  },
  {
    id: 'nfl-sig-exp-6', level: 'expert', signal: 'nfl-safety',
    prompt: P,
    options: ['Touchdown', 'Safety', 'Timeout', 'Personal foul'],
    answer: 1,
    title: 'The joined palms: 2, not 6',
    exp: {
      kid: 'The hands MEET above the head like a rooftop — that\'s the SAFETY, 2 points for the defense. Touchdown arms never touch each other!',
      beginner: 'The join is the entire decode: palms pressed together overhead = safety (2 points, defense scores, and it gets the ball back on a free kick). Two separated pillars = touchdown family.',
      intermediate: 'Why such a subtle difference for such different outcomes? Because both are "score" announcements to the press box — the joined palms were chosen as a modification of the score pose so scorers instantly know points are going on the board, just fewer and to the other team.',
      expert: 'End-zone forensics ride on this signal: was the ball carrier\'s momentum into the end zone self-created (safety) or did the impetus come from the defense (touchback instead)? The impetus doctrine — who supplied the force that put the ball in the end zone — is what the referee resolved in the second before those palms met.',
    },
  },
];
