// ─────────────────────────────────────────
// VALID VALUES FOR MESSAGE VALIDATION
// ─────────────────────────────────────────
// LEAF sport keys — the popup/overlay group soccer/rugby/cricket into sport→league dropdowns,
// but every message carries the leaf key (same keys the backend's espnConfig routes on).
const VALID_SPORTS = [
  'nfl', 'mlb', 'nba', 'wnba', 'nhl',
  'soccer', 'epl', 'laliga',            // Soccer group: MLS / Premier League / La Liga
  'worldcup',                           // standalone (tournament ends soon — deliberately not folded in)
  'rugby', 'mlr', 'nationscup', 'sixnations', 'nationschamp',  // Rugby group (mirrors iOS RUGBY_LEAGUES)
  'cricket',                            // Cricket group (single merged board; format filter is client-side)
  'soccer-all', 'rugby-all',            // merged 'All Matches' BOARDS — fetchGames only; per-game
                                        // sportKey (never the board key) is what explain/recap send
];

// Merged 'All Matches' boards → their member leagues. KEEP IN SYNC with sports.js SPORT_GROUPS
// (background is a service worker — it can't load sports.js, same reason SPORT_CONFIG is
// duplicated below). Mirrors iOS fetchRugbyBoard: fetch each league, concat, and stamp every
// game with its OWN league key (`sportKey`) — that's what the explain backend routes on.
const ALL_BOARDS = {
  'soccer-all': ['soccer', 'epl', 'laliga'],
  'rugby-all':  ['rugby', 'mlr', 'nationscup', 'sixnations', 'nationschamp'],
};
const VALID_LEVELS = ['kid', 'beginner', 'intermediate', 'expert'];
const VALID_LANGUAGES = ['en', 'es', 'fr', 'pt', 'de', 'ja', 'zh', 'ko', 'it', 'ar'];

// Valid game ids: ESPN + Cricsheet ids are numeric strings; LIVE cricket ids are 'sm-'-prefixed
// Sportmonks fixture ids ('sm-12345'). The backend routes on the prefix — never strip it.
const GAME_ID_RE = /^(?:sm-)?\d+$/;

// Auth endpoints (Phase 2 4a — email magic-link sign-in).
const AUTH_BASE = 'https://sports-explainer-mode.vercel.app/api/auth';
// API root (Phase 2 4b — entitlement lives beside /auth, not under it).
const API_BASE = 'https://sports-explainer-mode.vercel.app/api';

// SINGLE SOURCE OF TRUTH for the web purchase link — PRODUCTION. Lives here (not in content.js
// or popup.js) because BOTH surfaces need it and a second copy would drift.
// app_user_id = the signed-in email (URL-encoded) as the FINAL PATH SEGMENT, so the purchase
// attaches to the same customer /api/entitlement reads. Note: the production link has NO
// /sandbox/ path segment — the sandbox equivalent was https://pay.rev.cat/sandbox/<id>/.
// THIS IS LIVE — a purchase here charges a real card.
const PURCHASE_LINK_BASE = 'https://pay.rev.cat/ngnjkdtzqevjpwck/';

// ─────────────────────────────────────────
// CHROME.STORAGE STATE HELPERS (Fix #11)
// MV3 service workers can be suspended at any time.
// Never rely on global variables for persistent state.
// ─────────────────────────────────────────
async function setState(updates) {
  return new Promise((resolve) => {
    chrome.storage.local.set(updates, resolve);
  });
}

// --- Anonymous install id (seAnonId) ---
// A random per-install id sent with SIGNED-OUT requests so the server can meter the free tier
// (route.ts ANON_CAPS — ignored until the flag flips, so shipping this first is safe). It is not
// tracking: never sent alongside a session, never leaves our own backend, and clearing extension
// storage rotates it.
async function getAnonId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['seAnonId'], (r) => {
      if (r.seAnonId) return resolve(r.seAnonId);
      const id = (crypto.randomUUID && crypto.randomUUID())
        || Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
      chrome.storage.local.set({ seAnonId: id }, () => resolve(id));
    });
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

