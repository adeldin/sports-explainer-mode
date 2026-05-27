import { RugbyPlay } from '../types/sports';

export class RugbyExplainer {
  explain(play: RugbyPlay) {
    switch (play.playType) {
      case 'try':
        return this.explainTry(play);
      case 'knock_on':
        return this.explainKnockOn(play);
      case 'scrum':
        return this.explainScrum(play);
      case 'tackle':
        return this.explainTackle(play);
      default:
        return this.explainGeneric(play);
    }
  }

  private explainTry(play: RugbyPlay) {
    return {
      kid: {
        simple: `TRY! The player touched the ball down in the end zone! 5 points!`,
        whyItMatters: `This is how you score in rugby!`,
        ruleDetail: `A try is like a touchdown. You must touch the ball to the ground in the try zone to score 5 points.`
      },
      beginner: {
        simple: `Try scored! 5 points. Conversion kick attempt coming.`,
        whyItMatters: `After a try, the team can kick for 2 extra points.`,
        ruleDetail: `Unlike football, you must ground the ball (touch it down) in the try zone. Just crossing the line isn't enough.`
      },
      intermediate: {
        simple: `Try. 5 pts. Conversion attempt from where try was scored.`,
        whyItMatters: `Scoring near the posts makes the conversion easier. Teams sometimes run wide for better angles.`,
        ruleDetail: `The conversion kick is taken perpendicular to where the try was scored. Scoring centrally = easier kick.`
      }
    };
  }

  private explainKnockOn(play: RugbyPlay) {
    return {
      kid: {
        simple: `The ball went forward off someone's hands. That's not allowed! The other team gets the ball.`,
        whyItMatters: `In rugby, you can't drop the ball forward.`,
        ruleDetail: `A knock-on is when the ball goes forward off your hands or arms. The other team gets a scrum.`
      },
      beginner: {
        simple: `Knock-on. The ball went forward off the player's hands. Scrum to the other team.`,
        whyItMatters: `Rugby's key rule: the ball can only be passed backward. Dropping it forward is a turnover.`,
        ruleDetail: `If you drop the ball and it goes toward the opponent's try line, it's a knock-on. Results in a scrum with the other team getting possession.`
      },
      intermediate: {
        simple: `Knock-on. Scrum awarded to opposition.`,
        whyItMatters: `Ball security is crucial. Knock-ons often happen in contact or when catching kicks.`,
        ruleDetail: `Intentional knock-ons to prevent a try can result in a penalty try and yellow card. Accidental knock-ons are just scrums.`
      }
    };
  }

  private explainScrum(play: RugbyPlay) {
    return {
      kid: {
        simple: `The big players push against each other while someone rolls the ball between them!`,
        whyItMatters: `This is how the game restarts after certain mistakes.`,
        ruleDetail: `A scrum is when the forwards from both teams push against each other to win the ball.`
      },
      beginner: {
        simple: `Scrum. The forwards pack down and compete for the ball.`,
        whyItMatters: `Scrums restart play after knock-ons and forward passes. The team that didn't make the mistake usually gets the ball.`,
        ruleDetail: `8 forwards from each team bind together. The scrum-half rolls the ball in. Teams push to win possession.`
      },
      intermediate: {
        simple: `Scrum set. ${play.metadata?.possession} feed.`,
        whyItMatters: `Dominant scrums can win penalties or steal possession. Key battle between forward packs.`,
        ruleDetail: `The team feeding the scrum has advantage but can lose it if the opposition pushes harder. Scrum penalties are common.`
      }
    };
  }

  private explainTackle(play: RugbyPlay) {
    return {
      kid: {
        simple: `A player was tackled! They have to let go of the ball so the game can continue.`,
        whyItMatters: `Tackling stops the other team from running forward.`,
        ruleDetail: `When tackled, you must release the ball immediately. Other players can then try to get it.`
      },
      beginner: {
        simple: `Tackle made. The ball carrier must release the ball.`,
        whyItMatters: `After a tackle, a ruck forms where both teams compete for the ball.`,
        ruleDetail: `The tackled player must release the ball. The tackler must release the player. Both must roll away. Then others can compete for the ball.`
      },
      intermediate: {
        simple: `Tackle. Ruck forming.`,
        whyItMatters: `Ruck quality determines possession. Teams can win turnovers at the breakdown.`,
        ruleDetail: `The breakdown (tackle area) is crucial. Players must enter from their own side. Not releasing or going off feet = penalty.`
      }
    };
  }

  private explainGeneric(play: RugbyPlay) {
    return {
      kid: { simple: play.description },
      beginner: { simple: play.description },
      intermediate: { simple: play.description }
    };
  }
}

export const rugbyExplainer = new RugbyExplainer();