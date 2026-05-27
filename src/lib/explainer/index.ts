import { BasePlay, GameState, ExplainedPlay } from '../types/sports';
import { footballExplainer } from './football';
import { baseballExplainer } from './baseball';

class ExplainerEngine {
  explainPlay(play: BasePlay, gameState: GameState): ExplainedPlay {
    switch (play.sport) {
      case 'football':
        const footballExplanations = footballExplainer.explain(play as any);
        return {
          play,
          gameState,
          explanations: footballExplanations
        };
      
      case 'baseball':
        const baseballExplanations = baseballExplainer.explain(play as any);
        return {
          play,
          gameState,
          explanations: baseballExplanations
        };
      
      default:
        return this.getDefaultExplanation(play, gameState);
    }
  }

  private getDefaultExplanation(play: BasePlay, gameState: GameState): ExplainedPlay {
    return {
      play,
      gameState,
      explanations: {
        kid: {
          simple: play.description,
          whyItMatters: 'Something happened!',
          ruleDetail: 'Watch the game!'
        },
        beginner: {
          simple: play.description,
          whyItMatters: 'Play in progress',
          ruleDetail: 'Watch what happens next!'
        },
        intermediate: {
          simple: play.description,
          whyItMatters: 'Play in progress',
          ruleDetail: 'Watch what happens next!'
        }
      }
    };
  }
}

export const explainerEngine = new ExplainerEngine();