// --- Entitlement cache (seEntitlement = { isPro, isTrial, checkedAt }) ---
const ENTITLEMENT_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function getEntitlementCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['seEntitlement'], (r) => resolve(r.seEntitlement || null));
  });
}
async function setEntitlementCache(ent) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ seEntitlement: ent }, resolve);
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
  // gameId: ESPN/Cricsheet ids are numeric strings; live cricket ids are 'sm-'-prefixed
  // Sportmonks fixture ids (the prefix is load-bearing — backend routes on it).
  const gameId = typeof msg.gameId === 'string' && GAME_ID_RE.test(msg.gameId)
    ? msg.gameId
    : null;
  // Optional (Tier D): explain a SPECIFIC historical play by its text. When present the backend
  // explains THAT play instead of the latest. Trimmed + capped for safety; null → latest-play behavior.
  const playText = typeof msg.playText === 'string' && msg.playText.trim()
    ? msg.playText.trim().slice(0, 500)
    : null;
  // AUTO-refresh flag (poll tick / idle-resume). Drives the unchanged-play pre-check only —
  // it is NOT sent to the backend (the server ignores client isRefresh claims by design).
  const isRefresh = msg.isRefresh === true;

  if (!sport) return null; // sport is required — reject if invalid
  return { sport, level, gameId, language, playText, isRefresh };
}

function validateFetchPlaysMsg(msg) {
  const sport = VALID_SPORTS.includes(msg.sport) ? msg.sport : null;
  const gameId = typeof msg.gameId === 'string' && GAME_ID_RE.test(msg.gameId) ? msg.gameId : null;
  if (!sport || !gameId) return null; // a play list needs a specific game
  return { sport, gameId };
}

