import { Sport } from './api';

// Academy content banks — used by the Academy tab's "Did You Know" card and
// "Quick Quiz". English-only for v1 (no translation layer yet); flag for native
// localization before launch alongside the tennis/golf/cricket FAQ sets.

const FACTS: Record<Sport, string[]> = {
  mlb: [
    "A baseball has exactly 108 stitches — always hand-sewn.",
    "The fastest pitch ever recorded in MLB was 105.1 mph by Aroldis Chapman in 2010.",
    "Baseball is the only major sport where the defense controls the ball.",
    "An MLB baseball only lasts about 6 pitches before being replaced.",
    "Babe Ruth hit 714 home runs — a record that stood for 39 years until Hank Aaron broke it in 1974.",
    "The seventh-inning stretch tradition dates back to 1910 when President Taft stood up to leave and everyone stood out of respect.",
    "A regulation MLB game uses approximately 70 baseballs."
  ],
  nfl: [
    "An NFL game lasts about 3 hours but the ball is actually in play for only about 11 minutes.",
    "The Super Bowl is the most watched TV event in American history — over 100 million viewers annually.",
    "An NFL football is made from cowhide leather — four panels stitched together with a rubber bladder inside.",
    "The forward pass was not legal in American football until 1906.",
    "Jerry Rice holds the NFL record for career receiving touchdowns with 197.",
    "The NFL uses approximately 780,000 footballs per season.",
    "A standard NFL field is 100 yards long with two 10-yard end zones."
  ],
  nba: [
    "An NBA basketball hoop is exactly 10 feet high — a standard that has never changed since 1891.",
    "Wilt Chamberlain scored 100 points in a single NBA game on March 2, 1962.",
    "The three-point line was added to the NBA in 1979.",
    "Michael Jordan was cut from his high school basketball team as a sophomore.",
    "The NBA shot clock (24 seconds) was introduced in 1954 to speed up the game.",
    "LeBron James has played over 50,000 minutes in the NBA.",
    "A regulation NBA basketball must be inflated to between 7.5 and 8.5 pounds per square inch."
  ],
  nhl: [
    "The Stanley Cup is the oldest professional sports trophy in North America, first awarded in 1893.",
    "NHL players skate approximately 3-5 miles per game.",
    "The fastest hockey shot ever recorded was 108.8 mph by Zdeno Chara.",
    "A hockey puck is frozen before games to reduce bouncing on the ice.",
    "Wayne Gretzky scored more career assists (1,963) than any other player scored total points.",
    "NHL referees skate approximately 4-5 miles per game.",
    "The goalie mask was not widely used until 1959."
  ],
  soccer: [
    "Soccer is played by over 250 million players in more than 200 countries.",
    "The fastest goal ever scored in professional soccer was after 2.8 seconds.",
    "A soccer player runs approximately 7 miles per game.",
    "The FIFA World Cup final is the most watched single sporting event on Earth.",
    "Brazil is the only country to have played in every FIFA World Cup.",
    "The first World Cup was held in Uruguay in 1930.",
    "A regulation soccer ball has 32 panels — 20 hexagons and 12 pentagons."
  ],
  worldcup: [
    "The FIFA World Cup trophy weighs 6.175 kg and is made of 18-carat gold.",
    "Brazil has won the most World Cups — 5 times.",
    "The 1950 World Cup final was watched by 199,954 fans.",
    "Miroslav Klose holds the record for most World Cup goals — 16 for Germany.",
    "Only 8 countries have ever won the World Cup.",
    "VAR was first used at the 2018 World Cup in Russia.",
    "The 2026 World Cup is hosted by USA, Canada, and Mexico."
  ],
  rugby: [
    "Rugby was invented in 1823 when William Webb Ellis picked up a soccer ball and ran with it.",
    "The Rugby World Cup trophy is named the Webb Ellis Cup.",
    "A rugby player runs approximately 4-7 km per game.",
    "New Zealand's All Blacks have the best win percentage of any national team in any sport.",
    "The haka performed by the All Blacks is a traditional Maori war dance.",
    "A rugby ball is oval-shaped to make it easier to carry while running.",
    "The 2023 Rugby World Cup was watched by over 2 billion people worldwide."
  ],
  mlr: [
    "Major League Rugby was founded in 2018 — one of the newest professional leagues in the USA.",
    "MLR is the first Division 1 professional rugby union league in the United States.",
    "MLR teams play a 14-game regular season from February to June.",
    "Rugby union has 15 players per side — rugby league has 13.",
    "MLR has helped grow rugby participation in the USA by over 20% since its founding.",
    "The USA Rugby team is nicknamed the Eagles.",
    "The Chicago Hounds play at SeatGeek Stadium in Bridgeview, Illinois."
  ],
  wnba: [
    "The WNBA was founded in 1996 and played its first season in 1997.",
    "A WNBA basketball is slightly smaller than an NBA ball — 28.5 inches vs 29.5 inches.",
    "The WNBA season runs from May to October.",
    "Breanna Stewart is the only player to win MVP in NCAA, WNBA regular season, and WNBA Finals.",
    "The WNBA has 12 teams across the United States.",
    "Diana Taurasi holds the WNBA record for career points — over 10,000.",
    "WNBA quarters are 10 minutes long — shorter than NBA quarters."
  ],
  epl: [
    "The Premier League is the most-watched sports league in the world — broadcast in 212 territories.",
    "Manchester United has won the most Premier League titles — 13.",
    "The Premier League was founded in 1992.",
    "A Premier League season has 380 matches total.",
    "The fastest Premier League goal was scored after 7.69 seconds by Shane Long in 2019.",
    "Liverpool's Anfield stadium has hosted football since 1884.",
    "Premier League clubs earn over 3 billion pounds per season from TV rights."
  ],
  laliga: [
    "Real Madrid and Barcelona have won over 60 La Liga titles between them.",
    "Real Madrid is the most successful club in UEFA Champions League history with 14 titles.",
    "La Liga was founded in 1929.",
    "Lionel Messi scored 50 La Liga goals in the 2011-12 season — a record.",
    "El Clasico between Real Madrid and Barcelona is the most watched club football match.",
    "La Liga has 20 teams — the bottom 3 are relegated each season.",
    "Spain won three consecutive international tournaments from 2008 to 2012."
  ],
  tennis: [
    "The word love in tennis means zero — from the French l'oeuf meaning egg.",
    "A tennis ball is only in play for about 20 minutes of a 5-set match.",
    "Wimbledon uses approximately 54,000 tennis balls every tournament.",
    "The fastest serve ever recorded was 263 km/h by Sam Groth in 2012.",
    "Tennis was originally called lawn tennis.",
    "Rafael Nadal has won the French Open more times than any other player.",
    "A standard tennis court is 78 feet long and 36 feet wide for doubles."
  ],
  golf: [
    "The term birdie comes from American slang — bird meant something excellent.",
    "Golf is one of only two sports played on the Moon — Alan Shepard hit a ball there in 1971.",
    "The dimples on a golf ball (usually 336) help it travel up to twice as far as a smooth ball.",
    "Augusta National was built on a former plant nursery — hence all the flowers.",
    "The odds of a hole-in-one for an average golfer are about 1 in 12,500.",
    "Golf courses have 18 holes because 18 shots would consume one bottle of whisky.",
    "Tiger Woods has won 15 major championships."
  ],
  cricket: [
    "A cricket match can last up to 5 days and still end in a draw.",
    "The Ashes is named after a tiny urn containing burned cricket bails.",
    "Sachin Tendulkar scored 100 international centuries.",
    "Cricket was the first sport to use Hawk-Eye ball tracking technology.",
    "The longest cricket match lasted 14 days — abandoned so England could catch their boat home.",
    "A cricket ball is harder than a baseball and can travel over 90 mph.",
    "The IPL has over 400 million viewers — one of the most watched leagues in the world."
  ],
};

