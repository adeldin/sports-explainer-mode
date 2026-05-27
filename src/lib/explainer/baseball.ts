import { BaseballPlay } from '../types/sports';

export class BaseballExplainer {
  explain(play: BaseballPlay) {
    const playType = play.playType;
    const description = play.description;

    switch (playType) {
      case 'home_run':
        return this.explainHomeRun(description);
      case 'strikeout':
        return this.explainStrikeout(description);
      case 'walk':
        return this.explainWalk(description);
      case 'hit':
        return this.explainHit(description);
      case 'out':
        return this.explainOut(description);
      case 'double_play':
        return this.explainDoublePlay(description);
      case 'stolen_base':
        return this.explainStolenBase(description);
      default:
        return this.explainGeneric(description);
    }
  }

  private explainHomeRun(description: string) {
    return {
      kid: {
        simple: description,
        whyItMatters: 'The batter hit the ball over the fence! Everyone on base scores!',
        ruleDetail: '⚾ A home run is the best hit in baseball - automatic run!'
      },
      beginner: {
        simple: description,
        whyItMatters: 'A home run clears the bases and scores all runners, plus the batter.',
        ruleDetail: '📊 This could be a 1-4 run swing depending on baserunners.'
      },
      intermediate: {
        simple: description,
        whyItMatters: 'Home run - likely a mistake pitch or exceptional hitting.',
        ruleDetail: '📊 Check pitch location and count leverage.'
      }
    };
  }

  private explainStrikeout(description: string) {
    return {
      kid: {
        simple: description,
        whyItMatters: 'The batter got three strikes and is out.',
        ruleDetail: '❌ Three strikes and you\'re out!'
      },
      beginner: {
        simple: description,
        whyItMatters: 'The pitcher dominated this at-bat with strikes.',
        ruleDetail: '🎯 Good pitchers get strikeouts in key situations.'
      },
      intermediate: {
        simple: description,
        whyItMatters: 'Strikeout - pitcher executed pitch sequence effectively.',
        ruleDetail: '🎯 Analyze pitch mix and sequencing.'
      }
    };
  }

  private explainWalk(description: string) {
    return {
      kid: {
        simple: description,
        whyItMatters: 'The pitcher threw four balls, so the batter gets first base for free.',
        ruleDetail: '🚶 Four balls = free base!'
      },
      beginner: {
        simple: description,
        whyItMatters: 'The pitcher lost control of the strike zone, giving up a free baserunner.',
        ruleDetail: '⚠️ Walks can lead to big innings for the offense.'
      },
      intermediate: {
        simple: description,
        whyItMatters: 'Walk - pitcher missed spots or batter showed discipline.',
        ruleDetail: '⚠️ Check count leverage and base-out state.'
      }
    };
  }

  private explainHit(description: string) {
    return {
      kid: {
        simple: description,
        whyItMatters: 'The batter hit the ball and made it to base safely.',
        ruleDetail: '💡 Hits help the team score runs!'
      },
      beginner: {
        simple: description,
        whyItMatters: 'A successful hit puts pressure on the defense and advances the offense.',
        ruleDetail: '📈 Hits advance runners and create scoring opportunities.'
      },
      intermediate: {
        simple: description,
        whyItMatters: 'Base hit - contact quality and defensive positioning matter.',
        ruleDetail: '📈 Evaluate exit velocity and launch angle.'
      }
    };
  }

  private explainOut(description: string) {
    return {
      kid: {
        simple: description,
        whyItMatters: 'The player was put out.',
        ruleDetail: '❌ Three outs and the team switches!'
      },
      beginner: {
        simple: description,
        whyItMatters: 'The defense successfully recorded an out.',
        ruleDetail: '✅ Outs are the currency of baseball defense.'
      },
      intermediate: {
        simple: description,
        whyItMatters: 'Out recorded - defensive execution or poor contact.',
        ruleDetail: '✅ Consider WPA (Win Probability Added).'
      }
    };
  }

  private explainDoublePlay(description: string) {
    return {
      kid: {
        simple: description,
        whyItMatters: 'Two outs on one play! That\'s really good for the team in the field.',
        ruleDetail: '⚡ Getting two outs at once is amazing!'
      },
      beginner: {
        simple: description,
        whyItMatters: 'A double play kills a rally by getting two outs on one batted ball.',
        ruleDetail: '🔥 This is a momentum killer for the offense.'
      },
      intermediate: {
        simple: description,
        whyItMatters: 'Double play - ground ball with runner on, typically low launch angle.',
        ruleDetail: '🔥 Massive negative WPA for offense.'
      }
    };
  }

  private explainStolenBase(description: string) {
    return {
      kid: {
        simple: description,
        whyItMatters: 'The runner ran to the next base while the pitcher was throwing.',
        ruleDetail: '🏃 Fast runners can steal bases!'
      },
      beginner: {
        simple: description,
        whyItMatters: 'The runner took advantage of timing to advance without a hit.',
        ruleDetail: '⚡ Stolen bases put runners in scoring position.'
      },
      intermediate: {
        simple: description,
        whyItMatters: 'Stolen base - runner read pitcher timing and catcher release.',
        ruleDetail: '⚡ Check pitcher delivery time and catcher pop time.'
      }
    };
  }

  private explainGeneric(description: string) {
    return {
      kid: { 
        simple: description,
        whyItMatters: 'Something happened in the game!',
        ruleDetail: '⚾ Every play matters!'
      },
      beginner: { 
        simple: description,
        whyItMatters: 'This play affects the game.',
        ruleDetail: '⚾ Watch what happens next!'
      },
      intermediate: { 
        simple: description,
        whyItMatters: 'Analyze this play in context.',
        ruleDetail: '⚾ Consider the game situation.'
      }
    };
  }
}

export const baseballExplainer = new BaseballExplainer();