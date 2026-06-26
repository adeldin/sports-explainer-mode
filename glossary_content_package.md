# SportsWise — Academy Glossary Content Package

**Purpose:** Complete curated content for the full-parity Academy build. Two parts:
- **PART 1** — short `match` labels to BACK-FILL onto the 3 existing glossaries (MLB, NFL, Rugby). Claude Code adds these `match` values to existing entries, matched by `term`. Do NOT change their `def`.
- **PART 2** — the 7 new sport glossaries (NBA, WNBA, NHL, Soccer, Tennis, Golf, Cricket), each as `term | def | match`, transcribed verbatim into new typed files.

Format for new sports: `term | def | match` (one per line). Apostrophes in any field → double-quoted string in the .ts file.

---

# PART 1 — BACK-FILL `match` LABELS (existing MLB / NFL / Rugby)

> These map onto the EXISTING entries in baseball.ts / football.ts / rugby.ts by `term`.
> Add as the `match` field. Do not touch `def` or `aliases`.

## MLB — `match` labels (term → match)

```
strike | swing-and-miss or zone pitch
ball | pitch outside the zone
out | turn ended
safe | reached base cleanly
hit | ball put in play safely
single | one-base hit
double | two-base hit
triple | three-base hit
foul ball | hit out of fair territory
count | balls and strikes tally
strike zone | the legal pitch box
at-bat | a batter's turn
plate appearance | full turn at the plate
strikeout | out on three strikes
strikeout looking | caught watching strike three
walk | free base on four balls
hit by pitch | batter plunked, takes base
full count | three balls, two strikes
ahead in the count | pitcher's favor
behind in the count | hitter's favor
hitter | the batter
pitcher | the one who throws
lefty/righty matchup | handedness edge
fastball | the speed pitch
splitter | drops late, fools hitters
slider | sideways breaking pitch
curveball | big looping break
changeup | slow pitch disguised as fast
sinker | drops to get grounders
breaking ball | a pitch that bends
velocity | the pitch speed
put-away pitch | the strikeout pitch
pitch sequencing | the order of pitches
wild pitch | uncatchable errant throw
home run | hit out of the park
grand slam | bases-loaded home run
line drive | hard flat hit
ground ball | hit along the ground
fly ball | hit high in the air
pop-up | short high infield ball
bunt | soft tap to advance
sacrifice fly | fly ball scores a runner
stolen base | runner takes the next base
caught stealing | runner thrown out stealing
tag up | retouch base before running
pickoff | runner caught off base
bases loaded | runners on every base
RISP | runner in scoring position
error | fielder's misplay
force out | runner forced to the base
fielder | a defensive player
double play | two outs on one play
infield | the inner diamond
outfield | the grassy outer field
bullpen | relief pitchers' area
starter | the first pitcher
reliever | a replacement pitcher
closer | the ninth-inning specialist
save | preserving a close lead
batting average | hit rate
slugging | power hitting measure
ERA | runs allowed measure
RBI | run driven in
inning | a round of play
extra innings | overtime baseball
walk-off | game-ending home win
no-hitter | a game with no hits allowed
leadoff | the first batter up
pinch hitter | a substitute batter
designated hitter | bats for the pitcher
double switch | two swaps at once
```

## NFL — `match` labels (term → match)

