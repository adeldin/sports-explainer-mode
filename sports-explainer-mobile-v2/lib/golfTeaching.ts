// Golf teaching content — the layer that makes the live leaderboard LEARNABLE (not a scoreboard).
// Curated from a 3-AI batch, de-duped, best phrasing of each level kept. Modeled on lib/strategyTips.ts
// (content bank + selector helpers, consumed by one component — here GolfLeaderboard, Build 3).
//
// DISTINCT from lib/glossary/golf.ts: that is the single-`def` prose-scan glossary used by GlossaryText
// across PlayCard/RecapCard/etc. THIS is a 4-level, leaderboard-field-keyed dataset for the golf board's
// tappable headers/cells. Keep the two separate.
//
// TWO parts:
//   GOLF_GLOSSARY — 18 tappable concepts, each at 4 levels (rookie/beginner/intermediate/expert),
//                   keyed to a leaderboard `field` so taps line up with what's on screen.
//   GOLF_LENSES   — 15 "how to read a leaderboard" teaching insights (the watch-and-learn layer).
//
// ⚠️ ACCURACY HEDGES (professor review): cut rules and playoff formats VARY by event. Copy uses
// "usually / in most tournaments" deliberately — do NOT state these as fixed rules. FedEx Cup point
// VALUES changed for 2026; glossary copy below avoids citing specific point numbers for that reason.

import type { Level } from "./api"; // app difficulty level: 'kid' | 'beginner' | 'intermediate' | 'expert'

// The content's own level keys. NOTE the app uses 'kid' where this content uses "rookie" — levelText()
// bridges that (the only key that differs; the other three match 1:1).
export type GolfLevel = "rookie" | "beginner" | "intermediate" | "expert";

export interface GolfConcept {
  id: string;
  term: string;                 // display term
  field?: string;               // the live leaderboard field this maps to (if any)
  levels: Record<GolfLevel, string>;
}

