// ─────────────────────────────────────────
// VALID VALUES FOR MESSAGE VALIDATION
// ─────────────────────────────────────────
const VALID_SPORTS = ['nfl', 'mlb', 'nba', 'nhl', 'soccer', 'worldcup', 'rugby'];
const VALID_LEVELS = ['kid', 'beginner', 'intermediate', 'expert'];
const VALID_LANGUAGES = ['en', 'es', 'fr', 'pt', 'de', 'ja', 'zh', 'ko', 'it', 'ar'];

// Auth endpoints (Phase 2 4a — email magic-link sign-in).
const AUTH_BASE = 'https://sports-explainer-mode.vercel.app/api/auth';

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

// --- Auth storage (seAuth = { email, session }) ---
// Same Promise-wrapped chrome.storage.local pattern as getState/setState.
async function getAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['seAuth'], (r) => resolve(r.seAuth || null));
  });
}
async function setAuth(auth) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ seAuth: auth }, resolve);
  });
}
async function clearAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['seAuth'], resolve);
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
  // Optional (Tier D): explain a SPECIFIC historical play by its text. When present the backend
  // explains THAT play instead of the latest. Trimmed + capped for safety; null → latest-play behavior.
  const playText = typeof msg.playText === 'string' && msg.playText.trim()
    ? msg.playText.trim().slice(0, 500)
    : null;

  if (!sport) return null; // sport is required — reject if invalid
  return { sport, level, gameId, language, playText };
}

function validateFetchPlaysMsg(msg) {
  const sport = VALID_SPORTS.includes(msg.sport) ? msg.sport : null;
  const gameId = typeof msg.gameId === 'string' && /^\d+$/.test(msg.gameId) ? msg.gameId : null;
  if (!sport || !gameId) return null; // a play list needs a specific game
  return { sport, gameId };
}

