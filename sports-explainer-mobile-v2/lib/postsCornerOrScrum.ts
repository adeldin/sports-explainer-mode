// Posts, Corner, or Scrum? — scenario data (VERBATIM from rugbycorner/posts-corner-or-scrum.html).
// The penalty-menu teaching (a penalty is a MENU: posts / corner lineout→maul / scrum / quick tap),
// the stadium-board facts, every grade's board takeover text, and the 4-depth COACH'S READ copy are
// the owner-reviewed content — copied exactly, never re-derived. All fan-facing strings are prose
// only (inline <b>…</b> emphasis markup from the prototype is preserved for the renderer to style).
// Coordinates share the rugby pitch viewBox (680×420); the module draws the scoreboard band above
// it in its own 680×494 scene. Pure data + geometry helpers — zero RN imports.

export type Depth = 'rookie' | 'beginner' | 'intermediate' | 'expert';
export type PenaltyOption = 'posts' | 'corner' | 'scrum' | 'tap';
export type GradeKind = 'good' | 'ok' | 'bad';
export type XY = [number, number];

export interface BoardNote { cap: string; val: string; warn?: boolean }
export interface Board { spot: string; you: number; them: number; clock: string; note: BoardNote }
export interface OptionGrade {
  k: GradeKind;
  bmsg: string;      // full-board takeover text (LED)
  pts?: number;      // added to YOU when the outcome scores
  t: string;         // verdict title
  b: string;         // verdict body
}
export interface PenaltyScenario {
  tab: string;
  spot: XY;          // penalty mark on pitch coords
  board: Board;      // stadium facts — the situation IS the decision
  makes: boolean;    // is the kick at goal within range?
  grade: Record<PenaltyOption, OptionGrade>;
  why: Record<Depth, string>;
}

// ── Geometry helpers (verbatim from the prototype's render()) ──
// The law: their line must retreat 10m — dashed line just ahead of the mark.
export const tenLineX = (s: PenaltyScenario): number => Math.min(s.spot[0] + 56, 592);
export const clampY = (y: number): number => Math.max(24, Math.min(396, y));
const DEF_DY = [-120, -70, -24, 24, 70, 120];
// Their six-man line, set 10m back from the mark.
export function defenderLine(s: PenaltyScenario): XY[] {
  const dx = Math.min(tenLineX(s) + 10, 598);
  return DEF_DY.map(dy => [dx, clampY(s.spot[1] + dy)] as XY);
}
// Their fullback sits deep behind the line (he matters to posts + corner choices).
export function fullbackPos(s: PenaltyScenario): XY {
  return s.spot[0] > 560
    ? [618, 320]
    : [Math.min(622, s.spot[0] + 150), s.spot[1] > 210 ? 150 : 290];
}