export default FACTS;

export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number; // 0-based index of correct answer
  explanation: string;
};

export const QUIZ: Record<Sport, QuizQuestion[]> = {
  mlb: [
    { q: "How many strikes to strike out?", options: ["2","3","4","5"], answer: 1, explanation: "Three strikes and you are out — one of baseball's most fundamental rules." },
    { q: "What is an RBI?", options: ["A pitching stat","A run batted in","A type of pitch","A defensive play"], answer: 1, explanation: "RBI stands for Run Batted In — credited when a batter's hit causes a runner to score." },
    { q: "How many innings in a standard MLB game?", options: ["7","8","9","10"], answer: 2, explanation: "A standard MLB game has 9 innings. Tied games go to extra innings." },
    { q: "What is a perfect game?", options: ["Winning by 10+ runs","Pitcher retiring all 27 batters","Hitting for the cycle","A no-hitter with strikeouts only"], answer: 1, explanation: "A perfect game means the pitcher faces 27 batters and retires every single one." },
    { q: "What does hitting for the cycle mean?", options: ["Hitting a home run","Single double triple and home run in one game","Hitting in consecutive games","Scoring 4 runs"], answer: 1, explanation: "Hitting for the cycle means getting a single, double, triple, and home run all in the same game." }
  ],
  nfl: [
    { q: "How many points is a touchdown?", options: ["4","5","6","7"], answer: 2, explanation: "A touchdown is worth 6 points. The extra point kick makes it 7." },
    { q: "What is a first down?", options: ["First play of the game","Gaining 10 yards to reset downs","A touchdown","A penalty"], answer: 1, explanation: "A team has 4 downs to gain 10 yards. Gaining 10 resets to another 1st down." },
    { q: "What does a quarterback do?", options: ["Kick the ball","Block for runners","Lead the offense and throw passes","Cover receivers"], answer: 2, explanation: "The quarterback leads the offense — they receive the snap, hand off, or throw passes." },
    { q: "How long is an NFL quarter?", options: ["10 minutes","12 minutes","15 minutes","20 minutes"], answer: 2, explanation: "NFL games have 4 quarters of 15 minutes each." },
    { q: "What is a sack?", options: ["A successful field goal","Tackling the QB behind the line of scrimmage","A penalty","A blocked punt"], answer: 1, explanation: "A sack occurs when a defender tackles the quarterback behind the line of scrimmage." }
  ],
  nba: [
    { q: "How high is an NBA hoop?", options: ["9 feet","10 feet","11 feet","12 feet"], answer: 1, explanation: "NBA hoops are exactly 10 feet high — unchanged since 1891." },
    { q: "How many points is a three-pointer?", options: ["2","3","4","5"], answer: 1, explanation: "Shots from beyond the arc are worth 3 points. Added to the NBA in 1979." },
    { q: "What is a double-double?", options: ["Scoring twice in a row","Reaching double digits in two stat categories","Two consecutive wins","A two-point shot"], answer: 1, explanation: "A double-double means reaching 10+ in two categories like points and rebounds." },
    { q: "How long is the shot clock?", options: ["14 seconds","18 seconds","24 seconds","30 seconds"], answer: 2, explanation: "The shot clock is 24 seconds — the offense must shoot before it expires." },
    { q: "What is a pick and roll?", options: ["A penalty play","A screen then roll to basket","A defensive formation","A free throw situation"], answer: 1, explanation: "The pick and roll: one player screens a defender, then rolls to the basket for a pass." }
  ],
  nhl: [
    { q: "How many players per side on ice?", options: ["4","5","6","7"], answer: 2, explanation: "6 players per team — 1 goalie, 2 defensemen, 3 forwards." },
    { q: "What is a hat trick?", options: ["A defensive play","Scoring 3 goals in one game","A penalty","Winning in overtime"], answer: 1, explanation: "A hat trick is 3 goals by one player — fans throw hats onto the ice." },
    { q: "What is icing?", options: ["Celebrating a goal","Shooting puck from behind center across the opposing goal line","A penalty for fighting","A goalie save"], answer: 1, explanation: "Icing is called when a team shoots the puck from behind center all the way past the goal line." },
    { q: "How long is each NHL period?", options: ["15 minutes","20 minutes","25 minutes","30 minutes"], answer: 1, explanation: "NHL games have 3 periods of 20 minutes each." },
    { q: "What is the Stanley Cup?", options: ["The MVP award","The trophy for the NHL champion","A scoring record","The all-star trophy"], answer: 1, explanation: "The Stanley Cup is the oldest professional sports trophy in North America, first awarded in 1893." }
  ],
  soccer: [
    { q: "How long is a soccer match?", options: ["80 minutes","90 minutes","100 minutes","120 minutes"], answer: 1, explanation: "A standard match is 90 minutes — two 45-minute halves plus stoppage time." },
    { q: "What is offside?", options: ["A foul tackle","Being ahead of the defense when receiving a pass","Running out of bounds","Blocking the keeper"], answer: 1, explanation: "Offside is when an attacker is behind the defense when a pass is played to them." },
    { q: "How many players per side?", options: ["9","10","11","12"], answer: 2, explanation: "Each team has 11 players including the goalkeeper." },
    { q: "What is a penalty kick?", options: ["A kick from midfield","A shot from 12 yards vs the keeper","A free kick over a wall","A kick-off after a goal"], answer: 1, explanation: "A penalty kick is a direct shot from 12 yards against only the goalkeeper." },
    { q: "What is extra time?", options: ["Stoppage time at end of halves","Two extra 15-min periods when tied","A penalty shootout","An extra player"], answer: 1, explanation: "In knockouts, if tied after 90 minutes, two 15-minute extra periods are played." }
  ],
  worldcup: [
    { q: "How often is the World Cup held?", options: ["Every 2 years","Every 3 years","Every 4 years","Every 5 years"], answer: 2, explanation: "The World Cup is held every 4 years." },
    { q: "Which country has won the most World Cups?", options: ["Germany","Argentina","Brazil","Italy"], answer: 2, explanation: "Brazil has won 5 World Cups — the most of any nation." },
    { q: "What is the Group Stage?", options: ["The final","First round in groups of 4","A penalty shootout","The semifinal"], answer: 1, explanation: "Teams play in groups of 4 — the top 2 from each group advance." },
    { q: "What happens if a knockout match is tied after 90 min?", options: ["Both eliminated","Extra time then penalties","More shots wins","Replay next day"], answer: 1, explanation: "Tied knockouts go to 30 min extra time, then penalties if still tied." },
    { q: "What is the Golden Boot?", options: ["Best keeper","Top scorer of the tournament","Best young player","Fair play award"], answer: 1, explanation: "The Golden Boot goes to the tournament's top scorer." }
  ],
  rugby: [
    { q: "How many points is a try?", options: ["3","4","5","6"], answer: 2, explanation: "A try is worth 5 points. A conversion kick after adds 2 more." },
    { q: "What is a scrum?", options: ["A penalty kick","Both teams binding to contest possession","A defensive formation","A tackle"], answer: 1, explanation: "A scrum is a set piece where forwards from both teams bind and push against each other." },
    { q: "How many players per side in rugby union?", options: ["13","14","15","16"], answer: 2, explanation: "Rugby union has 15 players. Rugby league has 13." },
    { q: "What is a lineout?", options: ["When a player goes out of bounds","Throwing ball in from sideline with players jumping","A penalty kick","End of game"], answer: 1, explanation: "A lineout restarts play when the ball goes out of bounds — players jump to catch the throw." },
    { q: "How many points is a penalty kick in rugby?", options: ["2","3","4","5"], answer: 1, explanation: "A penalty kick through the posts is worth 3 points." }
  ],
  mlr: [
    { q: "What city do the Chicago Hounds play in?", options: ["Chicago","New York","Los Angeles","Dallas"], answer: 0, explanation: "The Chicago Hounds play at SeatGeek Stadium in Bridgeview, Illinois." },
    { q: "How many points is a drop goal?", options: ["1","2","3","4"], answer: 2, explanation: "A drop goal — dropping the ball and kicking through the posts — is worth 3 points." },
    { q: "What year was MLR founded?", options: ["2015","2016","2017","2018"], answer: 3, explanation: "Major League Rugby was founded in 2018." },
    { q: "What is a ruck?", options: ["A forward pass","Players contesting the ball on the ground","A penalty","A kick"], answer: 1, explanation: "A ruck forms when players from both teams contest the ball over a tackled player." },
    { q: "What does converting a try mean?", options: ["Score a try","Kick through posts for 2 extra points","Defend a try","Kick off after"], answer: 1, explanation: "A conversion kick after a try adds 2 points — taken in line with where the try was scored." }
  ],
  wnba: [
    { q: "When is the WNBA season?", options: ["March to October","May to October","June to December","April to September"], answer: 1, explanation: "The WNBA season runs May to October — opposite the NBA season." },
    { q: "How many WNBA teams are there?", options: ["10","11","12","13"], answer: 2, explanation: "The WNBA has 12 teams across the United States." },
    { q: "How does the WNBA ball compare to the NBA ball?", options: ["Same size","Slightly smaller","Slightly larger","Much smaller"], answer: 1, explanation: "The WNBA uses a size 6 ball — 28.5 inches vs 29.5 for the NBA." },
    { q: "Who holds the WNBA career scoring record?", options: ["Maya Moore","Breanna Stewart","Diana Taurasi","Lisa Leslie"], answer: 2, explanation: "Diana Taurasi holds the WNBA career scoring record with over 10,000 points." },
    { q: "How long are WNBA quarters?", options: ["8 minutes","10 minutes","12 minutes","15 minutes"], answer: 1, explanation: "WNBA quarters are 10 minutes — shorter than NBA quarters." }
  ],
  epl: [
    { q: "How many teams in the Premier League?", options: ["16","18","20","22"], answer: 2, explanation: "The Premier League has 20 teams. Bottom 3 are relegated each season." },
    { q: "What is relegation?", options: ["Winning the league","Being moved to a lower division","A transfer fee","A cup competition"], answer: 1, explanation: "Relegation means the bottom 3 teams drop to the Championship — replaced by 3 promoted teams." },
    { q: "How many matches per team per season?", options: ["30","34","38","42"], answer: 2, explanation: "Each team plays 38 matches — home and away against all 19 others." },
    { q: "What is the Golden Glove?", options: ["Best scorer","Best keeper for most clean sheets","Best young player","Manager of the year"], answer: 1, explanation: "The Golden Glove goes to the keeper with the most clean sheets in a season." },
    { q: "Which club has won the most Premier League titles?", options: ["Liverpool","Arsenal","Chelsea","Manchester United"], answer: 3, explanation: "Manchester United have won 13 Premier League titles." }
  ],
  laliga: [
    { q: "What is El Clasico?", options: ["The La Liga final","Real Madrid vs Barcelona","The Spanish cup","The oldest stadium"], answer: 1, explanation: "El Clasico is the match between Real Madrid and Barcelona — the most watched club match." },
    { q: "How many teams are relegated from La Liga?", options: ["2","3","4","5"], answer: 1, explanation: "The bottom 3 teams in La Liga are relegated to the Segunda Division each season." },
    { q: "Who has scored the most La Liga goals ever?", options: ["Ronaldo","Messi","Raul","Benzema"], answer: 1, explanation: "Lionel Messi holds the La Liga all-time record with 474 goals for Barcelona." },
    { q: "What do yellow and red cards mean?", options: ["Yellow only","Red only","Yellow caution red dismissal","Yellow red and blue"], answer: 2, explanation: "Yellow cards are cautions, red cards are dismissals. Two yellows equal a red." },
    { q: "When was La Liga founded?", options: ["1899","1919","1929","1939"], answer: 2, explanation: "La Liga was founded in 1929 — one of the oldest professional football leagues." }
  ],
  tennis: [
    { q: "What does love mean in tennis?", options: ["Perfect serve","Zero points","Winning shot","Net cord"], answer: 1, explanation: "Love means zero in tennis — from the French l'oeuf (egg) because zero looks like an egg." },
    { q: "How many sets to win a men's Grand Slam?", options: ["2","3","4","5"], answer: 1, explanation: "Men's Grand Slam matches are best of 5 sets — first to win 3 sets wins." },
    { q: "What is a break in tennis?", options: ["A rest period","Winning the opponent's serve game","A timeout","A failed serve"], answer: 1, explanation: "A break means winning a game when your opponent is serving — a significant advantage." },
    { q: "What score comes after deuce?", options: ["Game","Advantage","Set point","Match point"], answer: 1, explanation: "After deuce (40-40), the next point gives one player advantage." },
    { q: "Which surface is Wimbledon played on?", options: ["Clay","Hard court","Grass","Carpet"], answer: 2, explanation: "Wimbledon is played on grass — the oldest and most prestigious Grand Slam." }
  ],
  golf: [
    { q: "What does birdie mean?", options: ["Two over par","One over par","One under par","Two under par"], answer: 2, explanation: "A birdie is one stroke under par. Eagle is two under, albatross is three under." },
    { q: "What is par?", options: ["The worst score","Expected strokes for a hole","A penalty stroke","The course record"], answer: 1, explanation: "Par is the standard number of strokes an expert golfer should take." },
    { q: "What does making the cut mean?", options: ["Winning the tournament","Qualifying for the final two rounds","A hole-in-one","Breaking par"], answer: 1, explanation: "After two rounds the field is cut to the top players. Making the cut means you play the weekend." },
    { q: "Why do golfers yell fore?", options: ["To celebrate","To warn of an incoming ball","To signal a penalty","To call a caddy"], answer: 1, explanation: "Fore warns anyone in the path of the ball — from the term forecaddie." },
    { q: "What is a bogey?", options: ["One under par","Even par","One over par","Two over par"], answer: 2, explanation: "A bogey is one stroke over par — common even for good golfers." }
  ],
  cricket: [
    { q: "How many players on a cricket team?", options: ["9","10","11","12"], answer: 2, explanation: "Each cricket team has 11 players — 10 wickets means the batting team is all out." },
    { q: "What does out for a duck mean?", options: ["Scoring 0 runs before getting out","Being hit by the ball","Running between wickets","Dropping a catch"], answer: 0, explanation: "A duck means a batsman was dismissed without scoring — zero looks like a duck's egg." },
    { q: "What is an over?", options: ["End of the match","6 consecutive balls from one bowler","A boundary hit","A batting partnership"], answer: 1, explanation: "An over is 6 legal deliveries from the same bowler." },
    { q: "How many runs does a six score?", options: ["4","5","6","7"], answer: 2, explanation: "Hitting the ball over the boundary without bouncing scores 6 runs." },
    { q: "What does LBW stand for?", options: ["Last Ball Win","Leg Before Wicket","Low Ball Wide","Left Boundary Wall"], answer: 1, explanation: "LBW (Leg Before Wicket) is when the ball hits the leg and would have hit the stumps." }
  ],
};
