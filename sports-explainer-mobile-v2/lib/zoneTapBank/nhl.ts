// Zone Tap — NHL bank. Rink zones/positions only (rule-based, evergreen). Pure data,
// zero RN imports. Coordinates: HockeyRink viewBox 680×300 — goal lines x=46/634, blue
// lines x=258/422, red line x=340, center ice (340,150), end faceoff dots (112|568, 78|222),
// creases bulge toward center from each goal line, nets behind them. "You attack RIGHT."
import { ZoneScenario, circle, rectSpot, ball, att, def } from '../zoneTapRegions';

// Context marks (owner feedback pass): 'att' = your team (attacking the RIGHT net
// unless the prompt flips it), 'def' = opposition; the ball mark renders as a puck.
// Goalies sit truthfully in their nets/creases even when that region is a candidate;
// the player/spot the prompt asks the user to LOCATE is never drawn.

const NET_R = rectSpot('netR', 630, 130, 22, 40);
const NET_L = rectSpot('netL', 28, 130, 22, 40);
const CENTER = circle('center', 340, 150, 20);
const CREASE_R = circle('creaseR', 622, 150, 18);
const BLUE_R = rectSpot('blueR', 412, 14, 20, 272);
const BLUE_L = rectSpot('blueL', 248, 14, 20, 272);
const RED_LINE = rectSpot('redline', 331, 14, 18, 272);
const GOAL_LINE_R = rectSpot('goallineR', 628, 22, 12, 256);
const DOT_TR = circle('dotTR', 568, 78, 16);
const DOT_BR = circle('dotBR', 568, 222, 16);
const DOT_TL = circle('dotTL', 112, 78, 16);
const SLOT = circle('slot', 560, 150, 24);
const POINT_T = circle('pointT', 445, 55, 16);
const HALFWALL = circle('halfwall', 540, 28, 14);
const NEUTRAL = rectSpot('neutral', 270, 16, 140, 268);

