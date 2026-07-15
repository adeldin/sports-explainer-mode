// Zone Tap — Rugby bank (pooled category: rugby/mlr). Zones/laws only (rule-based,
// evergreen). Pure data, zero RN imports. Coordinates: RugbyPitch viewBox 680×420 —
// attack LEFT→RIGHT: try lines x=66/614 (shaded in-goals beyond), 22m lines x=187/493,
// dashed 10m lines x=285/395, dashed 5m-from-try lines x=93/587, halfway x=340 with the
// center spot at (340,210), posts ON each try line at y=210.
import { ZoneScenario, circle, rectSpot, ball, att, def } from '../zoneTapRegions';

// Context marks (owner feedback pass): 'att' = your team (attacking L→R unless the
// prompt flips it), 'def' = opposition; the ball mark renders as an oval. Rucks and
// scrums are drawn as tight two-color clusters with the ball at the base — the
// reference point most prompts hang off. The spot the prompt asks the user to LOCATE
// is never drawn.

const IN_GOAL_R = rectSpot('ingoalR', 618, 10, 52, 400);
const IN_GOAL_L = rectSpot('ingoalL', 10, 10, 52, 400);
const TRY_LINE_R = rectSpot('trylineR', 608, 10, 12, 400);
const HALFWAY = rectSpot('halfway', 331, 10, 18, 400);
const R22 = rectSpot('r22', 485, 10, 16, 400);
const L22 = rectSpot('l22', 179, 10, 16, 400);
const TEN_R = rectSpot('ten10R', 387, 10, 16, 400);
const POSTS_R = circle('postsR', 614, 210, 20);
const POSTS_L = circle('postsL', 66, 210, 20);
const TOUCH_TOP = rectSpot('touchtop', 70, 4, 540, 12);
const CENTER_SPOT = circle('centerspot', 340, 210, 16);
const FULLBACK = circle('fullback', 120, 210, 20);
const SCRUM_HALF = circle('scrumhalf', 352, 220, 14);
const FLY_HALF = circle('flyhalf', 412, 265, 16);