```
down | a single play attempt
first down | fresh set of downs
yard line | field position marker
line to gain | the first-down target
line of scrimmage | where the play starts
snap | ball put into play
possession | which team has the ball
drive | a series of plays
huddle | the pre-play gathering
formation | how players line up
turnover | losing the ball
touchdown | six-point score
field goal | three-point kick
extra point | post-touchdown kick
two-point conversion | two-point play try
safety | two points for the defense
end zone | the scoring area
uprights | the goalpost target
pick-six | interception returned for score
quarterback | the passer
running back | the runner
wide receiver | the pass catcher
tight end | blocker-receiver hybrid
offensive line | the front blockers
center | snaps the ball
eligible receiver | allowed to catch
defensive line | the front rushers
linebacker | the middle defender
cornerback | covers receivers
secondary | the deep defenders
defensive back | a coverage defender
completion | a caught pass
incompletion | an uncaught pass
interception | defense catches a pass
sack | quarterback tackled behind line
pressure | hurrying the passer
pocket | the passer's protected space
play-action | fake handoff then pass
route | a receiver's path
pass rush | charging the passer
blitz | sending extra rushers
scramble | quarterback runs to escape
checkdown | a safe short pass
pass protection | blocking for the passer
man coverage | guard one receiver
zone coverage | guard an area
pass interference | illegal coverage contact
coverage | defending receivers
handoff | giving the ball to a runner
rush | a running play
carry | one running attempt
run blocking | clearing a runner's path
screen pass | short pass behind blockers
goal line | the edge of the end zone
tackle | bringing a player down
tackle for loss | stop behind the line
punt | kicking it away
kickoff | the starting kick
return | bringing back a kick
special teams | the kicking unit
fair catch | a no-return signal
touchback | ball downed in end zone
onside kick | a short recovery kick
muffed punt | a dropped catch
penalty | a rule-break punishment
flag | the penalty marker
holding | illegally grabbing a player
false start | early offensive movement
offside | defender across the line
encroachment | defender contacts early
delay of game | snapped too late
roughing the passer | late quarterback hit
intentional grounding | throwing away under pressure
automatic first down | penalty grants a down
quarter | a game period
play clock | time to snap
game clock | the main timer
timeout | a play stoppage
out of bounds | off the field
down by contact | tackled to the ground
third down | the key conversion down
fourth down | the last-chance down
turnover on downs | failing to convert
three-and-out | a quick punt drive
field position | where you start
red zone | inside the 20
goal-to-go | last push to score
two-minute drill | hurried late offense
hurry-up | no-huddle speed offense
overtime | extra period to break a tie
audible | changing the play at the line
fumble | dropping the ball
hail mary | a desperate long pass
spike | stopping the clock
kneel-down | running out the clock
clock management | controlling the time
chains | the first-down measure
```

## Rugby — `match` labels (term → match)

```
try | five-point grounding
conversion | post-try kick
penalty kick | points from a foul
drop goal | drop-kicked score
in-goal | the scoring area
scrum | forwards-bind restart
ruck | contest over a grounded ball
maul | contest over a held ball
lineout | throw-in restart
breakdown | the post-tackle contest
tackle | bringing a carrier down
knock-on | ball dropped forward
offside | ahead of the ball illegally
forward pass | illegal forward throw
advantage | playing on after a foul
sin bin | ten-minute penalty
red card | sent off for good
forwards | the bigger pack players
backs | the faster outside players
scrum-half | feeds the scrum
fly-half | the playmaker
fullback | the last defender
prop | front-row forward
hooker | hooks the ball in scrums
lock | tall lineout jumper
back row | the loose forwards
turnover | winning the ball back
jackal | stealing the ball at the tackle
offload | a pass in the tackle
phase | one cycle of play
the 22 | the defensive zone line
up-and-under | a high contesting kick
box kick | scrum-half's kick
grubber | a kick along the ground
kick for touch | kicking to the sideline
territory | field position gained
possession | holding the ball
line break | bursting through the defense
```

---

# PART 2 — NEW SPORT GLOSSARIES (`term | def | match`)

## NBA → `basketball.ts` → `NBA_GLOSSARY` (sport: 'nba')  ·  also used by WNBA

