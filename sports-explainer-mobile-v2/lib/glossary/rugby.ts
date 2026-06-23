import { GlossaryEntry } from './types';

// Curated rugby glossary (rugby union — covers URC, MLR, and international) — 38 terms.
// Definitions are authored content shown verbatim in the tappable-definition box;
// do not rewrite them. Defs containing an apostrophe use double-quoted strings to keep
// the build safe. Verified against World Rugby Laws and reputable rugby references
// (try/grounding Law 8/21, ruck Law 15, maul Law 16, offside Law 10, cards Law 9 +
// the 2025/26 20-minute red card trial). Both the 'rugby' (URC) and 'mlr' league keys
// map to this single list — the vocabulary is shared.
export const RUGBY_GLOSSARY: GlossaryEntry[] = [
  // --- Scoring ---
  {
    term: 'try',
    def: "The main way to score, worth 5 points: a player grounds the ball in the opponent's in-goal area (their end zone). Unlike football, you can't just carry it over the line — the ball has to touch the ground. If you're carrying it, a touch down is enough; if it's loose on the ground, you press down on it.",
    sport: 'rugby',
    aliases: ['tries'],
  },
  {
    term: 'conversion',
    def: "A free kick at the posts worth 2 points, awarded right after a try. It's taken from a spot in line with where the try was scored — so scoring nearer the middle makes the kick easier.",
    sport: 'rugby',
    aliases: ['conversions', 'converted'],
  },
  {
    term: 'penalty kick',
    def: "A kick at the posts worth 3 points, awarded after the other team commits a penalty. A reliable way to put points on the board without scoring a try — teams often take the easy 3.",
    sport: 'rugby',
    aliases: ['penalty goal'],
  },
  {
    term: 'drop goal',
    def: 'A kick through the posts worth 3 points taken from open play, where the player drops the ball and kicks it on the bounce. Rare and dramatic — often a way to snatch a late lead.',
    sport: 'rugby',
    aliases: ['drop goals', 'dropped goal'],
  },
  {
    term: 'in-goal',
    def: "The area behind the goal line where a try is scored — rugby's version of the end zone. Ground the ball here and it's 5 points.",
    sport: 'rugby',
    aliases: ['in-goal area', 'try line'],
  },

  // --- The basic phases (where newcomers get lost) ---
  {
    term: 'scrum',
    def: "A restart where eight players from each side bind together and push for the ball, fed in on the ground between them. It's used after a minor infringement (like a knock-on) — a contained battle to win possession back.",
    sport: 'rugby',
    aliases: ['scrums'],
  },
  {
    term: 'ruck',
    def: "What forms after a tackled player goes to ground: players from both sides bind over the ball and try to drive each other off it, using only their feet to win it — no hands once it's formed. The fast, messy contest you see after almost every tackle.",
    sport: 'rugby',
    aliases: ['rucks'],
  },
  {
    term: 'maul',
    def: "Like a ruck but the ball-carrier stays on their FEET, held by an opponent with a teammate bound on too (at least three players), the whole knot driving forward. A rolling shove for territory — most common off a lineout near the try line.",
    sport: 'rugby',
    aliases: ['mauls'],
  },
  {
    term: 'lineout',
    def: "How play restarts after the ball goes out of bounds: the two packs line up and a player throws the ball straight down the middle, where teammates LIFT a jumper to catch it. Rugby's version of a throw-in, but airborne.",
    sport: 'rugby',
    aliases: ['line-out', 'lineouts'],
  },
  {
    term: 'breakdown',
    def: "The contest for the ball right after a tackle, as both sides arrive to fight for possession (the ruck is the heart of it). Win the breakdown and you keep attacking; lose it and you're defending — it's where many games are decided.",
    sport: 'rugby',
  },
  {
    term: 'tackle',
    def: 'Bringing the ball-carrier to the ground to stop their run. Once tackled, the carrier must release the ball — which is what triggers the breakdown and the scramble for possession.',
    sport: 'rugby',
    aliases: ['tackled', 'tackles'],
  },
  {
    term: 'knock-on',
    def: "When a player drops the ball forward or it bounces forward off their hands or arms. It's a turnover — the other team gets a scrum, because you can't pass or drop the ball toward the opponent's goal.",
    sport: 'rugby',
    aliases: ['knock on', 'knocked on'],
  },

  // --- Rules newcomers ask about ---
  {
    term: 'offside',
    def: "Being in front of the ball or the teammate who last played it — you can't just lurk near the opponent's line waiting for a pass. It's only punished if you interfere with play; otherwise you have to get back onside first. At a ruck or maul, the offside line runs through the last player's hindmost foot.",
    sport: 'rugby',
    aliases: ['offsides', 'off-side'],
  },
  {
    term: 'forward pass',
    def: "Throwing the ball toward the opponent's goal line — which is illegal. You can run or kick it forward, but you can only PASS it backward or sideways. A forward pass gives the other team a scrum.",
    sport: 'rugby',
    aliases: ['forward passes', 'throw forward'],
  },
  {
    term: 'advantage',
    def: "When a team commits an infringement but the other team is in a better spot by playing on, the ref lets play continue instead of stopping it — calling 'advantage.' If nothing comes of it, the ref brings play back to the original penalty. Keeps the game flowing.",
    sport: 'rugby',
  },
  {
    term: 'sin bin',
    def: "Where a player sits for 10 minutes after a yellow card, leaving their team a man down. Rugby's penalty box — for repeated infringements or a dangerous-but-not-malicious foul. Two yellows in a match add up to a red.",
    sport: 'rugby',
    aliases: ['yellow card', 'yellow-carded'],
  },
  {
    term: 'red card',
    def: "A sending-off for serious foul play. For the worst, deliberate offenses it's permanent — the team plays the rest of the game a man down. For dangerous-but-not-deliberate ones (newer 20-minute red), the player still goes for good but a teammate can replace them after 20 minutes.",
    sport: 'rugby',
    aliases: ['red-carded'],
  },

  // --- Who's who (positions newcomers keep asking about) ---
  {
    term: 'forwards',
    def: "The eight bigger, stronger players (numbers 1–8) who do the heavy work — scrums, lineouts, and winning the ball at rucks and mauls. Think of them as the engine room: they grind out possession so the backs can score.",
    sport: 'rugby',
    aliases: ['forward', 'the pack', 'pack'],
  },
  {
    term: 'backs',
    def: "The seven faster, more agile players (numbers 9–15) who take the ball the forwards win and try to score — running, passing, and kicking in open space. Generally the speed and skill of the team.",
    sport: 'rugby',
    aliases: ['back', 'backline', 'back line'],
  },
  {
    term: 'scrum-half',
    def: "The number 9 — the link between forwards and backs. They dig the ball out of rucks, scrums, and mauls and fire it out to the backs. Usually one of the smallest, quickest, chattiest players, and a key decision-maker.",
    sport: 'rugby',
    aliases: ['scrumhalf', 'scrum half', 'halfback'],
  },
  {
    term: 'fly-half',
    def: "The number 10 — the playmaker who usually gets the ball from the scrum-half and decides what the team does: pass, run, or kick. The tactical brain of the backline, and often the main goal-kicker.",
    sport: 'rugby',
    aliases: ['flyhalf', 'fly half', 'out-half', 'stand-off', 'first five-eighth'],
  },
  {
    term: 'fullback',
    def: "The number 15 — the last line of defense, playing deep behind everyone to field the opposition's kicks. On attack they often join the backline as an extra runner. Need a safe catch under a high ball and a big boot.",
    sport: 'rugby',
    aliases: ['full-back', 'full back'],
  },
  {
    term: 'prop',
    def: "The numbers 1 and 3 — the powerhouses on either side of the front row who do the heavy pushing in the scrum. Among the strongest players on the field; it's a specialist job, since a collapsed scrum can be dangerous.",
    sport: 'rugby',
    aliases: ['props', 'loosehead', 'tighthead'],
  },
  {
    term: 'hooker',
    def: "The number 2 — the front-row forward in the middle of the scrum who 'hooks' the ball back with their foot to win it. Also usually the player who throws the ball into the lineout, so accuracy matters.",
    sport: 'rugby',
    aliases: ['hookers'],
  },
  {
    term: 'lock',
    def: "The numbers 4 and 5 (the 'second row') — typically the tallest players, the main power in the scrum and the primary targets lifted to catch the ball in lineouts. The workhorses of the pack.",
    sport: 'rugby',
    aliases: ['locks', 'second row'],
  },
  {
    term: 'back row',
    def: "The three forwards at the back of the scrum — two flankers (6 and 7) and the number 8. Usually the most mobile forwards: first to the breakdown, big tacklers, and ball-carriers who link the forwards and backs.",
    sport: 'rugby',
    aliases: ['flanker', 'flankers', 'number 8', 'number eight', 'loose forwards'],
  },

  // --- In-game play & tactics (terms that show up explaining what just happened) ---
  {
    term: 'turnover',
    def: "When the team with the ball loses it to the other team — at a tackle, a ruck, a knock-on, or a steal. A turnover flips who's attacking, and a well-timed one can swing momentum instantly.",
    sport: 'rugby',
    aliases: ['turnovers', 'turned over'],
  },
  {
    term: 'jackal',
    def: "When a defender gets over the ball right after a tackle and tries to rip it away before the ruck forms — a steal at the breakdown. A great jackal (often by a flanker) wins a turnover or a penalty; do it a fraction too late and you're the one penalized.",
    sport: 'rugby',
    aliases: ['jackals', 'jackaled', 'poach', 'poacher'],
  },
  {
    term: 'offload',
    def: "A pass made in the act of being tackled, slipping the ball to a teammate before going to ground. It keeps the attack flowing and skips the slow ruck — one of the most exciting, skillful plays in the game.",
    sport: 'rugby',
    aliases: ['offloads', 'offloaded'],
  },
  {
    term: 'phase',
    def: "One cycle of play between breakdowns: the ball comes out of a ruck, the team attacks until the next tackle, and that's a phase. 'Multi-phase play' means stringing several together, grinding forward and wearing the defense down.",
    sport: 'rugby',
    aliases: ['phases', 'phase play'],
  },
  {
    term: 'the 22',
    def: "The line 22 meters out from each try line. It matters for kicking: inside your own 22 you can kick the ball directly out of bounds and gain ground; outside it, you can't. The zone where defenses tighten and attacks get dangerous.",
    sport: 'rugby',
    aliases: ['22', '22-metre line', '22 metre line'],
  },
  {
    term: 'up-and-under',
    def: "A high, hanging kick sent up so the kicker's own team can chase and contest it as it drops — putting the catcher under heavy pressure. Also called a garryowen or a bomb. A way to turn a kick into a 50/50 contest for the ball.",
    sport: 'rugby',
    aliases: ['up and under', 'garryowen', 'bomb', 'high ball'],
  },
  {
    term: 'box kick',
    def: "A kick by the scrum-half, lofted high and over their shoulder from the back of a ruck or maul, usually down the touchline for the wingers to chase. A common way to escape pressure and turn defense into a contest downfield.",
    sport: 'rugby',
    aliases: ['box kicks'],
  },
  {
    term: 'grubber',
    def: "A kick along the ground that bounces and rolls awkwardly — because the ball is oval, it skips unpredictably, making it hard to pick up. Often poked through or behind the defense for a teammate to chase.",
    sport: 'rugby',
    aliases: ['grubber kick', 'grubbers'],
  },
  {
    term: 'kick for touch',
    def: "Kicking the ball out of bounds on purpose to gain territory — play restarts with a lineout where it went out. The main way teams trade field position, especially clearing their own end or pushing toward the opponent's line.",
    sport: 'rugby',
    aliases: ['kicked for touch', 'kick to touch', 'into touch', 'touch'],
  },
  {
    term: 'territory',
    def: "Which end of the field play is happening in — a core rugby idea. Teams kick to win territory, pinning the opponent deep so any mistake hands over good attacking position. Often matters as much as possession.",
    sport: 'rugby',
  },
  {
    term: 'possession',
    def: "Simply which team has the ball. Rugby is a battle to win possession (at scrums, lineouts, and breakdowns) and then keep it through phases — you can't score without it, and giving it away cheaply is costly.",
    sport: 'rugby',
  },
  {
    term: 'line break',
    def: "When an attacker bursts clean through the defensive line into open space behind it. One of the most dangerous moments in rugby — a line break often leads to a try if support arrives.",
    sport: 'rugby',
    aliases: ['line breaks', 'linebreak', 'break the line'],
  },
];