export const RUGBY_ZONE_SCENARIOS: ZoneScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'rug-kid-1', level: 'kid',
    prompt: 'You attack left → right. Tap the area where you SCORE A TRY.',
    spots: [IN_GOAL_R, IN_GOAL_L, HALFWAY], answer: 'ingoalR',
    marks: [att(480, 206), ball(494, 210), def(540, 190)],
    title: 'The in-goal: rugby’s end zone',
    exp: {
      kid: 'Carry the ball into the shaded area past the far line and press it down on the ground — that’s a try, the big 5-point score!',
      beginner: 'Unlike football, you must GROUND the ball — touching it down with downward pressure. Crossing the line isn’t enough.',
      intermediate: 'The try line itself counts as in-goal: grounding ON the line scores. The dead-ball line at the very back is the limit.',
      expert: 'Grounding law details decide tight calls: downward pressure with hand/arm or upper body, ball under control. Held up over the line = no try — restart to the defenders (goal-line drop-out in current law).',
    },
  },
  {
    id: 'rug-kid-2', level: 'kid',
    prompt: 'Tap the HALFWAY line — where the game kicks off.',
    spots: [HALFWAY, R22, TRY_LINE_R, IN_GOAL_L], answer: 'halfway',
    marks: [ball(340, 210), att(324, 216)],
    title: 'Kickoff from halfway',
    exp: {
      kid: 'The match starts with a big kick from the middle line — and after every score, play restarts there too.',
      beginner: 'Kickoffs are drop-kicks from the center of halfway. After points, the team that CONCEDED restarts (conference varies by competition, but kicking off after conceding is the classic law).',
      intermediate: 'The kick must travel 10 metres (the dashed line) and land in play — short or straight into touch hands the other team a scrum or lineout at halfway.',
      expert: 'Kickoff strategy splits: deep to pin territory, or a high "contestable" to the 10m line to win the ball straight back. The restart is a possession play, not a formality.',
    },
  },
  {
    id: 'rug-kid-3', level: 'kid',
    prompt: 'Tap the POSTS you kick at (you attack right).',
    spots: [POSTS_R, POSTS_L, HALFWAY, TOUCH_TOP], answer: 'postsR',
    marks: [att(560, 216), ball(575, 210)],
    title: 'The H-shaped posts stand ON the try line',
    exp: {
      kid: 'Kick the ball between the tall posts and over the crossbar for points! Rugby’s goalposts stand right on the try line, not at the back.',
      beginner: 'Kicks through the posts: conversion after a try (2 points), penalty goal (3), drop goal (3). Between the uprights, above the crossbar.',
      intermediate: 'Posts-on-the-line matters for play: attackers use the posts as a shield, and a conversion is taken in line with WHERE the try was grounded — scoring near the posts makes the kick easy.',
      expert: 'That conversion-line law drives finishing behavior: wingers run around under the posts instead of dotting down in the corner when they can — turning a 60% touchline kick into a 99% one.',
    },
  },
  {
    id: 'rug-kid-4', level: 'kid',
    prompt: 'Tap the TOUCHLINE — where the ball going out means a throw-in (lineout).',
    spots: [TOUCH_TOP, HALFWAY, IN_GOAL_R, CENTER_SPOT], answer: 'touchtop',
    marks: [att(300, 52), ball(313, 48)],
    title: 'Touch: out of bounds, rugby-style',
    exp: {
      kid: 'The long side lines are "touch." Ball or ball-carrier touches them (or beyond) — play stops and teams line up for a throw-in called a lineout.',
      beginner: 'The line itself is OUT in rugby — stepping on it while holding the ball puts you in touch.',
      intermediate: 'Who throws in? Generally the team that did NOT put it out — but kicks change everything (penalty kicks to touch keep the throw!).',
      expert: 'Territory kicking is built on touch law: kick directly out from behind your 22 and the lineout is where it crossed; from outside your 22, a direct kick comes BACK to where you kicked. That one law shapes every exit.',
    },
  },
  {
    id: 'rug-kid-5', level: 'kid',
    prompt: 'You attack right. Tap the 22-METRE line you’re trying to reach.',
    spots: [R22, L22, HALFWAY], answer: 'r22',
    marks: [att(420, 208), ball(434, 212), def(460, 190)],
    title: 'The 22: the danger zone begins',
    exp: {
      kid: 'Each end has a line 22 metres from the try line. Getting past the FAR one means you’re close to scoring territory!',
      beginner: 'The 22s are rugby’s landmarks: inside the opponent’s 22 you attack; inside your own you defend and kick to safety.',
      intermediate: 'The 22 has laws attached: drop-outs are taken from it, and the direct-to-touch kicking rule flips when you’re behind your own.',
      expert: 'Coaches call the area past the opponent’s 22 the "red zone": possession there converts to points often enough that exits, penalties, and kick decisions are all graded by whether they cross this line.',
    },
  },
  {
    id: 'rug-kid-6', level: 'kid',
    prompt: 'Tap the TRY LINE itself.',
    spots: [TRY_LINE_R, HALFWAY, R22, TOUCH_TOP], answer: 'trylineR',
    marks: [att(585, 238), ball(598, 234), def(570, 200)],
    title: 'Ground the ball ON or OVER this line',
    exp: {
      kid: 'This white line is the goal line — press the ball down on it or past it and you’ve scored a try!',
      beginner: 'The line belongs to the in-goal: grounding exactly ON the line is a try. Defenders grounding it there instead make it a touch-down (restart), not a score.',
      intermediate: 'Near this line the game compresses: pick-and-go drives, defenders offside rules tighten to the line itself, and the TMO watches every grounding.',
      expert: 'Goal-line stands trigger special law: held up over the line now gives a goal-line drop-out to the defense — a recent change that rewards heroic defense and reshaped close-range attack patterns.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'rug-beg-1', level: 'beginner',
    prompt: 'The ball went into touch at the TOP. Tap where the LINEOUT forms.',
    spots: [rectSpot('lineout', 440, 14, 26, 100), CENTER_SPOT, R22, IN_GOAL_R], answer: 'lineout',
    marks: [ball(452, 8)],
    title: 'The lineout: a corridor from the touchline',
    exp: {
      kid: 'Both teams make two lines pointing IN from the sideline, and the ball is thrown down the middle — jumpers get lifted sky-high to catch it!',
      beginner: 'The lineout forms perpendicular to touch, between the 5m and 15m marks, where the ball went out. The throw must fly straight down the gap.',
      intermediate: 'The throwing team picks the numbers (how many in the line) and owns the calls — coded jumps make the lineout rugby’s most scripted set piece.',
      expert: 'Because penalty kicks to touch keep the throw, the lineout is the launchpad of modern attack: catch-and-drive mauls, off-the-top strikes. Lineout success rate is as watched as any stat in the sport.',
    },
  },
  {
    id: 'rug-beg-2', level: 'beginner',
    prompt: 'Attackers kick the ball DEAD through the right in-goal. Tap the line the defenders restart from.',
    spots: [R22, HALFWAY, TRY_LINE_R, TEN_R], answer: 'r22',
    marks: [ball(658, 330)],
    title: 'The 22 drop-out',
    exp: {
      kid: 'If the attacking kick rolls out the very back, the defending team gets a free drop-kick from their 22-metre line.',
      beginner: 'A ball made dead in-goal by the ATTACKERS = defenders restart with a drop kick anywhere along their 22.',
      intermediate: 'The drop-out is a mini-kickoff: go long for territory or short and contestable to win it straight back.',
      expert: 'Know the split: attacker kicks it dead → 22 drop-out; attacker knocks on / is held up IN-goal → goal-line drop-out. Two different restart lines for two different failures — recent law, frequently confused.',
    },
  },
  {
    id: 'rug-beg-3', level: 'beginner',
    prompt: 'Kickoff! The ball must travel to one line before landing. Tap it (you kick toward the right).',
    spots: [TEN_R, HALFWAY, R22, TRY_LINE_R], answer: 'ten10R',
    marks: [ball(340, 210), att(325, 216)],
    title: 'The 10-metre line',
    exp: {
      kid: 'The dashed line 10 big steps from the middle — kickoffs have to fly at least that far, or the other team gets the ball.',
      beginner: 'A kickoff not reaching the 10m line (untouched by the receivers) gives the receiving team a scrum at the center — a big punishment.',
      intermediate: 'The 10m line is also the receiving team’s front fence: their catchers stack just behind it for the contestable kick battle.',
      expert: 'Teams aim ON the 10m deliberately: the shortest legal kick maximizes hang time per metre, letting chasers arrive with the ball. Restart reception vs. chase is a set-piece in all but name.',
    },
  },
  {
    id: 'rug-beg-4', level: 'beginner',
    prompt: 'Scrum at the center spot. Tap where the SCRUM-HALF works.',
    spots: [SCRUM_HALF, FLY_HALF, FULLBACK, POSTS_R], answer: 'scrumhalf',
    marks: [att(331, 177), att(331, 191), att(331, 205), def(345, 177), def(345, 191), def(345, 205), ball(338, 214)],
    title: 'The scrum-half: at the base of the scrum',
    exp: {
      kid: 'The smallest player stands right beside the pushing pack — he feeds the ball in, then digs it out the back when his team wins it.',
      beginner: 'The 9 is the link between forwards and backs: puts the ball into the scrum, follows it to the back, and fires the pass out.',
      intermediate: 'At every phase (scrum, ruck, maul), the 9 lives at the base — his pass speed sets the whole attack’s tempo.',
      expert: 'Around the scrum the 9 is also a defender with special offside lines: he may follow the ball around the scrum while everyone else stays behind it — a private duel of 9 versus 9 at every put-in.',
    },
  },
  {
    id: 'rug-beg-5', level: 'beginner',
    prompt: 'Your team attacks RIGHT — so you defend the left. Tap your FULLBACK, the last line of defense.',
    spots: [FULLBACK, circle('wingtop', 250, 42, 15), SCRUM_HALF, R22], answer: 'fullback',
    marks: [att(290, 100), att(290, 210), att(290, 320), def(400, 200), ball(388, 196)],
    title: 'The fullback: deep behind the defensive line',
    exp: {
      kid: 'One player hangs way back near his own end, all alone — he catches the long kicks and makes the last-chance tackles.',
      beginner: 'The 15 covers everything behind the front-line defense: high balls, grubbers, and breakaway runners.',
      intermediate: 'He positions by the kicking game: deep and central when a kick is likely, pushed up into the line when the attack must pass. The back-field is his to organize.',
      expert: 'Modern back-three systems rotate coverage as a pendulum: fullback plus both wingers share the backfield so no kick lands unattended — which winger stays deep tells you the whole defensive system.',
    },
  },
  {
    id: 'rug-beg-6', level: 'beginner',
    prompt: 'Tap where the WINGS patrol.',
    spots: [rectSpot('wingzone', 150, 32, 380, 58), rectSpot('midzone', 150, 180, 380, 60), FULLBACK], answer: 'wingzone',
    marks: [att(250, 258), att(320, 268), att(390, 278), ball(262, 262)],
    title: 'Wings: the widest channels',
    exp: {
      kid: 'The fastest players stay out by the sidelines, waiting for the ball to reach them with room to sprint.',
      beginner: 'Wingers finish attacks: the ball travels through the backs until the winger gets it with only the touchline and one defender to beat.',
      intermediate: 'Wide channels are where overlaps appear — if the attack creates a 2-on-1 out here, the winger scores. Defense drifts wide to prevent exactly that.',
      expert: 'Off the ball, wings work hardest: the blind-side wing covers backfield kicks (the pendulum), and both fold around rucks to refill the line. "Winger" is now a positioning job with sprinting attached.',
    },
  },

  // ── intermediate ──────────────────────────────────────────────────────────
  {
    id: 'rug-int-1', level: 'intermediate',
    prompt: '50:22! Kick from your own half, bounce into touch inside their 22. Tap the target zone.',
    spots: [rectSpot('fifty22', 497, 12, 110, 55), rectSpot('their22mid', 497, 180, 110, 60), rectSpot('ownhalftouch', 100, 12, 150, 45), IN_GOAL_R], answer: 'fifty22',
    marks: [att(250, 258), ball(263, 252), def(560, 120)],
    title: 'The 50:22: bounce into touch in their 22',
    exp: {
      kid: 'A special kick: from your own half, if the ball BOUNCES in the field and then rolls out inside the other team’s 22 — YOUR team gets the throw-in!',
      beginner: 'Normally kicking into touch gives the other team the lineout. The 50:22 flips it: kick from inside your half, bounce into touch inside their 22, and the throw is yours.',
      intermediate: 'The rule forces defensive choices: keep a winger back to guard the 50:22 and the front-line defense is one thinner — exactly the law’s intent.',
      expert: 'Details: the kicker must be in his own half at the kick (play-the-ball position counts), it must bounce in the field of play, and indirect touches change it. Introduced in 2021 to reduce line-speed collisions by pulling defenders deep.',
    },
  },
  {
    id: 'rug-int-2', level: 'intermediate',
    prompt: 'Scrum near the BOTTOM touchline. Tap the OPENSIDE.',
    spots: [rectSpot('openside', 350, 40, 250, 140), rectSpot('blindside', 350, 330, 250, 66), FULLBACK], answer: 'openside',
    marks: [att(373, 300), att(373, 314), att(373, 328), def(387, 300), def(387, 314), def(387, 328), ball(368, 322)],
    title: 'Openside: the wide side of the set piece',
    exp: {
      kid: 'When a scrum happens near one sideline, the field has a BIG side and a small side. The big open side is where most attacks go.',
      beginner: 'Openside = more room, more attackers, more options. Blindside = the short, cramped side — but sneak plays live there because defenses forget it.',
      intermediate: 'Defenses split their backs by these sides: the openside gets the numbers; a lone wing guards the blind. Attacks probe the blindside precisely when that wing creeps infield.',
      expert: 'The openside/blindside split names the flankers too: the openside flanker (7) packs on the big side to reach the first breakdown faster. Geometry assigns the jersey numbers.',
    },
  },
  {
    id: 'rug-int-3', level: 'intermediate',
    prompt: 'Ruck at the center spot; you defend the LEFT. Tap where your defensive line must stand.',
    spots: [rectSpot('onside', 296, 120, 18, 180), rectSpot('offside', 366, 120, 18, 180), FULLBACK, L22], answer: 'onside',
    marks: [att(332, 204), att(330, 218), def(350, 204), def(348, 218), ball(324, 211)],
    title: 'The offside line: the ruck’s last feet',
    exp: {
      kid: 'At every pile-up, an invisible line appears. Defenders must stay on THEIR side of it until the ball comes out — no sneaking forward!',
      beginner: 'The offside line runs through the hindmost foot of the ruck, sideline to sideline. Defenders start behind it; step over early and it’s a penalty.',
      intermediate: 'The whole defensive line rises together off this line ("line speed"). Watching a game, that flat line of defenders IS the offside law made visible.',
      expert: 'Elite defenses live at the limit: aligned millimetres onside, sprinting on the 9’s touch. Referees police the "coming forward before the ball is out" margin — line-speed penalties swing tight games more than scrums do.',
    },
  },
  {
    id: 'rug-int-4', level: 'intermediate',
    prompt: 'Pinned at your own try line (you defend LEFT). Tap the box-kick landing zone your exit aims for.',
    spots: [rectSpot('boxzone', 200, 12, 110, 55), rectSpot('midexit', 200, 180, 110, 60), IN_GOAL_R, CENTER_SPOT], answer: 'boxzone',
    marks: [att(95, 182), att(95, 196), def(109, 182), def(109, 196), att(118, 206), ball(105, 210)],
    title: 'Exit: high, to the touchline side, past the 22',
    exp: {
      kid: 'When trapped near your own line, the little scrum-half boots the ball high up the sideline to escape danger.',
      beginner: 'The "box kick" goes over the 9’s shoulder into the space behind the defenders, near touch — even if the other team catches it, they’re far away and near the sideline.',
      intermediate: 'Exits target past your own 22 by the touchline: contestable height lets chasers compete, and the touchline limits the counter-attack’s options.',
      expert: 'The trade-offs are precise: too long = counter from space; too short = caught in your face; infield = full-field counter. That’s why the corridor near touch, 25–35m out, is the drilled landing zone.',
    },
  },
  {
    id: 'rug-int-5', level: 'intermediate',
    prompt: 'Attacking 5-METRE scrum! Tap where it packs down.',
    spots: [circle('fivescrum', 578, 210, 16), CENTER_SPOT, R22, FULLBACK], answer: 'fivescrum',
    marks: [att(545, 188), att(545, 232), def(600, 176), def(600, 244)],
    title: 'The 5m scrum: rugby’s goal-line siege',
    exp: {
      kid: 'When the defense makes a mistake right at their own line, the scrum happens just five steps from the try line — so close!',
      beginner: 'Scrums can’t be set closer than 5 metres from the try line (the dashed line). From there, one good shove or pick-and-go can score.',
      intermediate: 'The 5m scrum is a scoring platform: number 8 pickups, 9 snipes, or a shove for a penalty try. Defenses must commit their whole pack, leaving the backline stretched.',
      expert: 'The penalty-try calculus rules here: a dominant scrum collapsed illegally this close is a penalty try plus a card. Teams with strong scrums CHOOSE scrum restarts near the line over quick taps — the set piece IS the attack.',
    },
  },
  {
    id: 'rug-int-6', level: 'intermediate',
    prompt: 'Kickoff coming to your team (you attack right, receiving in your half). Tap where your CATCHERS stack.',
    spots: [rectSpot('receivers', 200, 140, 90, 140), IN_GOAL_L, rectSpot('frontline', 300, 140, 34, 140), TOUCH_TOP], answer: 'receivers',
    marks: [ball(342, 210), def(352, 218)],
    title: 'Receive between your 10m and your 22',
    exp: {
      kid: 'The kick will drop between the dashed line and the 22 — so the good catchers wait right there, with lifters ready to boost them.',
      beginner: 'Kickoffs must go 10m but rarely go past the 22 (too easy to catch and counter) — the landing corridor is predictable, so receivers pre-stack it.',
      intermediate: 'Teams lift kickoff catchers like lineout jumpers now. Winning your own restart reception cleanly is the price of admission for an exit.',
      expert: 'Chasing teams target the seam between pod catchers; receiving teams overload the expected side (kickers are handed). Restart reception maps are scouted per-opponent like lineout tendencies.',
    },
  },

  // ── expert ────────────────────────────────────────────────────────────────
  {
    id: 'rug-exp-1', level: 'expert',
    prompt: 'Ruck 25m out, in front of the posts. Tap the DROP-GOAL POCKET.',
    spots: [circle('pocket', 448, 245, 16), circle('flatline', 505, 255, 14), POSTS_R, circle('cornerdeep', 590, 60, 14)], answer: 'pocket',
    marks: [att(470, 203), att(470, 217), def(484, 203), def(484, 217), ball(461, 212), att(452, 224)],
    title: 'The pocket: deep behind the ruck',
    exp: {
      kid: 'To kick a drop goal, the kicker hides several steps BEHIND everyone, so he has time to drop the ball and boot it before defenders arrive.',
      beginner: 'The "pocket" is the space 8–10m behind the ruck, slightly offset — depth buys the kicker time against the charging defense.',
      intermediate: 'The whole team builds it: carries to the middle (squaring the angle to the posts), a clean ruck, then the 9’s flat pass back into the pocket. Everyone in the stadium knows — and it still works.',
      expert: 'Defending it is a law problem: chargers must come from onside, so the pocket’s depth is calibrated to the offside line — deep enough to beat the sprint, close enough to keep the kick short. Championship teams rehearse this exact geometry for endgames.',
    },
  },
  {
    id: 'rug-exp-2', level: 'expert',
    prompt: 'Attack has an overlap out wide (top). Tap where the DRIFT defense shepherds them.',
    spots: [rectSpot('drifttouch', 520, 22, 90, 58), rectSpot('driftin', 520, 150, 90, 60), POSTS_R, IN_GOAL_R], answer: 'drifttouch',
    marks: [att(420, 58), ball(432, 54), att(468, 40), att(452, 92), def(478, 66), def(498, 98), def(462, 128)],
    title: 'Drift: use the touchline as the extra defender',
    exp: {
      kid: 'When the attack has more players, the defenders slide sideways together, pushing everyone toward the sideline — the sideline becomes their teammate!',
      beginner: 'Against an overlap, drift defense gives ground sideways instead of rushing: each defender passes his man outward, and the touchline erases the spare attacker.',
      intermediate: 'The trade: drift concedes metres forward to deny the outside break. Its enemy is the cut-back — a runner angling INSIDE against the sliding defenders’ momentum.',
      expert: 'Drift vs. blitz is rugby’s coverage dichotomy: blitz (up-and-in) kills the ball early but dies to kicks in behind; drift survives overlaps but leaks gain-line. Which a team plays on which phase is the defensive coach’s signature.',
    },
  },
  {
    id: 'rug-exp-3', level: 'expert',
    prompt: 'Tap the "13 CHANNEL" — the defensive seam attacks love to target.',
    spots: [rectSpot('ch13', 430, 62, 90, 60), rectSpot('chmid', 430, 185, 90, 60), FULLBACK, TOUCH_TOP], answer: 'ch13',
    marks: [def(408, 90, '13'), def(396, 160), def(430, 26), att(330, 150), ball(342, 146)],
    title: 'Outside the outside-centre',
    exp: {
      kid: 'There’s a gap between the defender who guards the middle and the one guarding the sideline — sneaky attacks aim right between them.',
      beginner: 'The outside-centre (13) defends the widest midfield channel with the most space and the least help — attackers scheme to make HIM choose wrong.',
      intermediate: 'The 13 faces a two-way bind on every wide play: jam in on the ball and the wing’s man is free; hold width and the inside pass splits the seam.',
      expert: 'Whole attacking shapes exist to stress this channel: blocker plays, tip-ons, and 1-3-3-1 wide pods all isolate the 13 post-defense. Scouting reports grade opposing 13s by their jam/drift decision speed — it’s the most-attacked read in the sport.',
    },
  },
  {
    id: 'rug-exp-4', level: 'expert',
    prompt: 'Goal-line stand! Ruck 5m from YOUR line (defending left). Tap where the PILLAR defenders plant.',
    spots: [circle('pillars', 95, 185, 15), circle('wideedge', 95, 60, 15), circle('behindruck', 175, 210, 15), circle('backfield', 160, 320, 15)], answer: 'pillars',
    marks: [def(102, 206), def(102, 220), att(88, 206), att(88, 220), ball(112, 213)],
    title: 'Pillars: glued to the ruck fringe',
    exp: {
      kid: 'Right beside every pile-up, two defenders crouch like door guards — they stop the sneaky one-step dives near the line.',
      beginner: 'The "pillars" (guards) defend the first metre either side of the ruck. Near the try line, pick-and-goes attack exactly that metre, over and over.',
      intermediate: 'Pillars can’t leave early or bite on the 9: their discipline versus dummy runners is what goal-line defense is. The tackle happens ON the line, low, driving back.',
      expert: 'Repeat-phase goal-line D is a substitution chess match: fresh pillars every phase if you can, because a single mistimed pillar step concedes under the posts. Teams track "pillar integrity" on video the way football tracks gap integrity.',
    },
  },
  {
    id: 'rug-exp-5', level: 'expert',
    prompt: 'Territory kick: tap the "COFFIN CORNER" every fly-half dreams of hitting.',
    spots: [rectSpot('coffin', 565, 12, 44, 44), rectSpot('middeep', 430, 180, 90, 60), POSTS_R, IN_GOAL_R], answer: 'coffin',
    marks: [att(300, 140), ball(313, 136), def(520, 300)],
    title: 'The coffin corner: touch, deep in their 22',
    exp: {
      kid: 'The perfect kick rolls out of bounds in the tiny corner near the other team’s try line — they’re trapped with nowhere to go!',
      beginner: 'A lineout 5 metres from the opponent’s line is almost as good as possession in-goal: their throw is under pressure and any exit kick is rushed.',
      intermediate: 'The margin is brutal: a metre too long is dead ball (22 drop-out, all that territory wasted); too short and the fullback counters. The corner rewards exact trajectory.',
      expert: 'Penalty-to-touch decisions revolve around this corner: kick for the coffin lineout and drive, or take the 3 points? Analytics says the 5m lineout maul beats 3 points for strong maul teams — which is why the corner flag became the era’s signature choice.',
    },
  },
  {
    id: 'rug-exp-6', level: 'expert',
    prompt: 'Opponent tackled at midfield; you defend from the LEFT side. Tap where the JACKAL enters to steal the ball.',
    spots: [circle('gate', 316, 210, 14), circle('sideentry', 352, 162, 13), circle('wideout', 340, 66, 14), circle('deeppocket', 250, 260, 14)], answer: 'gate',
    marks: [def(338, 212), att(352, 218), ball(334, 206), att(292, 232)],
    title: 'Through the gate: enter from directly behind',
    exp: {
      kid: 'To grab the ball after a tackle you must run in through the "back door" — straight behind the tackled player, never from the side!',
      beginner: 'The law defines an entry "gate": arrive from your own side, directly behind the tackle, before the ruck forms. Side entries are penalties.',
      intermediate: 'The jackal races the cleaners: enter the gate, stay on your feet, hands on the ball before a ruck forms — win a turnover or a holding-on penalty.',
      expert: 'Elite jackals win with law precision: supporting their own body weight (no hands on ground), releasing the tackled player first if they made the tackle, surviving the clean-out legally. Every breakdown penalty in a broadcast traces to one of these micro-laws.',
    },
  },
];
