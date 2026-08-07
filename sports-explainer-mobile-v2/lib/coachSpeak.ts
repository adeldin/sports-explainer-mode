// Coach Speak — the NFL terminology bank behind the Coach's Corner glossary piece.
//
// WHAT THIS IS FOR: a broadcast says "they're in twelve personnel against big nickel" and a new fan
// hears noise. Every term here is real coach/booth shorthand paired with what it literally means and
// what it TELLS you — because the point of the phrase is never the phrase, it's the matchup it
// implies. That "so what" is the teaching; a dictionary definition alone would just be trivia.
//
// NOT a scenario module. There is no call to make and no wrong answer, so the visual-scenario
// authoring standard (whose load-bearing rule is "every wrong option must be punished by a named
// defender") does not apply — it explicitly scopes itself to binary-judgment, tap-the-read and
// multi-step pieces. This is the same class of piece as the soccer Formations browser.
//
// AUTHORING RULES for adding terms:
//  1. `heard` must be something a broadcast/coach ACTUALLY says, in that register. Not a paraphrase.
//  2. `means` is literal and checkable (counts, positions, alignment). No opinion.
//  3. `why` names the leverage — what the offense/defense gains, and what it gives up. Both halves,
//     always: a term that only has an upside teaches a bias, not a read.
//  4. Keep `why` to two or three sentences. This is a glossary, not the Coach's Read card.
//  5. Personnel/package terms carry `counts`, which renders the position breakdown chips. Omit it
//     for terms that aren't a grouping — an empty chip row reads as missing data.

export type CoachSpeakCategory =
  | 'personnel'
  | 'defense'
  | 'run'
  | 'pass'
  | 'situational'
  | 'sideline';

export interface PositionCount {
  label: string;   // position abbreviation as a coach says it (RB, TE, WR, DB…)
  n: number;
}

export interface CoachSpeakTerm {
  term: string;            // what's written on the call sheet
  aka?: string;            // the nickname the booth uses, when it differs
  category: CoachSpeakCategory;
  means: string;           // the literal, checkable definition
  why: string;             // the leverage — what it wins and what it concedes
  heard: string;           // how it actually sounds out loud
  counts?: PositionCount[]; // personnel/package groupings only
}

export const COACH_SPEAK_CATEGORIES: { key: CoachSpeakCategory; label: string; blurb: string }[] = [
  { key: 'personnel', label: 'Personnel', blurb: 'The two-digit code for who the offense has on the field.' },
  { key: 'defense', label: 'Defense', blurb: 'Packages, fronts and coverages — who the defense answers with.' },
  { key: 'run', label: 'Run game', blurb: 'Blocking schemes and the runs built on top of them.' },
  { key: 'pass', label: 'Pass game', blurb: 'Protections, route concepts and the reads inside them.' },
  { key: 'situational', label: 'Situational', blurb: 'Clock, downs and the math of when to do what.' },
  { key: 'sideline', label: 'Sideline slang', blurb: "Shorthand you'll hear yelled, not drawn up." },
];

