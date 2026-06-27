// Make the Call — the universal judgment-quiz DATA LAYER (content + selector), independent of the
// engine (the quiz UI). Authored scenarios live here as static data so content + engine can be built
// and filled in parallel. v1 ships three sports (mlb / soccer / nfl), text-first (no diagrams).
// See BUILD_MAKE_THE_CALL.md (Gate 1).

import type { Sport, Level } from "./api";

// A logical sport bucket for Make the Call. Soccer is split across several Sport
// keys (soccer | worldcup | epl | laliga); we author once per logical sport and
// resolve the real Sport key onto it (see resolveBank below).
export type MTCSport = "mlb" | "soccer" | "nfl";

export interface MakeTheCallScenario {
  // --- reused verbatim from the QuizQuestion shape (facts.ts) so scoring + the
  //     card already understand these fields ---
  q: string;              // the situation + the question, in one string
  options: string[];      // 2-4 plausible calls
  answer: number;         // 0-based index of the correct option
  explanation: string;    // the "why" — teaches the principle, not just "correct"
  difficulty: Level;      // 'kid' | 'beginner' | 'intermediate' | 'expert'

  // --- added for Make the Call ---
  id: string;             // stable unique id, e.g. "mlb-count-001" (for de-dupe + future tracking)
  sport: MTCSport;        // which logical bank this belongs to
  conceptTag: string;     // e.g. "count-leverage" — the bridge hook (Academy/Live link, later)
  watchFor?: string;      // optional: what this decision changes / what to watch next
  // diagramRef?: string; // RESERVED for a future visual version. Leave OUT of v1 entirely.
}