export const GOLF_GLOSSARY: GolfConcept[] = [
  {
    id: "to-par", term: "To par (e.g. -20)", field: "total",
    levels: {
      rookie: "Golf is scored against a target number called par. Lower is better, so a negative number is good — -20 means 20 shots better than expected. Like finishing a race well ahead of the expected time.",
      beginner: "“To par” compares a player's total to the course's expected score. Negative (red) numbers are under par and good; positive numbers are over par.",
      intermediate: "Leaderboards show score to par, not raw strokes, so you can compare players who've played a different number of holes. -12 is ahead of -9 regardless of total strokes.",
      expert: "Score to par tells you position, not context. -12 posted early reads differently than -12 with five holes left, depending on the course setup, weather wave, and which holes remain.",
    },
  },
  {
    id: "par", term: "Par", field: undefined,
    levels: {
      rookie: "Par is the score a good player is expected to make on a hole — the hole's “normal” number.",
      beginner: "A par-4 means a player is expected to finish in 4 shots. A full round is usually par 72.",
      intermediate: "Par sets each hole's scoring baseline. Players attack realistic birdie holes and play cautiously where par is already a good score.",
      expert: "Par is a design convention, not a true difficulty measure — some par-4s play easier than some par-3s depending on length, wind, and pin position.",
    },
  },
  {
    id: "birdie-bogey-eagle", term: "Birdie / Bogey / Eagle", field: undefined,
    levels: {
      rookie: "These describe one hole. Par is expected; a birdie is one better, an eagle is two better, a bogey is one worse.",
      beginner: "Birdie (-1) and eagle (-2) lower your leaderboard total; bogey (+1) and double bogey (+2) raise it. On a par-4: birdie=3, bogey=5.",
      intermediate: "Birdies build momentum in bunches, but the best rounds balance birdie chances against avoiding the big mistake. Bogey avoidance often matters more than fans expect.",
      expert: "Not all birdies are equal — one on a brutal par-4 gains ground on the field; one on an easy par-5 just keeps pace. And a “good bogey” (escaping trouble with only one lost shot) can save a round.",
    },
  },
  {
    id: "thru", term: "Thru (e.g. “Thru 16”)", field: "thru",
    levels: {
      rookie: "“Thru 16” means the player has finished 16 of today's 18 holes — two left to play.",
      beginner: "The “thru” number shows how far along a player is in their round, so you can compare players who aren't on the same hole.",
      intermediate: "A player at -8 thru 16 is still posting their score — their position is still moving. Someone already finished may look safe but can still be passed.",
      expert: "Holes remaining matter as much as the number: -10 thru 16 with two hard finishers left is a very different spot than -10 thru 16 with two birdie holes left.",
    },
  },
  {
    id: "F", term: "F / Final", field: "thru (\"F\") / roundComplete",
    levels: {
      rookie: "“F” means the player has finished today's round — their score for the day is locked in.",
      beginner: "A finished score becomes a target. Players still on the course know exactly what number they need to catch.",
      intermediate: "“Posting a number” means finishing with a score that pressures later groups. A finished player can still climb if others stumble.",
      expert: "A posted number gains weight when conditions worsen — “done early” can be an advantage when later players face wind, firm greens, or hard closing holes.",
    },
  },
  {
    id: "today", term: "Today / round score", field: "currentRoundScore",
    levels: {
      rookie: "This is how the player is doing in the current round only, not the whole tournament.",
      beginner: "If “today” says -4, the player is four under par for this round.",
      intermediate: "Total score shows tournament position; today's score shows momentum — who's hot right now.",
      expert: "A low round score can signal a charge, but timing matters: a finished -5 is more certain than a -5 from someone with dangerous holes still ahead.",
    },
  },
  {
    id: "total", term: "Total score", field: "total",
    levels: {
      rookie: "The player's score for the whole tournament so far. Lower is better.",
      beginner: "It adds up all their rounds into the single number the leaderboard ranks by.",
      intermediate: "Total is the main leaderboard number, but it needs context from holes played and today's score.",
      expert: "Total is the scoreboard truth but not always the predictive truth — remaining holes and weather wave change the real pressure.",
    },
  },
  {
    id: "ties", term: "T3 / ties", field: "position",
    levels: {
      rookie: "The “T” means tie. “T3” means the player is tied for 3rd with someone else.",
      beginner: "With a big field, many players share scores. If three are tied for 3rd, all show T3 and the next spot listed is 6th.",
      intermediate: "Ties affect money and points (tied prize money is pooled and split). One birdie can jump a player past a whole packed group.",
      expert: "Ties distort the board — T12 to T5 may take only a shot or two when players are bunched. The one tie never split is 1st after Sunday: that goes to a playoff.",
    },
  },
  {
    id: "the-cut", term: "The cut", field: "cutLines",
    levels: {
      rookie: "After the first two days, many players are sent home. Score well enough and you “make the cut” and play the weekend; if not, your tournament's over.",
      beginner: "In most tournaments the cut comes after two rounds — the better-scoring players continue, the rest go home. (Exact rules vary by event.)",
      intermediate: "The cut line moves as players finish Friday. Usually it's around the top 65 and ties, but majors and signature events can differ — so watch the line, not a fixed number.",
      expert: "The cut is dynamic — it depends on how the whole field scores, not a pre-set number, and not every event has one. Late-Friday strategy near the bubble gets conservative because one bogey can end the week.",
    },
  },
  {
    id: "moving-day", term: "Moving day (Saturday)", field: undefined,
    levels: {
      rookie: "Saturday is “moving day” — players try to climb the board to set up a winning position for Sunday.",
      beginner: "After the cut, players often play aggressively in round three to get close to the leaders before the final round.",
      intermediate: "Moving day separates real contenders from players just hanging around. A low Saturday can vault someone from 50th into the top 10.",
      expert: "It's controlled aggression — contenders must attack scoring holes without the mistake that ends their week. Winners almost always come from near the top after Saturday.",
    },
  },
  {
    id: "sunday-charge", term: "Sunday charge", field: undefined,
    levels: {
      rookie: "A great final round where a player climbs the board fast — golf's version of a late comeback.",
      beginner: "A player starts behind but makes several Sunday birdies to chase the leader.",
      intermediate: "A charge needs two things: the chaser going low AND the leaders leaving a door open. And it has to happen before the holes run out.",
      expert: "Timing defines it. Early birdies post a target; a late run forces the leaders to respond in real time, with no holes left to recover.",
    },
  },
  {
    id: "leader-clubhouse", term: "Leader / clubhouse leader", field: "position",
    levels: {
      rookie: "The leader has the best score right now. A “clubhouse leader” is the best score among players who've already finished.",
      beginner: "The clubhouse leader is done and waiting to see if anyone on the course passes them — but they give everyone a number to chase.",
      intermediate: "Posting the clubhouse lead pressures later groups, especially if the course is getting tougher. Watch whether leaders protect against that number or keep attacking.",
      expert: "A lead is part math, part psychology. The clubhouse number matters most when the finishing stretch is hard or weather makes late scoring unlikely.",
    },
  },
  {
    id: "tee-time", term: "Tee time", field: "teeTime",
    levels: {
      rookie: "The time a player starts their round — like an appointment to begin.",
      beginner: "Players don't all start at once; groups go off spaced apart. On the weekend, the best scores get the latest tee times.",
      intermediate: "Tee times matter because weather and course firmness change through the day — a favorable “draw” can mean calmer conditions.",
      expert: "Morning-vs-afternoon wave differences can be worth several shots before anyone tees off — serious viewers treat the draw as real competitive context.",
    },
  },
  {
    id: "two-tee-start", term: "Two-tee start", field: "startingHole",
    levels: {
      rookie: "Some players start on hole 1 and others on hole 10, so the whole field gets around faster.",
      beginner: "Used for big fields or weather risk. It means some players begin on the front nine and others on the back.",
      intermediate: "It makes “thru” trickier to read — a player “thru 6” who started on 10 has actually played holes 10–15, not 1–6.",
      expert: "Starting on 10 changes a round's rhythm — a player may hit the course's hardest stretch early instead of late, shifting where the pressure lands.",
    },
  },
  {
    id: "playoff", term: "Playoff / sudden death", field: undefined,
    levels: {
      rookie: "If players tie for 1st after the tournament ends, they play extra holes until someone wins.",
      beginner: "Most playoffs are sudden death — the first player to beat the other on a hole wins. (Some events play a set number of holes first.)",
      intermediate: "Format varies by event: sudden death rewards immediate execution; aggregate playoffs test a few holes' total. Always check the event's format.",
      expert: "Playoffs become match-play decisions inside stroke play — if your opponent is in trouble, safety can beat heroics. The playoff hole's scoring profile shapes strategy.",
    },
  },
  {
    id: "fedex-points", term: "FedEx Cup points", field: undefined,
    levels: {
      rookie: "Season-long points players earn by finishing well in tournaments — a year-long standings race that decides who reaches the playoffs.",
      beginner: "Better finishes earn more points, which help a player qualify and seed for the season-ending playoffs.",
      intermediate: "Points make every event matter beyond prize money — a player out of contention may still be playing Sunday for season standing or to keep their tour card.",
      expert: "Points shape scheduling, playoff seeding, and job security, and exact values change by season and event type (they were revised for 2026) — so treat specific point totals as event-dependent.",
    },
  },
  {
    id: "amateur", term: "Amateur “(a)”", field: "isAmateur",
    levels: {
      rookie: "An “(a)” by a name means an amateur — they play for the love of it and don't take prize money.",
      beginner: "Usually top college or elite non-pro players who qualified. If an amateur finishes high, the prize money skips them to the next pro.",
      intermediate: "Top amateurs are often future pros — one high on the board is a real story, and “low amateur” carries prestige.",
      expert: "Amateur status adds context — a made cut or top finish signals elite future potential even without a paycheck, and earns world amateur ranking points.",
    },
  },
  {
    id: "withdraw-dq", term: "WD / DQ", field: "status",
    levels: {
      rookie: "Letters instead of a score mean something went wrong. WD = withdrew (often hurt/sick). DQ = disqualified (broke a rule).",
      beginner: "Either way the player is out — no prize money or points. WD is usually injury; DQ is usually a rules issue.",
      intermediate: "A common DQ cause is signing an incorrect scorecard — golf holds players to strict self-reporting.",
      expert: "Golf's self-policing tradition is unusually strict — a scorecard-signature DQ is harsh but respected as part of the game's integrity culture.",
    },
  },
];

