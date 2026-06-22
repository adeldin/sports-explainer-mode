import { GlossaryEntry } from './types';

// Curated football glossary — 92 terms. Definitions are authored content shown
// verbatim in the tappable-definition box; do not rewrite them. Defs containing an
// apostrophe use double-quoted strings to keep the build safe.
export const FOOTBALL_GLOSSARY: GlossaryEntry[] = [
  // --- The basics ---
  {
    term: 'down',
    def: 'One offensive try to move the ball. The offense usually gets four downs to gain 10 yards and earn a fresh set of tries.',
    sport: 'nfl',
    aliases: ['downs'],
  },
  {
    term: 'first down',
    def: 'The first try in a new set of downs, and also what the offense earns by gaining the 10 yards. Moving the chains is how a drive stays alive.',
    sport: 'nfl',
    aliases: ['first downs'],
  },
  {
    term: 'yard line',
    def: 'The numbered lines across the field marking where the ball is. Football is a fight over yards, so the numbers matter constantly.',
    sport: 'nfl',
    aliases: ['yard lines'],
  },
  {
    term: 'line to gain',
    def: 'The spot the offense has to reach for a new first down — the yellow line you see on the TV broadcast.',
    sport: 'nfl',
  },
  {
    term: 'line of scrimmage',
    def: 'The invisible line where the ball sits at the start of a play, which neither team can cross until the snap. The starting line for that down.',
    sport: 'nfl',
  },
  {
    term: 'snap',
    def: 'The play\'s starting action: the center sends the ball backward to begin the down (usually to the quarterback, sometimes a punter or holder). Once it moves, everything comes alive.',
    sport: 'nfl',
    aliases: ['snapped', 'snaps'],
  },
  {
    term: 'possession',
    def: 'Which team has the ball. Football is a game of using your turns wisely before the other side gets its chance.',
    sport: 'nfl',
  },
  {
    term: 'drive',
    def: 'One team\'s series of plays with the ball, from the moment it takes over until it scores, punts, or turns it over. The story arc of an offensive possession.',
    sport: 'nfl',
    aliases: ['drives'],
  },
  {
    term: 'huddle',
    def: 'The quick gathering where players get the next play before lining up. A tiny meeting before full-speed chaos.',
    sport: 'nfl',
    aliases: ['huddles'],
  },
  {
    term: 'formation',
    def: 'How the offense or defense lines up before the snap. The arrangement tells you a lot about what is coming — run, pass, or trick.',
    sport: 'nfl',
    aliases: ['formations'],
  },
  {
    term: 'turnover',
    def: 'When the offense loses the ball to the defense, usually by interception or fumble. Few plays swing momentum faster.',
    sport: 'nfl',
    aliases: ['turnovers'],
  },

  // --- Scoring ---
  {
    term: 'touchdown',
    def: 'Getting the ball into the opponent\'s end zone, worth 6 points — the big prize. Afterward the team chooses a 1-point kick or a 2-point try.',
    sport: 'nfl',
    aliases: ['touchdowns'],
  },
  {
    term: 'field goal',
    def: "Kicking the ball through the uprights, worth 3 points. The consolation when a drive stalls but you're close enough to kick.",
    sport: 'nfl',
    aliases: ['field goals'],
  },
  {
    term: 'extra point',
    def: 'The kick after a touchdown, worth 1 point. Usually expected — but misses happen, and they can swing a game.',
    sport: 'nfl',
    aliases: ['extra points'],
  },
  {
    term: 'two-point conversion',
    def: 'After a touchdown, the offense skips the kick and runs one play from close range for 2 points. Riskier than the kick, but sometimes the math demands it.',
    sport: 'nfl',
    aliases: ['two point conversion', '2-point conversion'],
  },
  {
    term: 'safety',
    def: 'A rare 2-point score for the defense, usually when they tackle the ball-carrier in his own end zone. It also hands the scoring team the ball back, which makes it doubly painful.',
    sport: 'nfl',
  },
  {
    term: 'end zone',
    def: "The 10-yard scoring area at each end of the field. Get the ball in there and you've scored a touchdown.",
    sport: 'nfl',
    aliases: ['endzone'],
  },
  {
    term: 'uprights',
    def: 'The tall yellow goalposts. Kicks have to sail between them to count for a field goal or extra point.',
    sport: 'nfl',
  },
  {
    term: 'pick-six',
    def: "An interception returned for a touchdown. The quarterback's nightmare — a turnover and a score in one play.",
    sport: 'nfl',
    aliases: ['pick six', 'pick-6'],
  },

  // --- Offensive positions ---
  {
    term: 'quarterback',
    def: "The offense's leader, who takes the snap and either hands off, passes, or runs. The most important player on the field and usually the team's biggest name.",
    sport: 'nfl',
    aliases: ['quarterbacks', 'QB'],
  },
  {
    term: 'running back',
    def: 'The backfield player who takes handoffs, catches short passes, and helps block. Built for vision, toughness, and bursts through traffic.',
    sport: 'nfl',
    aliases: ['running backs', 'RB'],
  },
  {
    term: 'wide receiver',
    def: "A pass-catcher who lines up wide and runs routes to get open. Often the offense's speed, space, and big-play threat.",
    sport: 'nfl',
    aliases: ['wide receivers', 'WR', 'receiver', 'receivers'],
  },
  {
    term: 'tight end',
    def: 'A hybrid who is big enough to block like a lineman but can also catch passes like a receiver. A matchup nightmare when he is good.',
    sport: 'nfl',
    aliases: ['tight ends', 'TE'],
  },
  {
    term: 'offensive line',
    def: 'The five big blockers up front who protect the quarterback and open running lanes. The anonymous heroes — you only notice them when they fail.',
    sport: 'nfl',
    aliases: ['offensive linemen', 'o-line'],
  },
  {
    term: 'center',
    def: 'The lineman who starts each play by snapping the ball, then blocks. Every play begins in his hands.',
    sport: 'nfl',
  },
  {
    term: 'eligible receiver',
    def: "A player allowed to catch a forward pass. Most linemen aren't eligible — which is why an \"ineligible man downfield\" flag happens.",
    sport: 'nfl',
    aliases: ['eligible receivers'],
  },

  // --- Defensive positions ---
  {
    term: 'defensive line',
    def: 'The defenders up front trying to wreck the play by stuffing the run or pressuring the quarterback. The first wave of the defense.',
    sport: 'nfl',
    aliases: ['defensive linemen', 'd-line'],
  },
  {
    term: 'linebacker',
    def: "The versatile defenders just behind the line who do a bit of everything: stop runs, cover passes, and blitz. Often the defense's tone-setter.",
    sport: 'nfl',
    aliases: ['linebackers', 'LB'],
  },
  {
    term: 'cornerback',
    def: 'A fast defender who covers wide receivers, often one-on-one. A lonely job — one bad step can turn into a huge play.',
    sport: 'nfl',
    aliases: ['cornerbacks', 'CB', 'corner'],
  },
  {
    term: 'secondary',
    def: 'The defensive backs (cornerbacks and safeties) who cover the pass as a unit. The pass-defense back half of the defense.',
    sport: 'nfl',
  },
  {
    term: 'defensive back',
    def: 'The umbrella term for cornerbacks and safeties — the defenders who cover receivers. "DB" is just the shorthand you will hear constantly.',
    sport: 'nfl',
    aliases: ['defensive backs', 'DB'],
  },

  // --- Passing plays ---
  {
    term: 'completion',
    def: 'A forward pass caught and controlled in bounds by an eligible receiver. The basic successful pass.',
    sport: 'nfl',
    aliases: ['completions', 'completed'],
  },
  {
    term: 'incompletion',
    def: "A forward pass that isn't caught, falling to the ground. The down ends and, in most cases, the clock stops.",
    sport: 'nfl',
    aliases: ['incomplete', 'incompletions'],
  },
  {
    term: 'interception',
    def: 'When a defender catches a pass meant for the offense — a turnover, and one of the worst things that can happen to a quarterback.',
    sport: 'nfl',
    aliases: ['interceptions', 'intercepted', 'picked off'],
  },
  {
    term: 'sack',
    def: 'Tackling the quarterback behind the line of scrimmage before he can throw. A big momentum play and the defense\'s reward for pressure.',
    sport: 'nfl',
    aliases: ['sacks', 'sacked'],
  },
  {
    term: 'pressure',
    def: "When the defense disrupts the quarterback before he can throw comfortably. It doesn't have to be a sack to ruin a play.",
    sport: 'nfl',
    aliases: ['pressured', 'pressures'],
  },
  {
    term: 'pocket',
    def: 'The protected area the offensive line forms around the quarterback to give him time to throw. When it "collapses," he is in trouble.',
    sport: 'nfl',
  },
  {
    term: 'play-action',
    def: 'A pass play that starts by faking a handoff to freeze the defense, then throws. A con job — it works by making the defense bite on the run.',
    sport: 'nfl',
    aliases: ['play action', 'play-action pass'],
  },
  {
    term: 'route',
    def: 'The pre-planned path a receiver runs to get open. Every pass play is a choreography of several routes at once.',
    sport: 'nfl',
    aliases: ['routes'],
  },
  {
    term: 'pass rush',
    def: 'The defense\'s charge at the quarterback to pressure or sack him. The clock the quarterback is always racing against.',
    sport: 'nfl',
    aliases: ['pass rusher', 'pass rushers'],
  },
  {
    term: 'blitz',
    def: 'Sending extra defenders (like linebackers) after the quarterback beyond the usual rushers. A high-risk gamble: get there fast, or leave receivers wide open.',
    sport: 'nfl',
    aliases: ['blitzed', 'blitzing', 'blitzes'],
  },
  {
    term: 'scramble',
    def: 'When the quarterback drops back to pass, then runs because the play breaks down or space opens up. Not planned, but often dangerous.',
    sport: 'nfl',
    aliases: ['scrambled', 'scrambles', 'scrambling'],
  },
  {
    term: 'checkdown',
    def: 'A short, safe throw when the deeper options are covered. Not glamorous, but it keeps the offense out of trouble.',
    sport: 'nfl',
    aliases: ['check-down', 'checked down'],
  },
  {
    term: 'pass protection',
    def: 'The blocking designed to keep the quarterback upright long enough to throw. When it fails, everything gets messy fast.',
    sport: 'nfl',
    aliases: ['pass pro'],
  },

  // --- Coverage ---
  {
    term: 'man coverage',
    def: 'Each defender covers one specific receiver, following him everywhere. Simple and aggressive — a footrace of individual matchups.',
    sport: 'nfl',
    aliases: ['man-to-man', 'man-to-man coverage'],
  },
  {
    term: 'zone coverage',
    def: 'Defenders guard areas of the field instead of chasing one receiver everywhere. They pass routes off and try to make the quarterback throw into tight windows.',
    sport: 'nfl',
    aliases: ['zone defense'],
  },
  {
    term: 'pass interference',
    def: 'Illegally preventing an eligible player from making a fair play on a catchable pass. One of the costliest flags in football, especially deep downfield.',
    sport: 'nfl',
    aliases: ['PI'],
  },
  {
    term: 'coverage',
    def: 'How the defense guards receivers downfield, whether man or zone. "Good coverage" is why a quarterback holds the ball and gets sacked.',
    sport: 'nfl',
  },

  // --- Running plays ---
  {
    term: 'handoff',
    def: 'The quarterback physically giving the ball to a running back to run. The simplest play in football.',
    sport: 'nfl',
    aliases: ['handoffs', 'handed off'],
  },
  {
    term: 'rush',
    def: 'A running play, where the ball is carried rather than thrown. The ground game — less flashy than passing, but it eats clock.',
    sport: 'nfl',
    aliases: ['rushed', 'rushing'],
  },
  {
    term: 'carry',
    def: 'One running attempt by a ball-carrier. A back\'s workload is often measured in carries.',
    sport: 'nfl',
    aliases: ['carries'],
  },
  {
    term: 'run blocking',
    def: 'Blocking designed to open lanes for the ball-carrier. Less about standing still, more about moving bodies off the spot.',
    sport: 'nfl',
  },
  {
    term: 'screen pass',
    def: 'A short pass to a back or receiver with blockers set up in front, designed to beat an aggressive pass rush. A counterpunch to the blitz.',
    sport: 'nfl',
    aliases: ['screen', 'screens'],
  },
  {
    term: 'goal line',
    def: "The line at the front of the end zone. If the ball breaks that plane while a player controls it, it's a touchdown.",
    sport: 'nfl',
    aliases: ['goal-line'],
  },
  {
    term: 'tackle',
    def: "Bringing the ball-carrier to the ground or stopping his forward progress. The defense's most basic job.",
    sport: 'nfl',
    aliases: ['tackled', 'tackles'],
  },
  {
    term: 'tackle for loss',
    def: 'A defensive stop behind the line of scrimmage. It turns a normal down into a problem for the offense.',
    sport: 'nfl',
    aliases: ['TFL', 'tackles for loss'],
  },

  // --- Special teams ---
  {
    term: 'punt',
    def: 'Kicking the ball away on 4th down to flip field position, instead of risking a failed try. Giving up the ball on purpose to make the other team start far back.',
    sport: 'nfl',
    aliases: ['punts', 'punted', 'punting'],
  },
  {
    term: 'kickoff',
    def: 'The kick that starts each half and follows each score, handing the ball to the receiving team. The opening exchange of a possession sequence.',
    sport: 'nfl',
    aliases: ['kickoffs', 'kick-off'],
  },
  {
    term: 'return',
    def: 'Running back a kickoff or punt toward the other end. A chance for a huge swing — sometimes all the way for a score.',
    sport: 'nfl',
    aliases: ['returns', 'returned'],
  },
  {
    term: 'special teams',
    def: 'The units that handle kicks, punts, and returns. The overlooked third of the game where field position and surprises live.',
    sport: 'nfl',
  },
  {
    term: 'fair catch',
    def: "When a returner signals he won't run the kick back. He gets protection from being hit, but the return is over.",
    sport: 'nfl',
    aliases: ['fair catches'],
  },
  {
    term: 'touchback',
    def: "When a kick ends in the receiving team's end zone and the ball comes out to a set starting spot. No return, no collision, just a reset.",
    sport: 'nfl',
    aliases: ['touchbacks'],
  },
  {
    term: 'onside kick',
    def: 'A short, tricky kickoff designed so the kicking team can recover it themselves. Desperate and usually a sign time is running out.',
    sport: 'nfl',
    aliases: ['onside kicks', 'onside'],
  },
  {
    term: 'muffed punt',
    def: 'When the returner touches a punt but fails to control it. The ball is loose, and special-teams chaos begins.',
    sport: 'nfl',
    aliases: ['muffed', 'muff'],
  },

  // --- Penalties & rules ---
  {
    term: 'penalty',
    def: 'A rule violation that costs a team yards (and sometimes a down). The yellow flag means someone broke a rule.',
    sport: 'nfl',
    aliases: ['penalties'],
  },
  {
    term: 'flag',
    def: 'The yellow marker officials throw to signal a penalty. "There\'s a flag on the play" means something is coming back.',
    sport: 'nfl',
    aliases: ['flags', 'flagged'],
  },
  {
    term: 'holding',
    def: 'Illegally grabbing or restricting an opponent instead of blocking cleanly. One of football\'s most common drive-killing penalties.',
    sport: 'nfl',
  },
  {
    term: 'false start',
    def: 'When an offensive player flinches or moves before the snap, costing 5 yards. A self-inflicted, pre-snap mistake.',
    sport: 'nfl',
    aliases: ['false starts'],
  },
  {
    term: 'offside',
    def: 'When a defender is across the line too early, into the neutral zone at the snap. The defense jumping the start.',
    sport: 'nfl',
    aliases: ['offsides'],
  },
  {
    term: 'encroachment',
    def: 'When a defender crosses into the neutral zone before the snap and makes contact. A pre-snap defensive mistake — like offside, but he made contact.',
    sport: 'nfl',
  },
  {
    term: 'delay of game',
    def: 'A penalty for not snapping the ball before the play clock expires. A five-yard mistake caused by bad timing or confusion.',
    sport: 'nfl',
  },
  {
    term: 'roughing the passer',
    def: 'An illegal hit on the quarterback after or as he throws. One of the most debated flags in football.',
    sport: 'nfl',
  },
  {
    term: 'intentional grounding',
    def: 'When the quarterback illegally throws the ball away to avoid a sack. The rule keeps passers from escaping pressure for free.',
    sport: 'nfl',
  },
  {
    term: 'automatic first down',
    def: 'A penalty result that hands the offense a new set of downs no matter the distance. Defensive mistakes can give a dead drive new life.',
    sport: 'nfl',
  },

  // --- Game clock & situations ---
  {
    term: 'quarter',
    def: 'One of four timed segments of the game. The clock runs throughout, but the drama is usually packed into the fourth.',
    sport: 'nfl',
    aliases: ['quarters'],
  },
  {
    term: 'play clock',
    def: 'The short timer the offense has to snap the ball before a delay-of-game penalty. It keeps teams from standing around forever.',
    sport: 'nfl',
  },
  {
    term: 'game clock',
    def: 'The main clock counting down the quarter. Managing it well can be the difference between stealing a win and running out of time.',
    sport: 'nfl',
  },
  {
    term: 'timeout',
    def: 'A stoppage a team can call to save time, regroup, or set up a key play. In close games, timeouts are almost currency.',
    sport: 'nfl',
    aliases: ['timeouts', 'time-out'],
  },
  {
    term: 'out of bounds',
    def: 'Outside the sideline or end line. Going out ends the play and, late in a half, stops the clock — which is why receivers fight to get there.',
    sport: 'nfl',
  },
  {
    term: 'down by contact',
    def: "A ball-carrier is down once a defender's contact brings him to the ground. It's why the whistle blows even if the ball pops loose right after.",
    sport: 'nfl',
  },
  {
    term: 'third down',
    def: 'The third try, often the make-or-break down: convert and the drive lives, fail and fourth-down decisions begin. Where offenses earn their keep.',
    sport: 'nfl',
    aliases: ['third downs', '3rd down'],
  },
  {
    term: 'fourth down',
    def: 'The offense\'s last normal try. If they go for it and fail, the other team takes over right there — so teams usually punt or kick a field goal.',
    sport: 'nfl',
    aliases: ['fourth downs', '4th down'],
  },
  {
    term: 'turnover on downs',
    def: 'When the offense goes for it on fourth down and fails. No punt, no kick — the other team just takes over on the spot.',
    sport: 'nfl',
  },
  {
    term: 'three-and-out',
    def: 'A drive that runs three plays, fails to get a first down, and punts. The offensive version of going nowhere.',
    sport: 'nfl',
    aliases: ['three and out', '3-and-out'],
  },
  {
    term: 'field position',
    def: 'Where on the field a team starts its drive. Good field position means a shorter trip to score — quietly one of the biggest factors in a game.',
    sport: 'nfl',
  },
  {
    term: 'red zone',
    def: 'The area inside the opponent\'s 20-yard line, where a team is close to scoring. The field shrinks and defenses stiffen, so finishing drives here separates good offenses from great ones.',
    sport: 'nfl',
    aliases: ['red-zone'],
  },
  {
    term: 'goal-to-go',
    def: 'When the line to gain is the goal line — the only thing left to gain is the touchdown. You will see it on the TV graphic near the end zone.',
    sport: 'nfl',
    aliases: ['goal to go'],
  },
  {
    term: 'two-minute drill',
    def: 'The fast, urgent offense a team runs at the end of a half to score before time expires. Where clock management and quarterback poise get tested.',
    sport: 'nfl',
    aliases: ['two minute drill', 'two-minute offense'],
  },
  {
    term: 'hurry-up',
    def: 'Skipping the huddle to run plays fast and deny the defense time to rest or substitute. A tempo weapon.',
    sport: 'nfl',
    aliases: ['hurry up', 'no-huddle', 'no huddle'],
  },
  {
    term: 'overtime',
    def: "Extra play after regulation when the game's tied. The exact rules vary, but the sudden tension is always the same.",
    sport: 'nfl',
    aliases: ['OT'],
  },
  {
    term: 'audible',
    def: 'When the quarterback changes the play at the line after reading the defense. Those shouted codes before the snap are often him switching the plan.',
    sport: 'nfl',
    aliases: ['audibles', 'audibled'],
  },
  {
    term: 'fumble',
    def: "When a player loses the ball before he's down. The ball is live, both teams can usually recover it, and chaos takes over fast.",
    sport: 'nfl',
    aliases: ['fumbles', 'fumbled'],
  },
  {
    term: 'hail mary',
    def: 'A desperate long pass into the end zone as time expires, hoping someone comes down with it. A prayer, named like one.',
    sport: 'nfl',
  },
  {
    term: 'spike',
    def: 'A quick throw straight into the ground to stop the clock. It sacrifices a down to save time in a hurry.',
    sport: 'nfl',
    aliases: ['spiked', 'spikes'],
  },
  {
    term: 'kneel-down',
    def: 'When the quarterback takes the snap and kneels to safely run the clock out. How a team says, "We\'re done risking it — game over."',
    sport: 'nfl',
    aliases: ['kneel down', 'victory formation', 'take a knee'],
  },
  {
    term: 'clock management',
    def: 'How a team uses timeouts and the play clock to control how much time is left. The chess clock layered on top of the game, where smart teams steal possessions.',
    sport: 'nfl',
  },
  {
    term: 'chains',
    def: 'The 10-yard measuring chain on the sideline that marks where a first down is. "Moving the chains" means stringing together first downs and sustaining a drive.',
    sport: 'nfl',
  },
];
