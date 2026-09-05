import { makeRugbyReadGame } from './RugbyReadEngine';
import { SCENARIOS, OPTIONS, HINT_EMOJI } from '../../lib/oneMorePhase';

// One More Phase or Ship It Wide? — attacking patience: fix their 13, then strike.
export default makeRugbyReadGame({ options: OPTIONS, scenarios: SCENARIOS, hintEmoji: HINT_EMOJI });