// ---- SET 2: TEACHING LENSES (how to READ a leaderboard) ----
export interface GolfLens { id: string; lens: string; }

export const GOLF_LENSES: GolfLens[] = [
  { id: "g-l-01", lens: "Don't just watch who makes birdies — watch who avoids bogeys. Tournaments are often won by the player who stops giving shots back." },
  { id: "g-l-02", lens: "A player at -10 thru 12 isn't the same as -10 finished. Always check “thru” before deciding who's really in control." },
  { id: "g-l-03", lens: "The leaderboard lies a little until everyone's played the same number of holes — holes remaining is half the story." },
  { id: "g-l-04", lens: "Late tee times usually mean you're in the hunt — the leaders go out last, knowing exactly what number they need to beat." },
  { id: "g-l-05", lens: "Par isn't boring. On a hard hole, a par can gain a shot on the field — steady golf can be aggressive in effect." },
  { id: "g-l-06", lens: "A Sunday charge is real only when it posts a number — pressure arrives when the leaders can see the score behind them." },
  { id: "g-l-07", lens: "Ties can hide momentum. Two players both at T3 may be going opposite directions — one charging, one hanging on." },
  { id: "g-l-08", lens: "The leader's hardest job is knowing when par is a win. Chasers need birdies; leaders often win by refusing the big mistake." },
  { id: "g-l-09", lens: "Look at where the score came from. Five birdies and four bogeys is a very different round than one birdie and seventeen pars, even at the same total." },
  { id: "g-l-10", lens: "Watch the cut line like its own mini-tournament — for many players the drama isn't winning, it's earning two more rounds, points, and a paycheck." },
  { id: "g-l-11", lens: "A bogey after a bad drive can be a smart save. Coaches notice when a player stops a mistake from becoming a disaster." },
  { id: "g-l-12", lens: "Pressure grows as holes run out. Two back with nine to play is a different world than two back with two to play." },
  { id: "g-l-13", lens: "Watch the closing stretch, not just the total. -10 standing on a brutal finishing hole can be worse off than -9 with a birdie chance left." },
  { id: "g-l-14", lens: "Watch the weather wave. If wind picks up in the afternoon, a morning -2 can be a better round than an afternoon -4." },
  { id: "g-l-15", lens: "Watch bounce-back: what a player does right after a bogey. The best ones answer a mistake with a birdie." },
];