function validateRecapMsg(msg) {
  const sport = VALID_SPORTS.includes(msg.sport) ? msg.sport : null;
  const level = VALID_LEVELS.includes(msg.level) ? msg.level : 'beginner';
  const language = VALID_LANGUAGES.includes(msg.language) ? msg.language : 'en';
  const gameId = typeof msg.gameId === 'string' && GAME_ID_RE.test(msg.gameId) ? msg.gameId : null;
  // Pro recap: the backend only sends the 3 narrative fields when isPro is true. Optional,
  // defaults false → free-tier response (score + story + articleLink).
  const isPro = msg.isPro === true;
  // A recap is for a SPECIFIC finished game — both sport AND gameId are required.
  if (!sport || !gameId) return null;
  return { sport, level, gameId, language, isPro };
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

  // Optional: which game this question is about. Drives the server's per-game Q&A cap. Absent
  // (gameless "learn mode" ask) → the server leaves it ungated.
  const gameId = typeof msg.gameId === 'string' && GAME_ID_RE.test(msg.gameId) ? msg.gameId : null;

  if (!sport || !question) return null; // both required
  return { sport, level, question, context, language, gameId };
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
    handleFetchPlay(validated.sport, validated.level, validated.gameId, validated.language, validated.playText, validated.isRefresh)
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
    handleAskQuestion(validated.sport, validated.level, validated.question, validated.context, validated.language, validated.gameId)
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
    handleRecap(validated.sport, validated.level, validated.gameId, validated.language, validated.isPro)
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

  // ── ENTITLEMENT: is this user Pro? (15-min cache; msg.force bypasses it) ──
  if (msg.action === 'checkEntitlement') {
    handleCheckEntitlement(msg.force === true)
      .then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // ── UPGRADE: open the purchase tab (email as app_user_id). Called by BOTH popup + overlay. ──
  if (msg.action === 'openUpgrade') {
    handleOpenUpgrade()
      .then(sendResponse).catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

});

// ─────────────────────────────────────────
// FETCH PLAY EXPLANATION
// ─────────────────────────────────────────
// Attach the signed-in user's session token to an /api/explain body — and ONLY when one exists.
// The backend's cap enforcement is PRESENCE-BASED: a body with no `session` is an anonymous
// caller (the iOS app, and signed-out extension users) and is never enforced against. So an
// empty/null session field must never be sent — it would be a different thing than "absent".
// Same source the entitlement check reads: chrome.storage.local seAuth = { email, session }.
async function withSession(body) {
  const auth = await getAuth();
  const session = auth && typeof auth.session === 'string' ? auth.session.trim() : '';
  if (session) { body.session = session; return body; }
  // Signed out → attach the per-install anonymous id instead, so the server can meter the free
  // tier once ANON_CAPS flips on. NEVER sent alongside a session — the two identity paths are
  // mutually exclusive on the server too.
  body.anonId = await getAnonId();
  return body;
}

// ── UNCHANGED-PLAY PRE-CHECK (auto-refresh only) ────────────────────────────────────────────
// One keyless ESPN call to see whether the latest play moved since we last explained this game.
// Unchanged → skip the Groq-backed /api/explain call entirely. This is the extension's single
// biggest COGS lever: an overlay parked on a live game polls every ~30s whether or not anything
// happened. Plays-capable sports only (soccer/rugby/cricket have no ESPN plays[] to compare).
// Best-effort by construction: any failure falls through to the normal explain fetch.
async function latestPlaySig(sport, gameId) {
  const path = PLAYS_SUMMARY_PATHS[sport];
  if (!path) return null;
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${gameId}`,
    { cache: 'no-store' }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const raw = Array.isArray(data?.plays) ? data.plays : [];
  if (!raw.length) return null;
  const last = raw[raw.length - 1];
  return `${last?.id ?? ''}|${String(last?.text ?? '').slice(0, 200)}`;
}

// Last explained play per (sport|gameId) — a single slot; watching a second game just misses the
// pre-check once (fail open: it explains, which is exactly today's behavior).
async function getPlaySig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['seLastPlaySig'], (r) => resolve(r.seLastPlaySig || null));
  });
}
async function setPlaySig(v) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ seLastPlaySig: v }, resolve);
  });
}

async function handleFetchPlay(sport, level, gameId, language, playText, isRefresh = false) {
  // Auto-refresh + a live game list + not a manually-tapped play → try the cheap pre-check.
  if (isRefresh && !playText && gameId) {
    try {
      const sig = await latestPlaySig(sport, gameId);
      if (sig) {
        const key = `${sport}|${gameId}`;
        const stored = await getPlaySig();
        if (stored && stored.key === key && stored.sig === sig) {
          return { unchanged: true };   // nothing new — content.js keeps what's on screen
        }
        await setPlaySig({ key, sig }); // play moved (or first look) → explain + remember it
      }
    } catch (e) {
      // Pre-check is best-effort — fall through to the normal fetch.
    }
  }

  const body = { sport, level, gameId, language };
  if (playText) body.playText = playText; // present → backend explains THAT play, not the latest
  const res = await fetch('https://sports-explainer-mode.vercel.app/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(await withSession(body))
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return await res.json();
}

// ─────────────────────────────────────────
// PLAY-BY-PLAY LIST (Tier D) — ESPN summary plays[] for the 4 plays-capable sports.
// Filters empty-text + period-marker entries, most-recent-first, cap 40. Soccer/rugby → [].
// ─────────────────────────────────────────
const PLAYS_SUMMARY_PATHS = {
  nfl: 'football/nfl', mlb: 'baseball/mlb', nba: 'basketball/nba', wnba: 'basketball/wnba', nhl: 'hockey/nhl',
};

async function handleFetchPlays(sport, gameId) {
  const path = PLAYS_SUMMARY_PATHS[sport];
  if (!path) return { plays: [] }; // soccer/rugby/cricket have no ESPN plays[] — section hides
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
// isPro is forwarded to the backend, which withholds turningPoint / keyPerformance /
// whyItMattered unless it's true (cheaper + no content leak). Free users therefore get
// score + story + articleLink, and content.js renders the 3 fields as locked rows.
// ─────────────────────────────────────────
async function handleRecap(sport, level, gameId, language, isPro = false) {
  const res = await fetch('https://sports-explainer-mode.vercel.app/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(await withSession({ action: 'recap', sport, gameId, level, language, isPro }))
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return await res.json();
}

// ─────────────────────────────────────────
// ASK ANYTHING Q&A
// ─────────────────────────────────────────
async function handleAskQuestion(sport, level, question, context, language = 'en', gameId = null) {
  const askBody = { action: 'ask', sport, level, question, context, language };
  // Only when a game is selected. Omitted → the server treats it as a gameless "learn mode"
  // ask and leaves it ungated, matching the iOS carve-out.
  if (gameId) askBody.gameId = gameId;
  const res = await fetch('https://sports-explainer-mode.vercel.app/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(await withSession(askBody))
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
    // A new sign-in may be a different user — drop any entitlement cached for the old one.
    await setEntitlementCache(null);
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
  await setEntitlementCache(null);
  return { ok: true };
}

// Open the purchase tab with the signed-in email as app_user_id. Opened from BACKGROUND
// (chrome.tabs.create) rather than the caller, so it works identically from the popup — which
// closes on click and would kill a window.open — and from the overlay.
// Refuses without an email: an anonymous app_user_id would attach Pro to a customer we can
// never match back to this user.
async function handleOpenUpgrade() {
  const auth = await getAuth();
  const email = auth && auth.email ? auth.email : null;
  if (!email) return { ok: false, reason: 'not_signed_in' };
  const url = PURCHASE_LINK_BASE + encodeURIComponent(email);
  await chrome.tabs.create({ url });
  return { ok: true };
}

// ─────────────────────────────────────────
// ENTITLEMENT (Phase 2 4b — is this signed-in user Pro?)
// ─────────────────────────────────────────
// Returns { isPro, isTrial, signedIn }. Uses 15-min cache unless force=true.
async function handleCheckEntitlement(force) {
  const auth = await getAuth();
  if (!auth || !auth.session) return { isPro: false, signedIn: false };

  if (!force) {
    const cached = await getEntitlementCache();
    if (cached && cached.checkedAt && (Date.now() - cached.checkedAt) < ENTITLEMENT_TTL_MS) {
      return { isPro: !!cached.isPro, isTrial: !!cached.isTrial, signedIn: true, cached: true };
    }
  }

  try {
    const res = await fetch(`${API_BASE}/entitlement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: auth.session }),
    });
    const data = await res.json();
    if (data && data.signedIn === false) {
      // Session died — clear auth + entitlement cache.
      await clearAuth();
      await setEntitlementCache(null);
      return { isPro: false, signedIn: false };
    }
    const ent = { isPro: !!data.isPro, isTrial: !!data.isTrial, checkedAt: Date.now() };
    await setEntitlementCache(ent);
    return { isPro: ent.isPro, isTrial: ent.isTrial, signedIn: true };
  } catch (e) {
    // On network error, fall back to cache if present (even if stale), else not-pro.
    const cached = await getEntitlementCache();
    if (cached) return { isPro: !!cached.isPro, isTrial: !!cached.isTrial, signedIn: true, stale: true };
    return { isPro: false, signedIn: true, error: true };
  }
}

