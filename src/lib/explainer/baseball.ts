import { BaseballPlay, Explanation } from '../types/sports';
import { generateAIExplanation } from '../AI/groq';

class BaseballExplainer {
  async explain(play: BaseballPlay): Promise<{ kid: Explanation; beginner: Explanation; intermediate: Explanation }> {
    // Build context string for AI
    const context = this.buildContext(play);
    
    // Generate AI explanations for each level in parallel
    const [kidExplanation, beginnerExplanation, intermediateExplanation] = await Promise.all([
      generateAIExplanation({
        play: play.description,
        sport: 'baseball',
        gameContext: context,
        level: 'kid'
      }),
      generateAIExplanation({
        play: play.description,
        sport: 'baseball',
        gameContext: context,
        level: 'beginner'
      }),
      generateAIExplanation({
        play: play.description,
        sport: 'baseball',
        gameContext: context,
        level: 'intermediate'
      })
    ]);

    return {
      kid: kidExplanation,
      beginner: beginnerExplanation,
      intermediate: intermediateExplanation
    };
  }

  private buildContext(play: BaseballPlay): string {
    const parts = [];
    
    // Add inning info
    if (play.metadata?.inning !== undefined) {
      parts.push(`Inning ${play.metadata.inning}`);
    }
    
    // Add count
    if (play.metadata?.balls !== undefined && play.metadata?.strikes !== undefined) {
      parts.push(`Count: ${play.metadata.balls}-${play.metadata.strikes}`);
    }
    
    // Add outs
    if (play.metadata?.outs !== undefined) {
      parts.push(`${play.metadata.outs} out${play.metadata.outs !== 1 ? 's' : ''}`);
    }
    
    // Add base runners
    if (play.metadata?.baseRunners && play.metadata.baseRunners.length > 0) {
      const bases = play.metadata.baseRunners.map((runner: any) => {
        if (typeof runner === 'string') return runner;
        return runner.base || 'base';
      });
      parts.push(`Runners on: ${bases.join(', ')}`);
    }
    
    return parts.join(' | ');
  }
}

export const baseballExplainer = new BaseballExplainer();