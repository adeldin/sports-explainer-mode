import { BaseballPlay } from '../types/sports';

export class BaseballExplainer {
  explain(play: BaseballPlay) {
    switch (play.playType) {
      case 'strikeout':
        return this.explainStrikeout(play);
      case 'hit':
        return this.explainHit(play);
      case 'home_run':
        return this.explainHomeRun(play);
      case 'walk':
        return this.explainWalk(play);
      default:
        return this.explainGeneric(play);
    }
  }

  private explainStrikeout(play: BaseballPlay) {
    return {
      kid: {
        simple: `The batter missed three times and is out!`,
        whyItMatters: `The pitcher won! One out for the defense.`,
        ruleDetail: `Three strikes and you're out. A strike is a swing and miss, or a pitch in the strike zone.`
      },
      beginner: {
        simple: `Strikeout. The batter is out.`,
        whyItMatters: `${play.metadata?.outs || 0} outs now. Three outs ends the inning.`,
        ruleDetail: `Strikes: swinging and missing, not swinging at a good pitch, or hitting foul (except foul on 2 strikes doesn't count as strike 3).`
      },
      intermediate: {
        simple: `K. ${play.metadata?.outs} out${play.metadata?.outs !== 1 ? 's' : ''}.`,
        whyItMatters: `Strikeouts are efficient for pitchers - no chance of fielding errors.`,
        ruleDetail: `Swinging strike three can be a wild pitch - batter can run to first if catcher doesn't catch it cleanly.`
      }
    };
  }

  private explainHit(play: BaseballPlay) {
    return {
      kid: {
        simple: `The batter hit the ball and made it to base safely!`,
        whyItMatters: `Now there's a runner who can score!`,
        ruleDetail: `When you hit the ball and reach base before being tagged out, it's a hit!`
      },
      beginner: {
        simple: `Base hit! Runner on base.`,
        whyItMatters: `Hits advance runners and create scoring opportunities.`,
        ruleDetail: `Single = 1st base, Double = 2nd base, Triple = 3rd base. Runners already on base advance too.`
      },
      intermediate: {
        simple: `Base hit. ${play.metadata?.baseRunners?.length || 0} runner(s) on.`,
        whyItMatters: `Batting average = hits / at-bats. Good hitters are above .300.`,
        ruleDetail: `Extra-base hits (doubles, triples) are more valuable. Triples are rare - requires speed and good placement.`
      }
    };
  }

  private explainHomeRun(play: BaseballPlay) {
    return {
      kid: {
        simple: `HOME RUN! The ball went over the fence! Everyone scores!`,
        whyItMatters: `This is the most exciting play in baseball!`,
        ruleDetail: `When the ball goes over the outfield fence, the batter and all runners score automatically!`
      },
      beginner: {
        simple: `Home run! The ball cleared the fence. Automatic run(s).`,
        whyItMatters: `The batter and all base runners score. Could be 1-4 runs depending on runners on base.`,
        ruleDetail: `Grand slam = home run with bases loaded (3 runners on) = 4 runs. Most valuable hit in baseball.`
      },
      intermediate: {
        simple: `HR. ${(play.metadata?.baseRunners?.length || 0) + 1} run(s) score.`,
        whyItMatters: `Home runs are game-changers. Elite power hitters hit 40+ per season.`,
        ruleDetail: `Must be fair territory (between foul poles). Ball must clear the fence in flight - bouncing over is a ground-rule double.`
      }
    };
  }

  private explainWalk(play: BaseballPlay) {
    return {
      kid: {
        simple: `The pitcher threw 4 bad pitches, so the batter gets to go to first base for free!`,
        whyItMatters: `Free base! No hit needed!`,
        ruleDetail: `If the pitcher throws 4 balls (pitches outside the strike zone), the batter walks to first base.`
      },
      beginner: {
        simple: `Walk (base on balls). Batter advances to first base.`,
        whyItMatters: `Walks load the bases and tire the pitcher. As good as a hit for getting on base.`,
        ruleDetail: `4 balls = walk. A ball is a pitch outside the strike zone that the batter doesn't swing at. Runners on base advance if forced.`
      },
      intermediate: {
        simple: `BB. Batter walks.`,
        whyItMatters: `On-base percentage includes walks. Patient hitters draw walks by not chasing bad pitches.`,
        ruleDetail: `Intentional walks (4 pitches way outside) are strategic to avoid dangerous hitters or set up double plays.`
      }
    };
  }

  private explainGeneric(play: BaseballPlay) {
    return {
      kid: { simple: play.description },
      beginner: { simple: play.description },
      intermediate: { simple: play.description }
    };
  }
}

export const baseballExplainer = new BaseballExplainer();