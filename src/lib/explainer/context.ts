import { GameState, BasePlay } from '../types/sports';

export function getGameContext(play: BasePlay, gameState: GameState): string {
  if (gameState.sport !== 'baseball') return '';
  
  const metadata = play.metadata;
  if (!metadata) return '';
  
  const contexts: string[] = [];
  
  // Score situation
  const scoreDiff = Math.abs(gameState.homeScore - gameState.awayScore);
  if (scoreDiff === 0) {
    contexts.push('🔥 Tie game');
  } else if (scoreDiff === 1) {
    contexts.push('⚡ One-run game');
  }
  
  // Inning situation
  if (metadata.inning && metadata.inning >= 7) {
    contexts.push('⏰ Late in the game');
  }
  
  // Runners in scoring position
  if (metadata.baseRunners?.includes('2nd') || metadata.baseRunners?.includes('3rd')) {
    contexts.push('🎯 Runner in scoring position');
  }
  
  // Two outs
  if (metadata.outs === 2) {
    contexts.push('⚠️ Two outs');
  }
  
  // Bases loaded
  if (metadata.baseRunners?.length === 3) {
    contexts.push('🔥 Bases loaded!');
  }
  
  return contexts.join(' • ');
}
