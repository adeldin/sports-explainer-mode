import { BasePlay, GameState, ExplainedPlay } from '../types/sports';
import { footballExplainer } from './football';
import { baseballExplainer } from './baseball';
import { getGameContext } from './context';

class ExplainerEngine {
  async explainPlay(play: BasePlay, gameState: GameState): Promise<ExplainedPlay> {
    const context = getGameContext(play, gameState);
    
    switch (play.sport) {
      case 'football':
        const footballExplanations = footballExplainer.explain(play as any);
        return {
          play,
          gameState,
          explanations: footballExplanations,
          context
        };
      
      case 'baseball':
        // Baseball now uses async AI explanations - MUST await!
        const baseballExplanations = await baseballExplainer.explain(play as any);
        return {
          play,
          gameState,
          explanations: baseballExplanations,
          context
        };
      
      default:
        return this.getDefaultExplanation(play, gameState);
    }
  }

  getDefaultExplanation(play: BasePlay, gameState: GameState): ExplainedPlay {
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