// --- Helpers ---------------------------------------------------------------

// Translate a concept's raw `field` name to the on-screen LeaderboardRow COLUMN key. The content uses
// some source-side names (notably `currentRoundScore`) and a compound `thru ("F") / roundComplete`,
// while the board renders columns 'position' | 'total' | 'today' | 'thru'. Fields with no on-screen
// column (cutLines / teeTime / startingHole / isAmateur / status) → undefined (just won't map to a cell).
const FIELD_TO_COLUMN: Record<string, string> = {
  total: "total",
  currentRoundScore: "today",
  thru: "thru",
  position: "position",
};
function fieldToColumn(field?: string): string | undefined {
  if (!field) return undefined;
  if (FIELD_TO_COLUMN[field]) return FIELD_TO_COLUMN[field];
  if (field.startsWith("thru")) return "thru"; // tolerate the compound 'thru ("F") / roundComplete'
  return undefined;
}

// Look up the concept for an on-screen column ('position' | 'total' | 'today' | 'thru'). Returns the
// FIRST concept whose field maps to that column — array order makes the header-appropriate concept win
// where a column has two (total → "to-par", position → "ties"), matching the intended taps. Returns
// undefined for a column with no concept (tap is then a no-op — never crash).
export function conceptForField(field: string): GolfConcept | undefined {
  return GOLF_GLOSSARY.find((c) => fieldToColumn(c.field) === field);
}

// Get the level-appropriate text for a concept, given the APP's difficulty level. Bridges the only
// differing key: the app's 'kid' → the content's "rookie" (the other three match 1:1).
export function levelText(concept: GolfConcept, level: Level): string {
  const key: GolfLevel = level === "kid" ? "rookie" : level;
  return concept.levels[key];
}
