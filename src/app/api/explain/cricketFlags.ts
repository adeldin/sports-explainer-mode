// Cricket national-side flags — an EXACT-FULL-NAME ALLOWLIST. No fuzzy matching, no country
// inference: a name either IS a key here or gets no flag, which is what makes franchise sides
// ("Sydney Sixers") unflaggable by construction. Country names are identical across our sources
// ("England" is "England" in both Cricsheet and Sportmonks — verified on real payloads), so an
// exact-name lookup is join-safe for national teams (the player-name trap does NOT apply here).
//
// VALUES are presentation strings the mobile client renders: emoji today; if CricketData's flag
// art clears licensing (their ToS invites the ask), swap values to https URLs — the mobile
// renderer branches Text-vs-Image on the value, so the upgrade is VALUES-ONLY, no re-plumbing.
// NEVER embed these into the team-name string: it would foreclose that swap and pollute the
// board's teams+date dedupe key.
//
// Roster: the 12 Test nations (names mirrored from lib/espnTeams.ts's authored list) minus
// WEST INDIES — a multi-nation cricket board with NO ISO flag; deliberately absent -> text
// fallback, do not invent a substitute. Associates are seeded ONLY as actually observed in our
// data (Portugal, from the Gate-4 harvest); an unmapped name -> no flag field -> null render.
//
// ⚠️ England is a Unicode TAG SEQUENCE (gb-eng), not a regional-indicator pair — real-world
// render support varies. DEVICE-VERIFY before trusting it; if it shows tofu/black flag, remove
// the key and fall back to text (same for Scotland/Wales if they ever appear).

const FLAGS: Record<string, string> = {
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',      // tag sequence — see device-verify note above
  Australia: '🇦🇺',
  'South Africa': '🇿🇦',
  'New Zealand': '🇳🇿',
  India: '🇮🇳',
  Pakistan: '🇵🇰',
  'Sri Lanka': '🇱🇰',
  Zimbabwe: '🇿🇼',
  Bangladesh: '🇧🇩',
  Ireland: '🇮🇪',
  Afghanistan: '🇦🇫',
  Portugal: '🇵🇹',           // associate — observed in the T20I 2026 season fixtures
};

/** Exact-name flag lookup. Unmapped (franchises, West Indies, unseen associates) -> undefined. */
export function cricketFlag(teamName: string): string | undefined {
  return FLAGS[teamName];
}
