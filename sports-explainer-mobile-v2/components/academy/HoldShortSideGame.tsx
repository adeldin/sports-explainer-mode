import { makeRugbyReadGame } from './RugbyReadEngine';
import { SCENARIOS, OPTIONS, HINT_EMOJI } from '../../lib/holdShortSide';

// Hold the Short Side? — guard duty: why a defender protects the quiet strip.
export default makeRugbyReadGame({ options: OPTIONS, scenarios: SCENARIOS, hintEmoji: HINT_EMOJI });