export const MAKE_THE_CALL: Record<MTCSport, MakeTheCallScenario[]> = {
  // ---------- MLB ----------
  mlb: [
    {
      id: "mlb-count-001", sport: "mlb", conceptTag: "count-leverage", difficulty: "beginner",
      q: "It's a 3-0 count with no one on base. The batter is the other team's best power hitter. What's the smart pitch?",
      options: [
        "A fastball over the middle to get a strike",
        "A fastball just off the plate, hoping he chases",
        "Your nastiest slider in the dirt",
        "Walk him on purpose with a pitch way outside",
      ],
      answer: 1,
      explanation: "At 3-0 the hitter is usually 'taking' (not swinging) unless he gets something juicy. You don't want to groove a fastball down the middle to a slugger, and a slider in the dirt risks ball four. A fastball just off the edge might steal a strike if he's swinging, and costs you little if he takes it.",
      watchFor: "If it's now 3-1, the pitcher is in trouble — the hitter can sit on a fastball.",
    },
    {
      id: "mlb-infield-001", sport: "mlb", conceptTag: "defensive-positioning", difficulty: "beginner",
      q: "Bottom of the 9th, tie game, the winning run is on third base with one out. Where should the infield play?",
      options: [
        "Back, to turn a double play",
        "In, to throw the runner out at home",
        "At normal depth",
        "Shifted toward the pull side",
      ],
      answer: 1,
      explanation: "With the winning run 90 feet away, a normal ground ball ends the game even if you get the out at first. Playing the infield 'in' lets them throw home to stop the run — they trade range (more balls get through) for the chance to save the game right now.",
      watchFor: "Playing in means more grounders sneak through for hits — it's a real gamble.",
    },
    {
      id: "mlb-bullpen-001", sport: "mlb", conceptTag: "bullpen-leverage", difficulty: "intermediate",
      q: "It's the 7th inning, your team leads by one, bases loaded, two outs. A dangerous left-handed hitter is up. Your starter is tiring. What's the move?",
      options: [
        "Leave the starter in — he got them here",
        "Bring in your left-handed specialist for the matchup",
        "Bring in your closer now, four outs early",
        "Intentionally walk in a run to reset the matchup",
      ],
      answer: 1,
      explanation: "This is the highest-leverage moment of the game — one swing flips it. A tiring starter facing a dangerous lefty is the matchup to avoid. The lefty specialist tilts the platoon advantage your way. Burning the closer for a four-out save is defensible but costs you later; walking in a run hands them the lead-tying run for free.",
      watchFor: "If the lefty reaches base, the manager may already be reaching for the closer.",
    },
    {
      id: "mlb-steal-001", sport: "mlb", conceptTag: "risk-vs-reward", difficulty: "intermediate",
      q: "Your team trails by two runs in the 8th. A fast runner is on first with no outs and your best hitters are due up. Should he try to steal second?",
      options: [
        "Yes — get into scoring position",
        "No — don't risk the out with the big bats coming",
        "Only if the pitcher throws to first",
        "Steal third instead",
      ],
      answer: 1,
      explanation: "Down two, you need baserunners more than you need 90 feet. Getting caught stealing wastes an out AND removes a runner right when your best hitters could drive him in — a double whammy. With one run down it might be worth it; down two with the heart of the order coming, the out is too costly.",
      watchFor: "Game state changes this — down one with weaker hitters up, the steal becomes smart.",
    },
  ],

  // ---------- SOCCER ----------
  soccer: [
    {
      id: "soccer-press-001", sport: "soccer", conceptTag: "pressing", difficulty: "beginner",
      q: "Your team is winning 1-0 with 10 minutes left. The other team has the ball deep in their own half. What's the smart team shape?",
      options: [
        "Push everyone up to win the ball high and score again",
        "Drop into a compact block and protect the lead",
        "Have just the strikers chase the ball",
        "Foul immediately to stop play",
      ],
      answer: 1,
      explanation: "Up by one late, the priority is not conceding. Committing everyone forward to press leaves space behind for a counterattack — exactly how late equalizers happen. Dropping into a compact, organized block makes the field small and forces the opponent to break down a wall. It's less exciting, but it's how leads are protected.",
      watchFor: "Watch the fullbacks — if they stop overlapping, the team has switched to lead-protection mode.",
    },
    {
      id: "soccer-width-001", sport: "soccer", conceptTag: "creating-space", difficulty: "beginner",
      q: "The other team is defending with everyone packed tightly in the center of their box. How do you create a good chance?",
      options: [
        "Keep passing through the crowded middle",
        "Spread the ball wide to stretch them, then attack the gaps",
        "Shoot from distance every time",
        "Send long balls hoping for a deflection",
      ],
      answer: 1,
      explanation: "A packed central defense has no space to give in the middle — forcing it there plays into their hands. Moving the ball wide makes defenders shift and the compact block stretch; the gaps that open between them are where the real chance gets created. Width isn't about crossing — it's about pulling the defense apart.",
      watchFor: "After a switch of play, watch for the gap that opens on the far side before the defense recovers.",
    },
    {
      id: "soccer-redcard-001", sport: "soccer", conceptTag: "adjusting-to-personnel", difficulty: "intermediate",
      q: "Your team just got a red card — you're down to 10 players — with 30 minutes left in a 0-0 game. What's the right adjustment?",
      options: [
        "Keep the same attacking shape and hope",
        "Sacrifice an attacker, drop into a disciplined low block, play for a draw or the counter",
        "Push everyone forward to score before they tire you out",
        "Have the goalkeeper play as an outfield player",
      ],
      answer: 1,
      explanation: "A man down, you can't cover the whole field — trying to leaves gaps a good team will exploit. The standard fix is to give up a forward, compact the remaining 10 into a tight defensive shape, and stay dangerous on the counterattack. You concede possession on purpose to stay solid where it matters.",
      watchFor: "Watch which player comes off — losing a striker for a midfielder signals the switch to survival mode.",
    },
    {
      id: "soccer-buildup-001", sport: "soccer", conceptTag: "build-up", difficulty: "intermediate",
      q: "The opponent presses high and aggressively whenever your goalkeeper has the ball. Your defenders look rushed. What's the better build-up plan?",
      options: [
        "Just boot it long every time to escape the press",
        "Keep forcing short passes under pressure",
        "Use a mix — bait the press with short passes, then play over it when they commit",
        "Have the keeper hold the ball as long as possible",
      ],
      answer: 2,
      explanation: "A pure long-ball bail-out concedes possession cheaply; forcing short passes into a committed press invites a turnover near your own goal. The strong answer baits the press — draw them in with short options, and the moment they over-commit, play over or through the space they vacated. Pressing aggressively leaves space behind; good build-up uses it.",
      watchFor: "When the press commits, watch for the space behind their midfield — that's the target.",
    },
  ],

  // ---------- NFL ----------
  nfl: [
    {
      id: "nfl-4thdown-001", sport: "nfl", conceptTag: "risk-vs-reward", difficulty: "beginner",
      q: "It's 4th-and-1 at midfield, early in the game, score tied. What's the modern smart call?",
      options: [
        "Punt and play field position",
        "Go for it — gain a yard, keep the drive alive",
        "Attempt a very long field goal",
        "Throw a deep pass into the end zone",
      ],
      answer: 1,
      explanation: "4th-and-1 is a high-percentage conversion, and analytics have shifted the consensus toward going for it in this spot — the value of keeping the drive alive outweighs the modest field-position gain from a punt. A 60+ yard field goal is a low-percentage waste, and a deep shot ignores the easy yard you need.",
      watchFor: "Field position and time left change this — pinned deep in your own territory, the punt comes back into play.",
    },
    {
      id: "nfl-coverage-001", sport: "nfl", conceptTag: "reading-coverage", difficulty: "beginner",
      q: "The defense shows two deep safeties split to the sidelines before the snap. Generally, where is the defense most vulnerable?",
      options: [
        "Deep down the middle of the field",
        "On short outside throws to the sideline",
        "Nowhere — it covers everything",
        "On deep sideline routes",
      ],
      answer: 0,
      explanation: "Two safeties split wide and deep (a 'two-high' look) means no one is sitting in the deep middle — that area is the soft spot. Offenses attack it with routes up the seam. The trade-off of protecting both sidelines deep is that the middle of the field opens up.",
      watchFor: "Safeties can disguise it — watch if one sprints to the middle after the snap, changing the picture.",
    },
    {
      id: "nfl-clock-001", sport: "nfl", conceptTag: "clock-management", difficulty: "intermediate",
      q: "You trail by 4 with 2:00 left, one timeout, ball at your own 25. A run play just gained 6 yards and the clock is running. What now?",
      options: [
        "Call your timeout immediately to save clock",
        "Let the clock run and huddle normally",
        "Snap quickly to run another play before calling timeout",
        "Spike the ball to stop the clock",
      ],
      answer: 2,
      explanation: "Down 4, you need a touchdown, not a field goal, so you must balance scoring with saving your last timeout. Snapping quickly to get one more play off before stopping the clock preserves the timeout for when you'll need it most near the goal line. Burning the timeout now wastes your only stoppage; a spike wastes a down you can't spare.",
      watchFor: "That last timeout is precious — it's what lets you stop the clock near the goal line.",
    },
    {
      id: "nfl-blitz-001", sport: "nfl", conceptTag: "pressure-vs-coverage", difficulty: "intermediate",
      q: "It's 3rd-and-long. The defense wants a stop. What's the trade-off of sending an all-out blitz?",
      options: [
        "There is no trade-off — more rushers is always better",
        "You pressure the QB fast, but leave receivers in single coverage with no help",
        "It only works against the run",
        "It guarantees a sack",
      ],
      answer: 1,
      explanation: "Blitzing trades coverage for pressure: extra rushers can force a hurried throw or a sack, but every rusher is one fewer defender in coverage — receivers get single coverage with no safety help behind. Against a quick, accurate QB it can backfire into a big play. It's a calculated gamble, not a free win.",
      watchFor: "If the QB gets the ball out fast, the blitz loses — watch for a quick slant beating the pressure.",
    },
  ],
};

