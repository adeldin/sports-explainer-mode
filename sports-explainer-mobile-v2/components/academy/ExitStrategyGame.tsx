import { makeRugbyReadGame } from './RugbyReadEngine';
import { SCENARIOS, OPTIONS, HINT_EMOJI } from '../../lib/exitStrategy';

// Exit Strategy — the 9's call from inside your own 22: box, long, or run.
export default makeRugbyReadGame({ options: OPTIONS, scenarios: SCENARIOS, hintEmoji: HINT_EMOJI });
