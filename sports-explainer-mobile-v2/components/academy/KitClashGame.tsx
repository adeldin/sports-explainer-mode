import TeamPickGame from './TeamPickGame';
import type { AcademyGameProps } from '../../lib/academyGames';

// Kit Clash — pure color recall: two brand swatches (zero text) → name the
// team. Shares the ESPN team pool + engine with Crest Rush (lib/espnTeams /
// TeamPickGame); only the variant differs.
export default function KitClashGame(props: AcademyGameProps) {
  return <TeamPickGame {...props} variant="kit-clash" />;
}
