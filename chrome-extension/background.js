// ─────────────────────────────────────────
// VALID VALUES FOR MESSAGE VALIDATION
// ─────────────────────────────────────────
const VALID_SPORTS = ['nfl', 'mlb', 'nba', 'nhl', 'soccer', 'worldcup', 'rugby'];
const VALID_LEVELS = ['kid', 'beginner', 'intermediate', 'expert'];
const VALID_LANGUAGES = ['en', 'es', 'fr', 'pt', 'de', 'ja', 'zh', 'ko', 'it', 'ar'];

// ─────────────────────────────────────────
// CHROME.STORAGE STATE HELPERS (Fix #11)
// MV3 service workers can be suspended at any time.
// Never rely on global variables for persistent state.
// ─────────────────────────────────────────
async function getState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['currentSport', 'currentGameId', 'currentLevel', 'currentLanguage'], resolve);
  });
}

async function setState(updates) {
  return new Promise((resolve) => {
    chrome.storage.local.set(updates, resolve);
  });
}

// ─────────────────────────────────────────
// MESSAGE VALIDATION HELPER (Fix #12)
// Sanitize and validate all messages from
// content.js before forwarding to backend.
// ─────────────────────────────────────────
function validateFetchPlayMsg(msg) {
  const sport = VALID_SPORTS.includes(msg.sport) ? msg.sport : null;
  const level = VALID_LEVELS.includes(msg.level) ? msg.level : 'beginner';
  const language = VALID_LANGUAGES.includes(msg.language) ? msg.language : 'en';
  // gameId must be a non-empty string of digits (ESPN IDs are numeric strings)
  const gameId = typeof msg.gameId === 'string' && /^\d+$/.test(msg.gameId)
    ? msg.gameId
    : null;

  if (!sport) return null; // sport is required — reject if invalid
  return { sport, level, gameId, language };
}

function validateAskQuestionMsg(msg) {
  const sport = VALID_SPORTS.includes(msg.sport) ? msg.sport : null;
  const level = VALID_LEVELS.includes(msg.level) ? msg.level : 'beginner';
  const language = VALID_LANGUAGES.includes(msg.language) ? msg.language : 'en';
  // question must be a non-empty string, max 500 chars
  const question = typeof msg.question === 'string' && msg.question.trim().length > 0
    ? msg.question.trim().slice(0, 500)
    : null;
  // context is optional but must be a string if present, max 1000 chars
  const context = typeof msg.context === 'string'
    ? msg.context.trim().slice(0, 1000)
    : '';

  if (!sport || !question) return null; // both required
  return { sport, level, question, context, language };
}

function validateFetchGamesMsg(msg) {
  const sport = VALID_SPORTS.includes(msg.sport) ? msg.sport : null;
  if (!sport) return null;
  return { sport };
}