// ── The bank ────────────────────────────────────────────────────────────────
// Personnel numbering is the one piece of code every fan should own: FIRST digit = running backs,
// SECOND digit = tight ends. Receivers are whatever is left over to reach five skill players. Every
// grouping below states all three so the rule is visible rather than asserted.
export const COACH_SPEAK: CoachSpeakTerm[] = [
  // ── Personnel groupings ──
  {
    term: '11 personnel',
    aka: 'Eleven',
    category: 'personnel',
    counts: [{ label: 'RB', n: 1 }, { label: 'TE', n: 1 }, { label: 'WR', n: 3 }],
    means: 'One running back, one tight end, three receivers. The most common grouping in modern football by a wide margin.',
    why: 'It threatens run and pass equally, which forces the defense to pick a side before the snap — most answer with nickel, putting a fifth defensive back on the field. The cost is that you are asking one tight end to hold up as a blocker if the defense guesses run and stays big.',
    heard: '"They\'re in eleven personnel, so you\'ll see nickel across from it."',
  },
  {
    term: '12 personnel',
    aka: 'Ace',
    category: 'personnel',
    counts: [{ label: 'RB', n: 1 }, { label: 'TE', n: 2 }, { label: 'WR', n: 2 }],
    means: 'One back, two tight ends, two receivers. The second tight end can attach to the line or flex out like a receiver.',
    why: "It's the great disguiser: the same group can run downhill with an extra blocker or split the second tight end wide and throw. If the defense stays in base to handle the run, you have a tight end on a linebacker; if they go nickel, you run at the lighter box.",
    heard: '"Twelve personnel here — watch whether that second tight end flexes out."',
  },
  {
    term: '13 personnel',
    aka: 'Heavy',
    category: 'personnel',
    counts: [{ label: 'RB', n: 1 }, { label: 'TE', n: 3 }, { label: 'WR', n: 1 }],
    means: 'One back, three tight ends, one receiver. A short-yardage and goal-line grouping.',
    why: 'Three tight ends means three extra bodies who can block, so the offense can create a surface the defense has to match with size. The trade is that the passing threat is obvious and limited — everyone in the stadium knows what is probably coming.',
    heard: '"Thirteen personnel on third-and-one. They\'re telling you what they think of your front."',
  },
  {
    term: '21 personnel',
    aka: 'Regular / Pro',
    category: 'personnel',
    counts: [{ label: 'RB', n: 2 }, { label: 'TE', n: 1 }, { label: 'WR', n: 2 }],
    means: 'Two backs — usually a fullback and a tailback — one tight end, two receivers.',
    why: 'The fullback is a lead blocker who arrives at the hole before the ball does, which is why this grouping still lives in short yardage and play-action. It concedes a receiver, so the defense can commit a safety to the box without being outnumbered outside.',
    heard: '"Twenty-one personnel, fullback in the game — this is a lead run look."',
  },
  {
    term: '10 personnel',
    aka: 'Empty-adjacent / Spread',
    category: 'personnel',
    counts: [{ label: 'RB', n: 1 }, { label: 'TE', n: 0 }, { label: 'WR', n: 4 }],
    means: 'One back, no tight end, four receivers.',
    why: 'Four receivers stretch the defense sideline to sideline and usually pull a sixth defensive back onto the field, which empties the box and makes the run cheap. What you give up is protection — no tight end means five blockers against whatever the defense sends.',
    heard: '"Ten personnel, four wide. They want you in dime so they can run it."',
  },

  // ── Defensive packages, fronts, coverages ──
  {
    term: 'Base defense',
    category: 'defense',
    counts: [{ label: 'DL', n: 4 }, { label: 'LB', n: 3 }, { label: 'DB', n: 4 }],
    means: 'The starting alignment — four defensive linemen, three linebackers, four defensive backs. Also runs as 3-4 with three linemen and four linebackers.',
    why: 'It is built to stop the run first and is heavy enough to do it. Against three or four receivers it is a liability, because a linebacker ends up matched on a slot receiver in space.',
    heard: '"They stayed in base against eleven personnel — that\'s a mismatch waiting to happen."',
  },
  {
    term: 'Nickel',
    category: 'defense',
    counts: [{ label: 'DL', n: 4 }, { label: 'LB', n: 2 }, { label: 'DB', n: 5 }],
    means: 'A fifth defensive back replaces a linebacker. The fifth DB is the "nickelback," usually over the slot.',
    why: 'It buys coverage speed against three receivers without gutting the run fit, which is why it is now the real base defense in the NFL. The cost is one fewer linebacker, so inside runs get a lighter box to attack.',
    heard: '"Nickel personnel — the nickel is walked down over the slot."',
  },
  {
    term: 'Big nickel',
    aka: 'Buffalo',
    category: 'defense',
    counts: [{ label: 'DL', n: 4 }, { label: 'LB', n: 2 }, { label: 'S', n: 3 }, { label: 'CB', n: 2 }],
    means: 'Nickel, but the fifth defensive back is a third SAFETY rather than a slot corner.',
    why: 'A safety is bigger than a corner, so this answers two tight ends without going back to base — you keep enough size to tackle in the run game while covering better than a linebacker would. It is a compromise: less coverage range than a true nickel corner, less thump than a linebacker.',
    heard: '"Big nickel here — that\'s the third safety, not a corner, matching the second tight end."',
  },
  {
    term: 'Dime',
    category: 'defense',
    counts: [{ label: 'DL', n: 4 }, { label: 'LB', n: 1 }, { label: 'DB', n: 6 }],
    means: 'Six defensive backs, usually just one linebacker left on the field.',
    why: 'It is a passing-down package: maximum coverage, maximum speed. Everyone knows it cannot hold up against a run, which is exactly why offenses check to a run when they see it.',
    heard: '"They\'re in dime on third-and-eight. If the offense checks to a draw here, it could go."',
  },
  {
    term: 'Two-high',
    aka: 'Two-shell',
    category: 'defense',
    means: 'Two safeties aligned deep before the snap, splitting the deep part of the field in half.',
    why: 'Two deep defenders take away the shot plays and make the offense earn it underneath. The price is the box: with both safeties deep, there are fewer bodies near the line, so the run is there if the offense will take it.',
    heard: '"Two-high shell — they\'re daring them to run it."',
  },
  {
    term: 'Single-high',
    category: 'defense',
    means: 'One safety in the deep middle, the other rotated down into the box or into coverage.',
    why: 'Rotating a safety down gives you an extra run defender and lets you play tight man underneath. The vulnerability is structural — one deep defender cannot cover the whole field, so a receiver who wins outside has grass behind him.',
    heard: '"Single-high safety. Somebody\'s got a one-on-one out there."',
  },
  {
    term: 'Cover 0',
    category: 'defense',
    means: 'Man coverage across the board with NO deep safety — everyone not rushing is locked on a man.',
    why: 'It is the most aggressive call there is: extra rushers get home fast because nobody is held back in help. If a receiver beats his man, there is nothing behind it — this is the call that produces both the sack and the 70-yard touchdown.',
    heard: '"Cover zero. They\'re bringing everybody — this is a footrace."',
  },
  {
    term: 'Robber',
    category: 'defense',
    means: 'A safety or linebacker drops into the intermediate middle to "rob" the crossing and dig routes the quarterback expects to be open.',
    why: 'It looks like man coverage until the throw, then a defender appears in a window the quarterback already committed to. That defender is not in the run fit, so it can be exposed by a run at the space he vacated.',
    heard: '"That\'s a robber technique — he read the quarterback\'s eyes the whole way."',
  },
  {
    term: 'Spy',
    category: 'defense',
    means: 'One defender is assigned to mirror the quarterback rather than rush or cover.',
    why: 'Against a quarterback who runs, a spy takes away the scramble that breaks a good coverage call. You are playing one defender short in coverage to do it, so it is a real cost, not a free assignment.',
    heard: '"They\'ve got a spy on him — the linebacker isn\'t rushing, he\'s mirroring."',
  },
  {
    term: 'Stunt',
    aka: 'Twist',
    category: 'defense',
    means: 'Two pass rushers cross on the way to the quarterback — one occupies blockers while the other loops behind.',
    why: 'It attacks communication rather than a man: if the linemen fail to pass the rushers off cleanly, the looper comes free untouched. Well-executed it beats better blockers; poorly timed it opens a running lane where the loop began.',
    heard: '"Nice stunt up front — the tackle looped and nobody picked him up."',
  },

  // ── Run game ──
  {
    term: 'Zone read',
    category: 'run',
    means: 'The quarterback reads one unblocked defender after the snap and either hands off or keeps the ball based on what that defender does.',
    why: 'Leaving a man unblocked frees a blocker elsewhere, so the offense effectively blocks a defender with the quarterback\'s eyes. The read has to be right — a wrong keep runs into the very defender the play refused to block.',
    heard: '"Zone read — he\'s reading the backside end and that end crashed."',
  },
  {
    term: 'Gap scheme',
    aka: 'Power / Counter',
    category: 'run',
    means: 'Linemen pull across the formation to lead the runner into one specific gap, rather than blocking the man in front of them.',
    why: 'Pulling creates a numbers advantage at the point of attack — more blockers than defenders in one gap. It is slower to develop, so a fast penetrating defender can wreck it in the backfield before the pullers arrive.',
    heard: '"Gap scheme, guard pulling — they\'re trying to get a hat on the linebacker."',
  },
  {
    term: 'Zone scheme',
    aka: 'Inside / Outside zone',
    category: 'run',
    means: 'The whole line steps in one direction and blocks areas rather than assigned men; the back picks his lane off what develops.',
    why: 'It is a read for the back, not a designed hole — that is why it works against many fronts without changing the call. It depends on line movement and back vision working together; if the back cuts early, he runs into unblocked help.',
    heard: '"Outside zone — everybody\'s flowing left, and he\'s pressing it before he cuts back."',
  },
  {
    term: 'RPO',
    aka: 'Run-pass option',
    category: 'run',
    means: 'One play with a run blocked up AND a route running, and a quarterback read that decides which one happens after the snap.',
    why: 'It puts a defender in a genuine bind: whatever he does is wrong, because the quarterback is reading exactly him. The window is tiny — the ball has to come out before the linemen get downfield illegally.',
    heard: '"RPO — the linebacker crashed on the run so he pulled it and threw the slant."',
  },

  // ── Pass game ──
  {
    term: 'Play action',
    category: 'pass',
    means: 'A fake handoff before a pass, designed to make second-level defenders step toward the run.',
    why: 'Every step a linebacker takes forward is a window opening behind him — that is the entire mechanism. It takes longer to develop than a normal drop, so it needs protection to hold, and it works best when the run is a real threat.',
    heard: '"Play action pulled the linebackers up and the tight end ran right behind them."',
  },
  {
    term: 'Max protect',
    category: 'pass',
    means: 'Keeping extra blockers — a back, a tight end, or both — in to protect instead of releasing them into routes.',
    why: 'It buys time for deep routes against a heavy rush. You are sending two or three receivers instead of five, so the coverage has extra defenders for the routes you do run.',
    heard: '"Max protect — they kept seven in to block and took a shot."',
  },
  {
    term: 'Hot route',
    category: 'pass',
    means: 'A pre-arranged quick throw a receiver breaks into when he sees an unblocked rusher coming.',
    why: 'It is the answer to a blitz the protection cannot pick up: get the ball out to the space the blitzer left. It requires quarterback and receiver to see the same thing at the same instant, which is why it produces both the easy completion and the ugly interception.',
    heard: '"He saw the pressure and went hot — that throw has to come out now."',
  },
  {
    term: 'Mesh',
    category: 'pass',
    means: 'Two receivers cross shallow in the middle, running close enough to brush past each other.',
    why: 'Against man coverage the crossing traffic makes defenders run into each other; against zone it becomes a simple find-the-hole read. It is one of the few concepts that answers both coverages without a check.',
    heard: '"Mesh concept — the defenders collided at the crossing point and he came open."',
  },
  {
    term: 'Pick up the blitz',
    aka: 'Pick it up',
    category: 'pass',
    means: 'Blockers identifying and stopping extra rushers, usually the back sliding to whichever rusher is unaccounted for.',
    why: 'Protection is arithmetic before it is effort: five blockers cannot block six rushers, so someone has to be thrown hot or the back has to win a one-on-one. Most sacks are a communication failure here, not a physical loss.',
    heard: '"The back has to pick that up — he ran right past the free rusher."',
  },

  // ── Situational ──
  {
    term: 'Four-minute offense',
    category: 'situational',
    means: 'The offense with a lead late, trying to run clock and end the game rather than score.',
    why: 'First downs are worth more than yards here, because each one costs the opponent a set of downs and forces timeouts. The failure mode is running conservatively into a three-and-out, which gives the ball back with time left.',
    heard: '"This is four-minute offense — they don\'t need points, they need first downs."',
  },
  {
    term: 'Two-minute drill',
    category: 'situational',
    means: 'The hurry-up offense used at the end of a half, built around the sideline, the clock and timeouts.',
    why: 'Throws that end out of bounds stop the clock, so the sideline is worth more than the middle even at equal yardage. Getting tackled inbounds can cost more than the yards gain.',
    heard: '"Two-minute drill — he has to get out of bounds there."',
  },
  {
    term: 'Fourth-down conversion rate',
    aka: 'Going for it',
    category: 'situational',
    means: 'How often an offense converts on fourth down. Fourth-and-1 converts roughly two times in three; fourth-and-5 or longer falls under half.',
    why: 'The decision is not bravery, it is the gap between converting and what a punt is actually worth from that spot. Inside the opponent\'s 40, a punt gains so little field position that a short fourth down is usually the better play.',
    heard: '"Fourth-and-one at the forty — the numbers say go."',
  },
  {
    term: 'Ice the kicker',
    category: 'situational',
    means: 'Calling timeout just before a field goal attempt to make the kicker wait and think.',
    why: 'The intent is psychological, and the evidence that it works is thin — it also gives the kicker a free practice attempt to read the wind. It is used more out of convention than because the math supports it.',
    heard: '"They called timeout to ice him — he just got a free look at it."',
  },

  // ── Sideline slang ──
  {
    term: 'In the box',
    category: 'sideline',
    means: 'The area from tackle to tackle and about five yards off the line — where run defenders live. Counting "bodies in the box" is how you judge a run.',
    why: 'If the offense has more blockers than the defense has box defenders, the run has a numbers advantage before anyone moves. This single count drives most run-pass checks at the line.',
    heard: '"Six in the box — he\'s going to check to a run here."',
  },
  {
    term: 'Leverage',
    category: 'sideline',
    means: 'Which side of a receiver a defender is playing — inside or outside, over the top or underneath.',
    why: 'Leverage tells you what a defender is protecting and therefore what he is conceding. A corner playing inside leverage is giving up the sideline; a route to the space he has already abandoned is the open one.',
    heard: '"He\'s got inside leverage, so the ball has to go outside him."',
  },
  {
    term: 'Chunk play',
    category: 'sideline',
    means: 'A single play gaining a big piece of the field — usually 20+ yards passing or 10+ rushing.',
    why: 'Long drives are fragile because every additional play is another chance to be stopped. Offenses chase chunks because they skip the compounding risk of eight straight successful plays.',
    heard: '"They need a chunk play here — they\'re not driving the length of the field with one timeout."',
  },
  {
    term: 'Explosive',
    category: 'sideline',
    means: 'The stat-sheet cousin of a chunk play — a gain past the threshold a staff has defined as explosive.',
    why: 'Coaches track explosives because the rate at which you allow them predicts points better than total yards does. A defense can lead the league in yards allowed and still lose if it gives up explosives.',
    heard: '"They\'ve given up three explosives in the first half."',
  },
  {
    term: 'Establish the line of scrimmage',
    category: 'sideline',
    means: 'Winning the space right at the snap — pushing the line forward on offense, or into the backfield on defense.',
    why: 'It describes where the play starts going right or wrong before any read matters. A defensive line that lives a yard into the backfield breaks runs and pass protection alike, which is why coaches talk about it first.',
    heard: '"They\'re establishing the line of scrimmage — nothing\'s getting started."',
  },
  {
    term: 'Complementary football',
    category: 'sideline',
    means: 'Offense, defense and special teams helping each other — a defensive stop giving the offense a short field, or the offense draining clock to rest the defense.',
    why: 'It names the fact that units are not independent. A defense that gets no rest tires in the fourth quarter regardless of how well it played, which is why time of possession still gets mentioned.',
    heard: '"That\'s complementary football — the stop gave them the ball at midfield."',
  },
];

export function termsForCategory(cat: CoachSpeakCategory): CoachSpeakTerm[] {
  return COACH_SPEAK.filter(t => t.category === cat);
}

// Free-text search across everything a user might half-remember: the term, the nickname, and the
// definition. Case- and punctuation-tolerant, because "cover 0" / "cover zero" / "Cover-0" are the
// same question. Returns the full bank for an empty query so the UI has no special case.
export function searchTerms(query: string): CoachSpeakTerm[] {
  const q = query.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
  if (!q) return COACH_SPEAK;
  return COACH_SPEAK.filter(t => {
    const hay = `${t.term} ${t.aka ?? ''} ${t.means}`.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    return hay.includes(q);
  });
}
