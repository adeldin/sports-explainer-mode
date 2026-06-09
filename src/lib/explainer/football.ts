import { FootballPlay, Explanation } from '../types/sports';

export class FootballExplainer {
  explain(play: FootballPlay) {
    switch (play.playType) {
      case 'pass':
        return this.explainPass(play);
      case 'run':
        return this.explainRun(play);
      case 'penalty':
        return this.explainPenalty(play);
      case 'touchdown':
        return this.explainTouchdown(play);
      case 'field_goal':
        return this.explainFieldGoal(play);
      case 'turnover':
        return this.explainTurnover(play);
      default:
        return this.explainGeneric(play);
    }
  }

  private explainPass(play: FootballPlay) {
    const yards = play.metadata?.yardsGained || 0;
    const success = yards > 0;

    return {
      kid: {
        simple: success 
          ? `The quarterback threw the ball and someone caught it! They moved forward ${yards} yards.`
          : `The quarterback threw the ball but nobody caught it.`,
        whyItMatters: success ? `Moving forward helps the team score!` : `They'll try again next play.`,
        ruleDetail: `The quarterback can throw the ball forward to teammates. If they catch it, the team moves forward. If nobody catches it, it's incomplete.`
      },
      beginner: {
        simple: success
          ? `Completed pass for ${yards} yards.`
          : `Incomplete pass.`,
        whyItMatters: success && yards >= (play.metadata?.distance || 10)
          ? `This gained a first down!`
          : `${(play.metadata?.distance || 10) - yards} yards needed for first down.`,
        ruleDetail: `A forward pass must be thrown from behind the line of scrimmage. Only one forward pass allowed per play. If the ball hits the ground, it's incomplete.`
      },
      intermediate: {
        simple: `${yards}-yard ${success ? 'completion' : 'incompletion'}. ${play.metadata?.down}${play.metadata?.down ? ' & ' : ''}${play.metadata?.distance || ''}`,
        whyItMatters: `Passing is high-risk, high-reward. ${success && yards >= 20 ? 'Big gain.' : ''}`,
        ruleDetail: `Pass interference occurs when a defender contacts the receiver before the ball arrives. Offensive PI is when the receiver pushes off.`
      }
    };
  }

  private explainRun(play: FootballPlay) {
    const yards = play.metadata?.yardsGained || 0;
    return {
      kid: {
        simple: `A player ran with the ball for ${yards} yards!`,
        whyItMatters: yards >= 5 ? `Good run!` : `Every yard helps!`,
        ruleDetail: `The runner tries to get past the other team. The play ends when tackled or out of bounds.`
      },
      beginner: {
        simple: `Running play gained ${yards} yards.`,
        whyItMatters: yards >= (play.metadata?.distance || 10) ? `First down!` : `${(play.metadata?.distance || 10) - yards} yards to go.`,
        ruleDetail: `Running plays are safer than passes but gain fewer yards. The play ends when the runner is tackled.`
      },
      intermediate: {
        simple: `${yards}-yard rush.`,
        whyItMatters: `Running keeps the clock moving and controls tempo.`,
        ruleDetail: `Run plays don't stop the clock unless the runner goes out of bounds. Teams run to protect leads.`
      }
    };
  }

  private explainPenalty(play: FootballPlay) {
    return {
      kid: {
        simple: `A player broke a rule. One team moves backward or forward.`,
        whyItMatters: `Breaking rules helps the other team.`,
        ruleDetail: `When players break rules, the referee throws a yellow flag. Teams gain or lose yards.`
      },
      beginner: {
        simple: `${play.description}`,
        whyItMatters: `Penalties can change the whole situation.`,
        ruleDetail: `Common penalties: holding (grabbing), false start (moving too early), pass interference. Most are 5, 10, or 15 yards.`
      },
      intermediate: {
        simple: `${play.description}`,
        whyItMatters: `Some penalties give automatic first downs.`,
        ruleDetail: `Pre-snap penalties are dead-ball fouls. Live-ball penalties can be declined if the result was better.`
      }
    };
  }

  private explainTouchdown(play: FootballPlay) {
    return {
      kid: {
        simple: `TOUCHDOWN! 6 points!`,
        whyItMatters: `This is the best way to score!`,
        ruleDetail: `A touchdown is when the ball gets into the end zone. The team gets 6 points!`
      },
      beginner: {
        simple: `Touchdown! 6 points scored.`,
        whyItMatters: `After a TD, the team can kick for 1 point or try for 2.`,
        ruleDetail: `The ball must cross the goal line while in possession. Then the team attempts an extra point.`
      },
      intermediate: {
        simple: `Touchdown. 6 points.`,
        whyItMatters: `Teams usually kick the extra point (98% success) unless needing 2 points.`,
        ruleDetail: `The ball only needs to break the plane of the goal line. Extra point from the 15, 2-point try from the 2.`
      }
    };
  }

  private explainFieldGoal(play: FootballPlay) {
    const made = play.description.toLowerCase().includes('good');
    return {
      kid: {
        simple: made ? `The kicker scored 3 points!` : `The kick missed.`,
        whyItMatters: made ? `The team scored!` : `No points.`,
        ruleDetail: `Kicking through the yellow posts scores 3 points.`
      },
      beginner: {
        simple: made ? `Field goal good! 3 points.` : `Field goal missed.`,
        whyItMatters: `Teams kick when too far for a TD but close enough to score.`,
        ruleDetail: `The ball must go between the uprights and above the crossbar.`
      },
      intermediate: {
        simple: made ? `FG successful. 3 pts.` : `FG failed.`,
        whyItMatters: `About 85% successful from under 40 yards.`,
        ruleDetail: `Failed FGs give opponents good field position. Teams may punt from long distance instead.`
      }
    };
  }

  private explainTurnover(play: FootballPlay) {
    const isInt = play.description.toLowerCase().includes('interception');
    return {
      kid: {
        simple: isInt ? `The other team caught the ball!` : `The ball was dropped and the other team got it!`,
        whyItMatters: `Now the other team gets to attack!`,
        ruleDetail: isInt ? `An interception is when the defense catches the pass.` : `A fumble is when someone drops the ball.`
      },
      beginner: {
        simple: isInt ? `Interception! Defense has the ball.` : `Fumble recovered by defense!`,
        whyItMatters: `Turnovers are game-changing. Complete momentum shift.`,
        ruleDetail: isInt ? `Defense can return an interception for a touchdown.` : `Any player can recover a fumble.`
      },
      intermediate: {
        simple: isInt ? `Interception.` : `Fumble. Defense recovers.`,
        whyItMatters: `Turnover margin strongly predicts wins.`,
        ruleDetail: isInt ? `Pick-six = interception returned for TD.` : `Ground can't cause a fumble.`
      }
    };
  }

 private explainGeneric(play: FootballPlay) {
  return {
    kid: {
      simple: play.description,
      whyItMatters: 'Something happened in the game!',
      ruleDetail: 'Watch what happens next!'
    },
    beginner: {
      simple: play.description,
      whyItMatters: 'This play affects the game situation.',
      ruleDetail: 'Understanding this helps you follow the action.'
    },
    intermediate: {
      simple: play.description,
      whyItMatters: 'This play impacts field position and momentum.',
      ruleDetail: 'Strategic decisions are being made based on game context.'
    }
  };
}
}

export const footballExplainer = new FootballExplainer();