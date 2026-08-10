// Stat Geek — the analytics glossary.
//
// The stats people hear on broadcasts and sports radio and nod along to: WAR, EPA, PER, DVOA,
// true shooting. Distinct from two neighbours it deliberately does NOT touch:
//   • lib/coachSpeak.ts   — NFL TACTICAL vocabulary (12 personnel, big nickel). Stays NFL-only.
//   • lib/glossary/       — the 400-term rules/jargon bank that powers tap-a-term inside
//                           explanations, Term Match and Jeopardy. Different job, different shape.
//
// This one is CROSS-SPORT by construction: entries carry their own `sport`, and the piece is
// registered under every sport it covers rather than living beneath one tile.
//
// Not gated behind Pro. Coach's Corner is free by design — LiveScreen's cap card points capped
// users here as a still-free surface — so gating this would contradict the app's own copy.
//
// AUTHORING NOTE: the three fields answer three different questions, and keeping them distinct is
// what makes the entry useful rather than a dictionary line:
//   means — the real, checkable definition (what it IS)
//   why   — the plain-English significance (why anyone computes it)
//   heard — a real broadcast sentence (how you'll actually encounter it)

/** The three sports Stat Geek covers today. NOTE these are CONTENT keys, not app Sport keys —
 *  the app calls them 'mlb' | 'nfl' | 'nba'. See SPORT_KEY_TO_STAT_SPORT below. */
export type StatGeekSport = 'baseball' | 'football' | 'basketball';

export interface StatGeekEntry {
  term: string;
  aka?: string;
  sport: StatGeekSport;
  category: string;
  means: string;   // the real/technical definition
  why: string;     // plain-English significance
  heard: string;   // a realistic broadcast-booth sentence using it
}

