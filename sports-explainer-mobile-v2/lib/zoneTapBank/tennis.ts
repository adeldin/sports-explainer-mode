// Zone Tap — Tennis bank. Court zones/tactics only (rule-based, evergreen). Pure data,
// zero RN imports. Coordinates: TennisCourt viewBox 680×340 — court x=67..613,
// y=44..296; net x=340; singles sidelines y=76/264; service lines x=193/487; center
// service line y=170. Perspective: the server/you play from the LEFT unless stated.
// Facing-right geometry: the left player's DEUCE side is the BOTTOM half, so his deuce
// serve lands in the TOP-RIGHT box (diagonal); his AD serve lands in the BOTTOM-RIGHT box.
import { ZoneScenario, circle, rectSpot, ball, att, def } from '../zoneTapRegions';

// Context marks (owner feedback pass): 'att' = the player the prompt frames as "you"
// (or the server), 'def' = the opponent. The spot the prompt asks the user to LOCATE
// is never drawn; the ball appears only where the prompt references it (a drop shot,
// a rally ball at a racquet) — never on a serve-target question, where the ball's
// landing IS the answer.

const NET = rectSpot('net', 332, 44, 16, 252);
const BOX_TR = rectSpot('boxTR', 344, 78, 141, 90);   // right side, top box (receiver's deuce court)
const BOX_BR = rectSpot('boxBR', 344, 172, 141, 90);  // right side, bottom box (receiver's ad court)
const BASELINE_R = rectSpot('baselineR', 607, 68, 12, 204);
const SVC_LINE_R = rectSpot('svclineR', 482, 80, 10, 180);
const ALLEY_TOP = rectSpot('alley', 90, 46, 500, 27);
const NOMANS = rectSpot('nomans', 495, 85, 105, 170);
const CENTER_MARK = circle('centermark', 609, 170, 11);
const T_RIGHT = circle('tee', 487, 170, 13);
const WIDE_DEUCE = circle('widedeuce', 465, 88, 13);
const BODY_AD = circle('bodyad', 415, 216, 14);
const SERVE_STANCE = circle('servestance', 636, 148, 15);
const VOLLEY_POS = circle('volleypos', 400, 150, 16);

