import { makeRugbyReadGame } from './RugbyReadEngine';
import { SCENARIOS, OPTIONS, HINT_EMOJI } from '../../lib/jamOrDrift';

// Jam or Drift? — rugby defensive 2-v-1 read. All content lives in lib/jamOrDrift;
// the scaffold is the shared RugbyReadEngine (one canonical component for the set).
export default makeRugbyReadGame({ options: OPTIONS, scenarios: SCENARIOS, hintEmoji: HINT_EMOJI });
