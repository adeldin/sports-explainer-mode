import { BasePlay, ExplainedPlay, GameState } from '../types/sports';
import { footballExplainer } from './football';
import { baseballExplainer } from './baseball';
import { rugbyExplainer } from './rugby';

export class SportsExplainerEngine {
  explainPlay(play: BasePlay, gameState: GameState): ExplainedPlay {
    let explanations;

    switch (play.sport) {
      case 'football':
        explanations = footballExplainer.explain(play as any);
        break;
      case 'baseball':
        explanations = baseballExplainer.explain(play as any);
        break;
      case 'rugby':
        explanations = rugbyExplainer.explain(play as any);
        break;
      default:
        explanations = {
          kid: { simple: play.description },
          beginner: { simple: play.description },
          intermediate: { simple: play.description }
        };
    }

    return {
      play,
      gameState,
      explanations
    };
  }
}

export const explainerEngine = new SportsExplainerEngine();