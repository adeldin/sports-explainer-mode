// chrome-extension/sports.js
// SHARED sport→league catalog for the popup AND the overlay selector — one source of truth so the
// two pickers can never drift. Loaded by popup.html (script tag) and as a content script before
// content.js (same window.SE_* pattern as glossary.js / caps.js).
//
// LEAF keys are what every runtime message carries (fetchGames / fetchPlay / ask / recap) — they
// match the backend's espnConfig in src/app/api/explain/route.ts and the iOS SPORT_CONFIG.
// Grouped sports (a `leagues` array) render as sport → league → game; flat sports skip the league
// step. A group's `key` may equal one of its leaf keys (soccer/cricket) — that's fine, lookups by
// leaf go through groupForLeaf which checks leagues first.
(function () {

  const SPORT_GROUPS = [
    { key: 'nfl', label: '🏈 NFL' },
    { key: 'mlb', label: '⚾ MLB' },
    { key: 'nba', label: '🏀 NBA' },
    { key: 'wnba', label: '🏀 WNBA' },
    { key: 'nhl', label: '🏒 NHL' },
    {
      key: 'soccer', label: '⚽ Soccer', leagues: [
        // 'All Matches' is a MERGED BOARD (background fetches every member league and concats,
        // mirroring iOS fetchRugbyBoard). Each game keeps its OWN league key in `sportKey` —
        // that per-game key is what explain/recap routing needs, never the board key.
        { key: 'soccer-all', label: 'All Matches' },
        { key: 'soccer', label: 'MLS' },
        { key: 'epl', label: 'Premier League' },
        { key: 'laliga', label: 'La Liga' },
      ],
    },
    // World Cup stays standalone (tournament ends within days of this build — not worth folding
    // into the Soccer group and re-teaching users where it went mid-tournament).
    { key: 'worldcup', label: '🌍 World Cup' },
    {
      key: 'rugby', label: '🏉 Rugby', leagues: [
        // Mirrors iOS RUGBY_LEAGUES (lib/scoreboard.ts) — same keys, same labels; 'All Matches'
        // is the merged board (see the soccer group note).
        { key: 'rugby-all', label: 'All Matches' },
        { key: 'rugby', label: 'URC' },
        { key: 'mlr', label: 'MLR' },
        { key: 'nationscup', label: 'Nations Cup' },
        { key: 'sixnations', label: 'Six Nations' },
        { key: 'nationschamp', label: 'Nations Championship' },
      ],
    },
    {
      key: 'cricket', label: '🏏 Cricket', leagues: [
        // The cricket board is ONE merged feed (archival Cricsheet + Sportmonks live), so these
        // "leagues" are FORMAT FILTERS applied client-side to the same board — every entry keeps
        // leaf key 'cricket' and `formatFilter` matches the backend's Game.format ("T20"/"ODI"/
        // "Test"; matched by inclusion so "T20I" counts as T20). Swap for real competitions when
        // the board grows a league field.
        { key: 'cricket', label: 'All Matches' },
        { key: 'cricket', label: 'T20', formatFilter: 'T20' },
        { key: 'cricket', label: 'ODI', formatFilter: 'ODI' },
        { key: 'cricket', label: 'Test', formatFilter: 'Test' },
      ],
    },
  ];

  // A league <option> value must be unique within its group, but format-filter leagues share one
  // leaf key — encode both. ':' never appears in a leaf key, so parsing is unambiguous.
  function leagueValue(l) { return l.formatFilter ? `${l.key}:${l.formatFilter}` : l.key; }
  function parseLeagueValue(v) {
    const i = String(v || '').indexOf(':');
    return i < 0 ? { key: v || null, formatFilter: null }
                 : { key: v.slice(0, i), formatFilter: v.slice(i + 1) || null };
  }

  // Does this game pass a format filter? No filter → everything passes; inclusion match so
  // feed variants ("T20I") still land in their bucket. Games with NO format (an old backend
  // that predates the field) pass every filter — never hide data because metadata is missing.
  function matchesFormat(game, formatFilter) {
    if (!formatFilter) return true;
    const f = String(game && game.format || '');
    if (!f) return true;
    return f.toUpperCase().includes(formatFilter.toUpperCase());
  }

  // Group for a LEAF key. Leagues are checked FIRST because a group key can equal a leaf key
  // ('soccer' the group contains 'soccer' the MLS leaf).
  function groupForLeaf(leaf) {
    return SPORT_GROUPS.find(g => g.leagues && g.leagues.some(l => l.key === leaf))
      || SPORT_GROUPS.find(g => !g.leagues && g.key === leaf)
      || null;
  }

  // Sports whose games can span multiple days (weekly rugby window / archival cricket board).
  // The overlay's today-only slate filter skips these — the fetch itself is already scoped.
  const WINDOW_SPORTS = ['rugby', 'rugby-all', 'mlr', 'nationscup', 'sixnations', 'nationschamp', 'cricket'];

  // Merged 'All Matches' boards → the sport key /api/explain should get for GAMELESS calls
  // (no game selected → nothing to read a per-game sportKey from). The backend has no
  // 'soccer-all'/'rugby-all' concept — these board keys must never reach it.
  const ALL_BOARD_EXPLAIN_FALLBACK = { 'soccer-all': 'soccer', 'rugby-all': 'rugby' };

  // Display label for a leaf league key ("epl" → "Premier League"). '' when unknown/flat.
  function leagueLabelFor(leaf) {
    for (const g of SPORT_GROUPS) {
      const l = g.leagues && g.leagues.find(x => x.key === leaf);
      if (l) return l.label;
    }
    return '';
  }

  window.SE_SPORTS = {
    SPORT_GROUPS, groupForLeaf, WINDOW_SPORTS,
    leagueValue, parseLeagueValue, matchesFormat,
    ALL_BOARD_EXPLAIN_FALLBACK, leagueLabelFor,
  };
})();