```
basket | The raised hoop and net where players score. Also used to mean a made score. | the hoop
field goal | Any made shot during normal play, worth 2 or 3 points. Does not include free throws. | live-play score
three-pointer | A shot made from behind the long arc, worth 3 points instead of 2. | long-range score
free throw | An unguarded shot from the line after certain fouls, worth 1 point each. | one-point shot
layup | A close shot near the basket, usually while moving toward the hoop. One of the most common scores. | close moving finish
dunk | A shot where a player jumps and pushes the ball down through the rim. | power rim finish
jump shot | A shot released in the air before landing. Most mid- and long-range shots are jump shots. | airborne release
rebound | Grabbing the ball after a missed shot, giving a fresh chance or ending the other team's. | missed-shot grab
assist | A pass that directly leads to a teammate scoring. | scoring setup pass
steal | When a defender legally takes the ball away from the other team. | defensive takeaway
block | When a defender legally stops a shot before it reaches the basket. | shot denial
turnover | Losing the ball before getting a shot — a bad pass, steal, or rule mistake. | lost possession
foul | Illegal contact or action against an opponent, often leading to free throws or lost ball. | illegal contact
personal foul | A foul charged to an individual player for illegal contact. Too many means disqualification. | player contact penalty
technical foul | A penalty for conduct rather than playing contact, like arguing with officials. | conduct penalty
flagrant foul | A serious foul with unnecessary or excessive contact, sometimes leading to ejection. | dangerous contact
possession | The time one team controls the ball and tries to score. | team control
shot clock | The countdown limiting how long a team can hold before shooting — 24 seconds in the NBA. | 24-second limit
backcourt | The half a team is defending. The offense usually can't return there with the ball. | defensive half
frontcourt | The half a team attacks. Offensive plays run here. | attacking half
paint | The rectangular area near the basket where many close shots and battles happen. | crowded inside area
perimeter | The outside area near the three-point line where guards and shooters operate. | outside scoring area
fast break | A quick attack after a steal, rebound, or turnover, before the defense is set. | quick transition attack
pick-and-roll | One player screens a defender, then cuts to the basket for a pass. A staple NBA action. | screen then cut
screen | An offensive player standing still to legally block a defender and free a teammate. | legal path blocker
isolation | One player attacks a defender one-on-one while teammates clear out. | one-on-one attack
zone defense | Players guard areas of the court instead of specific opponents. | area-based guarding
man-to-man defense | Each player guards a specific opponent. | player-based guarding
buzzer-beater | A shot released just before the clock hits zero that counts. | last-second shot
overtime | Extra time played when the score is tied after regulation. | tied-game extra time
and-one | A made basket while fouled, earning one free throw. | score-plus-foul
```

## NHL → `hockey.ts` → `NHL_GLOSSARY` (sport: 'nhl')

```
puck | The small black rubber disc players shoot into the net to score. | the game disc
stick | The curved tool players use to control, pass, and shoot the puck. | puck-handling tool
goal | A score made when the puck fully crosses the line into the net. Worth one point. | puck in net
net | The goal frame and mesh the goalie protects. | scoring cage
goalie | The player who guards the net and stops shots, wearing larger pads. | net protector
save | When the goalie stops a shot from going in. | stopped shot
shot on goal | A shot that would score if the goalie or frame didn't stop it. Misses wide don't count. | on-target attempt
assist | Credit for helping set up a goal with a pass. Up to two per goal. | scoring helper
faceoff | The restart where an official drops the puck between two players who battle for it. | puck drop battle
blue line | A line separating the middle of the rink from each attacking zone. Key for offside. | attack-zone border
red line | The line across the center of the rink, used for icing. | center divider
neutral zone | The middle ice between the two blue lines, where teams build speed. | middle ice space
offensive zone | The end where a team is trying to score. | attacking end
defensive zone | The end where a team protects its own net. | protecting end
offside | When an attacker enters the offensive zone before the puck does. Play stops. | early zone entry
icing | Shooting the puck from your own side all the way past the far goal line untouched. | long clear violation
power play | When one team has more skaters because the other has a player in the box. | extra-player advantage
penalty kill | When a team is short a skater and defends until the penalty ends. | short-handed defense
penalty box | Where a penalized player sits while their team plays short. | punishment seat
minor penalty | A common two-minute penalty; the team usually plays short-handed. | two-minute punishment
major penalty | A serious five-minute penalty for dangerous actions. | five-minute punishment
slashing | Hitting an opponent illegally with the stick. | illegal stick hit
tripping | Causing an opponent to fall by taking out their legs. | knocked-down skater
slap shot | A hard shot with a big backswing, the fastest shot type. | hardest shot
wrist shot | A quick, accurate shot flicked with the wrists. | quick-flick shot
checking | Using the body legally to separate an opponent from the puck. | body contact play
forecheck | Pressure in the other team's end to force a turnover. | attacking pressure
backcheck | Skating back toward your own net to break up an attack. | chase-back defense
breakaway | When a player gets behind the defense, alone against the goalie. | alone on goalie
empty net | Pulling the goalie for an extra skater, leaving the net open. | unguarded goal setup
line change | Swapping tired players for fresh ones; shifts are short. | fresh-legs swap
overtime | Extra time when the score is tied after regulation. | tied-game extra time
```