export const SCENARIOS: PenaltyScenario[] = [
  {
    tab: 'Take the lead?', spot: [455, 200],
    board: { spot: '28M CENTRE', you: 12, them: 14, clock: '68:00', note: { cap: 'KICKER', val: 'IN RANGE' } },
    makes: true,
    grade: {
      posts: {
        k: 'good', bmsg: 'OVER! +3', pts: 3, t: 'Three points — and the lead',
        b: "Down two with the kick right in front, this is the percentage play: it sails over and you lead by one with twelve minutes to defend. Points on the board change what the other team has to do.",
      },
      corner: {
        k: 'ok', bmsg: 'HELD UP', t: 'Greedy — you only needed three',
        b: "The maul is a real weapon, but it can be held up, turned over, or pinged — and you turned down a near-certain lead to roll those dice. Chasing seven when three flips the game is risk you didn't need to buy.",
      },
      scrum: {
        k: 'bad', bmsg: 'ABSORBED', t: 'The lowest-percentage door',
        b: "A midfield scrum earns you a launch play against a set defense — a long way from points. Their pack holds it up comfortably, the chance fizzles, and the three points that would have taken the lead are gone.",
      },
      tap: {
        k: 'bad', bmsg: 'STOPPED', t: 'Tapped into a set wall',
        b: "Their line was standing and waiting — the quick tap ran your carrier into a fifteen-man wall for no gain, and the shot at goal evaporated the moment you tapped. Speed only helps when the defense isn't ready.",
      },
    },
    why: {
      rookie: "A penalty kick at goal is worth three points, and from 28 meters in front pros make about 9 of 10. When three points changes who's winning, take them.",
      beginner: "The choice is three points now versus a chance at seven later. This kick is close to a 90% make; a corner lineout maul scores a try roughly a third of the time. Down two, the near-certain lead beats the maybe.",
      intermediate: "Points change the opponent's math: once you lead, they have to chase, take risks, and give away more penalties. Pro kickers land about three of four attempts overall and far more from in front — the kick buys pressure as well as points.",
      expert: "Do the expected-points math: ~90% of 3 is about 2.7; a corner maul at a one-in-three try rate is worth roughly 2.3 before conversion risk. The kick wins the spreadsheet AND flips the scoreboard — aggression is for when the numbers or the game state say otherwise.",
    },
  },
  {
    tab: 'Chasing seven', spot: [582, 110],
    board: { spot: '5M TOUCHLINE', you: 15, them: 22, clock: '78:00', note: { cap: 'YOUR MAUL', val: 'DOMINANT' } },
    makes: true,
    grade: {
      corner: {
        k: 'good', bmsg: 'TRY! +5', pts: 5, t: 'Corner — the only score that matters',
        b: "Down seven with two minutes left, only a converted try ties it. Kick to the corner, throw to the maul that's marched them all night, and shove. It's the rehearsed, highest-percentage route to the try line.",
      },
      posts: {
        k: 'bad', bmsg: '+3 NOT ENOUGH', pts: 3, t: "Three points you can't spend",
        b: "It makes the score closer and changes nothing — you'd still need a try, and now the restart burns what little clock is left. When only seven helps, three is a trap.",
      },
      scrum: {
        k: 'ok', bmsg: 'RESET AGAIN', t: 'A real weapon — but the slower one',
        b: "A five-meter scrum is genuinely dangerous, but it takes longer to set, can be reset twice more, and isn't the platform that's dominated tonight. With the clock dying, the corner maul is the faster, proven route.",
      },
      tap: {
        k: 'ok', bmsg: 'HELD UP 1M OUT', t: 'Bold — into a goal-line wall',
        b: "The tap catches some defenses cold, but on their own line every defender is already set and legal. Your carrier is swallowed a meter out. Playable, but you traded a rehearsed maul for a coin flip.",
      },
    },
    why: {
      rookie: "Sometimes three points don't help — down seven late, only a try ties it. The corner kick gets your throw-in five meters from their goal line.",
      beginner: "Kicking to the corner buys the lineout five meters out: catch, form the maul, drive. Attacking 5m lineouts produce tries about a third of the time — a real shot at the score you actually need. Three points here still leaves you losing.",
      intermediate: "Scoreboard math first: down seven at 78 minutes, a penalty goal leaves you needing a try you may never touch the ball again to score. The corner converts field position into your best rehearsed try play — and a dominant maul beats that one-in-three baseline by a distance.",
      expert: "Dominance data drives the call: a maul that's marched them all night converts well above the ~33% baseline, and it mines penalties — held-up mauls frequently earn another shot or a penalty try. Down seven with two minutes left, every alternative is a slower path to the only score that matters.",
    },
  },
  {
    tab: 'Out of range', spot: [320, 240],
    board: { spot: 'HALFWAY', you: 19, them: 13, clock: '55:00', note: { cap: 'KICKER', val: 'OUT OF RANGE' } },
    makes: false,
    grade: {
      corner: {
        k: 'good', bmsg: 'YOUR LINEOUT', t: 'Kick it long — territory plus your throw',
        b: "The touch-finder rolls out deep in their half and the lineout throw is yours. You've swapped a penalty at halfway for an attacking platform near their twenty-two — the classic use of a penalty you can't kick at goal.",
      },
      posts: {
        k: 'bad', bmsg: 'SHORT', t: 'A hope, not a kick',
        b: "It's beyond his range — the ball falls short, their fullback gathers it in space, and your penalty just became their counter-attack. A missed long shot hands back everything the penalty gave you.",
      },
      scrum: {
        k: 'bad', bmsg: 'NO GAIN', t: 'A scrum in the middle of nowhere',
        b: "A halfway scrum wins you a set-piece launch sixty meters from the line — their eight simply absorbs it. You spent a free gift of territory on the option that gains none.",
      },
      tap: {
        k: 'ok', bmsg: 'SMALL CARRY', t: 'Playable — but why hurry here?',
        b: "Up six with half an hour left, a quick tap at halfway against a mostly-set line buys a carry and not much else. Nothing terrible happens — you just declined the free forty meters the kick to touch was offering.",
      },
    },
    why: {
      rookie: "Too far to kick at the posts? Kick the ball off the field down near their goal line instead — after a penalty, YOUR team gets the throw-in.",
      beginner: "That's the special part: normally the team that kicks the ball out loses the throw, but from a penalty the kicking team keeps it. A good touch-finder here banks 35–40 meters of territory AND possession — the best trade on the table.",
      intermediate: "This is how leading teams squeeze a game: bank the free territory, throw in near their 22, and make them defend long stretches of their own half — where their penalties become kicks you CAN make. A sub-50% bomb at the posts isn't a shot, it's a donation to the counter-attack.",
      expert: "Watch the touchline math: die the ball as deep as possible without finding the fullback. Field position is compound interest — every exit you force is another chance the next penalty lands inside range, and most tries start from possession won inside the opponent's half.",
    },
  },
  {
    tab: "They're a man down", spot: [542, 230],
    board: { spot: '12M OUT', you: 13, them: 12, clock: '52:00', note: { cap: 'THEY HAVE', val: '14 MEN', warn: true } },
    makes: true,
    grade: {
      corner: {
        k: 'good', bmsg: 'TRY! +5', pts: 5, t: 'Press the man advantage where it hurts',
        b: "For ten minutes their pack defends with a body missing. Corner, lineout, maul — the seven-man defense has to fold extra tacklers in, and either the maul goes over or the space opens wide. Tries during the sin-bin are how leads become safe.",
      },
      posts: {
        k: 'ok', bmsg: 'OVER! +3', pts: 3, t: 'Solid — but small',
        b: "Three points is never nothing, and a four-point lead is real. But it spends the penalty without spending the man advantage — the clock on their yellow card keeps running either way, and this was the window to score seven.",
      },
      scrum: {
        k: 'ok', bmsg: 'SHOVE — CLOSE', t: 'Also presses the shortage — second-best',
        b: "With a forward in the bin their scrum is patched together, so the shove is live. It's a genuine option; the corner maul just attacks the same weakness with a higher try rate and less reset lottery.",
      },
      tap: {
        k: 'bad', bmsg: 'STOPPED', t: 'Wasted the platform',
        b: "Twelve meters out they're set and waiting even with fourteen — the tap runs into their guard and the drive dies. You had two set-piece hammers against a short-handed pack and swung neither.",
      },
    },
    why: {
      rookie: "The other team has a player in the sin bin — 14 against your 15 for ten minutes. That's the time to go for tries, not settle for small points.",
      beginner: "A yellow card costs the average team about seven points while it runs. Smart teams cash the advantage as tries: every defensive job now has one less body — especially in the forwards.",
      intermediate: "The corner maul attacks the shortage directly: a seven-man pack defending a maul must borrow tacklers from the line, which opens the width. Either the maul scores or the overlap appears — it's why try rates jump during yellows.",
      expert: "Sin-bin economics: analyses put the average points swing near seven per yellow card, and set-piece platforms are where it's harvested. The captain's job is converting a temporary numbers edge into permanent scoreboard — three points spends the penalty without spending the man advantage.",
    },
  },
];
