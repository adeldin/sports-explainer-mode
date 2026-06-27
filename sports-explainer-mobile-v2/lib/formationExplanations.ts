// Formation explanation lookup — STANDALONE data module that pairs with the formation layout engine
// (the data-driven SVG diagram, Tier 1). Pure static data: one explanation per formation per difficulty
// level, ZERO AI cost. Keyed by the ESPN `formation` string (e.g. "4-3-3"); the layout engine / card
// just reads FORMATION_EXPLANATIONS[formation]?.[level].
//
// Tier voice (author's intent): kid = Rookie · beginner = Beginner · intermediate = Expert · expert = Coach.
// The OBJECT keys are the app's Level values (kid/beginner/intermediate/expert) so this maps 1:1 to the
// user's currently-selected level — no translation layer needed.

import type { Level } from './api';

export type FormationKey =
  | '4-3-3' | '4-2-3-1' | '4-4-2' | '4-1-4-1' | '4-5-1' | '3-5-2'
  | '3-4-3' | '5-3-2' | '4-4-1-1' | '5-4-1' | '4-2-2-2' | '3-4-1-2';

export const FORMATION_EXPLANATIONS: Record<FormationKey, Record<Level, string>> = {
  '4-3-3': {
    kid: `A 4-3-3 is built to attack with width, using three forwards to stretch the field and keep pressure on the other team.`,
    beginner: `This shape puts three attackers high up the field, usually with wide players near the sidelines. It is good for pressing, fast attacks, and making the opponent defend the full width of the pitch.`,
    intermediate: `The 4-3-3 prioritizes width, high pressing, and midfield balance, often using wingers to pin fullbacks while the midfield three controls central spaces. Its weakness is that the lone striker and advanced wide players can become disconnected if the midfield cannot progress the ball.`,
    expert: `Use a 4-3-3 when you want to press aggressively, dominate wide areas, and create 1v1 chances for wingers. The trade-off is that your fullbacks often have to cover huge spaces, especially if the wingers stay high. It works best with athletic wide players, a striker who can occupy center backs, and midfielders who can protect against counters.`,
  },
  '4-2-3-1': {
    kid: `A 4-2-3-1 is a balanced shape that protects the defense while still giving the team several attacking options.`,
    beginner: `The two deeper midfielders help shield the back line, while three attacking midfielders support the striker. It is popular because it can defend safely and still attack with numbers.`,
    intermediate: `The 4-2-3-1 gives strong central protection through the double pivot while keeping a clear attacking line behind the striker. Its main challenge is connecting the striker to the rest of the team if the attacking midfield three are forced too deep.`,
    expert: `This is a strong choice when you want control without becoming too defensive. The double pivot gives rest-defense and helps stop counterattacks, while the number 10 can find pockets between the lines. The trade-off is that the striker may be isolated unless the wingers and attacking midfielder arrive quickly in support.`,
  },
  '4-4-2': {
    kid: `A 4-4-2 is a simple, organized shape with two forwards and two clear lines behind them.`,
    beginner: `This formation is easy to understand: four defenders, four midfielders, and two strikers. It is good for staying compact, defending as a group, and attacking early toward the front two.`,
    intermediate: `The 4-4-2 prioritizes structure, compactness, and direct attacking partnerships, especially through two strikers who can occupy both center backs. Its weakness is central midfield overloads, because a three-player midfield can outnumber the two central midfielders.`,
    expert: `Use a 4-4-2 when you want defensive clarity, strong horizontal compactness, and a reliable outlet through two forwards. It is excellent for mid-block defending and quick transitions, but it can struggle against teams that overload central midfield. The wide midfielders must work hard both ways or the shape becomes too flat and passive.`,
  },
  '4-1-4-1': {
    kid: `A 4-1-4-1 is built to protect the middle of the field while keeping enough players ready to attack.`,
    beginner: `One midfielder sits in front of the defense, with four midfielders ahead of them. That sitting player helps stop attacks through the middle and lets the team stay organized.`,
    intermediate: `The 4-1-4-1 provides a single holding midfielder as the defensive anchor, allowing the two central midfielders ahead to press or support attacks. Its risk is that the holding player can be exposed if the wide midfielders and central midfielders press unevenly.`,
    expert: `This shape is useful when you want midfield coverage without committing to a second striker. It can press in a 4-1-4-1 or drop into a compact block, with the holding midfielder screening passes into dangerous central zones. The trade-off is that the lone striker can be isolated, and the defensive midfielder must read the game extremely well.`,
  },
  '4-5-1': {
    kid: `A 4-5-1 is a cautious shape that fills the midfield and makes it hard for the other team to play through.`,
    beginner: `This formation uses five midfielders to crowd the center and protect the defense. It usually gives up some attacking power in exchange for being harder to break down.`,
    intermediate: `The 4-5-1 prioritizes midfield density, compact defending, and control of central passing lanes. Its weakness is attacking isolation, because the lone striker often has limited support unless midfield runners break forward quickly.`,
    expert: `Use a 4-5-1 when you need defensive stability, especially against a team that wants to dominate possession. It can frustrate opponents by closing central spaces and forcing them wide, but it requires disciplined shifting across the field. The trade-off is that counterattacks can die quickly if the midfield line is too deep or slow to support.`,
  },
  '3-5-2': {
    kid: `A 3-5-2 uses three defenders and five midfielders to control the middle while still playing with two forwards.`,
    beginner: `The wingbacks are key because they run the sides of the field, helping both defense and attack. This shape gives the team numbers in midfield and two strikers to combine up front.`,
    intermediate: `The 3-5-2 creates central superiority through three midfielders and two forwards, while wingbacks provide the width. Its weakness is defending wide areas behind the wingbacks, especially against fast wingers or quick switches of play.`,
    expert: `Use a 3-5-2 when you want to overload central areas, pair two strikers, and still have width from wingbacks. It is strong against two-striker systems because the back three can match up well while keeping a spare defender. The trade-off is heavy wingback responsibility; if they are pinned deep, the team can become a narrow back five with limited attacking width.`,
  },
  '3-4-3': {
    kid: `A 3-4-3 is an attacking shape that uses three forwards and wingbacks to put pressure across the front line.`,
    beginner: `This formation has three central defenders, two wide players who cover the sides, and three attackers. It can create lots of pressure, but it asks the wide players to do a lot of running.`,
    intermediate: `The 3-4-3 prioritizes front-line pressure, wide overloads, and flexible buildup with a back three. Its weakness is the two-player central midfield, which can be outnumbered if the front three do not help defensively.`,
    expert: `Use a 3-4-3 when you want aggressive pressing, width from wingbacks, and three attackers occupying the opponent's back line. It can pin opponents deep and create strong wide rotations, especially when the outside center backs step forward. The trade-off is central vulnerability: your midfield pair must cover huge spaces and survive pressure.`,
  },
  '5-3-2': {
    kid: `A 5-3-2 is a defensive shape that protects the goal with five defenders and looks to counter with two forwards.`,
    beginner: `The team defends with a back five, making it hard to get behind them. The two forwards give the team a way to attack quickly when they win the ball.`,
    intermediate: `The 5-3-2 prioritizes defensive security, central compactness, and counterattacking through two strikers. Its weakness is that it can concede wide possession and become pinned back if the wingbacks cannot move up the field.`,
    expert: `Use a 5-3-2 when you need to protect central spaces, defend crosses with numbers, and counter through two forwards. It is useful against stronger possession teams or opponents with dangerous central attackers. The trade-off is territory: if the wingbacks stay too deep, the team may struggle to escape pressure.`,
  },
  '4-4-1-1': {
    kid: `A 4-4-1-1 is like a 4-4-2, but one forward drops deeper to connect the midfield and attack.`,
    beginner: `One striker stays highest, while the second attacker plays just behind them. That deeper player helps link passes and makes the team less direct than a basic 4-4-2.`,
    intermediate: `The 4-4-1-1 keeps the defensive stability of a 4-4-2 while adding a second-line attacker between midfield and the striker. Its weakness is that the top striker can still become isolated if the support player is forced too deep.`,
    expert: `Use a 4-4-1-1 when you want compact defensive lines but also need someone to connect midfield to attack. The second forward can screen the opponent's holding midfielder, receive between the lines, or join the striker late. The trade-off is that it depends heavily on that player's intelligence and timing.`,
  },
  '5-4-1': {
    kid: `A 5-4-1 is a very defensive shape that protects space and makes the opponent work hard to create chances.`,
    beginner: `This formation keeps five defenders and four midfielders behind the ball, with one striker up front. It is often used to defend a lead or survive against a stronger attacking team.`,
    intermediate: `The 5-4-1 prioritizes low-block compactness, wide protection, and numbers in the penalty area. Its weakness is limited attacking presence, because the lone striker may be far away from support when the team wins the ball.`,
    expert: `Use a 5-4-1 when the main goal is to deny space, defend crosses, and force the opponent into low-quality chances. It can be very hard to break down if the distances between lines stay tight. The trade-off is that you may invite pressure for long stretches and need excellent discipline to avoid becoming passive.`,
  },
  '4-2-2-2': {
    kid: `A 4-2-2-2 is a narrow attacking shape with two strikers and two creative players behind them.`,
    beginner: `Instead of using traditional wide wingers, this formation often puts two attacking midfielders inside. It is good for quick passing through the middle, but it can leave the wide areas to the fullbacks.`,
    intermediate: `The 4-2-2-2 prioritizes central overloads, vertical passing, and aggressive pressing with two forwards and two narrow attacking midfielders. Its weakness is natural width, since the fullbacks often have to provide most of the outside threat.`,
    expert: `Use a 4-2-2-2 when you want to attack through central combinations and press opponents into mistakes. The two strikers can occupy center backs while the two attacking midfielders find pockets inside. The trade-off is width and spacing: if the fullbacks cannot advance safely, the attack can become crowded and predictable.`,
  },
  '3-4-1-2': {
    kid: `A 3-4-1-2 uses two strikers and a creative player behind them to attack through the middle.`,
    beginner: `The "1" behind the strikers is usually a playmaker who connects passes and creates chances. The wingbacks provide width, while the two strikers give the team a strong presence up front.`,
    intermediate: `The 3-4-1-2 creates central attacking overloads with a number 10 behind two forwards, supported by wingbacks for width. Its weakness is defending wide transitions, especially if the wingbacks are high and the outside center backs get pulled out.`,
    expert: `Use a 3-4-1-2 when you want to attack through the middle with a playmaker feeding two strikers. It can overwhelm teams that defend with only two central midfielders, because the number 10 creates an extra problem between the lines. The trade-off is defensive coverage in wide areas and the need for the wingbacks to manage both attacking width and recovery runs.`,
  },
};