// Map a real Sport key onto its logical Make the Call bank.
// Returns null for sports we have no MTC content for yet (the caller shows an empty state).
export function resolveBank(sport: Sport): MTCSport | null {
  if (sport === "mlb") return "mlb";
  if (sport === "nfl") return "nfl";
  if (sport === "soccer" || sport === "worldcup" || sport === "epl" || sport === "laliga") return "soccer";
  return null;
}

// Build the pool for a set of sport keys at a given level. Mirrors how the live
// QuizCard does `sportKeys.flatMap(k => QUIZ[k]).filter(difficulty===level)`,
// but de-duped by logical bank so soccer's four keys don't 4x the pool.
export function buildScenarioPool(sportKeys: Sport[], level: Level): MakeTheCallScenario[] {
  const banks = new Set<MTCSport>();
  for (const k of sportKeys) {
    const b = resolveBank(k);
    if (b) banks.add(b);
  }
  const pool: MakeTheCallScenario[] = [];
  for (const b of banks) {
    for (const s of MAKE_THE_CALL[b]) {
      if (s.difficulty === level) pool.push(s);
    }
  }
  return pool;
}

// Convenience: which logical sports actually have at least one scenario at this level.
export function sportsWithContent(level: Level): MTCSport[] {
  return (Object.keys(MAKE_THE_CALL) as MTCSport[]).filter(
    b => MAKE_THE_CALL[b].some(s => s.difficulty === level)
  );
}
