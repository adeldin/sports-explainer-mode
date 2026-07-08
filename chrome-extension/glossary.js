// SportsWise glossary — tappable-definition data + matcher for the extension overlay (Tier E).
// PORTED VERBATIM from sports-explainer-mobile-v2/lib/glossary/*.ts. Definitions are the app's
// authored content copied EXACTLY (only the TS types, the `sport` field, and the unused `match`
// field were dropped). Do NOT rewrite definitions here — keep them in sync with the app's source.
//
// Runs as a content script BEFORE content.js (see manifest). Exposes both the data and the matcher
// on the isolated-world window so content.js can use them: window.SE_GLOSSARY / window.SE_segmentText.
(function () {

  const MLB = [
    { term: "strike", def: "A pitch the batter swings at and misses, takes when it was in the strike zone, or hits foul (with less than two strikes). Three of them and he's out.", aliases: ["strikes"] },
    { term: "ball", def: "A pitch outside the strike zone that the batter doesn't swing at. Four of them and he gets a free walk to first." },
    { term: "out", def: "When the batting team loses a player's turn — by strikeout, a caught ball, or being tagged or forced. Three outs and the team's half of the inning is over.", aliases: ["outs"] },
    { term: "safe", def: "When a runner reaches a base without being put out. The opposite of out — he stays on the base, alive." },
    { term: "hit", def: "When a batter puts the ball in play and reaches base safely without the help of an error or a fielder's choice. The basic way to earn your way on.", aliases: ["hits","base hit"] },
    { term: "single", def: "A hit good for one base. The most common hit — the batter reaches first safely.", aliases: ["singles"] },
    { term: "double", def: "A hit good for two bases. Solid contact into a gap that gets the batter to second.", aliases: ["doubles"] },
    { term: "triple", def: "A hit good for three bases. One of the most exciting plays in the game — it takes real contact and real speed.", aliases: ["triples"] },
    { term: "foul ball", def: "A ball hit outside the foul lines. It counts as a strike — but never as the third strike, so a batter can foul off pitch after pitch and stay alive.", aliases: ["foul","fouled off","fouls off","foul balls"] },
    { term: "count", def: "The running tally of balls and strikes on the batter right now, always said balls-first (\"2-1\" means 2 balls, 1 strike). It tells you who is ahead in the at-bat — the pitcher or the hitter." },
    { term: "strike zone", def: "The invisible box over home plate, roughly from the knees to the lower chest, where a pitch can be called a strike. The whole pitcher-hitter battle is fought over its edges." },
    { term: "at-bat", def: "A batter's official turn that counts toward his batting average, usually ending in a hit or an out. Not every trip to the plate is an at-bat — a walk, for one, doesn't count.", aliases: ["at-bats","at bat","at bats"] },
    { term: "plate appearance", def: "Any complete trip to the plate, however it ends — hit, out, walk, hit by pitch, all of it. The wider count that at-bats are a subset of.", aliases: ["plate appearances"] },
    { term: "strikeout", def: "When the batter gets three strikes and is out. The pitcher's cleanest way to get rid of a hitter — no fielders needed.", aliases: ["strikeouts","struck out","strikes out"] },
    { term: "strikeout looking", def: "A strikeout where the batter takes the third strike without swinging, frozen because he guessed wrong. More embarrassing than swinging and missing.", aliases: ["struck out looking","caught looking"] },
    { term: "walk", def: "When a batter takes four balls and gets to go to first base for free, no hit required. The pitcher's mistake, not the batter's reward.", aliases: ["walks","walked"] },
    { term: "hit by pitch", def: "When a pitch hits the batter and he's awarded first base. Sometimes accidental, sometimes the price of crowding the plate.", aliases: ["hit by a pitch"] },
    { term: "full count", def: "Three balls and two strikes — the maximum before something has to happen. The next pitch ends the at-bat one way or another, so the tension peaks here." },
    { term: "ahead in the count", def: "When the pitcher has more strikes than balls (like 0-2 or 1-2). He can waste a pitch or two and tempt the hitter into chasing something nasty." },
    { term: "behind in the count", def: "When the hitter has more balls than strikes (like 2-0 or 3-1). The pitcher has to throw something hittable, so the batter can sit and wait for it." },
    { term: "hitter's count", def: "A count that favors the batter (2-0, 3-1), where he knows a strike is likely coming and can swing big. The green light to look for damage." },
    { term: "pitcher's count", def: "A count that favors the pitcher (0-2, 1-2), where he can throw his nastiest stuff off the plate and dare the hitter to chase. The setup for the strikeout." },
    { term: "lefty/righty matchup", def: "Whether the batter and pitcher throw from the same side or opposite sides. Hitters generally do better against the opposite hand — it's why managers shuffle pitchers and pinch hitters to chase the favorable side.", aliases: ["lefty-righty matchup"] },
    { term: "fastball", def: "The most basic pitch: thrown as hard as possible, mostly straight. Everything else a pitcher throws is designed to look like this and then not be.", aliases: ["fastballs"] },
    { term: "splitter", def: "A pitch that looks like a fastball, then drops sharply right as it reaches the plate — like the ball falls off a table. Built to make hitters swing over the top of it.", aliases: ["splitters"] },
    { term: "slider", def: "A pitch that looks a bit like a fastball, then breaks sideways and down. One of the game's favorite out pitches, because the hitter has to decide before it finishes moving.", aliases: ["sliders"] },
    { term: "curveball", def: "A slower pitch with a big, top-to-bottom break. When it freezes a hitter, it's the timing and the drop that make it look wrong until it's too late.", aliases: ["curveballs","curve"] },
    { term: "changeup", def: "A pitch thrown with fastball arm-speed but much slower, so the hitter swings too early. It is a lie told with the arm — everything looks like a fastball except the speed.", aliases: ["changeups","change-up"] },
    { term: "sinker", def: "A fastball built to drop as it arrives, designed to get hitters to pound it into the ground. A ground-ball weapon first — but it can still miss bats.", aliases: ["sinkers"] },
    { term: "breaking ball", def: "Any pitch built to curve or dart instead of going straight (a curveball, slider, etc.). The whole point is to fool a hitter who's expecting a fastball.", aliases: ["breaking balls","breaking pitch"] },
    { term: "velocity", def: "Simply how hard a pitch is thrown, in miles per hour. More velo gives the hitter less time to react — but straight and hard is still hittable if he is ready for it.", aliases: ["velo"] },
    { term: "put-away pitch", def: "The pitch a pitcher trusts most when he's ahead and needs one more strike. Some pitchers have one obvious finisher; others create it with the count and sequence." },
    { term: "pitch sequencing", def: "The order a pitcher throws his pitches to set up the one that gets the out — showing fastballs to make the off-speed pitch look unhittable. The chess, not the muscle.", aliases: ["sequencing","sequenced"] },
    { term: "wild pitch", def: "A pitch so far off-target the catcher can't handle it, letting runners advance. The pitcher's fault, officially — and often a rally-starter.", aliases: ["wild pitches"] },
    { term: "home run", def: "A hit, usually over the outfield wall, that lets the batter circle all the bases and score, plus anyone already on. Baseball's loudest swing.", aliases: ["home runs","homer","homers","homered"] },
    { term: "grand slam", def: "A home run with all three bases occupied, scoring four runs at once — the maximum on one swing. The biggest swing in baseball.", aliases: ["grand slams"] },
    { term: "line drive", def: "A ball hit hard and on a flat, fast path — the kind of contact hitters want. Sharp and low, not lazy and high.", aliases: ["line drives","lined"] },
    { term: "ground ball", def: "A ball hit onto the ground that rolls or bounces toward an infielder. It can become an easy out, a sneaky hit, or a way to move runners.", aliases: ["ground balls","grounder","grounders","grounded out","grounds out","ground out"] },
    { term: "fly ball", def: "A ball hit up into the air. If it hangs up, it's caught for an out; if it carries, it can turn into extra bases or a home run.", aliases: ["fly balls","flied out","flies out","flyout"] },
    { term: "pop-up", def: "A ball hit very high but not far, usually an easy catch. It often means the hitter got under the ball instead of driving through it.", aliases: ["pop up","popped up","pops up","popup"] },
    { term: "bunt", def: "Softly tapping the ball instead of swinging, usually to advance a runner or catch the defense napping. A finesse play in a power sport.", aliases: ["bunts","bunted"] },
    { term: "sacrifice fly", def: "A fly ball caught for an out that still lets a runner tag up and score from third. The batter's out, the team gets the run, and it doesn't count as an at-bat — a good trade.", aliases: ["sacrifice flies","sac fly","sac flies"] },
    { term: "stolen base", def: "When a runner takes the next base without a hit, usually by sprinting as the pitch is thrown and beating the throw. Speed, timing, and nerve all in one.", aliases: ["stolen bases","steal","steals","stole","stealing"] },
    { term: "caught stealing", def: "When a runner tries to steal but the throw beats him and he's tagged out. The downside risk that makes stealing a gamble, not a freebie." },
    { term: "tag up", def: "On a caught fly ball, a runner has to be on his original base after the catch before he can advance. It's why you'll see runners wait, then bolt the instant a deep fly is caught.", aliases: ["tagged up","tagging up","tags up"] },
    { term: "pickoff", def: "When the pitcher (or catcher) throws to a base to catch a leading runner off it for a surprise out. The reason runners cannot stray too far.", aliases: ["pick-off","picked off","pickoffs"] },
    { term: "bases loaded", def: "Runners on first, second, and third all at once. Maximum danger for the pitcher — any hit scores, and a walk or hit-by-pitch forces in a run." },
    { term: "RISP", def: "\"Runners In Scoring Position\" — a runner on second or third, close enough to score on a single. When you hear it, the moment just got more important.", aliases: ["runners in scoring position","scoring position"] },
    { term: "error", def: "A defensive mistake that lets a batter or runner advance when a normal play would have gotten the out. The scorer's way of saying \"that one is on the fielder, not the pitcher.\"", aliases: ["errors"] },
    { term: "force out", def: "An out made by getting the ball to a base the runner is required to advance to — no tag needed, just touch the bag first. The simplest out in the book.", aliases: ["force play","forced out"] },
    { term: "fielder's choice", def: "When the defense goes after a different runner instead of the batter, so the batter reaches first but isn't credited with a hit. He's safe because of the defense's decision, not a clean hit." },
    { term: "double play", def: "One defensive play that records two outs at once, usually a ground ball turned into outs at two bases. The fastest way for a pitcher to escape trouble — it can erase a rally in a hurry.", aliases: ["double plays","turned two"] },
    { term: "infield", def: "The area around the bases, guarded by the first baseman, second baseman, shortstop, and third baseman. Where ground balls and quick throws happen." },
    { term: "outfield", def: "The wide area beyond the infield, covered by the left, center, and right fielders. Where fly balls get chased down and home runs sail over." },
    { term: "bullpen", def: "The relief pitchers who come in after the starter tires, and the area where they warm up. When you hear \"going to the bullpen,\" the starter's day is ending.", aliases: ["pen"] },
    { term: "starter", def: "The pitcher who begins the game and, ideally, goes deep into it. The team's main arm for the day — everyone in the bullpen exists to follow him.", aliases: ["starting pitcher"] },
    { term: "reliever", def: "Any pitcher who comes in after the starter. Often a specialist — for one inning, one matchup, or one big out.", aliases: ["relievers","relief pitcher","relief pitchers"] },
    { term: "closer", def: "The relief pitcher a team trusts to pitch the final inning and protect a lead. A high-nerve specialist who exists for the last three outs.", aliases: ["closers"] },
    { term: "save", def: "Credit a relief pitcher gets for finishing a win under pressure, usually protecting a small lead late. It's the stat most tied to the closer's job.", aliases: ["saves"] },
    { term: "batting average", def: "How often a batter gets a hit, shown as a decimal like .300 (three hits per ten at-bats). .300 is excellent; around .250 is solid; near .200 raises eyebrows." },
    { term: "slugging", def: "A stat that rewards total bases, counting doubles, triples, and homers more than singles. It measures power better than batting average does.", aliases: ["slugging percentage"] },
    { term: "ERA", def: "Earned Run Average: roughly how many runs a pitcher gives up per nine innings, leaving out runs caused by errors. Lower is better — under 3.00 is excellent, around 4.00 is ordinary, north of 5.00 is trouble." },
    { term: "RBI", def: "Run Batted In: credit a batter gets when his play brings a runner home to score. It shows run production — but it also depends on having teammates on base to drive in.", aliases: ["RBIs"] },
    { term: "inning", def: "One of nine segments of a game, split into a top (away team bats) and bottom (home team bats). Each half ends when the batting team makes three outs.", aliases: ["innings"] },
    { term: "extra innings", def: "What happens when the game's tied after nine: they keep playing until one team finishes an inning ahead, or the home team walks it off in the bottom half. No clock, just pressure." },
    { term: "walk-off", def: "A game-ending play by the home team in the last inning — the moment they take the lead, the game is instantly over and everyone walks off. Baseball's most dramatic finish.", aliases: ["walkoff","walk-off win"] },
    { term: "no-hitter", def: "A game in which one team allows zero hits, even though runners can still reach by walk or error. One of the sport's rarest, tensest feats — and superstitious fans won't say it out loud while it's happening.", aliases: ["no hitter"] },
    { term: "leadoff", def: "Either the first batter of an inning, or the hitter who bats first in the lineup. Traditionally a fast table-setter — though modern teams sometimes put real power there." },
    { term: "pinch hitter", def: "A substitute batter sent in to hit for someone else at a key moment, usually for a better matchup. Once he comes in, the player he replaced is done for the day.", aliases: ["pinch-hitter","pinch hit","pinch-hit"] },
    { term: "designated hitter", def: "A player who bats in place of the pitcher and doesn't play the field. It's why pitchers in modern MLB rarely hit anymore.", aliases: ["DH"] },
    { term: "double switch", def: "A two-player substitution that also changes where the pitcher's spot lands in the batting order. A classic National League move that's gotten rare with the universal DH — and still confusing enough that broadcasters slow down to explain it." },
  ];

  const NFL = [
    { term: "down", def: "One offensive try to move the ball. The offense usually gets four downs to gain 10 yards and earn a fresh set of tries.", aliases: ["downs"] },
    { term: "first down", def: "The first try in a new set of downs, and also what the offense earns by gaining the 10 yards. Moving the chains is how a drive stays alive.", aliases: ["first downs"] },
    { term: "yard line", def: "The numbered lines across the field marking where the ball is. Football is a fight over yards, so the numbers matter constantly.", aliases: ["yard lines"] },
    { term: "line to gain", def: "The spot the offense has to reach for a new first down — the yellow line you see on the TV broadcast." },
    { term: "line of scrimmage", def: "The invisible line where the ball sits at the start of a play, which neither team can cross until the snap. The starting line for that down." },
    { term: "snap", def: "The play's starting action: the center sends the ball backward to begin the down (usually to the quarterback, sometimes a punter or holder). Once it moves, everything comes alive.", aliases: ["snapped","snaps"] },
    { term: "possession", def: "Which team has the ball. Football is a game of using your turns wisely before the other side gets its chance." },
    { term: "drive", def: "One team's series of plays with the ball, from the moment it takes over until it scores, punts, or turns it over. The story arc of an offensive possession.", aliases: ["drives"] },
    { term: "huddle", def: "The quick gathering where players get the next play before lining up. A tiny meeting before full-speed chaos.", aliases: ["huddles"] },
    { term: "formation", def: "How the offense or defense lines up before the snap. The arrangement tells you a lot about what is coming — run, pass, or trick.", aliases: ["formations"] },
    { term: "turnover", def: "When the offense loses the ball to the defense, usually by interception or fumble. Few plays swing momentum faster.", aliases: ["turnovers"] },
    { term: "touchdown", def: "Getting the ball into the opponent's end zone, worth 6 points — the big prize. Afterward the team chooses a 1-point kick or a 2-point try.", aliases: ["touchdowns"] },
    { term: "field goal", def: "Kicking the ball through the uprights, worth 3 points. The consolation when a drive stalls but you're close enough to kick.", aliases: ["field goals"] },
    { term: "extra point", def: "The kick after a touchdown, worth 1 point. Usually expected — but misses happen, and they can swing a game.", aliases: ["extra points"] },
    { term: "two-point conversion", def: "After a touchdown, the offense skips the kick and runs one play from close range for 2 points. Riskier than the kick, but sometimes the math demands it.", aliases: ["two point conversion","2-point conversion"] },
    { term: "safety", def: "A rare 2-point score for the defense, usually when they tackle the ball-carrier in his own end zone. It also hands the scoring team the ball back, which makes it doubly painful." },
    { term: "end zone", def: "The 10-yard scoring area at each end of the field. Get the ball in there and you've scored a touchdown.", aliases: ["endzone"] },
    { term: "uprights", def: "The tall yellow goalposts. Kicks have to sail between them to count for a field goal or extra point." },
    { term: "pick-six", def: "An interception returned for a touchdown. The quarterback's nightmare — a turnover and a score in one play.", aliases: ["pick six","pick-6"] },
    { term: "quarterback", def: "The offense's leader, who takes the snap and either hands off, passes, or runs. The most important player on the field and usually the team's biggest name.", aliases: ["quarterbacks","QB"] },
    { term: "running back", def: "The backfield player who takes handoffs, catches short passes, and helps block. Built for vision, toughness, and bursts through traffic.", aliases: ["running backs","RB"] },
    { term: "wide receiver", def: "A pass-catcher who lines up wide and runs routes to get open. Often the offense's speed, space, and big-play threat.", aliases: ["wide receivers","WR","receiver","receivers"] },
    { term: "tight end", def: "A hybrid who is big enough to block like a lineman but can also catch passes like a receiver. A matchup nightmare when he is good.", aliases: ["tight ends","TE"] },
    { term: "offensive line", def: "The five big blockers up front who protect the quarterback and open running lanes. The anonymous heroes — you only notice them when they fail.", aliases: ["offensive linemen","o-line"] },
    { term: "center", def: "The lineman who starts each play by snapping the ball, then blocks. Every play begins in his hands." },
    { term: "eligible receiver", def: "A player allowed to catch a forward pass. Most linemen aren't eligible — which is why an \"ineligible man downfield\" flag happens.", aliases: ["eligible receivers"] },
    { term: "defensive line", def: "The defenders up front trying to wreck the play by stuffing the run or pressuring the quarterback. The first wave of the defense.", aliases: ["defensive linemen","d-line"] },
    { term: "linebacker", def: "The versatile defenders just behind the line who do a bit of everything: stop runs, cover passes, and blitz. Often the defense's tone-setter.", aliases: ["linebackers","LB"] },
    { term: "cornerback", def: "A fast defender who covers wide receivers, often one-on-one. A lonely job — one bad step can turn into a huge play.", aliases: ["cornerbacks","CB","corner"] },
    { term: "secondary", def: "The defensive backs (cornerbacks and safeties) who cover the pass as a unit. The pass-defense back half of the defense." },
    { term: "defensive back", def: "The umbrella term for cornerbacks and safeties — the defenders who cover receivers. \"DB\" is just the shorthand you will hear constantly.", aliases: ["defensive backs","DB"] },
    { term: "completion", def: "A forward pass caught and controlled in bounds by an eligible receiver. The basic successful pass.", aliases: ["completions","completed"] },
    { term: "incompletion", def: "A forward pass that isn't caught, falling to the ground. The down ends and, in most cases, the clock stops.", aliases: ["incomplete","incompletions"] },
    { term: "interception", def: "When a defender catches a pass meant for the offense — a turnover, and one of the worst things that can happen to a quarterback.", aliases: ["interceptions","intercepted","picked off"] },
    { term: "sack", def: "Tackling the quarterback behind the line of scrimmage before he can throw. A big momentum play and the defense's reward for pressure.", aliases: ["sacks","sacked"] },
    { term: "pressure", def: "When the defense disrupts the quarterback before he can throw comfortably. It doesn't have to be a sack to ruin a play.", aliases: ["pressured","pressures"] },
    { term: "pocket", def: "The protected area the offensive line forms around the quarterback to give him time to throw. When it \"collapses,\" he is in trouble." },
    { term: "play-action", def: "A pass play that starts by faking a handoff to freeze the defense, then throws. A con job — it works by making the defense bite on the run.", aliases: ["play action","play-action pass"] },
    { term: "route", def: "The pre-planned path a receiver runs to get open. Every pass play is a choreography of several routes at once.", aliases: ["routes"] },
    { term: "pass rush", def: "The defense's charge at the quarterback to pressure or sack him. The clock the quarterback is always racing against.", aliases: ["pass rusher","pass rushers"] },
    { term: "blitz", def: "Sending extra defenders (like linebackers) after the quarterback beyond the usual rushers. A high-risk gamble: get there fast, or leave receivers wide open.", aliases: ["blitzed","blitzing","blitzes"] },
    { term: "scramble", def: "When the quarterback drops back to pass, then runs because the play breaks down or space opens up. Not planned, but often dangerous.", aliases: ["scrambled","scrambles","scrambling"] },
    { term: "checkdown", def: "A short, safe throw when the deeper options are covered. Not glamorous, but it keeps the offense out of trouble.", aliases: ["check-down","checked down"] },
    { term: "pass protection", def: "The blocking designed to keep the quarterback upright long enough to throw. When it fails, everything gets messy fast.", aliases: ["pass pro"] },
    { term: "man coverage", def: "Each defender covers one specific receiver, following him everywhere. Simple and aggressive — a footrace of individual matchups.", aliases: ["man-to-man","man-to-man coverage"] },
    { term: "zone coverage", def: "Defenders guard areas of the field instead of chasing one receiver everywhere. They pass routes off and try to make the quarterback throw into tight windows.", aliases: ["zone defense"] },
    { term: "pass interference", def: "Illegally preventing an eligible player from making a fair play on a catchable pass. One of the costliest flags in football, especially deep downfield.", aliases: ["PI"] },
    { term: "coverage", def: "How the defense guards receivers downfield, whether man or zone. \"Good coverage\" is why a quarterback holds the ball and gets sacked." },
    { term: "handoff", def: "The quarterback physically giving the ball to a running back to run. The simplest play in football.", aliases: ["handoffs","handed off"] },
    { term: "rush", def: "A running play, where the ball is carried rather than thrown. The ground game — less flashy than passing, but it eats clock.", aliases: ["rushed","rushing"] },
    { term: "carry", def: "One running attempt by a ball-carrier. A back's workload is often measured in carries.", aliases: ["carries"] },
    { term: "run blocking", def: "Blocking designed to open lanes for the ball-carrier. Less about standing still, more about moving bodies off the spot." },
    { term: "screen pass", def: "A short pass to a back or receiver with blockers set up in front, designed to beat an aggressive pass rush. A counterpunch to the blitz.", aliases: ["screen","screens"] },
    { term: "goal line", def: "The line at the front of the end zone. If the ball breaks that plane while a player controls it, it's a touchdown.", aliases: ["goal-line"] },
    { term: "tackle", def: "Bringing the ball-carrier to the ground or stopping his forward progress. The defense's most basic job.", aliases: ["tackled","tackles"] },
    { term: "tackle for loss", def: "A defensive stop behind the line of scrimmage. It turns a normal down into a problem for the offense.", aliases: ["TFL","tackles for loss"] },
    { term: "punt", def: "Kicking the ball away on 4th down to flip field position, instead of risking a failed try. Giving up the ball on purpose to make the other team start far back.", aliases: ["punts","punted","punting"] },
    { term: "kickoff", def: "The kick that starts each half and follows each score, handing the ball to the receiving team. The opening exchange of a possession sequence.", aliases: ["kickoffs","kick-off"] },
    { term: "return", def: "Running back a kickoff or punt toward the other end. A chance for a huge swing — sometimes all the way for a score.", aliases: ["returns","returned"] },
    { term: "special teams", def: "The units that handle kicks, punts, and returns. The overlooked third of the game where field position and surprises live." },
    { term: "fair catch", def: "When a returner signals he won't run the kick back. He gets protection from being hit, but the return is over.", aliases: ["fair catches"] },
    { term: "touchback", def: "When a kick ends in the receiving team's end zone and the ball comes out to a set starting spot. No return, no collision, just a reset.", aliases: ["touchbacks"] },
    { term: "onside kick", def: "A short, tricky kickoff designed so the kicking team can recover it themselves. Desperate and usually a sign time is running out.", aliases: ["onside kicks","onside"] },
    { term: "muffed punt", def: "When the returner touches a punt but fails to control it. The ball is loose, and special-teams chaos begins.", aliases: ["muffed","muff"] },
    { term: "penalty", def: "A rule violation that costs a team yards (and sometimes a down). The yellow flag means someone broke a rule.", aliases: ["penalties"] },
    { term: "flag", def: "The yellow marker officials throw to signal a penalty. \"There's a flag on the play\" means something is coming back.", aliases: ["flags","flagged"] },
    { term: "holding", def: "Illegally grabbing or restricting an opponent instead of blocking cleanly. One of football's most common drive-killing penalties." },
    { term: "false start", def: "When an offensive player flinches or moves before the snap, costing 5 yards. A self-inflicted, pre-snap mistake.", aliases: ["false starts"] },
    { term: "offside", def: "When a defender is across the line too early, into the neutral zone at the snap. The defense jumping the start.", aliases: ["offsides"] },
    { term: "encroachment", def: "When a defender crosses into the neutral zone before the snap and makes contact. A pre-snap defensive mistake — like offside, but he made contact." },
    { term: "delay of game", def: "A penalty for not snapping the ball before the play clock expires. A five-yard mistake caused by bad timing or confusion." },
    { term: "roughing the passer", def: "An illegal hit on the quarterback after or as he throws. One of the most debated flags in football." },
    { term: "intentional grounding", def: "When the quarterback illegally throws the ball away to avoid a sack. The rule keeps passers from escaping pressure for free." },
    { term: "automatic first down", def: "A penalty result that hands the offense a new set of downs no matter the distance. Defensive mistakes can give a dead drive new life." },
    { term: "quarter", def: "One of four timed segments of the game. The clock runs throughout, but the drama is usually packed into the fourth.", aliases: ["quarters"] },
    { term: "play clock", def: "The short timer the offense has to snap the ball before a delay-of-game penalty. It keeps teams from standing around forever." },
    { term: "game clock", def: "The main clock counting down the quarter. Managing it well can be the difference between stealing a win and running out of time." },
    { term: "timeout", def: "A stoppage a team can call to save time, regroup, or set up a key play. In close games, timeouts are almost currency.", aliases: ["timeouts","time-out"] },
    { term: "out of bounds", def: "Outside the sideline or end line. Going out ends the play and, late in a half, stops the clock — which is why receivers fight to get there." },
    { term: "down by contact", def: "A ball-carrier is down once a defender's contact brings him to the ground. It's why the whistle blows even if the ball pops loose right after." },
    { term: "third down", def: "The third try, often the make-or-break down: convert and the drive lives, fail and fourth-down decisions begin. Where offenses earn their keep.", aliases: ["third downs","3rd down"] },
    { term: "fourth down", def: "The offense's last normal try. If they go for it and fail, the other team takes over right there — so teams usually punt or kick a field goal.", aliases: ["fourth downs","4th down"] },
    { term: "turnover on downs", def: "When the offense goes for it on fourth down and fails. No punt, no kick — the other team just takes over on the spot." },
    { term: "three-and-out", def: "A drive that runs three plays, fails to get a first down, and punts. The offensive version of going nowhere.", aliases: ["three and out","3-and-out"] },
    { term: "field position", def: "Where on the field a team starts its drive. Good field position means a shorter trip to score — quietly one of the biggest factors in a game." },
    { term: "red zone", def: "The area inside the opponent's 20-yard line, where a team is close to scoring. The field shrinks and defenses stiffen, so finishing drives here separates good offenses from great ones.", aliases: ["red-zone"] },
    { term: "goal-to-go", def: "When the line to gain is the goal line — the only thing left to gain is the touchdown. You will see it on the TV graphic near the end zone.", aliases: ["goal to go"] },
    { term: "two-minute drill", def: "The fast, urgent offense a team runs at the end of a half to score before time expires. Where clock management and quarterback poise get tested.", aliases: ["two minute drill","two-minute offense"] },
    { term: "hurry-up", def: "Skipping the huddle to run plays fast and deny the defense time to rest or substitute. A tempo weapon.", aliases: ["hurry up","no-huddle","no huddle"] },
    { term: "overtime", def: "Extra play after regulation when the game's tied. The exact rules vary, but the sudden tension is always the same.", aliases: ["OT"] },
    { term: "audible", def: "When the quarterback changes the play at the line after reading the defense. Those shouted codes before the snap are often him switching the plan.", aliases: ["audibles","audibled"] },
    { term: "fumble", def: "When a player loses the ball before he's down. The ball is live, both teams can usually recover it, and chaos takes over fast.", aliases: ["fumbles","fumbled"] },
    { term: "hail mary", def: "A desperate long pass into the end zone as time expires, hoping someone comes down with it. A prayer, named like one." },
    { term: "spike", def: "A quick throw straight into the ground to stop the clock. It sacrifices a down to save time in a hurry.", aliases: ["spiked","spikes"] },
    { term: "kneel-down", def: "When the quarterback takes the snap and kneels to safely run the clock out. How a team says, \"We're done risking it — game over.\"", aliases: ["kneel down","victory formation","take a knee"] },
    { term: "clock management", def: "How a team uses timeouts and the play clock to control how much time is left. The chess clock layered on top of the game, where smart teams steal possessions." },
    { term: "chains", def: "The 10-yard measuring chain on the sideline that marks where a first down is. \"Moving the chains\" means stringing together first downs and sustaining a drive." },
  ];

  const NBA = [
    { term: "basket", def: "The raised hoop and net where players score. Also used to mean a made score." },
    { term: "field goal", def: "Any made shot during normal play, worth 2 or 3 points. Does not include free throws." },
    { term: "three-pointer", def: "A shot made from behind the long arc, worth 3 points instead of 2." },
    { term: "free throw", def: "An unguarded shot from the line after certain fouls, worth 1 point each." },
    { term: "layup", def: "A close shot near the basket, usually while moving toward the hoop. One of the most common scores." },
    { term: "dunk", def: "A shot where a player jumps and pushes the ball down through the rim." },
    { term: "jump shot", def: "A shot released in the air before landing. Most mid- and long-range shots are jump shots." },
    { term: "rebound", def: "Grabbing the ball after a missed shot, giving a fresh chance or ending the other team's." },
    { term: "assist", def: "A pass that directly leads to a teammate scoring." },
    { term: "steal", def: "When a defender legally takes the ball away from the other team." },
    { term: "block", def: "When a defender legally stops a shot before it reaches the basket." },
    { term: "turnover", def: "Losing the ball before getting a shot — a bad pass, steal, or rule mistake." },
    { term: "foul", def: "Illegal contact or action against an opponent, often leading to free throws or lost ball." },
    { term: "personal foul", def: "A foul charged to an individual player for illegal contact. Too many means disqualification." },
    { term: "technical foul", def: "A penalty for conduct rather than playing contact, like arguing with officials." },
    { term: "flagrant foul", def: "A serious foul with unnecessary or excessive contact, sometimes leading to ejection." },
    { term: "possession", def: "The time one team controls the ball and tries to score." },
    { term: "shot clock", def: "The countdown limiting how long a team can hold before shooting — 24 seconds in the NBA." },
    { term: "backcourt", def: "The half a team is defending. The offense usually can't return there with the ball." },
    { term: "frontcourt", def: "The half a team attacks. Offensive plays run here." },
    { term: "paint", def: "The rectangular area near the basket where many close shots and battles happen." },
    { term: "perimeter", def: "The outside area near the three-point line where guards and shooters operate." },
    { term: "fast break", def: "A quick attack after a steal, rebound, or turnover, before the defense is set." },
    { term: "pick-and-roll", def: "One player screens a defender, then cuts to the basket for a pass. A staple NBA action." },
    { term: "screen", def: "An offensive player standing still to legally block a defender and free a teammate." },
    { term: "isolation", def: "One player attacks a defender one-on-one while teammates clear out." },
    { term: "zone defense", def: "Players guard areas of the court instead of specific opponents." },
    { term: "man-to-man defense", def: "Each player guards a specific opponent." },
    { term: "buzzer-beater", def: "A shot released just before the clock hits zero that counts." },
    { term: "overtime", def: "Extra time played when the score is tied after regulation." },
    { term: "and-one", def: "A made basket while fouled, earning one free throw." },
  ];

  const NHL = [
    { term: "puck", def: "The small black rubber disc players shoot into the net to score." },
    { term: "stick", def: "The curved tool players use to control, pass, and shoot the puck." },
    { term: "goal", def: "A score made when the puck fully crosses the line into the net. Worth one point." },
    { term: "net", def: "The goal frame and mesh the goalie protects." },
    { term: "goalie", def: "The player who guards the net and stops shots, wearing larger pads." },
    { term: "save", def: "When the goalie stops a shot from going in." },
    { term: "shot on goal", def: "A shot that would score if the goalie or frame didn't stop it. Misses wide don't count." },
    { term: "assist", def: "Credit for helping set up a goal with a pass. Up to two per goal." },
    { term: "faceoff", def: "The restart where an official drops the puck between two players who battle for it." },
    { term: "blue line", def: "A line separating the middle of the rink from each attacking zone. Key for offside." },
    { term: "red line", def: "The line across the center of the rink, used for icing." },
    { term: "neutral zone", def: "The middle ice between the two blue lines, where teams build speed." },
    { term: "offensive zone", def: "The end where a team is trying to score." },
    { term: "defensive zone", def: "The end where a team protects its own net." },
    { term: "offside", def: "When an attacker enters the offensive zone before the puck does. Play stops." },
    { term: "icing", def: "Shooting the puck from your own side all the way past the far goal line untouched." },
    { term: "power play", def: "When one team has more skaters because the other has a player in the box." },
    { term: "penalty kill", def: "When a team is short a skater and defends until the penalty ends." },
    { term: "penalty box", def: "Where a penalized player sits while their team plays short." },
    { term: "minor penalty", def: "A common two-minute penalty; the team usually plays short-handed." },
    { term: "major penalty", def: "A serious five-minute penalty for dangerous actions." },
    { term: "slashing", def: "Hitting an opponent illegally with the stick." },
    { term: "tripping", def: "Causing an opponent to fall by taking out their legs." },
    { term: "slap shot", def: "A hard shot with a big backswing, the fastest shot type." },
    { term: "wrist shot", def: "A quick, accurate shot flicked with the wrists." },
    { term: "checking", def: "Using the body legally to separate an opponent from the puck." },
    { term: "forecheck", def: "Pressure in the other team's end to force a turnover." },
    { term: "backcheck", def: "Skating back toward your own net to break up an attack." },
    { term: "breakaway", def: "When a player gets behind the defense, alone against the goalie." },
    { term: "empty net", def: "Pulling the goalie for an extra skater, leaving the net open." },
    { term: "line change", def: "Swapping tired players for fresh ones; shifts are short." },
    { term: "overtime", def: "Extra time when the score is tied after regulation." },
  ];

  const SOCCER = [
    { term: "ball", def: "The round object players pass, dribble, and kick to score." },
    { term: "goal", def: "A score when the whole ball crosses the line between the posts, under the bar. Worth one point." },
    { term: "goalkeeper", def: "The player who guards the goal and can use hands inside their own penalty area." },
    { term: "defender", def: "A player whose main job is to stop the other team scoring, playing near their own goal." },
    { term: "midfielder", def: "A player who works between defense and attack, linking the two ends." },
    { term: "forward", def: "A player whose main job is to attack and score, playing nearest the opponent's goal." },
    { term: "striker", def: "A forward focused on finishing chances, usually central." },
    { term: "save", def: "When the goalkeeper stops a shot from becoming a goal." },
    { term: "shot", def: "An attempt to score by kicking or heading toward goal." },
    { term: "shot on target", def: "A shot that would score if a defender or keeper didn't stop it. Wide or over doesn't count." },
    { term: "pass", def: "Deliberately moving the ball to a teammate." },
    { term: "cross", def: "A ball played from a wide area toward the middle in front of goal." },
    { term: "through ball", def: "A pass into open space behind the defense for a teammate to run onto." },
    { term: "dribble", def: "Moving with the ball under close control to beat defenders or carry it forward." },
    { term: "header", def: "Playing the ball with the head to pass, clear, or score." },
    { term: "tackle", def: "A legal attempt to win the ball from an opponent." },
    { term: "clearance", def: "Kicking or heading the ball away from danger near your own goal." },
    { term: "possession", def: "When a team controls the ball and builds an attack." },
    { term: "counterattack", def: "A fast attack right after winning the ball, before the defense sets." },
    { term: "offside", def: "A rule stopping attackers from waiting too far ahead before the ball is played to them." },
    { term: "foul", def: "Illegal contact like tripping, pushing, or holding, giving the other team a restart." },
    { term: "handball", def: "Deliberately touching the ball with hand or arm; can give a free or penalty kick." },
    { term: "free kick", def: "A restart awarded after a foul, kicked from the spot of the call." },
    { term: "penalty kick", def: "A one-on-one shot from the spot for a foul inside the penalty area." },
    { term: "penalty area", def: "The big box in front of each goal where keepers use hands and penalties are given." },
    { term: "corner kick", def: "A restart from the corner after the defense last touched a ball over their goal line." },
    { term: "goal kick", def: "A restart from inside the box after the attack put the ball over the goal line." },
    { term: "throw-in", def: "A two-handed restart from the sideline after the ball goes out." },
    { term: "yellow card", def: "A formal warning; two in a match means a red." },
    { term: "red card", def: "A sending-off — the player leaves and isn't replaced." },
    { term: "substitution", def: "Replacing one player with another for rest, tactics, or injury." },
    { term: "stoppage time", def: "Extra minutes added at a half's end for time lost to delays." },
    { term: "penalty shootout", def: "A tiebreaker after extra time — players take turns from the spot." },
  ];

  const RUGBY = [
    { term: "try", def: "The main way to score, worth 5 points: a player grounds the ball in the opponent's in-goal area (their end zone). Unlike football, you can't just carry it over the line — the ball has to touch the ground. If you're carrying it, a touch down is enough; if it's loose on the ground, you press down on it.", aliases: ["tries"] },
    { term: "conversion", def: "A free kick at the posts worth 2 points, awarded right after a try. It's taken from a spot in line with where the try was scored — so scoring nearer the middle makes the kick easier.", aliases: ["conversions","converted"] },
    { term: "penalty kick", def: "A kick at the posts worth 3 points, awarded after the other team commits a penalty. A reliable way to put points on the board without scoring a try — teams often take the easy 3.", aliases: ["penalty goal"] },
    { term: "drop goal", def: "A kick through the posts worth 3 points taken from open play, where the player drops the ball and kicks it on the bounce. Rare and dramatic — often a way to snatch a late lead.", aliases: ["drop goals","dropped goal"] },
    { term: "in-goal", def: "The area behind the goal line where a try is scored — rugby's version of the end zone. Ground the ball here and it's 5 points.", aliases: ["in-goal area","try line"] },
    { term: "scrum", def: "A restart where eight players from each side bind together and push for the ball, fed in on the ground between them. It's used after a minor infringement (like a knock-on) — a contained battle to win possession back.", aliases: ["scrums"] },
    { term: "ruck", def: "What forms after a tackled player goes to ground: players from both sides bind over the ball and try to drive each other off it, using only their feet to win it — no hands once it's formed. The fast, messy contest you see after almost every tackle.", aliases: ["rucks"] },
    { term: "maul", def: "Like a ruck but the ball-carrier stays on their FEET, held by an opponent with a teammate bound on too (at least three players), the whole knot driving forward. A rolling shove for territory — most common off a lineout near the try line.", aliases: ["mauls"] },
    { term: "lineout", def: "How play restarts after the ball goes out of bounds: the two packs line up and a player throws the ball straight down the middle, where teammates LIFT a jumper to catch it. Rugby's version of a throw-in, but airborne.", aliases: ["line-out","lineouts"] },
    { term: "breakdown", def: "The contest for the ball right after a tackle, as both sides arrive to fight for possession (the ruck is the heart of it). Win the breakdown and you keep attacking; lose it and you're defending — it's where many games are decided." },
    { term: "tackle", def: "Bringing the ball-carrier to the ground to stop their run. Once tackled, the carrier must release the ball — which is what triggers the breakdown and the scramble for possession.", aliases: ["tackled","tackles"] },
    { term: "knock-on", def: "When a player drops the ball forward or it bounces forward off their hands or arms. It's a turnover — the other team gets a scrum, because you can't pass or drop the ball toward the opponent's goal.", aliases: ["knock on","knocked on"] },
    { term: "offside", def: "Being in front of the ball or the teammate who last played it — you can't just lurk near the opponent's line waiting for a pass. It's only punished if you interfere with play; otherwise you have to get back onside first. At a ruck or maul, the offside line runs through the last player's hindmost foot.", aliases: ["offsides","off-side"] },
    { term: "forward pass", def: "Throwing the ball toward the opponent's goal line — which is illegal. You can run or kick it forward, but you can only PASS it backward or sideways. A forward pass gives the other team a scrum.", aliases: ["forward passes","throw forward"] },
    { term: "advantage", def: "When a team commits an infringement but the other team is in a better spot by playing on, the ref lets play continue instead of stopping it — calling 'advantage.' If nothing comes of it, the ref brings play back to the original penalty. Keeps the game flowing." },
    { term: "sin bin", def: "Where a player sits for 10 minutes after a yellow card, leaving their team a man down. Rugby's penalty box — for repeated infringements or a dangerous-but-not-malicious foul. Two yellows in a match add up to a red.", aliases: ["yellow card","yellow-carded"] },
    { term: "red card", def: "A sending-off for serious foul play. For the worst, deliberate offenses it's permanent — the team plays the rest of the game a man down. For dangerous-but-not-deliberate ones (newer 20-minute red), the player still goes for good but a teammate can replace them after 20 minutes.", aliases: ["red-carded"] },
    { term: "forwards", def: "The eight bigger, stronger players (numbers 1–8) who do the heavy work — scrums, lineouts, and winning the ball at rucks and mauls. Think of them as the engine room: they grind out possession so the backs can score.", aliases: ["forward","the pack","pack"] },
    { term: "backs", def: "The seven faster, more agile players (numbers 9–15) who take the ball the forwards win and try to score — running, passing, and kicking in open space. Generally the speed and skill of the team.", aliases: ["back","backline","back line"] },
    { term: "scrum-half", def: "The number 9 — the link between forwards and backs. They dig the ball out of rucks, scrums, and mauls and fire it out to the backs. Usually one of the smallest, quickest, chattiest players, and a key decision-maker.", aliases: ["scrumhalf","scrum half","halfback"] },
    { term: "fly-half", def: "The number 10 — the playmaker who usually gets the ball from the scrum-half and decides what the team does: pass, run, or kick. The tactical brain of the backline, and often the main goal-kicker.", aliases: ["flyhalf","fly half","out-half","stand-off","first five-eighth"] },
    { term: "fullback", def: "The number 15 — the last line of defense, playing deep behind everyone to field the opposition's kicks. On attack they often join the backline as an extra runner. Need a safe catch under a high ball and a big boot.", aliases: ["full-back","full back"] },
    { term: "prop", def: "The numbers 1 and 3 — the powerhouses on either side of the front row who do the heavy pushing in the scrum. Among the strongest players on the field; it's a specialist job, since a collapsed scrum can be dangerous.", aliases: ["props","loosehead","tighthead"] },
    { term: "hooker", def: "The number 2 — the front-row forward in the middle of the scrum who 'hooks' the ball back with their foot to win it. Also usually the player who throws the ball into the lineout, so accuracy matters.", aliases: ["hookers"] },
    { term: "lock", def: "The numbers 4 and 5 (the 'second row') — typically the tallest players, the main power in the scrum and the primary targets lifted to catch the ball in lineouts. The workhorses of the pack.", aliases: ["locks","second row"] },
    { term: "back row", def: "The three forwards at the back of the scrum — two flankers (6 and 7) and the number 8. Usually the most mobile forwards: first to the breakdown, big tacklers, and ball-carriers who link the forwards and backs.", aliases: ["flanker","flankers","number 8","number eight","loose forwards"] },
    { term: "turnover", def: "When the team with the ball loses it to the other team — at a tackle, a ruck, a knock-on, or a steal. A turnover flips who's attacking, and a well-timed one can swing momentum instantly.", aliases: ["turnovers","turned over"] },
    { term: "jackal", def: "When a defender gets over the ball right after a tackle and tries to rip it away before the ruck forms — a steal at the breakdown. A great jackal (often by a flanker) wins a turnover or a penalty; do it a fraction too late and you're the one penalized.", aliases: ["jackals","jackaled","poach","poacher"] },
    { term: "offload", def: "A pass made in the act of being tackled, slipping the ball to a teammate before going to ground. It keeps the attack flowing and skips the slow ruck — one of the most exciting, skillful plays in the game.", aliases: ["offloads","offloaded"] },
    { term: "phase", def: "One cycle of play between breakdowns: the ball comes out of a ruck, the team attacks until the next tackle, and that's a phase. 'Multi-phase play' means stringing several together, grinding forward and wearing the defense down.", aliases: ["phases","phase play"] },
    { term: "the 22", def: "The line 22 meters out from each try line. It matters for kicking: inside your own 22 you can kick the ball directly out of bounds and gain ground; outside it, you can't. The zone where defenses tighten and attacks get dangerous.", aliases: ["22","22-metre line","22 metre line"] },
    { term: "up-and-under", def: "A high, hanging kick sent up so the kicker's own team can chase and contest it as it drops — putting the catcher under heavy pressure. Also called a garryowen or a bomb. A way to turn a kick into a 50/50 contest for the ball.", aliases: ["up and under","garryowen","bomb","high ball"] },
    { term: "box kick", def: "A kick by the scrum-half, lofted high and over their shoulder from the back of a ruck or maul, usually down the touchline for the wingers to chase. A common way to escape pressure and turn defense into a contest downfield.", aliases: ["box kicks"] },
    { term: "grubber", def: "A kick along the ground that bounces and rolls awkwardly — because the ball is oval, it skips unpredictably, making it hard to pick up. Often poked through or behind the defense for a teammate to chase.", aliases: ["grubber kick","grubbers"] },
    { term: "kick for touch", def: "Kicking the ball out of bounds on purpose to gain territory — play restarts with a lineout where it went out. The main way teams trade field position, especially clearing their own end or pushing toward the opponent's line.", aliases: ["kicked for touch","kick to touch","into touch","touch"] },
    { term: "territory", def: "Which end of the field play is happening in — a core rugby idea. Teams kick to win territory, pinning the opponent deep so any mistake hands over good attacking position. Often matters as much as possession." },
    { term: "possession", def: "Simply which team has the ball. Rugby is a battle to win possession (at scrums, lineouts, and breakdowns) and then keep it through phases — you can't score without it, and giving it away cheaply is costly." },
    { term: "line break", def: "When an attacker bursts clean through the defensive line into open space behind it. One of the most dangerous moments in rugby — a line break often leads to a try if support arrives.", aliases: ["line breaks","linebreak","break the line"] },
  ];

  // Keyed by the EXTENSION's sport keys. soccer + worldcup share the soccer list.
  const GLOSSARY = {
    mlb: MLB,
    nfl: NFL,
    nba: NBA,
    nhl: NHL,
    soccer: SOCCER,
    worldcup: SOCCER,
    rugby: RUGBY,
  };

  // ── MATCHER (ported verbatim from lib/glossary/segment.ts) ─────────────────────────────
  // Splits an explanation string into plain-text and tappable-term runs by matching the curated
  // glossary for a sport. Invariant: concatenating the segments' `value`s reproduces the input EXACTLY.
  const MAX_TERMS = 3; // max distinct tappable terms per block (too many underlines = clutter)

  // Trivial common words that are NEVER tappable. They STAY in the match vocabulary (so longer terms
  // like "ground ball" still win their spans) but are skipped at selection.
  const LOW_VALUE = new Set(['out', 'ball', 'hit', 'safe', 'run', 'single', 'double', 'tackle']);

  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function segmentText(text, sport) {
    const entries = GLOSSARY[sport] || [];
    if (!text || entries.length === 0) return [{ type: 'text', value: text }];

    // Surface form (lowercased) -> parent {term, def}. Every term AND alias is a candidate surface;
    // the first entry to claim a surface keeps it.
    const surfaceToParent = new Map();
    for (const e of entries) {
      const parent = { term: e.term, def: e.def };
      for (const form of [e.term, ...(e.aliases || [])]) {
        const key = form.toLowerCase();
        if (!surfaceToParent.has(key)) surfaceToParent.set(key, parent);
      }
    }

    // Longest-first so multi-word/longer forms win at a shared start (JS alternation is ordered).
    const surfaces = [...surfaceToParent.keys()].sort((a, b) => b.length - a.length);
    // \b on both ends = whole-word matching ("run" won't match "running", "ball" not "fastball").
    const pattern = new RegExp('\\b(?:' + surfaces.map(escapeRegExp).join('|') + ')\\b', 'gi');

    const fired = new Set();
    const spans = [];
    let m;
    while ((m = pattern.exec(text)) !== null) {
      if (spans.length >= MAX_TERMS) break;
      const value = m[0];
      const parent = surfaceToParent.get(value.toLowerCase());
      if (!parent) continue;
      if (LOW_VALUE.has(parent.term.toLowerCase())) continue; // stoplist -> never tappable
      if (fired.has(parent.term)) continue;                   // first-occurrence only
      fired.add(parent.term);
      spans.push({ start: m.index, end: m.index + value.length, term: parent.term, def: parent.def, value });
    }

    if (spans.length === 0) return [{ type: 'text', value: text }];

    const segments = [];
    let cursor = 0;
    for (const s of spans) {
      if (s.start > cursor) segments.push({ type: 'text', value: text.slice(cursor, s.start) });
      segments.push({ type: 'term', value: s.value, term: s.term, def: s.def });
      cursor = s.end;
    }
    if (cursor < text.length) segments.push({ type: 'text', value: text.slice(cursor) });
    return segments;
  }

  // Expose on the isolated-world window for content.js.
  window.SE_GLOSSARY = GLOSSARY;
  window.SE_segmentText = segmentText;
})();