function validateRecapMsg(msg) {
  const sport = VALID_SPORTS.includes(msg.sport) ? msg.sport : null;
  const level = VALID_LEVELS.includes(msg.level) ? msg.level : 'beginner';
  const language = VALID_LANGUAGES.includes(msg.language) ? msg.language : 'en';
  const gameId = typeof msg.gameId === 'string' && /^\d+$/.test(msg.gameId) ? msg.gameId : null;
  // A recap is for a SPECIFIC finished game — both sport AND gameId are required.
  if (!sport || !gameId) return null;
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

// --- Auth validators (Phase 2 4a) ---
function normalizeEmailMsg(raw) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}
function validateAuthRequestCodeMsg(msg) {
  const email = normalizeEmailMsg(msg.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  return { email };
}
function validateAuthVerifyCodeMsg(msg) {
  const email = normalizeEmailMsg(msg.email);
  const code = typeof msg.code === 'string' ? msg.code.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) return null;
  return { email, code };
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
    handleFetchPlay(validated.sport, validated.level, validated.gameId, validated.language, validated.playText)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // ── FETCH PLAYS (play-by-play list for a game) ──
  if (msg.action === 'fetchPlays') {
    const validated = validateFetchPlaysMsg(msg);
    if (!validated) {
      sendResponse({ error: 'Invalid fetchPlays message — sport and gameId are required.' });
      return true;
    }
    handleFetchPlays(validated.sport, validated.gameId)
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

  // ── RECAP (finished/Final games) ──
  if (msg.action === 'recap') {
    const validated = validateRecapMsg(msg);
    if (!validated) {
      sendResponse({ error: 'Invalid recap message — sport and gameId are required.' });
      return true;
    }
    handleRecap(validated.sport, validated.level, validated.gameId, validated.language)
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

  // ── AUTH: request code ──
  if (msg.action === 'authRequestCode') {
    const v = validateAuthRequestCodeMsg(msg);
    if (!v) { sendResponse({ error: 'Invalid email.' }); return true; }
    handleAuthRequestCode(v.email)
      .then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // ── AUTH: verify code ──
  if (msg.action === 'authVerifyCode') {
    const v = validateAuthVerifyCodeMsg(msg);
    if (!v) { sendResponse({ error: 'Enter a valid email and 6-digit code.' }); return true; }
    handleAuthVerifyCode(v.email, v.code)
      .then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // ── AUTH: check stored session (whoami) ──
  if (msg.action === 'authCheckSession') {
    handleAuthCheckSession()
      .then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // ── AUTH: sign out ──
  if (msg.action === 'authSignOut') {
    handleAuthSignOut()
      .then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }

});

// ─────────────────────────────────────────
// FETCH PLAY EXPLANATION
// ─────────────────────────────────────────
async function handleFetchPlay(sport, level, gameId, language, playText) {
  const body = { sport, level, gameId, language };
  if (playText) body.playText = playText; // present → backend explains THAT play, not the latest
  const res = await fetch('https://sports-explainer-mode.vercel.app/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return await res.json();
}

// ─────────────────────────────────────────
// PLAY-BY-PLAY LIST (Tier D) — ESPN summary plays[] for the 4 plays-capable sports.
// Filters empty-text + period-marker entries, most-recent-first, cap 40. Soccer/rugby → [].
// ─────────────────────────────────────────
const PLAYS_SUMMARY_PATHS = {
  nfl: 'football/nfl', mlb: 'baseball/mlb', nba: 'basketball/nba', nhl: 'hockey/nhl',
};

async function handleFetchPlays(sport, gameId) {
  const path = PLAYS_SUMMARY_PATHS[sport];
  if (!path) return { plays: [] }; // soccer/worldcup/rugby have no plays[] — section hides
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${gameId}`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`ESPN summary returned ${res.status}`);
  const data = await res.json();
  const raw = Array.isArray(data?.plays) ? data.plays : [];

  const plays = [];
  for (const p of raw) {
    const text = (p && typeof p.text === 'string') ? p.text.trim() : '';
    // Drop empty-text entries (present per data recon) and pure period markers (not tappable plays).
    if (!text || /inning|^start of|^end of|game end/i.test(text)) continue;
    const per = p.period || {};
    const period = per.displayValue || (per.number ? `Period ${per.number}` : '');
    plays.push({ id: String(p.id ?? plays.length), text, period, scoring: !!p.scoringPlay });
  }
  plays.reverse(); // ESPN returns oldest-first → flip to most-recent-first
  return { plays: plays.slice(0, 40) };
}

// ─────────────────────────────────────────
// POST-GAME RECAP (Final games) — mirrors handleFetchPlay with action:'recap'.
// The 3 Pro narrative fields come back empty for the extension (no isPro); we render
// score + story + articleLink only.
// ─────────────────────────────────────────
async function handleRecap(sport, level, gameId, language) {
  const res = await fetch('https://sports-explainer-mode.vercel.app/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'recap', sport, gameId, level, language })
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
// AUTH (Phase 2 4a — email magic-link sign-in; identity only, no entitlement yet)
// ─────────────────────────────────────────
async function handleAuthRequestCode(email) {
  const res = await fetch(`${AUTH_BASE}/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  // request-code always returns a generic { ok:true } — pass it through.
  return res.json();
}

async function handleAuthVerifyCode(email, code) {
  const res = await fetch(`${AUTH_BASE}/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json();
  if (data && data.ok && data.session) {
    // Persist the session so the user stays signed in across launches.
    await setAuth({ email: data.email, session: data.session });
    return { ok: true, email: data.email };
  }
  return { ok: false };
}

async function handleAuthCheckSession() {
  // Validate the stored session with whoami; if invalid/expired, clear it.
  const auth = await getAuth();
  if (!auth || !auth.session) return { signedIn: false };
  try {
    const res = await fetch(`${AUTH_BASE}/whoami`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: auth.session }),
    });
    const data = await res.json();
    if (data && data.ok && data.email) {
      // Keep storage in sync with the server's view of the email.
      if (data.email !== auth.email) await setAuth({ email: data.email, session: auth.session });
      return { signedIn: true, email: data.email };
    }
  } catch (e) {
    // Network error — treat as unknown, but don't wipe the session on a transient failure.
    return { signedIn: true, email: auth.email, stale: true };
  }
  // whoami said not-ok → session invalid/expired → clear it.
  await clearAuth();
  return { signedIn: false };
}

async function handleAuthSignOut() {
  await clearAuth();
  return { ok: true };
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