// ─────────────────────────────────────────
// FETCH TODAY'S GAMES FOR POPUP GAME LIST
// ─────────────────────────────────────────
// Short team label for boards whose teams are full names (cricket/rugby national sides have no
// ESPN abbreviation): initials for multi-word names ("New Zealand" → NZ, "South Africa" → SA),
// else the first 3 letters uppercased ("India" → IND).
function teamAbbrev(name) {
  const n = String(name || '').trim();
  if (!n) return '?';
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map(w => w[0]).join('').toUpperCase().slice(0, 3);
  return n.slice(0, 3).toUpperCase();
}

// Map a backend canonical Game ({ id, homeTeam, awayTeam, homeScore, awayScore, status, state,
// startTime?, homeFlag?, awayFlag? } — served by /api/cricket and /api/rugby-live) into the
// SAME shape buildGame() produces from ESPN, so popup.js + the overlay rail need no branching.
function mapCanonicalGame(m) {
  const status = String(m.status || '');
  return {
    id: String(m.id),
    home: m.homeTeam || '?', away: m.awayTeam || '?',
    homeAbbrev: teamAbbrev(m.homeTeam), awayAbbrev: teamAbbrev(m.awayTeam),
    homeScore: m.homeScore || '', awayScore: m.awayScore || '',
    homeLogo: '', awayLogo: '',
    homeFlag: m.homeFlag || '', awayFlag: m.awayFlag || '', // emoji flags (cricket national sides)
    state: m.state || 'pre', detail: status, statusLabel: status,
    broadcasts: '',
    date: m.startTime ? new Date(m.startTime).toISOString() : '',
    format: m.format || '', // cricket match format (T20/ODI/Test) — drives the format dropdown
  };
}