## Soccer → `soccer.ts` → `SOCCER_GLOSSARY` (sport: 'soccer')  ·  maps soccer/epl/laliga/worldcup

```
ball | The round object players pass, dribble, and kick to score. | the game ball
goal | A score when the whole ball crosses the line between the posts, under the bar. Worth one point. | ball in net
goalkeeper | The player who guards the goal and can use hands inside their own penalty area. | net protector
defender | A player whose main job is to stop the other team scoring, playing near their own goal. | goal-side stopper
midfielder | A player who works between defense and attack, linking the two ends. | middle-field connector
forward | A player whose main job is to attack and score, playing nearest the opponent's goal. | main attacker
striker | A forward focused on finishing chances, usually central. | central finisher
save | When the goalkeeper stops a shot from becoming a goal. | stopped attempt
shot | An attempt to score by kicking or heading toward goal. | scoring attempt
shot on target | A shot that would score if a defender or keeper didn't stop it. Wide or over doesn't count. | on-frame attempt
pass | Deliberately moving the ball to a teammate. | teammate delivery
cross | A ball played from a wide area toward the middle in front of goal. | wide goal delivery
through ball | A pass into open space behind the defense for a teammate to run onto. | space-splitting pass
dribble | Moving with the ball under close control to beat defenders or carry it forward. | close-control run
header | Playing the ball with the head to pass, clear, or score. | head contact play
tackle | A legal attempt to win the ball from an opponent. | ball-winning challenge
clearance | Kicking or heading the ball away from danger near your own goal. | danger removal
possession | When a team controls the ball and builds an attack. | ball control
counterattack | A fast attack right after winning the ball, before the defense sets. | quick break forward
offside | A rule stopping attackers from waiting too far ahead before the ball is played to them. | too-far-ahead attack
foul | Illegal contact like tripping, pushing, or holding, giving the other team a restart. | illegal contact
handball | Deliberately touching the ball with hand or arm; can give a free or penalty kick. | illegal arm touch
free kick | A restart awarded after a foul, kicked from the spot of the call. | foul restart
penalty kick | A one-on-one shot from the spot for a foul inside the penalty area. | close-range punishment
penalty area | The big box in front of each goal where keepers use hands and penalties are given. | the keeper's box
corner kick | A restart from the corner after the defense last touched a ball over their goal line. | corner restart
goal kick | A restart from inside the box after the attack put the ball over the goal line. | defensive restart
throw-in | A two-handed restart from the sideline after the ball goes out. | sideline restart
yellow card | A formal warning; two in a match means a red. | official warning
red card | A sending-off — the player leaves and isn't replaced. | player ejection
substitution | Replacing one player with another for rest, tactics, or injury. | player swap
stoppage time | Extra minutes added at a half's end for time lost to delays. | added minutes
penalty shootout | A tiebreaker after extra time — players take turns from the spot. | spot-kick tiebreaker
```

## Tennis → `tennis.ts` → `TENNIS_GLOSSARY` (sport: 'tennis')