export const STAT_GEEK_ENTRIES: StatGeekEntry[] = [

  // ============ BASEBALL (20) ============

  {
    term: "WAR",
    aka: "Wins Above Replacement",
    sport: "baseball",
    category: "Overall Value",
    means: "An estimate of how many more wins a player is worth than a freely available minor-league replacement, combining hitting, fielding, baserunning, and (for pitchers) run prevention into one number.",
    why: "It's the single 'how good is this guy, total' number. A 6 WAR season is an MVP-caliber year; a 0-1 WAR player is replaceable.",
    heard: "\"He's been worth 4 wins above replacement already, and it's only July.\""
  },
  {
    term: "OPS",
    aka: "On-base Plus Slugging",
    sport: "baseball",
    category: "Batting",
    means: "On-base percentage plus slugging percentage, added together.",
    why: "A quick one-number combo of 'does he get on base' and 'does he hit for power' — better than average alone, though it double-counts OBP a bit.",
    heard: "\"He's carrying an .850 OPS this year, way up from last season.\""
  },
  {
    term: "OPS+",
    sport: "baseball",
    category: "Batting",
    means: "OPS adjusted for the player's home ballpark and league, scaled so 100 is league average.",
    why: "Lets you compare hitters across different ballparks and eras fairly — a hitter in a pitcher-friendly park gets credit for it.",
    heard: "\"140 OPS+ — that means he's been 40 percent better than a league-average hitter.\""
  },
  {
    term: "wRC+",
    aka: "Weighted Runs Created Plus",
    sport: "baseball",
    category: "Batting",
    means: "A park- and league-adjusted stat measuring total offensive value per plate appearance, weighting each outcome (walk, single, homer) by its actual run value, scaled so 100 is average.",
    why: "Considered the most accurate single 'how good is this hitter' number — more precise than OPS+ because it weights outcomes correctly instead of just adding two rates together.",
    heard: "\"His wRC plus is 155 — he's been one of the best hitters in baseball this year.\""
  },
  {
    term: "wOBA",
    aka: "Weighted On-Base Average",
    sport: "baseball",
    category: "Batting",
    means: "A rate stat, scaled like OBP, where every offensive outcome (walk, single, double, homer, etc.) is weighted by how much it actually contributes to scoring runs.",
    why: "It's the building block behind wRC+ — a fairer 'one number' than batting average because a walk and a home run aren't treated as equally 'not making an out.'",
    heard: "\"League average wOBA is around .320 — he's sitting at .390.\""
  },
  {
    term: "BABIP",
    aka: "Batting Average on Balls In Play",
    sport: "baseball",
    category: "Batting",
    means: "Batting average calculated only on balls put in play — strikeouts and home runs are excluded.",
    why: "Tells you if a hitter (or the pitcher facing him) is running hot or cold on balls in play — useful for spotting luck versus real talent.",
    heard: "\"His BABIP is way above his career average — some regression might be coming.\""
  },
  {
    term: "ISO",
    aka: "Isolated Power",
    sport: "baseball",
    category: "Batting",
    means: "Slugging percentage minus batting average.",
    why: "Strips out singles so you see pure extra-base power on its own, separate from how often he simply makes contact.",
    heard: "\"He's got a .250 ISO — that's serious pop.\""
  },
  {
    term: "AVG",
    aka: "Batting Average",
    sport: "baseball",
    category: "Batting / Slash Line",
    means: "Hits divided by at-bats.",
    why: "The oldest, most familiar hitting stat — how often he gets a hit — but it treats a single and a home run the same and ignores walks entirely.",
    heard: "\"He's hitting .295 on the season.\""
  },
  {
    term: "OBP",
    aka: "On-Base Percentage",
    sport: "baseball",
    category: "Batting / Slash Line",
    means: "How often a batter reaches base safely via hit, walk, or hit-by-pitch, divided by plate appearances (roughly).",
    why: "Measures how often he simply doesn't make an out — a walk counts the same as a single here, which AVG ignores.",
    heard: "\"His on-base percentage is .380 — he doesn't make an out very often.\""
  },
  {
    term: "SLG",
    aka: "Slugging Percentage",
    sport: "baseball",
    category: "Batting / Slash Line",
    means: "Total bases divided by at-bats (a double counts as 2, a triple as 3, a homer as 4).",
    why: "Measures raw power — how much damage he does when he does get a hit, not just whether he gets one.",
    heard: "\"He's slugging .520 — real power numbers.\""
  },
  {
    term: "Slash Line",
    sport: "baseball",
    category: "Batting / Slash Line",
    means: "The three-number shorthand AVG/OBP/SLG written together, like .275/.340/.460.",
    why: "One quick snapshot of a hitter's whole offensive game: how often he gets a hit, how often he reaches base any way, and how much power he has.",
    heard: "\"He's slashing .275, .340, .460 — solid across the board.\""
  },
  {
    term: "ERA+",
    sport: "baseball",
    category: "Pitching",
    means: "ERA adjusted for ballpark and league, scaled so 100 is league average; higher is better.",
    why: "Same idea as OPS+ but for pitchers — lets you compare a pitcher's ERA fairly across different parks and eras.",
    heard: "\"His ERA plus is 128 — he's been 28 percent better than league average.\""
  },
  {
    term: "FIP",
    aka: "Fielding Independent Pitching",
    sport: "baseball",
    category: "Pitching",
    means: "An ERA-like stat built only from strikeouts, walks, hit-by-pitches, and home runs — the outcomes a pitcher controls most directly, removing the defense behind him.",
    why: "Shows what a pitcher's ERA 'should' look like if his defense and luck on balls in play were average — useful when ERA and performance seem to disagree.",
    heard: "\"His ERA is 4.50 but his FIP is 3.60 — his defense hasn't been doing him any favors.\""
  },
  {
    term: "WHIP",
    aka: "Walks plus Hits per Inning Pitched",
    sport: "baseball",
    category: "Pitching",
    means: "(Walks + hits allowed) divided by innings pitched.",
    why: "A quick read on how many baserunners a pitcher allows per inning — lower is better.",
    heard: "\"He's got a 1.05 WHIP — barely letting anybody on base.\""
  },
  {
    term: "K/9",
    aka: "Strikeouts per 9 Innings",
    sport: "baseball",
    category: "Pitching",
    means: "A pitcher's strikeout total, scaled to a rate per 9 innings pitched.",
    why: "Measures strikeout ability as a rate rather than a raw total, so pitchers with different amounts of playing time can be compared fairly.",
    heard: "\"He's striking out over 11 batters per 9 innings this year.\""
  },
  {
    term: "BB/9",
    aka: "Walks per 9 Innings",
    sport: "baseball",
    category: "Pitching",
    means: "A pitcher's walk total, scaled to a rate per 9 innings pitched.",
    why: "Shows how often a pitcher loses the strike zone, independent of how many innings he's thrown.",
    heard: "\"His walk rate has crept up to over 4 per 9 innings lately.\""
  },
  {
    term: "DRS",
    aka: "Defensive Runs Saved",
    sport: "baseball",
    category: "Defense",
    means: "An estimate of how many runs a fielder saved or cost his team compared to an average defender at his position.",
    why: "Puts a number on defense the same way OPS puts a number on hitting — is he actually good with the glove, not just reputation.",
    heard: "\"He's saved 12 runs with his glove this year — legit Gold Glove case.\""
  },
  {
    term: "OAA",
    aka: "Outs Above Average",
    sport: "baseball",
    category: "Defense",
    means: "A Statcast metric estimating how many extra outs a fielder converts compared to an average fielder, based on the difficulty of each play.",
    why: "A modern, tracking-data version of defensive value — accounts for how hard each play actually was, not just whether it was made.",
    heard: "\"He's a plus-9 in Outs Above Average — one of the best defenders at his position.\""
  },
  {
    term: "Barrel %",
    sport: "baseball",
    category: "Statcast",
    means: "The percentage of a hitter's batted balls that combine an ideal exit velocity and launch angle — the batted-ball type most likely to become an extra-base hit.",
    why: "Tells you how often he's really squaring the ball up, regardless of whether it happened to find a fielder or not.",
    heard: "\"His barrel rate is in the 90th percentile — he's crushing the ball consistently.\""
  },
  {
    term: "Exit Velocity",
    sport: "baseball",
    category: "Statcast",
    means: "How fast the ball is traveling off the bat, measured in mph, right after contact.",
    why: "A direct measure of raw contact quality — how hard he's hitting the ball, independent of where it goes or whether it's caught.",
    heard: "\"That ball left the bat at 108 miles an hour.\""
  },

  // ============ FOOTBALL (13 — see the count note in the header of this file) ============

  {
    term: "EPA",
    aka: "Expected Points Added",
    sport: "football",
    category: "Overall Value",
    means: "The change in a team's expected points before and after a play, based on down, distance, and field position from historical data.",
    why: "Tells you whether a play actually helped the offense score, more than just 'positive yardage' does — a 3-yard gain on 3rd-and-2 helps a lot more than 3 yards on 3rd-and-10.",
    heard: "\"That was a plus-0.4 EPA play — real value even though it only gained 4 yards.\""
  },
  {
    term: "DVOA",
    aka: "Defense-adjusted Value Over Average",
    sport: "football",
    category: "Overall Value",
    means: "A per-play efficiency rating (from Football Outsiders) comparing a team or player's performance to league average, adjusted for the strength of the opponent faced on each play.",
    why: "Answers 'how good are they, accounting for who they've actually played' rather than just raw yards or points.",
    heard: "\"They rank 3rd in defensive DVOA, and that's against a tough slate of offenses.\""
  },
  {
    term: "QBR",
    aka: "Total Quarterback Rating",
    sport: "football",
    category: "Passing",
    means: "ESPN's 0-100 quarterback grade that weighs every play (including scrambles and sacks) by its game situation and win-probability impact, not just the old passer-rating formula.",
    why: "A more complete single QB grade than the traditional passer rating, which ignores sacks and rushing entirely.",
    heard: "\"His QBR is 78 tonight — he's playing about as well as you can play.\""
  },
  {
    term: "CPOE",
    aka: "Completion % Over Expected",
    sport: "football",
    category: "Passing",
    means: "A QB's actual completion percentage minus the completion percentage expected given the difficulty (distance, coverage, target separation) of his throws.",
    why: "Separates real accuracy from just throwing a lot of easy checkdowns — a QB can have a high completion percentage but a low CPOE if his throws are mostly safe and short.",
    heard: "\"He's plus-6 in completion percentage over expected — he's been more accurate than the throws alone would suggest.\""
  },
  {
    term: "Success Rate",
    sport: "football",
    category: "Efficiency",
    means: "The percentage of plays that gain enough yardage relative to down and distance to be considered a 'successful' play (roughly: 40% of needed yards on 1st down, 60% on 2nd, 100% on 3rd/4th).",
    why: "A cleaner efficiency measure than yards per play, since it credits plays that actually move the chains rather than just padding a stat with one big gain.",
    heard: "\"They're at a 48 percent success rate on early downs — that's what's keeping the offense on schedule.\""
  },
  {
    term: "ANY/A",
    aka: "Adjusted Net Yards per Attempt",
    sport: "football",
    category: "Passing",
    means: "A passing-efficiency stat: (passing yards + 20×TD − 45×INT − sack yards) divided by (attempts + sacks).",
    why: "Considered a better single passing-efficiency number than the old passer rating, because it properly bakes in the cost of sacks and interceptions.",
    heard: "\"His ANY/A is over 8 this year — elite efficiency, sacks and picks included.\""
  },
  {
    term: "YAC",
    aka: "Yards After Catch",
    sport: "football",
    category: "Receiving",
    means: "The yards a receiver or running back gains after making the catch, not counting the distance the ball traveled in the air.",
    why: "Separates what the quarterback's arm did from what the receiver did with the ball once he had it.",
    heard: "\"He turned a 3-yard slant into a 40-yard gain — 37 of those were yards after catch.\""
  },
  {
    term: "Air Yards",
    sport: "football",
    category: "Passing",
    means: "The distance the ball travels in the air from the line of scrimmage to the point of the catch (or incompletion), not counting YAC.",
    why: "Shows how far downfield a quarterback is actually throwing, separate from what happens after the catch.",
    heard: "\"He's averaging over 9 air yards per attempt — he's pushing the ball down the field.\""
  },
  {
    term: "PFF Grade",
    aka: "Pro Football Focus Grade",
    sport: "football",
    category: "Overall Value",
    means: "A play-by-play, 0-100-scaled grade from Pro Football Focus analysts who charted every player on every snap.",
    why: "A film-based grade rather than a pure stats-based one — tries to capture things box scores miss, like blocking or coverage.",
    heard: "\"He posted a 91 pass-blocking grade from PFF — one of the best games of his career up front.\""
  },
  {
    term: "Explosive Play Rate",
    sport: "football",
    category: "Efficiency",
    means: "The percentage of an offense's plays that gain a big chunk of yardage at once (commonly defined as 15+ yards passing or 10+ yards rushing).",
    why: "Big plays are disproportionately valuable for scoring, so this tracks how often an offense creates them, separate from steady, grind-it-out yardage.",
    heard: "\"Their explosive play rate is top-5 in the league — they're built on chunk plays.\""
  },
  {
    term: "Havoc Rate",
    sport: "football",
    category: "Defense",
    means: "The percentage of a defense's plays that result in a tackle for loss, forced fumble, pass breakup, or interception.",
    why: "Measures how disruptive a defense is — how often they blow up a play behind the line or force a mistake, not just whether they eventually stopped the drive.",
    heard: "\"That defensive line generates havoc on almost a fifth of snaps.\""
  },
  {
    term: "Points Per Drive",
    sport: "football",
    category: "Efficiency",
    means: "The average number of points an offense scores per possession.",
    why: "A cleaner measure of offensive effectiveness than total points, since it accounts for how many chances a team actually got.",
    heard: "\"They're averaging 2.8 points per drive, best mark in the league.\""
  },
  {
    term: "Red Zone Efficiency",
    sport: "football",
    category: "Efficiency",
    means: "The percentage of trips inside the opponent's 20-yard line that end in a touchdown.",
    why: "Shows how well a team finishes drives once they're already in scoring position — a team can move the ball well between the 20s and still struggle here.",
    heard: "\"They're settling for field goals too much — their red zone efficiency is bottom-5.\""
  },

  // ============ BASKETBALL (12) ============

  {
    term: "PER",
    aka: "Player Efficiency Rating",
    sport: "basketball",
    category: "Overall Value",
    means: "A per-minute, pace-adjusted rating combining a player's positive contributions (scoring, rebounds, assists, steals, blocks) and negative ones (missed shots, turnovers, fouls) into one number, where 15 is league average.",
    why: "A quick single-number snapshot of overall statistical production, though it leans offensive and doesn't fully capture defense.",
    heard: "\"He's putting up a 26 PER — that's an All-NBA-caliber efficiency number.\""
  },
  {
    term: "TS%",
    aka: "True Shooting Percentage",
    sport: "basketball",
    category: "Scoring",
    means: "A shooting-efficiency stat that properly accounts for the extra value of 3-pointers and the free throws a player draws, unlike plain field goal percentage.",
    why: "The most accurate single number for 'how efficiently does he score,' because it doesn't undervalue 3-point shooting or ignore free-throw trips the way FG% does.",
    heard: "\"He's shooting 62 percent true shooting — elite efficiency for his volume.\""
  },
  {
    term: "eFG%",
    aka: "Effective Field Goal Percentage",
    sport: "basketball",
    category: "Scoring",
    means: "Field goal percentage adjusted so a made 3-pointer counts as worth 1.5 made 2-pointers, reflecting its extra point value.",
    why: "Fixes plain FG%'s blind spot: it credits a player properly for shooting well from 3, instead of treating every make the same.",
    heard: "\"His effective field goal percentage jumps way up once you account for how many threes he's hitting.\""
  },
  {
    term: "BPM",
    aka: "Box Plus-Minus",
    sport: "basketball",
    category: "Overall Value",
    means: "An estimate, built from box-score stats, of a player's contribution in points per 100 possessions compared to a league-average player.",
    why: "A single all-around impact estimate, useful for comparing players across positions and roles at a glance.",
    heard: "\"His BPM is plus-7 — among the most productive players in the league by this measure.\""
  },
  {
    term: "VORP",
    aka: "Value Over Replacement Player",
    sport: "basketball",
    category: "Overall Value",
    means: "An estimate of a player's total value over a season compared to a readily available 'replacement-level' player, built from BPM and playing time.",
    why: "Basketball's version of baseball's WAR — bundles quality and quantity of playing time into one 'how much did he matter' number.",
    heard: "\"He leads the league in VORP — not just efficient, but he's playing a ton of minutes at that level.\""
  },
  {
    term: "Usage Rate",
    aka: "Usage %",
    sport: "basketball",
    category: "Role",
    means: "The percentage of his team's offensive possessions that end with that player shooting, drawing a shooting foul, or turning the ball over, while he's on the floor.",
    why: "Measures how much of the offense 'runs through' him — a high-usage, low-efficiency player is a different problem than a low-usage, low-efficiency one.",
    heard: "\"He's got a 34 percent usage rate — he's the clear first option on that offense.\""
  },
  {
    term: "ORTG",
    aka: "Offensive Rating",
    sport: "basketball",
    category: "Team Efficiency",
    means: "Points scored per 100 possessions, for a team or attributed to an individual player's time on court.",
    why: "A pace-neutral way to measure offensive effectiveness — fair to compare a fast team and a slow team.",
    heard: "\"They've got a 118 offensive rating this season, top of the league.\""
  },
  {
    term: "DRTG",
    aka: "Defensive Rating",
    sport: "basketball",
    category: "Team Efficiency",
    means: "Points allowed per 100 possessions, for a team or attributed to an individual player's time on court.",
    why: "The defensive mirror of ORTG — pace-adjusted, so you can fairly compare defenses that play at different speeds.",
    heard: "\"Their defensive rating with him on the floor is 6 points better than with him off it.\""
  },
  {
    term: "Net Rating",
    sport: "basketball",
    category: "Team Efficiency",
    means: "Offensive rating minus defensive rating.",
    why: "The single cleanest 'how good is this team (or lineup), overall' number, since it nets out both ends of the floor.",
    heard: "\"That lineup has a net rating of plus-15 — they're dominating their minutes together.\""
  },
  {
    term: "Win Shares",
    sport: "basketball",
    category: "Overall Value",
    means: "An estimate of the number of wins a player has individually contributed to his team's total, split into offensive and defensive win shares.",
    why: "Translates a player's stats directly into 'wins,' the currency that actually matters, rather than an abstract rate number.",
    heard: "\"He's third in the league in win shares — a huge part of why they're winning.\""
  },
  {
    term: "PIE",
    aka: "Player Impact Estimate",
    sport: "basketball",
    category: "Overall Value",
    means: "The NBA's own all-in-one stat measuring a player's overall statistical contribution as a share of all statistical events in games he plays.",
    why: "A simpler, official-NBA-stats-site alternative to PER or BPM for a quick 'how big a piece of the game was he' read.",
    heard: "\"His PIE is 18 percent tonight — he was all over the box score.\""
  },
  {
    term: "Plus/Minus",
    sport: "basketball",
    category: "Team Efficiency",
    means: "The point differential for the team while a specific player is on the court.",
    why: "A blunt but simple 'is his team better or worse with him out there' snapshot, though it's heavily influenced by teammates and matchups.",
    heard: "\"He was a plus-19 in his 30 minutes tonight.\""
  },

];

