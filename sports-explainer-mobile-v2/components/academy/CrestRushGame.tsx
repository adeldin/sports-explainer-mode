import TeamPickGame from './TeamPickGame';
import type { AcademyGameProps } from '../../lib/academyGames';

// Crest Rush — crest ↔ team-name recognition against the clock. The Academy's
// first live-data game: the team pool streams from ESPN's keyless /teams route
// (lib/espnTeams), shared with Kit Clash. All game logic lives in TeamPickGame.
export default function CrestRushGame(props: AcademyGameProps) {
  return <TeamPickGame {...props} variant="crest-rush" />;
}