```
serve | The shot that starts each point, hit from behind the baseline into the service box. | point-starting hit
return | The shot hit back after the serve to start the rally. | answer to serve
rally | A back-and-forth exchange after the serve until someone misses or wins it. | back-and-forth exchange
ace | A legal serve the receiver never touches, winning the point instantly. | untouched winning serve
fault | A missed serve that lands outside the box or in the net; the server gets a second try. | missed service try
double fault | Two missed serves in a row, giving the point to the receiver. | two serve misses
let | A serve that clips the net but lands in; it doesn't count and is retaken. | net-touch redo
forehand | A shot hit on the dominant-hand side, often a player's most powerful groundstroke. | strong-side swing
backhand | A shot hit on the opposite side from the forehand, one or two hands. | opposite-side swing
groundstroke | A normal shot hit after the ball bounces. | bounced-court shot
volley | A shot hit before the ball bounces, usually near the net. | no-bounce hit
smash | A hard overhead shot off a high ball, often to finish the point. | overhead finish
lob | A high shot lofted over an opponent at the net. | high overhit
drop shot | A soft shot landing short to force the opponent to sprint forward. | soft short touch
slice | A shot with underspin that stays low or slows after bouncing. | low spinning shot
topspin | Forward spin that makes the ball dip and bounce higher. | dipping forward spin
point | The smallest unit of scoring; points build games. | smallest score unit
game | A scoring unit of points; usually four points and a two-point lead win it. | points into score
set | A unit of games; usually six games with a two-game lead, or a tiebreak. | games into round
match | The full contest, won by taking the required number of sets. | full contest
love | The tennis word for zero in the score. | zero score
deuce | A 40-40 tie; a player must win two points in a row from here. | late tied score
advantage | The point after deuce, one away from winning the game. | one-away edge
break point | A point where the receiver can win the game off the server. | chance against server
break | Winning a game while the opponent is serving. | win on their serve
hold | Winning your own service game. | win on your serve
tiebreak | A special game at 6-6 decided by single points instead of 15/30/40. | close-set decider
baseline | The back line at each end where players rally and serve from. | back court line
service box | The diagonal target area a serve must land in. | serve landing area
net | The barrier across the middle the ball must clear. | middle barrier
winner | A shot the opponent can't reach, winning the point outright. | unreachable clean shot
unforced error | A missed shot not forced by the opponent — an avoidable mistake. | avoidable miss
challenge | A request to review a line call with electronic tracking. | line-call review
```

## Golf → `golf.ts` → `GOLF_GLOSSARY` (sport: 'golf')

```
hole | One section of the course, tee to cup. A full round is usually 18. | course section
cup | The small hole in the green the ball must finish in. | final target
green | The very short, smooth grass around the cup where players putt. | smooth putting area
fairway | The short grass between tee and green — the best place to land. | best grass path
rough | The longer grass outside the fairway that makes shots harder. | longer trouble grass
tee | The peg that lifts the ball for the first shot; also the starting area. | starting spot
par | The expected number of strokes for a hole (par 3, 4, or 5). | expected score
stroke | One counted swing at the ball; fewer is better. | counted swing
round | A full set of holes, usually 18, played in one session. | full course play
birdie | One stroke under par on a hole. | one under expected
eagle | Two strokes under par — uncommon and impressive. | two under expected
bogey | One stroke over par on a hole. | one over expected
double bogey | Two strokes over par on a hole. | two over expected
ace | A hole-in-one — the ball goes in from the tee shot. | single-shot score
drive | The opening long shot, usually hit from the tee with a driver. | opening long shot
approach shot | A shot aimed at getting the ball onto the green. | shot toward green
chip | A short shot near the green that pops up briefly then rolls. | short pop-and-roll
pitch | A higher short shot that carries over trouble and lands softly. | high short shot
putt | A gentle rolling shot on or near the green toward the cup. | rolling finish shot
bunker | A sand-filled obstacle that makes shots harder. | sand trouble area
water hazard | A pond, lake, or stream; going in usually means a penalty. | water trouble area
out of bounds | Outside the playable course; usually a penalty and a replay. | outside playable area
penalty stroke | An extra stroke added for a rule issue, worsening the score. | added mistake point
lie | How and where the ball is sitting before a shot. | ball sitting condition
flagstick | The pole-and-flag marking the hole's location on the green. | visible flag target
caddie | The person who carries the clubs and advises on strategy. | player's course helper
driver | The club for the longest shots, usually off the tee. | longest-distance club
iron | A club for middle-distance shots toward the green. | middle-distance club
wedge | A club for short, high shots and tricky spots like sand. | short high-lift club
putter | The club built for rolling the ball on the green. | green rolling club
leaderboard | The list of player scores and rankings during a tournament. | tournament ranking list
cut | The score line deciding who continues after the early rounds. | survive-to-weekend line
fore | The warning shout when a ball heads toward people. | watch-out shout
```