// ─────────────────────────────────────────
// MESSAGE LISTENER
// ─────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // ── FETCH PLAY ──
  if (msg.action === 'fetchPlay') {
    const validated = validateFetchPlayMsg(msg);
    if (!validated) {
      sendResponse({ error: 'Invalid fetchPlay message — sport is required and must be valid.' });
      return true;
    }
    // Persist state to chrome.storage so service worker can recover after suspension
    setState({
      currentSport: validated.sport,
      currentGameId: validated.gameId,
      currentLevel: validated.level,
      currentLanguage: validated.language
    });
    handleFetchPlay(validated.sport, validated.level, validated.gameId, validated.language)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // ── ASK QUESTION ──
  if (msg.action === 'askQuestion') {
    const validated = validateAskQuestionMsg(msg);
    if (!validated) {
      sendResponse({ error: 'Invalid askQuestion message — sport and question are required.' });
      return true;
    }
    handleAskQuestion(validated.sport, validated.level, validated.question, validated.context, validated.language)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // ── FETCH GAMES ──
  if (msg.action === 'fetchGames') {
    const validated = validateFetchGamesMsg(msg);
    if (!validated) {
      sendResponse({ error: 'Invalid fetchGames message — sport is required and must be valid.' });
      return true;
    }
    handleFetchGames(validated.sport)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

});

// ─────────────────────────────────────────
// FETCH PLAY EXPLANATION
// ─────────────────────────────────────────
async function handleFetchPlay(sport, level, gameId, language) {
  const res = await fetch('https://sports-explainer-mode.vercel.app/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sport, level, gameId, language })
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return await res.json();
}

// ─────────────────────────────────────────
// ASK ANYTHING Q&A
// ─────────────────────────────────────────
async function handleAskQuestion(sport, level, question, context, language = 'en') {
  const res = await fetch('https://sports-explainer-mode.vercel.app/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ask', sport, level, question, context, language })
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return await res.json();
}

// ─────────────────────────────────────────
// FETCH TODAY'S GAMES FOR POPUP GAME LIST
// ─────────────────────────────────────────
async function handleFetchGames(sport) {
  // Normalize one ESPN competition into an enriched score-card game. Mirrors the app's
  // lib/scoreboard.ts extractors (abbrev / logo / score-string-or-object / broadcasts).
  // Keeps the legacy fields (home/away displayName, state, detail, home/awayScore) so
  // popup.js + the selector dropdown keep working, and ADDS the score-card fields.
  const buildGame = (id, competition, statusType, dateStr) => {
    const comp = competition || {};
    const home = comp.competitors?.find(c => c.homeAway === 'home');
    const away = comp.competitors?.find(c => c.homeAway === 'away');
    const abbrev = c => c?.team?.abbreviation || c?.team?.shortDisplayName || c?.team?.displayName || '?';
    const name = c => c?.team?.displayName || abbrev(c);
    const scoreOf = c => {
      const s = c?.score;
      if (s == null) return '';
      return typeof s === 'object' ? String(s.displayValue ?? s.value ?? '') : String(s);
    };
    const logoOf = c => c?.team?.logo || c?.team?.logos?.[0]?.href || '';
    const broadcastsOf = () => {
      const names = [];
      for (const b of (comp.broadcasts || [])) for (const n of (b?.names || [])) if (n) names.push(String(n));
      for (const g of (comp.geoBroadcasts || [])) { const sn = g?.media?.shortName; if (sn) names.push(String(sn)); }
      return Array.from(new Set(names)).join(', ');
    };
    const state = statusType?.state || 'pre';
    const statusLabel = statusType?.shortDetail || statusType?.description || '';
    return {
      id: String(id),
      home: name(home), away: name(away),                 // legacy (displayName) — popup/selector
      homeAbbrev: abbrev(home), awayAbbrev: abbrev(away),
      homeScore: scoreOf(home), awayScore: scoreOf(away),
      homeLogo: logoOf(home), awayLogo: logoOf(away),
      state, detail: statusLabel, statusLabel,
      broadcasts: broadcastsOf(),
      date: dateStr || '',   // ESPN event.date (ISO) — used to filter to today's slate
    };
  };

  const SPORT_CONFIG = {
    nfl:      { sport: 'football',   league: 'nfl' },
    mlb:      { sport: 'baseball',   league: 'mlb' },
    nba:      { sport: 'basketball', league: 'nba' },
    nhl:      { sport: 'hockey',     league: 'nhl' },
    soccer:   { sport: 'soccer',     league: 'usa.1' },
    worldcup: { sport: 'soccer',     league: 'fifa.world' },
    rugby:    { sport: 'rugby',      league: '282', useCoreAPI: true },
  };

  const config = SPORT_CONFIG[sport] || SPORT_CONFIG.nfl;

  // ── RUGBY: Two-step $ref fetch ──
  if (config.useCoreAPI) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const eventsRes = await fetch(
      `https://sports.core.api.espn.com/v2/sports/${config.sport}/leagues/${config.league}/events?dates=${today}`,
      { cache: 'no-store' }
    );
    if (!eventsRes.ok) throw new Error(`ESPN Core API returned ${eventsRes.status}`);
    const eventsData = await eventsRes.json();
    const items = eventsData.items || [];

    const games = await Promise.all(items.map(async (item) => {
      const eventRes = await fetch(item.$ref, { cache: 'no-store' });
      const eventData = await eventRes.json();
      return buildGame(eventData.id, eventData.competitions?.[0], eventData.status?.type, eventData.date);
    }));

    return { games };
  }

  // ── ALL OTHER SPORTS ──
  const scoreboardRes = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/${config.sport}/${config.league}/scoreboard`,
    { cache: 'no-store' }
  );
  if (!scoreboardRes.ok) throw new Error(`ESPN Scoreboard API returned ${scoreboardRes.status}`);
  const scoreboardData = await scoreboardRes.json();
  const events = scoreboardData.events || [];

  const games = events.map(event =>
    buildGame(event.id, event.competitions?.[0], event.status?.type, event.date)
  );

  return { games };
}