/** Entries for one sport, or all of them when no sport is given. Mirrors getGlossary(sport). */
export function getStatGeek(sport?: StatGeekSport): StatGeekEntry[] {
  return sport ? STAT_GEEK_ENTRIES.filter(e => e.sport === sport) : STAT_GEEK_ENTRIES;
}

/** The app's Sport keys are not the content keys — map before calling getStatGeek. */
export const SPORT_KEY_TO_STAT_SPORT: Record<string, StatGeekSport> = {
  mlb: 'baseball',
  nfl: 'football',
  nba: 'basketball',
};

/** Distinct categories present for a sport, in first-appearance order (drives the pills). */
export function categoriesFor(sport: StatGeekSport): string[] {
  const seen: string[] = [];
  for (const e of getStatGeek(sport)) if (!seen.includes(e.category)) seen.push(e.category);
  return seen;
}

/**
 * Free-text search across term, alias and definition — the same tolerance Coach Speak uses,
 * because the whole point is that someone half-remembers what they heard. Case- and
 * punctuation-insensitive, so "wRC+" / "wrc plus" / "WRC" all find the same entry.
 */
export function searchStatGeek(query: string, sport?: StatGeekSport): StatGeekEntry[] {
  const pool = getStatGeek(sport);
  const q = query.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
  if (!q) return pool;
  return pool.filter(e => {
    const hay = `${e.term} ${e.aka ?? ''} ${e.means}`.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    return hay.includes(q);
  });
}
