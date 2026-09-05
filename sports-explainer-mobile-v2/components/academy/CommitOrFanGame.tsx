import { makeRugbyReadGame } from './RugbyReadEngine';
import { SCENARIOS, OPTIONS, HINT_EMOJI } from '../../lib/commitOrFan';

// Commit or Fan? — the breakdown decision: contest the ball or set the line.
export default makeRugbyReadGame({ options: OPTIONS, scenarios: SCENARIOS, hintEmoji: HINT_EMOJI });
