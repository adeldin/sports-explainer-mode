// Zone Tap — WNBA bank. The WNBA and NBA play on the SAME painted court geometry, and
// Zone Tap teaches court geography (rule-based, league-agnostic) — so this bank derives
// from the shared basketball scenarios with WNBA-scoped ids. The copy in the shared bank
// is deliberately league-neutral (or names both leagues where distances differ, e.g. the
// corner-three note). If WNBA-specific spatial content is ever wanted (e.g. its exact
// arc), author it here and append. Pure data, zero RN imports.
import type { ZoneScenario } from '../zoneTapRegions';
import { NBA_ZONE_SCENARIOS } from './nba';

export const WNBA_ZONE_SCENARIOS: ZoneScenario[] = NBA_ZONE_SCENARIOS.map(s => ({
  ...s,
  id: s.id.replace(/^nba-/, 'wnba-'),
}));