async function handleFetchGames(sport) {
  // ── MERGED 'All Matches' BOARDS (soccer-all / rugby-all) ──────────────────────────────────
  // Fetch every member league concurrently and concat — one slow/failed league can't sink the
  // board (allSettled, same posture as iOS fetchRugbyBoard). Each game is stamped with its own
  // league key so the client can route explain/recap to the right backend league.
  if (ALL_BOARDS[sport]) {
    const results = await Promise.allSettled(
      ALL_BOARDS[sport].map(leagueKey =>
        handleFetchGames(leagueKey).then(res =>
          (res.games || []).map(g => ({ ...g, sportKey: leagueKey }))
        )
      )
    );
    const games = [];
    for (const r of results) if (r.status === 'fulfilled') games.push(...r.value);
    return { games };
  }

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
    wnba:     { sport: 'basketball', league: 'wnba' },
    nhl:      { sport: 'hockey',     league: 'nhl' },
    soccer:   { sport: 'soccer',     league: 'usa.1' },
    epl:      { sport: 'soccer',     league: 'eng.1' },
    laliga:   { sport: 'soccer',     league: 'esp.1' },
    worldcup: { sport: 'soccer',     league: 'fifa.world' },
    // Rugby leagues — ESPN Core API two-step $ref fetch. League ids MUST match the backend's
    // espnConfig (route.ts) — the explain path looks the gameId up in the SAME league, so a
    // mismatched id can never be found server-side. (The old '282' here was Olympic 7s while
    // the backend explains URC 270557 — every rugby explain silently fell back.)
    rugby:        { sport: 'rugby', league: '270557', useCoreAPI: true }, // URC
    mlr:          { sport: 'rugby', league: '289262', useCoreAPI: true },
    sixnations:   { sport: 'rugby', league: '180659', useCoreAPI: true },
    nationschamp: { sport: 'rugby', league: '17567',  useCoreAPI: true },
    // Backend-served boards (API keys live server-side; response is already-normalized
    // canonical Game[] in { matches } — same contract the iOS app consumes).
    nationscup: { backendBoard: `${API_BASE}/rugby-live` },
    cricket:    { backendBoard: `${API_BASE}/cricket` },
  };

  const config = SPORT_CONFIG[sport] || SPORT_CONFIG.nfl;

  // ── BACKEND BOARDS (cricket / nationscup): map canonical Game[] → the extension game shape ──
  if (config.backendBoard) {
    const res = await fetch(config.backendBoard, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Board API returned ${res.status}`);
    const data = await res.json();
    const matches = Array.isArray(data?.matches) ? data.matches : [];
    return { games: matches.map(mapCanonicalGame) };
  }

  // ── RUGBY: Two-step $ref fetch over a −3d…+10d window (weekly sport — a today-only
  //    list is empty most days; mirrors the iOS core-API windowed board). ──
  if (config.useCoreAPI) {
    const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    const eventsRes = await fetch(
      `https://sports.core.api.espn.com/v2/sports/${config.sport}/leagues/${config.league}/events?dates=${day(-3)}-${day(10)}&limit=50`,
      { cache: 'no-store' }
    );
    if (!eventsRes.ok) throw new Error(`ESPN Core API returned ${eventsRes.status}`);
    const eventsData = await eventsRes.json();
    const items = (eventsData.items || []).slice(0, 30); // cap the per-event $ref fan-out

    const games = await Promise.all(items.map(async (item) => {
      // Core API $refs come back http:// — upgrade to https (same as the iOS httpsRef helper).
      const eventRes = await fetch(String(item.$ref).replace(/^http:\/\//i, 'https://'), { cache: 'no-store' });
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