## Cricket → `cricket.ts` → `CRICKET_GLOSSARY` (sport: 'cricket')

```
bat | The flat wooden tool the batter uses to hit the ball. | hitting tool
ball | The hard ball the bowler delivers toward the batter. | the game ball
wicket | The three upright stumps the bowler aims at; also means a batter getting out. | target sticks
stumps | The three wooden posts at each end of the pitch. | three posts
batter | The player trying to score runs by hitting the ball. Two bat at once. | run scorer
bowler | The player who delivers the ball toward the batter. | ball deliverer
fielder | A player who stops the ball, catches it, or helps get a batter out. | defensive player
wicketkeeper | The fielder crouched behind the stumps in gloves. | behind-batter catcher
run | The basic scoring unit — batters run between the wickets. | scoring unit
boundary | The edge of the field; reaching it scores extra runs. | field edge score
four | A boundary worth four runs, reached along the ground. | ground boundary score
six | A boundary worth six, cleared without bouncing — the biggest hit. | airborne boundary score
over | A set of six legal balls from one bowler. | six-ball set
innings | A team's turn to bat. | team batting turn
pitch | The central strip where the bowler delivers and the batter faces. | central playing strip
crease | The marked lines showing safe areas and delivery limits. | safety and delivery lines
out | When a batter is dismissed and replaced by a teammate. | batter dismissed
bowled | Out when the delivery hits the wicket and knocks the bails off. | sticks knocked over
caught | Out when a fielder catches the hit ball before it bounces. | caught before bounce
lbw | Out when the ball hits the leg and would have hit the wicket. | leg blocks target
run out | Out when the wicket is broken while the batter is short of safety. | beaten while running
stumped | Out when the keeper breaks the wicket as the batter strays out. | keeper catches wanderer
delivery | One ball bowled to the batter. | single bowled ball
no-ball | An illegal delivery; the batting team gets an extra run and ball. | illegal bowled ball
wide | A delivery too far to reach; an extra run and usually a re-bowl. | unreachable extra ball
dot ball | A delivery off which no runs are scored, building pressure. | no-score ball
maiden over | An over with no runs scored — a very tight over. | scoreless over
appeal | When fielders shout to ask the umpire for an out. | shout for dismissal
umpire | The official who judges outs, wides, no-balls, and more. | on-field official
powerplay | A phase with fielding limits that encourages attacking batting. | restricted-fielding phase
partnership | The combined runs of two batters batting together. | two-batter stand
chase | When the second team tries to reach the first team's target. | target pursuit
century | A score of 100+ runs by one batter — a major milestone. | hundred-run milestone
duck | Getting out without scoring a single run. | out for zero
```

---

## Counts (for the build doc's "report term counts" gate)
- MLB back-fill: 71 labels · NFL: 97 · Rugby: 38
- NBA: 31 (also serves WNBA) · NHL: 32 · Soccer: 33 · Tennis: 33 · Golf: 33 · Cricket: 34
- New terms total: ~196 · Grand total across all 10 sports: ~400
