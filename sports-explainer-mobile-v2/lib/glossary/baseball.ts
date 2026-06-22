import { GlossaryEntry } from './types';

// Curated baseball glossary — 71 terms. Definitions are authored content shown
// verbatim in the tappable-definition box; do not rewrite them. Defs containing an
// apostrophe use double-quoted strings to keep the build safe.
export const BASEBALL_GLOSSARY: GlossaryEntry[] = [
  // --- The basics ---
  {
    term: 'strike',
    def: "A pitch the batter swings at and misses, takes when it was in the strike zone, or hits foul (with less than two strikes). Three of them and he's out.",
    sport: 'mlb',
    aliases: ['strikes'],
  },
  {
    term: 'ball',
    def: "A pitch outside the strike zone that the batter doesn't swing at. Four of them and he gets a free walk to first.",
    sport: 'mlb',
  },
  {
    term: 'out',
    def: "When the batting team loses a player's turn — by strikeout, a caught ball, or being tagged or forced. Three outs and the team's half of the inning is over.",
    sport: 'mlb',
    aliases: ['outs'],
  },
  {
    term: 'safe',
    def: 'When a runner reaches a base without being put out. The opposite of out — he stays on the base, alive.',
    sport: 'mlb',
  },
  {
    term: 'hit',
    def: "When a batter puts the ball in play and reaches base safely without the help of an error or a fielder's choice. The basic way to earn your way on.",
    sport: 'mlb',
    aliases: ['hits', 'base hit'],
  },
  {
    term: 'single',
    def: 'A hit good for one base. The most common hit — the batter reaches first safely.',
    sport: 'mlb',
    aliases: ['singles'],
  },
  {
    term: 'double',
    def: 'A hit good for two bases. Solid contact into a gap that gets the batter to second.',
    sport: 'mlb',
    aliases: ['doubles'],
  },
  {
    term: 'triple',
    def: 'A hit good for three bases. One of the most exciting plays in the game — it takes real contact and real speed.',
    sport: 'mlb',
    aliases: ['triples'],
  },
  {
    term: 'foul ball',
    def: "A ball hit outside the foul lines. It counts as a strike — but never as the third strike, so a batter can foul off pitch after pitch and stay alive.",
    sport: 'mlb',
    aliases: ['foul', 'fouled off', 'fouls off', 'foul balls'],
  },
  {
    term: 'count',
    def: 'The running tally of balls and strikes on the batter right now, always said balls-first ("2-1" means 2 balls, 1 strike). It tells you who is ahead in the at-bat — the pitcher or the hitter.',
    sport: 'mlb',
  },
  {
    term: 'strike zone',
    def: 'The invisible box over home plate, roughly from the knees to the lower chest, where a pitch can be called a strike. The whole pitcher-hitter battle is fought over its edges.',
    sport: 'mlb',
  },

  // --- The at-bat ---
  {
    term: 'at-bat',
    def: "A batter's official turn that counts toward his batting average, usually ending in a hit or an out. Not every trip to the plate is an at-bat — a walk, for one, doesn't count.",
    sport: 'mlb',
    aliases: ['at-bats', 'at bat', 'at bats'],
  },
  {
    term: 'plate appearance',
    def: 'Any complete trip to the plate, however it ends — hit, out, walk, hit by pitch, all of it. The wider count that at-bats are a subset of.',
    sport: 'mlb',
    aliases: ['plate appearances'],
  },
  {
    term: 'strikeout',
    def: 'When the batter gets three strikes and is out. The pitcher\'s cleanest way to get rid of a hitter — no fielders needed.',
    sport: 'mlb',
    aliases: ['strikeouts', 'struck out', 'strikes out'],
  },
  {
    term: 'strikeout looking',
    def: 'A strikeout where the batter takes the third strike without swinging, frozen because he guessed wrong. More embarrassing than swinging and missing.',
    sport: 'mlb',
    aliases: ['struck out looking', 'caught looking'],
  },
  {
    term: 'walk',
    def: "When a batter takes four balls and gets to go to first base for free, no hit required. The pitcher's mistake, not the batter's reward.",
    sport: 'mlb',
    aliases: ['walks', 'walked'],
  },
  {
    term: 'hit by pitch',
    def: "When a pitch hits the batter and he's awarded first base. Sometimes accidental, sometimes the price of crowding the plate.",
    sport: 'mlb',
    aliases: ['hit by a pitch'],
  },
  {
    term: 'full count',
    def: 'Three balls and two strikes — the maximum before something has to happen. The next pitch ends the at-bat one way or another, so the tension peaks here.',
    sport: 'mlb',
  },

  // --- Count states ---
  {
    term: 'ahead in the count',
    def: 'When the pitcher has more strikes than balls (like 0-2 or 1-2). He can waste a pitch or two and tempt the hitter into chasing something nasty.',
    sport: 'mlb',
  },
  {
    term: 'behind in the count',
    def: 'When the hitter has more balls than strikes (like 2-0 or 3-1). The pitcher has to throw something hittable, so the batter can sit and wait for it.',
    sport: 'mlb',
  },
  {
    term: "hitter's count",
    def: 'A count that favors the batter (2-0, 3-1), where he knows a strike is likely coming and can swing big. The green light to look for damage.',
    sport: 'mlb',
  },
  {
    term: "pitcher's count",
    def: 'A count that favors the pitcher (0-2, 1-2), where he can throw his nastiest stuff off the plate and dare the hitter to chase. The setup for the strikeout.',
    sport: 'mlb',
  },
  {
    term: 'lefty/righty matchup',
    def: "Whether the batter and pitcher throw from the same side or opposite sides. Hitters generally do better against the opposite hand — it's why managers shuffle pitchers and pinch hitters to chase the favorable side.",
    sport: 'mlb',
    aliases: ['lefty-righty matchup'],
  },

  // --- Pitches ---
  {
    term: 'fastball',
    def: 'The most basic pitch: thrown as hard as possible, mostly straight. Everything else a pitcher throws is designed to look like this and then not be.',
    sport: 'mlb',
    aliases: ['fastballs'],
  },
  {
    term: 'splitter',
    def: 'A pitch that looks like a fastball, then drops sharply right as it reaches the plate — like the ball falls off a table. Built to make hitters swing over the top of it.',
    sport: 'mlb',
    aliases: ['splitters'],
  },
  {
    term: 'slider',
    def: "A pitch that looks a bit like a fastball, then breaks sideways and down. One of the game's favorite out pitches, because the hitter has to decide before it finishes moving.",
    sport: 'mlb',
    aliases: ['sliders'],
  },
  {
    term: 'curveball',
    def: "A slower pitch with a big, top-to-bottom break. When it freezes a hitter, it's the timing and the drop that make it look wrong until it's too late.",
    sport: 'mlb',
    aliases: ['curveballs', 'curve'],
  },
  {
    term: 'changeup',
    def: 'A pitch thrown with fastball arm-speed but much slower, so the hitter swings too early. It is a lie told with the arm — everything looks like a fastball except the speed.',
    sport: 'mlb',
    aliases: ['changeups', 'change-up'],
  },
  {
    term: 'sinker',
    def: 'A fastball built to drop as it arrives, designed to get hitters to pound it into the ground. A ground-ball weapon first — but it can still miss bats.',
    sport: 'mlb',
    aliases: ['sinkers'],
  },
  {
    term: 'breaking ball',
    def: "Any pitch built to curve or dart instead of going straight (a curveball, slider, etc.). The whole point is to fool a hitter who's expecting a fastball.",
    sport: 'mlb',
    aliases: ['breaking balls', 'breaking pitch'],
  },
  {
    term: 'velocity',
    def: 'Simply how hard a pitch is thrown, in miles per hour. More velo gives the hitter less time to react — but straight and hard is still hittable if he is ready for it.',
    sport: 'mlb',
    aliases: ['velo'],
  },
  {
    term: 'put-away pitch',
    def: "The pitch a pitcher trusts most when he's ahead and needs one more strike. Some pitchers have one obvious finisher; others create it with the count and sequence.",
    sport: 'mlb',
  },
  {
    term: 'pitch sequencing',
    def: 'The order a pitcher throws his pitches to set up the one that gets the out — showing fastballs to make the off-speed pitch look unhittable. The chess, not the muscle.',
    sport: 'mlb',
    aliases: ['sequencing', 'sequenced'],
  },
  {
    term: 'wild pitch',
    def: "A pitch so far off-target the catcher can't handle it, letting runners advance. The pitcher's fault, officially — and often a rally-starter.",
    sport: 'mlb',
    aliases: ['wild pitches'],
  },

  // --- Hitting ---
  {
    term: 'home run',
    def: "A hit, usually over the outfield wall, that lets the batter circle all the bases and score, plus anyone already on. Baseball's loudest swing.",
    sport: 'mlb',
    aliases: ['home runs', 'homer', 'homers', 'homered'],
  },
  {
    term: 'grand slam',
    def: 'A home run with all three bases occupied, scoring four runs at once — the maximum on one swing. The biggest swing in baseball.',
    sport: 'mlb',
    aliases: ['grand slams'],
  },
  {
    term: 'line drive',
    def: 'A ball hit hard and on a flat, fast path — the kind of contact hitters want. Sharp and low, not lazy and high.',
    sport: 'mlb',
    aliases: ['line drives', 'lined'],
  },
  {
    term: 'ground ball',
    def: 'A ball hit onto the ground that rolls or bounces toward an infielder. It can become an easy out, a sneaky hit, or a way to move runners.',
    sport: 'mlb',
    aliases: ['ground balls', 'grounder', 'grounders', 'grounded out', 'grounds out', 'ground out'],
  },
  {
    term: 'fly ball',
    def: "A ball hit up into the air. If it hangs up, it's caught for an out; if it carries, it can turn into extra bases or a home run.",
    sport: 'mlb',
    aliases: ['fly balls', 'flied out', 'flies out', 'flyout'],
  },
  {
    term: 'pop-up',
    def: 'A ball hit very high but not far, usually an easy catch. It often means the hitter got under the ball instead of driving through it.',
    sport: 'mlb',
    aliases: ['pop up', 'popped up', 'pops up', 'popup'],
  },
  {
    term: 'bunt',
    def: 'Softly tapping the ball instead of swinging, usually to advance a runner or catch the defense napping. A finesse play in a power sport.',
    sport: 'mlb',
    aliases: ['bunts', 'bunted'],
  },
  {
    term: 'sacrifice fly',
    def: "A fly ball caught for an out that still lets a runner tag up and score from third. The batter's out, the team gets the run, and it doesn't count as an at-bat — a good trade.",
    sport: 'mlb',
    aliases: ['sacrifice flies', 'sac fly', 'sac flies'],
  },

  // --- Baserunning ---
  {
    term: 'stolen base',
    def: 'When a runner takes the next base without a hit, usually by sprinting as the pitch is thrown and beating the throw. Speed, timing, and nerve all in one.',
    sport: 'mlb',
    aliases: ['stolen bases', 'steal', 'steals', 'stole', 'stealing'],
  },
  {
    term: 'caught stealing',
    def: "When a runner tries to steal but the throw beats him and he's tagged out. The downside risk that makes stealing a gamble, not a freebie.",
    sport: 'mlb',
  },
  {
    term: 'tag up',
    def: "On a caught fly ball, a runner has to be on his original base after the catch before he can advance. It's why you'll see runners wait, then bolt the instant a deep fly is caught.",
    sport: 'mlb',
    aliases: ['tagged up', 'tagging up', 'tags up'],
  },
  {
    term: 'pickoff',
    def: 'When the pitcher (or catcher) throws to a base to catch a leading runner off it for a surprise out. The reason runners cannot stray too far.',
    sport: 'mlb',
    aliases: ['pick-off', 'picked off', 'pickoffs'],
  },
  {
    term: 'bases loaded',
    def: 'Runners on first, second, and third all at once. Maximum danger for the pitcher — any hit scores, and a walk or hit-by-pitch forces in a run.',
    sport: 'mlb',
  },
  {
    term: 'RISP',
    def: '"Runners In Scoring Position" — a runner on second or third, close enough to score on a single. When you hear it, the moment just got more important.',
    sport: 'mlb',
    aliases: ['runners in scoring position', 'scoring position'],
  },

  // --- Defense ---
  {
    term: 'error',
    def: 'A defensive mistake that lets a batter or runner advance when a normal play would have gotten the out. The scorer\'s way of saying "that one is on the fielder, not the pitcher."',
    sport: 'mlb',
    aliases: ['errors'],
  },
  {
    term: 'force out',
    def: 'An out made by getting the ball to a base the runner is required to advance to — no tag needed, just touch the bag first. The simplest out in the book.',
    sport: 'mlb',
    aliases: ['force play', 'forced out'],
  },
  {
    term: "fielder's choice",
    def: "When the defense goes after a different runner instead of the batter, so the batter reaches first but isn't credited with a hit. He's safe because of the defense's decision, not a clean hit.",
    sport: 'mlb',
  },
  {
    term: 'double play',
    def: 'One defensive play that records two outs at once, usually a ground ball turned into outs at two bases. The fastest way for a pitcher to escape trouble — it can erase a rally in a hurry.',
    sport: 'mlb',
    aliases: ['double plays', 'turned two'],
  },
  {
    term: 'infield',
    def: 'The area around the bases, guarded by the first baseman, second baseman, shortstop, and third baseman. Where ground balls and quick throws happen.',
    sport: 'mlb',
  },
  {
    term: 'outfield',
    def: 'The wide area beyond the infield, covered by the left, center, and right fielders. Where fly balls get chased down and home runs sail over.',
    sport: 'mlb',
  },

  // --- Pitching staff ---
  {
    term: 'bullpen',
    def: 'The relief pitchers who come in after the starter tires, and the area where they warm up. When you hear "going to the bullpen," the starter\'s day is ending.',
    sport: 'mlb',
    aliases: ['pen'],
  },
  {
    term: 'starter',
    def: "The pitcher who begins the game and, ideally, goes deep into it. The team's main arm for the day — everyone in the bullpen exists to follow him.",
    sport: 'mlb',
    aliases: ['starting pitcher'],
  },
  {
    term: 'reliever',
    def: 'Any pitcher who comes in after the starter. Often a specialist — for one inning, one matchup, or one big out.',
    sport: 'mlb',
    aliases: ['relievers', 'relief pitcher', 'relief pitchers'],
  },
  {
    term: 'closer',
    def: 'The relief pitcher a team trusts to pitch the final inning and protect a lead. A high-nerve specialist who exists for the last three outs.',
    sport: 'mlb',
    aliases: ['closers'],
  },
  {
    term: 'save',
    def: "Credit a relief pitcher gets for finishing a win under pressure, usually protecting a small lead late. It's the stat most tied to the closer's job.",
    sport: 'mlb',
    aliases: ['saves'],
  },

  // --- The stats ---
  {
    term: 'batting average',
    def: 'How often a batter gets a hit, shown as a decimal like .300 (three hits per ten at-bats). .300 is excellent; around .250 is solid; near .200 raises eyebrows.',
    sport: 'mlb',
  },
  {
    term: 'slugging',
    def: 'A stat that rewards total bases, counting doubles, triples, and homers more than singles. It measures power better than batting average does.',
    sport: 'mlb',
    aliases: ['slugging percentage'],
  },
  {
    term: 'ERA',
    def: 'Earned Run Average: roughly how many runs a pitcher gives up per nine innings, leaving out runs caused by errors. Lower is better — under 3.00 is excellent, around 4.00 is ordinary, north of 5.00 is trouble.',
    sport: 'mlb',
  },
  {
    term: 'RBI',
    def: 'Run Batted In: credit a batter gets when his play brings a runner home to score. It shows run production — but it also depends on having teammates on base to drive in.',
    sport: 'mlb',
    aliases: ['RBIs'],
  },

  // --- Game flow ---
  {
    term: 'inning',
    def: 'One of nine segments of a game, split into a top (away team bats) and bottom (home team bats). Each half ends when the batting team makes three outs.',
    sport: 'mlb',
    aliases: ['innings'],
  },
  {
    term: 'extra innings',
    def: "What happens when the game's tied after nine: they keep playing until one team finishes an inning ahead, or the home team walks it off in the bottom half. No clock, just pressure.",
    sport: 'mlb',
  },
  {
    term: 'walk-off',
    def: 'A game-ending play by the home team in the last inning — the moment they take the lead, the game is instantly over and everyone walks off. Baseball\'s most dramatic finish.',
    sport: 'mlb',
    aliases: ['walkoff', 'walk-off win'],
  },
  {
    term: 'no-hitter',
    def: "A game in which one team allows zero hits, even though runners can still reach by walk or error. One of the sport's rarest, tensest feats — and superstitious fans won't say it out loud while it's happening.",
    sport: 'mlb',
    aliases: ['no hitter'],
  },
  {
    term: 'leadoff',
    def: 'Either the first batter of an inning, or the hitter who bats first in the lineup. Traditionally a fast table-setter — though modern teams sometimes put real power there.',
    sport: 'mlb',
  },
  {
    term: 'pinch hitter',
    def: 'A substitute batter sent in to hit for someone else at a key moment, usually for a better matchup. Once he comes in, the player he replaced is done for the day.',
    sport: 'mlb',
    aliases: ['pinch-hitter', 'pinch hit', 'pinch-hit'],
  },
  {
    term: 'designated hitter',
    def: "A player who bats in place of the pitcher and doesn't play the field. It's why pitchers in modern MLB rarely hit anymore.",
    sport: 'mlb',
    aliases: ['DH'],
  },
  {
    term: 'double switch',
    def: "A two-player substitution that also changes where the pitcher's spot lands in the batting order. A classic National League move that's gotten rare with the universal DH — and still confusing enough that broadcasters slow down to explain it.",
    sport: 'mlb',
  },
];