export const TENNIS_ZONE_SCENARIOS: ZoneScenario[] = [
  // ── kid ────────────────────────────────────────────────────────────────────
  {
    id: 'ten-kid-1', level: 'kid',
    prompt: 'Tap the NET.',
    spots: [NET, BASELINE_R, ALLEY_TOP], answer: 'net',
    marks: [att(48, 170), def(634, 152)],
    title: 'The net: the wall in the middle',
    exp: {
      kid: 'The ball must fly OVER the net on every shot. Hit it into the net and the point is over — for the other player!',
      beginner: 'The net is lower in the middle than at the posts — which is why so many shots aim through the middle.',
      intermediate: 'Touch rules: you may never touch the net while the ball is in play, and the ball may clip the net and drop over (a "let" only on serves).',
      expert: 'Net-cord dynamics are strategic: heavy topspin clears by feet; flat drives skim it. The 6-inch height difference between center and sideline quietly shapes every down-the-line versus crosscourt decision.',
    },
  },
  {
    id: 'ten-kid-2', level: 'kid',
    prompt: 'Tap the BASELINE — players serve from behind it.',
    spots: [BASELINE_R, NET, SVC_LINE_R, ALLEY_TOP], answer: 'baselineR',
    marks: [def(636, 150), att(50, 190)],
    title: 'The baseline: the back boundary',
    exp: {
      kid: 'The line at the very back of the court — most of tennis happens near it, and serves must start behind it.',
      beginner: 'Balls landing ON the baseline are IN — the line counts. Beyond it is out.',
      intermediate: 'Baseline positioning is the rally’s thermostat: inside it you attack early; behind it you defend with more time.',
      expert: 'Court positioning stats (average contact point relative to the baseline) separate styles more cleanly than any shot stat: aggressive returners camp inside it, grinders play from metres behind.',
    },
  },
  {
    id: 'ten-kid-3', level: 'kid',
    prompt: 'Tap a SERVICE BOX — where a serve must land.',
    spots: [BOX_TR, NOMANS, NET, ALLEY_TOP], answer: 'boxTR',
    marks: [att(50, 240), ball(300, 140), def(640, 100)],
    title: 'Serves must land in the small box',
    exp: {
      kid: 'A serve only counts if it bounces inside the small box near the net on the other side — miss it twice and you lose the point!',
      beginner: 'Each side has two service boxes (net to service line, split by the center line). The serve must land in the correct one, diagonally across.',
      intermediate: 'Miss the box once = fault; twice = double fault, point over. Lines count as in — a serve clipping the box’s line is good.',
      expert: 'The box is why serving is a percentage game: first serves trade accuracy for speed (aim closer to lines), second serves add spin to arc safely into the same target. Serve strategy is really box-geometry management.',
    },
  },
  {
    id: 'ten-kid-4', level: 'kid',
    prompt: 'Tap the DOUBLES ALLEY — the lane used only in doubles.',
    spots: [ALLEY_TOP, BOX_TR, NET, NOMANS], answer: 'alley',
    marks: [att(48, 230), att(280, 105), def(640, 120), def(400, 245)],
    title: 'The alley: extra court for doubles',
    exp: {
      kid: 'The skinny lane along the side is a bonus strip — it counts in doubles (four players) but is OUT in singles!',
      beginner: 'Singles uses the inner sideline; doubles the outer one. Same court, two widths — the alley is the difference.',
      intermediate: 'The extra width changes doubles geometry entirely: angles that would be out in singles are winners, and net players guard the alley against exactly those.',
      expert: '"Protecting your alley" is doubles positioning 101 — but overprotecting it opens the middle, where most doubles points are actually won ("down the middle solves the riddle").',
    },
  },
  {
    id: 'ten-kid-5', level: 'kid',
    prompt: 'Tap where a player stands to SERVE.',
    spots: [SERVE_STANCE, VOLLEY_POS, BOX_TR, T_RIGHT], answer: 'servestance',
    marks: [def(55, 250)],
    title: 'Behind the baseline, next to the center mark',
    exp: {
      kid: 'The server stands BEHIND the back line, near the little middle notch — never inside the court until after the hit!',
      beginner: 'Serving rules: both feet behind the baseline until contact, standing between the center mark and the sideline, serving diagonally.',
      intermediate: 'Stepping on the line before contact is a foot fault — a real fault, same as missing the box.',
      expert: 'Serve stance position is tactical: close to the center mark serves open both targets equally (and covers the middle after); wide stances telegraph angles but create new ones. Watch a pro shift along the baseline by score.',
    },
  },
  {
    id: 'ten-kid-6', level: 'kid',
    prompt: 'Tap the CENTER MARK on the baseline.',
    spots: [CENTER_MARK, T_RIGHT, NET, circle('cornerbase', 605, 280, 12)], answer: 'centermark',
    title: 'The little notch in the middle of the baseline',
    exp: {
      kid: 'That tiny tick mark shows the middle of the court — servers use it to know which side to stand on.',
      beginner: 'On deuce points you serve from the right of the mark; on ad points from the left. It’s the serve’s traffic divider.',
      intermediate: 'Between shots, players "recover" toward the center mark area — it’s the home base that keeps both corners reachable.',
      expert: 'Strictly, ideal recovery is the ANGLE bisector of the opponent’s possible replies — usually near the mark, but shifted toward the side you just hit to. The mark is the landmark; the bisector is the truth.',
    },
  },

  // ── beginner ──────────────────────────────────────────────────────────────
  {
    id: 'ten-beg-1', level: 'beginner',
    prompt: 'DEUCE point: the server (left side) must hit the receiver’s deuce court. Tap the target box.',
    spots: [BOX_TR, BOX_BR, NOMANS], answer: 'boxTR',
    marks: [att(52, 238), def(648, 96)],
    title: 'Serves travel diagonally — deuce court to deuce court',
    exp: {
      kid: 'Serves always fly diagonally, corner to corner! The server stands on his right, and the ball must land in the box diagonally across.',
      beginner: 'Both players’ "deuce court" is the right half from their own view. The serve goes from the server’s deuce side into the receiver’s deuce box — always the diagonal.',
      intermediate: 'Points alternate sides: first point deuce, second ad, and so on. The diagonal rule means the whole point starts crosscourt — which is why crosscourt rallies are the natural pattern.',
      expert: 'The diagonal serve creates the geometry of tennis: wide serves open crosscourt angles, T serves close them. Every serve-plus-one pattern is a consequence of this single rule.',
    },
  },
  {
    id: 'ten-beg-2', level: 'beginner',
    prompt: 'Tap "down the T" — the ace target at the middle of the service line.',
    spots: [T_RIGHT, WIDE_DEUCE, NET, BASELINE_R], answer: 'tee',
    marks: [att(52, 196), def(650, 110)],
    title: 'The T: where the center line meets the service line',
    exp: {
      kid: 'The two lines make a letter T in the middle. A serve fired right at the T is super hard to reach!',
      beginner: 'The T serve travels the shortest distance and gives the returner almost no angle to reply with — the classic ace spot.',
      intermediate: 'T versus wide is the server’s eternal coin flip: T takes away angles, wide creates them (but opens the court for the return). Mixing them is the whole game.',
      expert: 'Serving to the T also shrinks the server’s own recovery problem: the return must come back through the middle, so the server’s next ball is predictable — T serves are as much about the +1 as the ace.',
    },
  },
  {
    id: 'ten-beg-3', level: 'beginner',
    prompt: 'Deuce-court serve: tap the WIDE target that drags the returner off the court.',
    spots: [WIDE_DEUCE, T_RIGHT, BASELINE_R, NET], answer: 'widedeuce',
    marks: [att(52, 196), def(645, 105)],
    title: 'The wide serve: near the sideline edge of the box',
    exp: {
      kid: 'A serve aimed at the box’s outside corner pulls the other player way off the court — leaving the rest empty!',
      beginner: 'The wide serve wins two ways: an outright ace off the court, or a weak stretched return into a wide-open court.',
      intermediate: 'The cost: hitting wide OPENS your own court too — the returner’s down-the-line reply has a big target. Wide serves need a plan for the next shot.',
      expert: 'Slice serves make the wide target nastier (the ball keeps moving away after the bounce, especially deuce court for righties). Server handedness + spin + court side is a 3-variable matrix pros know cold.',
    },
  },
  {
    id: 'ten-beg-4', level: 'beginner',
    prompt: 'Tap "NO-MAN’S LAND" — the zone coaches tell you never to camp in.',
    spots: [NOMANS, BOX_TR, NET, ALLEY_TOP], answer: 'nomans',
    marks: [def(52, 170)],
    title: 'Between the service line and the baseline',
    exp: {
      kid: 'Standing in the middle zone is trouble: too far back to volley, too close to hit a normal bounce — the ball lands right at your feet!',
      beginner: 'In no-man’s land every ball arrives awkwardly — half-volleys off your shoes. Play the baseline OR come all the way to the net; don’t live in between.',
      intermediate: 'You PASS THROUGH it constantly (approaching the net, recovering) — the sin isn’t entering, it’s stopping there when the opponent has time to aim at your feet.',
      expert: 'Modern tennis complicates the dogma: aggressive players camp INSIDE the baseline edge of it to take time away, accepting half-volley skill as the price. "No-man’s land" is now a skill boundary, not a geographic one.',
    },
  },
  {
    id: 'ten-beg-5', level: 'beginner',
    prompt: 'Tap where a VOLLEYER stands at the net.',
    spots: [VOLLEY_POS, NOMANS, BASELINE_R, NET], answer: 'volleypos',
    marks: [def(52, 200), ball(66, 196)],
    title: 'Volley position: halfway between net and service line',
    exp: {
      kid: 'A net player stands a few steps back from the net itself — close enough to smash volleys, far enough to react and cover lobs.',
      beginner: 'Touching the net is illegal and hugging it invites the lob — so the base volley position is 2–3 steps back, splitting the difference.',
      intermediate: 'The volleyer moves diagonally with each shot: in and across toward the ball’s side. Each volley should let you step CLOSER; retreating at net means you’re losing the exchange.',
      expert: 'First volley usually happens deeper (near the service line, off the approach), then position tightens. The split-step timing — as the opponent starts their swing — matters more than the exact spot.',
    },
  },
  {
    id: 'ten-beg-6', level: 'beginner',
    prompt: 'You just served from the LEFT. Tap where you RECOVER to for the next shot.',
    spots: [circle('recover', 634, 172, 14), circle('cornercamp', 632, 274, 13), VOLLEY_POS, NOMANS], answer: 'recover',
    marks: [att(652, 276), def(48, 110), ball(200, 140)],
    title: 'Recover to the middle, behind the baseline',
    exp: {
      kid: 'After every shot, hustle back toward the middle — so no corner is too far away when the ball comes back!',
      beginner: 'Standing where you served leaves the other side open. The recovery habit — hit, then move to center — is what separates players who "run a lot" from players who are always in position.',
      intermediate: 'Recovery is to the middle of the POSSIBLE replies, not the geometric center — slightly toward the side you hit to, since sharper angles come back that way.',
      expert: 'Elite movement is measured between shots, not during them: recovery steps happen while the ball travels, ending in a split-step at the opponent’s contact. Watch feet between shots to see who’s actually winning the court-position war.',
    },
  },

  // ── intermediate ──────────────────────────────────────────────────────────
  {
    id: 'ten-int-1', level: 'intermediate',
    prompt: 'ADVANTAGE point: server (left) now serves from his AD side. Tap the box this serve must land in.',
    spots: [BOX_BR, BOX_TR, NOMANS], answer: 'boxBR',
    marks: [att(52, 150), def(648, 240)],
    title: 'Ad-court serves land in the other diagonal',
    exp: {
      kid: 'For this point the server moves to the other side of his little center mark — so the diagonal flips, and the serve lands in the OTHER box!',
      beginner: 'Odd points (and every ad point) are served from the left of the center mark into the receiver’s left box — the "ad court." The diagonal always holds.',
      intermediate: 'Ad court is where games end (any 40–30, 30–40 or advantage point) — so lefties’ slice swinging wide in the ad court is famously valuable: they own the game’s biggest points.',
      expert: 'Handedness asymmetry is a real edge: a lefty’s wide ad-court serve drags a righty’s backhand off the court on game point after game point. Entire careers (and doubles pairings) are built on which diagonal you dominate.',
    },
  },
  {
    id: 'ten-int-2', level: 'intermediate',
    prompt: 'DOUBLES: the server plays from the bottom-left. Tap where the server’s PARTNER stands.',
    spots: [circle('netpartner', 268, 108, 17), circle('backtogether', 268, 232, 17), NOMANS, ALLEY_TOP], answer: 'netpartner',
    marks: [att(48, 240), def(648, 100), def(420, 250)],
    title: 'Server’s partner: at the net, on the other half',
    exp: {
      kid: 'While one player serves from the back, the partner stands close to the net on the other side of their court, ready to pounce!',
      beginner: 'Classic doubles formation: one up (net), one back (server). The net partner intercepts weak returns before they become rallies.',
      intermediate: 'The net partner isn’t static: he shifts with each serve’s target and "poaches" across to pick off crosscourt returns — his movement pressures the returner as much as the serve does.',
      expert: 'Formations are signals-based now: I-formation (partner crouched at the middle) and Australian (same side as server) exist to scramble the returner’s crosscourt habit. Where the partner stands is a called play, not a habit.',
    },
  },
  {
    id: 'ten-int-3', level: 'intermediate',
    prompt: 'Tap the SHORT-ANGLE target — the shot that drags your opponent OFF the court sideways.',
    spots: [circle('shortangle', 368, 92, 14), circle('deepcorner', 592, 88, 14), CENTER_MARK, NET], answer: 'shortangle',
    marks: [att(630, 200), ball(616, 196), def(52, 170)],
    title: 'Short and wide: near the net, near the sideline',
    exp: {
      kid: 'A softly angled shot that lands short and wide makes your opponent sprint OFF the court sideways to reach it — then the whole court is empty!',
      beginner: 'Depth isn’t the only weapon: a short crosscourt angle pulls the opponent forward AND sideways, two directions at once.',
      intermediate: 'Short angles create angles: once the opponent is off the court, your next shot into the opposite corner travels behind or away from them. It’s a two-shot pattern.',
      expert: 'Heavy topspin unlocks this zone: the arc lets the ball dip inside the service box while still crossing safely. Players with extreme spin (clay-courters especially) use the short angle as a primary weapon, not a change-up.',
    },
  },
  {
    id: 'ten-int-4', level: 'intermediate',
    prompt: 'Your opponent is at the NET. Tap where your LOB should land.',
    spots: [circle('lobtarget', 578, 170, 17), BOX_TR, NET, ALLEY_TOP], answer: 'lobtarget',
    marks: [def(398, 155), att(60, 220), ball(74, 214)],
    title: 'Deep — near the baseline, over their head',
    exp: {
      kid: 'When the other player rushes the net, hit the ball high over their head so it lands way back near their baseline — they have to turn and chase!',
      beginner: 'A short lob gets smashed; a deep lob wins the point or forces a scrambling retreat. Depth is the whole difference.',
      intermediate: 'Aim over the BACKHAND shoulder: overhead smashes on the backhand side are the weakest shot in almost every player’s game.',
      expert: 'The topspin lob is the advanced version — dipping fast after clearing the racquet so it can’t be run down. Against modern net rushers who close tight, the lob threat is what keeps the volley position honest at all.',
    },
  },
  {
    id: 'ten-int-5', level: 'intermediate',
    prompt: 'Facing a HUGE first serve. Tap where returners stand to buy time.',
    spots: [circle('deepreturn', 658, 172, 14), NOMANS, VOLLEY_POS, BOX_TR], answer: 'deepreturn',
    marks: [att(52, 196), ball(300, 160)],
    title: 'Way behind the baseline',
    exp: {
      kid: 'Against a rocket serve, smart players back way up — the extra steps give the ball time to slow down and give you time to swing!',
      beginner: 'Standing deep trades court position for reaction time: the serve arrives slower and bounces up to a comfortable height.',
      intermediate: 'The cost: deep returns open the short angles and give the server extra time for the +1. Some returners instead step IN to take the serve early — opposite bet, same problem.',
      expert: 'Return depth is now a scouted, per-opponent choice: deep vs. big flat servers, up on the baseline vs. kick serves (before the ball climbs). Elite returners change position BETWEEN first and second serves every single point.',
    },
  },
  {
    id: 'ten-int-6', level: 'intermediate',
    prompt: 'SERVE-AND-VOLLEY: after serving, you sprint in. Tap where your SPLIT-STEP happens for the first volley.',
    spots: [circle('firstvolley', 470, 150, 15), NET, BASELINE_R, BOX_BR], answer: 'firstvolley',
    marks: [att(588, 178), def(52, 140), ball(66, 146)],
    title: 'First volley: around the service line',
    exp: {
      kid: 'A serve-and-volley player can’t reach the net in one sprint — the first stop is around the service line, hitting the volley there before moving closer.',
      beginner: 'The rhythm: serve, sprint, SPLIT-STEP as the returner swings, volley from the service-line area, then close tighter for the next one.',
      intermediate: 'The split-step timing beats the position: whatever ground you’ve covered, you must be balanced when the return is struck — a controlled first volley from deeper beats a lunging one from closer.',
      expert: 'Modern serve-and-volley is a change-up rather than a lifestyle — but the geometry is unchanged since the grass eras: serve wide → volley to the open court; serve T → volley behind the returner. The first volley’s target is decided before the serve is tossed.',
    },
  },

  // ── expert ────────────────────────────────────────────────────────────────
  {
    id: 'ten-exp-1', level: 'expert',
    prompt: 'BREAK POINT, serving to the ad court: the classic play is the BODY serve. Tap the target.',
    spots: [BODY_AD, circle('wideadex', 465, 250, 13), T_RIGHT, NET], answer: 'bodyad',
    marks: [att(50, 150), def(645, 235)],
    title: 'The body serve: right at the returner',
    exp: {
      kid: 'Instead of aiming at a corner, the serve flies straight AT the other player — it’s surprisingly hard to hit a ball coming right at you!',
      beginner: 'Corners can be reached with a stretch; a body serve jams the returner mid-torso — no room to swing, usually a weak blocked reply.',
      intermediate: 'On big points, body serves also remove the returner’s guess: leaning toward either corner is punished. The middle of the box is the "no-read" target.',
      expert: 'The pro detail: body serves aim at the returner’s HIP on the racket side (jamming the swing path) with slice tailing INTO them. On break points the stats are clear — body and T dominate, because pressure shrinks wide targets first.',
    },
  },
  {
    id: 'ten-exp-2', level: 'expert',
    prompt: 'The player on the RIGHT is right-handed. Tap where they camp to hit the INSIDE-OUT forehand.',
    spots: [circle('bhcorner', 638, 242, 16), circle('fhcorner', 638, 98, 16), NOMANS, VOLLEY_POS], answer: 'bhcorner',
    marks: [def(52, 180), ball(66, 176)],
    title: 'Run around the backhand — camp in the backhand corner',
    exp: {
      kid: 'The player sneaks around so a ball coming to their weaker side can be hit with their FAVORITE swing instead — sneaky footwork!',
      beginner: 'For a righty facing left, the backhand corner is the AD side. Standing there lets them hit forehands off balls aimed at their backhand — the "inside-out" forehand, crosscourt to the opponent’s backhand.',
      intermediate: 'The bet: a stronger shot from a worse position. The counter is the ball hit BEHIND them into the open forehand side they abandoned.',
      expert: 'This pattern organized a whole era of baseline tennis: control the ad-corner with the forehand, hammer inside-out until the short ball comes, then inside-IN for the winner. Court position, not shot choice, is the actual weapon.',
    },
  },
  {
    id: 'ten-exp-3', level: 'expert',
    prompt: 'DOUBLES: the net player POACHES. Tap where they cut to.',
    spots: [circle('poach', 308, 166, 14), circle('alleyguard', 150, 58, 14), rectSpot('baselineL', 61, 68, 12, 204), NOMANS], answer: 'poach',
    marks: [att(268, 108), att(48, 244), def(648, 102), def(420, 246), ball(460, 190)],
    title: 'The poach: across the middle, at the net',
    exp: {
      kid: 'The net player suddenly dashes ACROSS the middle to steal a crosscourt shot meant for their partner — an ambush!',
      beginner: 'Returns habitually go crosscourt (over the low net, away from the net player). Poaching crosses into that lane at the last second to volley it away.',
      intermediate: 'Timing is everything: break as the returner commits to the swing. Too early and they redirect down your vacated alley — that risk is the poach’s price.',
      expert: 'Poaching is a signaled system, not improvisation: fake vs. go called before the point, with the server covering the vacated half. The threat alone bends return targets toward errors — the best poachers win points on shots they never touch.',
    },
  },
  {
    id: 'ten-exp-4', level: 'expert',
    prompt: 'Your opponent drops it SHORT. Tap where you must sprint to.',
    spots: [circle('dropspot', 372, 196, 15), circle('staybase', 636, 200, 14), NOMANS, NET], answer: 'dropspot',
    marks: [att(642, 212), def(52, 190), ball(366, 188)],
    title: 'Chase the drop shot — get in before the second bounce',
    exp: {
      kid: 'A drop shot barely tips over the net and dies — you must SPRINT forward and reach it before it bounces twice!',
      beginner: 'The race is to the ball’s SECOND bounce. Arrive early and you have options; arrive late and a desperate scoop is all that’s left.',
      intermediate: 'Your reply depends on arrival time: early = counter-drop or angle; late = push deep and scramble back. The opponent follows drop shots forward to punish weak scoops.',
      expert: 'The drop shot is really a POSITION attack — it punishes deep return positions. That is why it surged as return positions moved back: the counter to standing 4 metres behind the baseline is making that spot indefensible.',
    },
  },
  {
    id: 'ten-exp-5', level: 'expert',
    prompt: 'SERVE +1: your wide deuce serve dragged the returner off the TOP side. Tap the classic +1 target.',
    spots: [circle('opencourt', 585, 246, 16), circle('behindem', 585, 96, 15), T_RIGHT, NET], answer: 'opencourt',
    marks: [def(640, 55), att(52, 196), ball(300, 150)],
    title: 'Into the open court — the opposite corner',
    exp: {
      kid: 'The serve pulled the other player way off one side — so the next shot goes to the far EMPTY corner. One-two punch!',
      beginner: '"Serve plus one": the serve creates the opening; the first groundstroke cashes it. Wide serve → open-court forehand is the oldest pattern in the book.',
      intermediate: 'The pattern is decided pre-serve: wide serve commits you to taking the return early and driving it opposite. Hesitate and the returner recovers — the +1 is a timing promise, not a reaction.',
      expert: 'The counter-read: elite returners recover so fast the open court is a trap — so servers go BEHIND them (same corner) against great movers, wrong-footing the recovery sprint. Open court vs. behind is scouted per opponent per surface.',
    },
  },
  {
    id: 'ten-exp-6', level: 'expert',
    prompt: 'You hit a sharp angle pulling your opponent wide TOP. Tap your correct RECOVERY spot (right side).',
    spots: [circle('bisector', 642, 138, 15), circle('deadcenter', 640, 268, 14), T_RIGHT, NET], answer: 'bisector',
    marks: [att(600, 90), def(60, 70), ball(170, 80)],
    title: 'Recover to the bisector — not the center',
    exp: {
      kid: 'You don’t always run back to the exact middle! Stand a bit toward the side the ball can most easily come back to.',
      beginner: 'From a wide position, your opponent’s crosscourt reply has more angle than the down-the-line one — so shade your recovery toward the sharper possibility.',
      intermediate: 'The rule: stand on the bisector of the opponent’s two best replies. Hit wide top → their sharpest angle comes back to your top side → recover shifted that way.',
      expert: 'This is the geometry underneath "good movement": recovery spots shift with every shot you hit, which is why pros look like they guess right constantly — they’re standing where the average reply must come. Wardrobe-sized difference from center-camping.',
    },
  },
];