export const NHL_ZONE_SCENARIOS: ZoneScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'nhl-kid-1', level: 'kid',
    prompt: 'Your team shoots at the RIGHT net. Tap it!',
    spots: [NET_R, NET_L, CENTER], answer: 'netR',
    marks: [att(450, 152), ball(462, 148), att(500, 92), def(639, 150), att(41, 150)],
    title: 'Score in the net you attack',
    exp: {
      kid: 'Each team defends one net and attacks the other. Yours to score in is on the right — the goalie standing in it is NOT on your team!',
      beginner: 'Teams switch ends after each period, so your attacking net changes twice (and again in overtime).',
      intermediate: 'The whole puck must cross the goal line between the posts to count — reviewed by camera when it’s close.',
      expert: 'End-switching isn’t just fairness: the "long change" in the 2nd period (bench far from your defensive zone) is a real tactical factor — tired players get stranded, and more goals happen.',
    },
  },
  {
    id: 'nhl-kid-2', level: 'kid',
    prompt: 'Tap CENTER ICE — where every game begins.',
    spots: [CENTER, NET_R, DOT_TL, BLUE_R], answer: 'center',
    marks: [att(326, 150), def(354, 150), att(300, 90), def(380, 210)],
    title: 'The opening faceoff',
    exp: {
      kid: 'The referee drops the puck in the exact middle circle, and one player from each team fights for it. Game on!',
      beginner: 'Center-ice faceoffs start each period and follow every goal. Only the two centers may stand in the circle for the drop.',
      intermediate: 'Faceoffs are a real skill — wins mean instant possession, and teams track the percentage like a batting average.',
      expert: 'Where a faceoff happens sets tactics: there are 9 spots on the rink, and defensive-zone draws trigger set plays as scripted as football snaps.',
    },
  },
  {
    id: 'nhl-kid-3', level: 'kid',
    prompt: 'Tap the goalie’s CREASE — the blue paint in front of the net.',
    spots: [CREASE_R, DOT_BR, CENTER, BLUE_R], answer: 'creaseR',
    marks: [att(552, 162), ball(564, 156), def(634, 150)],
    title: 'The crease: the goalie’s house',
    exp: {
      kid: 'The blue paint in FRONT of the net is the goalie’s special area. Crashing into the goalie there is not allowed!',
      beginner: 'The crease marks the goalie’s workspace — goals can be waved off if an attacker interferes with the goalie inside it.',
      intermediate: 'Attackers CAN skate through, but impairing the goalie’s ability to make a save (in or out of the crease) is goaltender interference.',
      expert: 'The interference standard is judged, not measured: contact initiated by the attacker vs. incidental contact when the goalie plays outside his paint. It’s the most-reviewed judgment call in the sport.',
    },
  },
  {
    id: 'nhl-kid-4', level: 'kid',
    prompt: 'Tap a BLUE line.',
    spots: [BLUE_R, RED_LINE, GOAL_LINE_R, CENTER], answer: 'blueR',
    title: 'Blue lines divide the rink into three zones',
    exp: {
      kid: 'The two blue lines split the ice into three parts: your end, the middle, and the other team’s end.',
      beginner: 'Defensive zone, neutral zone, offensive zone — the blue lines are the borders, and they’re the lines that decide offside.',
      intermediate: 'The puck must enter the offensive zone BEFORE your teammates — cross early and the linesman calls offside.',
      expert: 'The blue line is also "the point" on offense: defensemen patrol it to keep pucks alive in the zone. A puck out over the blue line means everyone must clear and re-enter — zone time dies at this line.',
    },
  },
  {
    id: 'nhl-kid-5', level: 'kid',
    prompt: 'Tap a FACEOFF dot in the end zone.',
    spots: [DOT_TR, CENTER, NET_R, POINT_T], answer: 'dotTR',
    title: 'The red dots: where play restarts',
    exp: {
      kid: 'See the red dots and circles painted on the ice? After a whistle, the puck gets dropped on one of them.',
      beginner: 'There are dots in each end zone plus neutral-ice spots — the rules pick which dot based on why play stopped.',
      intermediate: 'Icing pulls the faceoff all the way back to the offending team’s end — that territorial punishment is most of why icing matters.',
      expert: 'Faceoff location is leverage: offensive-zone draws let you deploy your scorers and win set plays; that’s why teams fight so hard to avoid icings and why line changes are planned around where the next draw is.',
    },
  },
  {
    id: 'nhl-kid-6', level: 'kid',
    prompt: 'Tap the NEUTRAL zone — the middle ice between the blue lines.',
    spots: [NEUTRAL, rectSpot('rzone', 440, 16, 180, 268), rectSpot('lzone', 60, 16, 180, 268)], answer: 'neutral',
    title: 'The neutral zone',
    exp: {
      kid: 'The strip of ice in the middle belongs to nobody — teams race through it to attack.',
      beginner: 'It’s the transition area: breakouts leave your zone, cross the neutral zone, and become attacks at the far blue line.',
      intermediate: 'Defenses set "traps" here — clogging the neutral zone forces dump-ins instead of clean entries.',
      expert: 'Analytics made the neutral zone famous: controlled entries (carry/pass) generate far more shots than dump-and-chase, so the battle for this strip quietly decides possession games.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'nhl-beg-1', level: 'beginner',
    prompt: 'You attack the RIGHT net. Tap the line the PUCK must cross before your teammates — or it’s offside.',
    spots: [BLUE_R, BLUE_L, RED_LINE, GOAL_LINE_R], answer: 'blueR',
    marks: [att(360, 210), ball(372, 206), att(398, 96), def(470, 150)],
    title: 'Offside lives at the attacking blue line',
    exp: {
      kid: 'The puck has to cross the blue line into the attacking end FIRST. If a teammate skates in before the puck — offside, whistle!',
      beginner: 'The rule stops goal-hanging: no camping in the offensive zone waiting for a pass. The puck leads, players follow.',
      intermediate: 'Skate position decides it: a player is offside when BOTH skates are fully over the blue line before the puck. One skate on the line keeps you onside.',
      expert: 'Delayed offside adds the wrinkle: linesman raises an arm, attackers can "tag up" at the blue line to erase it. Zone entries are designed around exactly this line — it’s hockey’s most tactical stripe.',
    },
  },
  {
    id: 'nhl-beg-2', level: 'beginner',
    prompt: 'Tap the SLOT — where the best scoring chances happen.',
    spots: [SLOT, POINT_T, DOT_TR, CENTER], answer: 'slot',
    marks: [def(634, 150), def(585, 196), att(505, 92)],
    title: 'The slot: between the circles, in front of the net',
    exp: {
      kid: 'The open ice right in front of the goalie is called the slot — shots from there go in the most!',
      beginner: 'Between the two faceoff circles, from the crease out — close range, straight angle. Defenses protect it above everything.',
      intermediate: 'Coaches split it further: the "low slot" (deadliest) and "high slot" for one-timers. Most goals come from this area, every season, every league.',
      expert: 'Expected-goals models are basically slot-detectors: shot distance and angle dominate the math. "Get to the middle" isn’t a cliché — it’s the entire xG gradient painted on the ice.',
    },
  },
  {
    id: 'nhl-beg-3', level: 'beginner',
    prompt: 'Tap "the POINT" — where a defenseman keeps the puck in the zone.',
    spots: [POINT_T, SLOT, CREASE_R, DOT_BR], answer: 'pointT',
    marks: [att(545, 238), ball(556, 244), def(634, 150), def(520, 190)],
    title: 'The point: just inside the blue line',
    exp: {
      kid: 'The defensemen stand way up by the blue line when their team attacks — that spot is called "the point."',
      beginner: 'From the point they keep pucks IN the zone (stop clears at the line) and shoot through traffic for tips and rebounds.',
      intermediate: 'Point shots are rarely goals themselves — they’re chaos generators: deflections, rebounds, and screens in front do the scoring.',
      expert: 'The point is also the risk position: a puck through a pinching defenseman becomes an odd-man rush the other way. "Pinch or peel" reads at this spot decide games.',
    },
  },
  {
    id: 'nhl-beg-4', level: 'beginner',
    prompt: 'Tap the GOAL line — the line the puck must FULLY cross for a goal.',
    spots: [GOAL_LINE_R, BLUE_R, RED_LINE, CENTER], answer: 'goallineR',
    title: 'The red goal line',
    exp: {
      kid: 'The thin red line across the ice at the net — the WHOLE puck must get over it, inside the posts, to count as a goal.',
      beginner: 'Not halfway, not mostly — 100% of the puck over 100% of the line. Overhead cameras exist for exactly this call.',
      intermediate: 'The goal line matters beyond goals: icing is judged by the puck crossing this line, and pucks behind it are "below the goal line" — a distinct tactical area.',
      expert: 'That "below the goal line" real estate is a modern offensive base — attacks run from behind the net because defenders can’t face the puck and the slot at once (the Gretzky office principle).',
    },
  },
  {
    id: 'nhl-beg-5', level: 'beginner',
    prompt: 'ICING check: the puck must be shot from BEHIND one line to be icing. Tap that line.',
    spots: [RED_LINE, BLUE_R, GOAL_LINE_R, DOT_TL], answer: 'redline',
    marks: [att(150, 220), ball(163, 214)],
    title: 'Icing: shot from your side of the center red line',
    exp: {
      kid: 'If you shoot the puck from your OWN half all the way past the other team’s goal line, that’s icing — play comes ALL the way back.',
      beginner: 'Icing = puck shot from behind the center red line, crossing the far goal line untouched. Faceoff returns to your end — no free clears.',
      intermediate: 'Exceptions matter: no icing while shorthanded (penalty killers may clear), and none if the puck could have been played, or was shot from ON/past the red line.',
      expert: 'The team that iced can’t change lines — that trapped-tired-line rule is the real punishment. Hybrid icing (race judged at the dots) exists purely to prevent the old crash-into-the-boards races.',
    },
  },
  {
    id: 'nhl-beg-6', level: 'beginner',
    prompt: 'Tap "Gretzky’s office" — the famous spot BEHIND the net.',
    spots: [circle('behind', 660, 150, 11), SLOT, POINT_T, DOT_TR], answer: 'behind',
    marks: [def(630, 150), att(560, 118), att(578, 190), def(600, 130)],
    title: 'Behind the net: the office',
    exp: {
      kid: 'The skinny ice BEHIND the goal is a sneaky place to hold the puck — the goalie can’t even see you back there!',
      beginner: 'From behind the net you can pass to players in front while defenders turn their backs to the danger zone. Wayne Gretzky ran offense from there so often it’s called his "office."',
      intermediate: 'The geometry is the trick: a defender can watch YOU or the slot, not both. Wraparounds, jam plays, and royal-road feeds all launch from here.',
      expert: 'Modern systems formalize it: below-goal-line possession is a stated offensive structure ("cycle to the net-line"), and defending it forces a coverage decision — man-chase behind or zone the front. Neither is safe.',
    },
  },

  // ── intermediate ──────────────────────────────────────────────────────────
  {
    id: 'nhl-int-1', level: 'intermediate',
    prompt: 'Power play, umbrella setup. Tap where the PP quarterback runs things from.',
    spots: [circle('ppqb', 445, 150, 16), SLOT, HALFWALL, CREASE_R], answer: 'ppqb',
    marks: [att(520, 52), att(520, 268), att(596, 166), def(636, 150), def(500, 120), def(500, 180)],
    title: 'Top of the zone: the PP quarterback',
    exp: {
      kid: 'On a power play, one player stands up top in the middle, controlling the puck and choosing the play — like a quarterback.',
      beginner: 'With one extra skater, the point man at the top can walk the line, shoot, or feed either side — the whole ice is in front of him.',
      intermediate: 'The umbrella/1-3-1 puts your best passer up top: half-wall, bumper, and back-door options all radiate from this spot.',
      expert: 'PK reads start with him too: pressure the top and the seams open low; sag off and he walks in for the shot. Elite PP units win by making the top man’s FIRST option unreadable.',
    },
  },
  {
    id: 'nhl-int-2', level: 'intermediate',
    prompt: 'Tap the HALF-WALL — the power play’s playmaking hub on the boards.',
    spots: [HALFWALL, CREASE_R, CENTER, DOT_BR], answer: 'halfwall',
    marks: [att(445, 150), ball(457, 146), att(548, 150), def(628, 150), def(505, 105)],
    title: 'The half-wall: halfway up the boards',
    exp: {
      kid: 'The spot along the side boards, halfway between the corner and the blue line, is where a clever passer likes to stand.',
      beginner: 'On the power play the "flank" player sets up here: he can shoot, feed the slot, or cycle low — three threats from one spot.',
      intermediate: 'The 1-3-1 lives through the half-walls: one-timers across the "royal road," bumper touches, and low give-and-gos all start on this wall.',
      expert: 'Handedness defines the flank: an off-hand shooter (righty on the left wall) catches passes already loaded for a one-timer. That single detail dictates most PP personnel maps.',
    },
  },
  {
    id: 'nhl-int-3', level: 'intermediate',
    prompt: 'You defend the LEFT net. Tap the dot where a DEFENSIVE-zone faceoff happens (top side).',
    spots: [DOT_TL, DOT_TR, CENTER, DOT_BR], answer: 'dotTL',
    marks: [att(41, 150), def(150, 120)],
    title: 'D-zone draw: the dots in YOUR end',
    exp: {
      kid: 'When the whistle blows near your own net, the puck gets dropped on the dot in YOUR end — dangerous territory!',
      beginner: 'Defensive-zone faceoffs are high-stakes: lose the draw and the other team gets an instant shot from the slot.',
      intermediate: 'Teams send out their best faceoff center and defensive unit for these — and the winger alignments are scripted set plays.',
      expert: 'After an icing you’re stuck: no line change, tired five, d-zone dot. Stringing icings against a gassed unit is a real offensive strategy — the dot location IS the pressure.',
    },
  },
  {
    id: 'nhl-int-4', level: 'intermediate',
    prompt: 'Tap the TRAPEZOID behind the net — the only area back there where the goalie may play the puck.',
    spots: [rectSpot('trap', 648, 168, 20, 26), SLOT, POINT_T, CENTER], answer: 'trap',
    marks: [def(630, 150), ball(640, 242)],
    title: 'The trapezoid: the goalie’s legal puck-playing zone',
    exp: {
      kid: 'Those slanted lines behind the net make a special zone — the goalie may only play the puck back there INSIDE it.',
      beginner: 'A goalie who plays the puck behind the goal line OUTSIDE the trapezoid takes a penalty. In front of the goal line he’s free to roam.',
      intermediate: 'It exists to protect dump-and-chase offense: great puck-handling goalies were killing forechecks by clearing everything. The trapezoid gives forecheckers a chance.',
      expert: 'It’s nicknamed the "Brodeur rule" after the goalie whose puckhandling inspired it. Note the exact geometry: behind the goal line only — a goalie may play pucks at the blue line all day if he dares skate there.',
    },
  },
  {
    id: 'nhl-int-5', level: 'intermediate',
    prompt: 'Puck on the BOTTOM half-wall. Tap the "BACK DOOR" the defense must not forget.',
    spots: [circle('backdoor', 618, 124, 13), SLOT, DOT_BR, POINT_T], answer: 'backdoor',
    marks: [att(540, 270), ball(552, 264), def(628, 162), def(566, 182)],
    title: 'Back door: the far side of the crease',
    exp: {
      kid: 'While everyone watches the puck on one side, a sneaky attacker tiptoes to the FAR side of the net for a tap-in!',
      beginner: 'The "back door" is the far post area, away from the puck. One cross-ice pass and it’s an open net — goalies can’t slide that fast.',
      intermediate: 'Cross-slot passes ("royal road" feeds) force the goalie to move laterally through his crease — the hardest save in hockey. Defenses assign a man to the back post for exactly this.',
      expert: 'PK structure sacrifices the perimeter to deny this seam: the weak-side defender "boxes" to the far post, stick in the passing lane. Every odd-man rush drill is really a back-door denial drill.',
    },
  },
  {
    id: 'nhl-int-6', level: 'intermediate',
    prompt: 'Breakout time (you defend the LEFT net). Tap where the WINGER posts up for the outlet pass.',
    spots: [circle('breakout', 105, 28, 14), SLOT, CENTER, POINT_T], answer: 'breakout',
    marks: [att(32, 185), ball(24, 178), att(41, 150), att(150, 150), def(120, 215)],
    title: 'Wingers to the walls for the breakout',
    exp: {
      kid: 'To escape your own end, a teammate waits along the boards, ready to catch a pass and zoom up the ice.',
      beginner: 'Standard breakout: defenseman gets the puck behind the net, wingers post on the half-walls, center swings low for support.',
      intermediate: 'The wall is a shield: with the boards at your back the winger can chip pucks out even under pressure. "Wheel," "rim," and "over" are all breakout calls to these spots.',
      expert: 'Forechecks (1-2-2, 2-1-2) are built to jump exactly this wall pass — so modern breakouts fake the wall and hit the center in the middle ("middle drive") instead. The wall winger is bait as often as target.',
    },
  },

  // ── expert ────────────────────────────────────────────────────────────────
  {
    id: 'nhl-exp-1', level: 'expert',
    prompt: '1-3-1 power play: tap the BUMPER position.',
    spots: [circle('bumper', 548, 150, 15), POINT_T, HALFWALL, CREASE_R], answer: 'bumper',
    marks: [att(445, 150), att(520, 52), ball(531, 60), att(520, 268), att(596, 166), def(634, 150), def(505, 112), def(505, 188)],
    title: 'The bumper: middle of the 1-3-1',
    exp: {
      kid: 'One power-play player stands right in the MIDDLE of everything, between the circles — quick touches, quick shots.',
      beginner: 'The "bumper" plays the middle soft spot of the penalty kill’s box — one-touch shots and relays through the seam.',
      intermediate: 'He does the invisible work: occupies the PK’s center, opens half-wall-to-half-wall seams, and cleans up rebounds from the slot.',
      expert: 'The bumper is the PK’s dilemma: cover him and the royal-road one-timers open; ignore him and it’s tap-ins. Deployment detail: usually your smartest hands, not your hardest shot.',
    },
  },
  {
    id: 'nhl-exp-2', level: 'expert',
    prompt: 'Beating the trap: tap where the STRETCH forward camps for the long pass.',
    spots: [circle('stretch', 405, 75, 16), CENTER, DOT_TL, SLOT], answer: 'stretch',
    marks: [att(120, 200), ball(132, 196), def(310, 150), def(310, 210), def(280, 100)],
    title: 'The stretch man: at the far blue line',
    exp: {
      kid: 'One fast player sneaks all the way up near the far blue line, waiting for a looong pass to race in alone.',
      beginner: 'A "stretch pass" skips the clogged middle: from your zone straight to a forward waiting at the offensive blue line.',
      intermediate: 'He must stay ONSIDE, so he surfs the line — the pass has to arrive as the puck crosses, or be tipped in. Timing beats the trap; the line polices the timing.',
      expert: 'Two rules shape this play: the blue line (offside) and center red (two-line passes are LEGAL in today’s NHL — that 2005 change created the stretch game). Defenses answer with a high F3 and tight gaps.',
    },
  },
  {
    id: 'nhl-exp-3', level: 'expert',
    prompt: 'Tap the "ROYAL ROAD" — the invisible line passes must cross to break a goalie.',
    spots: [rectSpot('royal', 455, 140, 165, 20), POINT_T, HALFWALL, BLUE_R], answer: 'royal',
    marks: [def(632, 150), att(528, 48), ball(539, 56), att(528, 252)],
    title: 'The royal road: net-to-net through the slot',
    exp: {
      kid: 'Imagine a line drawn through the middle of the ice straight at the net. Passes that cross it make the goalie scramble sideways!',
      beginner: 'A goalie set on one side must push ACROSS for passes over that middle line — shots right after are the hardest saves in hockey.',
      intermediate: 'Tracking data popularized it: shots after a royal-road pass score several times more often than static ones. Defenses defend the LINE, not just the man.',
      expert: 'It reframes defense: a "good stick" in the royal-road lane beats a big body beside it. PP design (flank one-timers), rush attacks (middle-lane drive), and goalie post-integration all orbit this concept.',
    },
  },
  {
    id: 'nhl-exp-4', level: 'expert',
    prompt: 'Hybrid icing: the linesman judges a RACE. Tap where that race is judged.',
    spots: [DOT_TR, GOAL_LINE_R, NET_R, BLUE_R], answer: 'dotTR',
    marks: [ball(655, 262), def(495, 170), att(505, 188), def(639, 150)],
    title: 'The race is to the faceoff dots — not the puck',
    exp: {
      kid: 'On a long icing chase, the referee watches which player reaches the red DOT first — not who touches the puck!',
      beginner: 'Hybrid icing: if the defender leads the race at the end-zone dots, icing is blown dead immediately. No more full-speed crashes into the end boards.',
      intermediate: 'The attacker can still beat the call by winning to the dots — icing is "negated by the race," keeping the chase play alive without the danger.',
      expert: 'Judged details: it’s the defender’s position at the dots’ imaginary line, ties go to the defense (icing called), and the linesman may wave it off earlier if the puck will die. Safety rule, but it changed dump-in geometry league-wide.',
    },
  },
  {
    id: 'nhl-exp-5', level: 'expert',
    prompt: 'You defend the LEFT net. Tap where your defenseman "boxes out" at the NET-FRONT.',
    spots: [circle('netfront', 85, 150, 15), SLOT, POINT_T, circle('cornerL', 60, 262, 14)], answer: 'netfront',
    marks: [att(41, 150), def(95, 142), def(200, 62), ball(212, 68), att(70, 250)],
    title: 'Net-front defense: body between man and net',
    exp: {
      kid: 'The defender plants himself right in front of his own net and uses his body to keep attackers away from the goalie.',
      beginner: 'Net-front battles decide tips, screens, and rebounds. The defender "boxes out" — inside position, stick on the attacker’s stick.',
      intermediate: 'Modern point-shot offense is a net-front play: the shot is just a delivery; the goal is scored (or prevented) in this two-foot battle.',
      expert: 'Technique detail: defenders now front the shot lane OR box behind depending on the screen type — and the stick-lift at the moment of the shot, not the cross-check, is what kills tips without penalties.',
    },
  },
  {
    id: 'nhl-exp-6', level: 'expert',
    prompt: 'Puck on the TOP boards in the offensive zone. Tap the WEAK SIDE the defense will leave thin.',
    spots: [rectSpot('weakside', 450, 195, 190, 88), rectSpot('strongside', 450, 20, 190, 80), NEUTRAL], answer: 'weakside',
    marks: [att(540, 32), ball(552, 38), def(520, 72), def(560, 92), def(632, 150)],
    title: 'Strong side / weak side: the puck defines them',
    exp: {
      kid: 'Defenders crowd the side where the puck is — so the OTHER side of the ice is where the open space hides.',
      beginner: 'The puck’s side is the "strong side"; the far side is "weak." Defenses overload strong; offenses attack weak with switches and cross-ice passes.',
      intermediate: 'Zone defense collapses toward the puck by design — the bet is that cross-ice passes are hard. Every overload play and weak-side "sneak" attacks that bet.',
      expert: 'The tension is the royal road again: helping strong-side harder means longer weak-side recoveries through the dangerous lane. Elite defensive wingers are judged almost entirely on weak-side awareness.',
    },
  },
];
