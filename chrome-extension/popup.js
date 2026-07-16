let selectedLevel = 'beginner';
let selectedGameId = null;
let selectedSport = null;   // LEAF sport key (what every message carries)
let selectedGroup = null;   // the SE_SPORTS group behind the sport dropdown
let selectedFormat = null;  // cricket format filter (T20/ODI/Test) — client-side, from the league pick

const sportSelect = document.getElementById('sport-select');
const leagueSection = document.getElementById('league-section');
const leagueSelect = document.getElementById('league-select');
const gameSelect = document.getElementById('game-select');
const gameListSection = document.getElementById('game-list-section');
const gamesLoading = document.getElementById('games-loading');
const toggleBtn = document.getElementById('toggle-btn');
const statusEl = document.getElementById('status');
const accountStrip = document.getElementById('account-strip');

// ─────────────────────────────────────────
// ACCOUNT (entry screen)
// ─────────────────────────────────────────
// The popup is a SEPARATE context from the overlay — none of content.js's state (sePro,
// seAuthEmail, openUpgrade) is reachable here. Account state comes from background, which both
// surfaces already share, and the purchase link lives there too (single source of truth).
//
// Sign-in itself is NOT duplicated here: the email→code UI lives in the overlay's Account panel,
// and "Sign in" routes there via the openAccount message.

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderAccount(state) {
  const signedIn = !!(state && state.signedIn);
  const isPro = !!(state && state.isPro);
  const email = (state && state.email) || '';

  // SIGNED OUT — an account is NOT required. Free works with no sign-in at all, so "Start free"
  // is the loud line and sign-in is a quiet link. A big orange "Sign in" button here read as a
  // wall in front of the product.
  if (!signedIn) {
    accountStrip.innerHTML =
      `<div class="who">` +
        `<span class="free-first">Start free — no account needed.</span>` +
        `Sign in only to sync Pro. <button class="link-btn" id="strip-signin">Sign in</button>` +
      `</div>`;
    document.getElementById('strip-signin').addEventListener('click', openAccountInOverlay);
    return;
  }

  // SIGNED IN. Pro gets no Upgrade button; both get Sign out (the fix for "wrong account, stuck").
  // Identity line first (full width — the email ellipsizes instead of hiding behind the Upgrade
  // button), then the actions on their OWN row. The old single-row layout let the button sit on
  // top of the email and wrap the tier badge to a second line.
  const who =
    `<div class="who">Signed in as <span class="email" title="${escapeHtml(email)}">${escapeHtml(email)}</span>` +
    ` · <span class="${isPro ? 'tier-pro' : 'tier-free'}">${isPro ? 'Pro' : 'Free'}</span></div>`;

  // Free → the game-independent upgrade path: it works with no live game on, which is the whole
  // reason this strip exists (the only other Upgrade CTAs sit behind a cap or a recap).
  // Price in the tooltip — keep in sync with the RevenueCat web offering (and content.js's copy).
  const upgrade = isPro ? '' : `<button class="upgrade-btn" id="strip-upgrade" title="$6.99/month or $39.99/year">Upgrade to Pro</button>`;
  accountStrip.innerHTML = who +
    `<div class="actions">${upgrade}<button class="signout-btn" id="strip-signout">Sign out</button></div>`;

  if (!isPro) {
    document.getElementById('strip-upgrade').addEventListener('click', () => {
      // Background opens the tab (it owns the purchase URL + the email as app_user_id). It must —
      // the popup closes on click, which would kill a window.open() started here.
      chrome.runtime.sendMessage({ action: 'openUpgrade' }, () => window.close());
    });
  }

  document.getElementById('strip-signout').addEventListener('click', () => {
    // Background clears seAuth + the entitlement cache. Re-render in place (don't close the
    // popup) so the user immediately sees they're signed out and can sign in as someone else.
    chrome.runtime.sendMessage({ action: 'authSignOut' }, () => {
      renderAccount({ signedIn: false });
    });
  });
}

// "Sign in" → show the overlay and open it straight to the Account section (where the real
// email/code flow lives), then close the popup so it isn't sitting on top.
async function openAccountInOverlay() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'openAccount' }, () => {
      if (chrome.runtime.lastError) {
        statusEl.textContent = '❌ Open a normal web page first, then try again.';
        return;
      }
      window.close();
    });
  } catch (err) {
    statusEl.textContent = '❌ ' + err.message;
  }
}

function loadAccountState() {
  chrome.runtime.sendMessage({ action: 'authCheckSession' }, (s) => {
    if (chrome.runtime.lastError || !s || !s.signedIn) { renderAccount({ signedIn: false }); return; }
    chrome.runtime.sendMessage({ action: 'checkEntitlement' }, (e) => {
      renderAccount({ signedIn: true, email: s.email, isPro: !!(e && e.isPro) });
    });
  });
}
loadAccountState();

// ─────────────────────────────────────────
// LEVEL PILLS
// ─────────────────────────────────────────
document.querySelectorAll('.level-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.level-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedLevel = pill.dataset.level;
  });
});

// ─────────────────────────────────────────
// SPORT → (LEAGUE) → LOAD GAMES
// The sport dropdown carries GROUP keys (SE_SPORTS.SPORT_GROUPS). Grouped sports (soccer/rugby/
// cricket) reveal the league dropdown; the LEAF key from it is what messages carry. Flat sports
// load games directly.
// ─────────────────────────────────────────
function resetGameList(prompt) {
  gameListSection.style.display = 'none';
  gameSelect.innerHTML = '<option value="">— Pick a game —</option>';
  gameSelect.disabled = true;
  if (prompt) statusEl.textContent = prompt;
}

sportSelect.addEventListener('change', () => {
  const groupKey = sportSelect.value || null;   // '' = the "Choose a sport…" placeholder
  selectedGroup = groupKey ? window.SE_SPORTS.SPORT_GROUPS.find(g => g.key === groupKey) : null;
  selectedSport = null;
  selectedFormat = null;
  selectedGameId = null;
  toggleBtn.disabled = true;
  toggleBtn.textContent = 'Show Overlay';

  // Back to the placeholder → collapse everything and reset the prompt.
  if (!selectedGroup) {
    leagueSection.style.display = 'none';
    resetGameList('Start by selecting your sport');
    return;
  }

  if (selectedGroup.leagues) {
    // Grouped sport → league step. A single-league group (cricket) auto-selects — the dropdown
    // still shows (consistent flow) but the user isn't forced to pick the only option.
    leagueSelect.innerHTML = '';
    if (selectedGroup.leagues.length === 1) {
      const only = selectedGroup.leagues[0];
      const opt = document.createElement('option');
      opt.value = window.SE_SPORTS.leagueValue(only); opt.textContent = only.label; opt.selected = true;
      leagueSelect.appendChild(opt);
      leagueSection.style.display = 'block';
      selectedSport = only.key;
      selectedFormat = only.formatFilter || null;
      loadGames();
      return;
    }
    const placeholder = document.createElement('option');
    placeholder.value = ''; placeholder.textContent = '— Pick a league —'; placeholder.selected = true;
    leagueSelect.appendChild(placeholder);
    selectedGroup.leagues.forEach(l => {
      const opt = document.createElement('option');
      // Format-filter leagues (cricket) share a leaf key — the value encodes key + filter.
      opt.value = window.SE_SPORTS.leagueValue(l); opt.textContent = l.label;
      leagueSelect.appendChild(opt);
    });
    leagueSection.style.display = 'block';
    resetGameList('Now pick a league');
    return;
  }

  // Flat sport → straight to games.
  leagueSection.style.display = 'none';
  selectedSport = selectedGroup.key;
  loadGames();
});

leagueSelect.addEventListener('change', () => {
  const parsed = window.SE_SPORTS.parseLeagueValue(leagueSelect.value);
  selectedSport = parsed.key || null;
  selectedFormat = parsed.formatFilter;
  selectedGameId = null;
  toggleBtn.disabled = true;
  if (!selectedSport) { resetGameList('Now pick a league'); return; }
  loadGames();
});

let loadSeq = 0; // guards against a slow fetch landing after the user already switched sport/league

async function loadGames() {
  const seq = ++loadSeq;
  // Show loading state
  gameListSection.style.display = 'block';
  gamesLoading.style.display = 'block';
  gameSelect.style.display = 'none';
  gameSelect.disabled = true;
  gameSelect.innerHTML = '<option value="">— Pick a game —</option>';
  statusEl.textContent = 'Loading games...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'fetchGames',
      sport: selectedSport
    });
    if (seq !== loadSeq) return; // superseded by a newer pick — don't render stale results

    // Cricket format filter (T20/ODI/Test) — client-side over the one merged board.
    const games = (response?.games || []).filter(g => window.SE_SPORTS.matchesFormat(g, selectedFormat));
    gamesLoading.style.display = 'none';
    gameSelect.style.display = 'block';

    if (games.length === 0) {
      statusEl.textContent = 'No games found.';
      gameSelect.innerHTML = '<option value="">— No games found —</option>';
      return;
    }

    // Windowed boards (rugby/cricket) span multiple days — tag non-today games with a short date.
    const todayStr = new Date().toDateString();
    const dateTag = (game) => {
      if (!game.date) return '';
      const d = new Date(game.date);
      if (isNaN(d.getTime()) || d.toDateString() === todayStr) return '';
      return ` · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    };

    // Same ordering as the overlay rail: live → upcoming (soonest first) → finals (newest first —
    // the archival cricket board arrives oldest-first and spans weeks).
    const ORDER = { in: 0, pre: 1, post: 2 };
    games.sort((a, b) => {
      const byState = (ORDER[a.state] ?? 3) - (ORDER[b.state] ?? 3);
      if (byState) return byState;
      const ta = Date.parse(a.date || '') || 0, tb = Date.parse(b.date || '') || 0;
      return a.state === 'post' ? tb - ta : ta - tb;
    });

    // Populate game list
    gameSelect.innerHTML = '<option value="">— Pick a game —</option>';
    games.forEach(game => {
      const option = document.createElement('option');
      option.value = game.id;

      // Build label based on game state. Merged 'All Matches' boards stamp each game with its
      // own league key — surface it so mixed-league lists stay legible.
      const league = game.sportKey ? window.SE_SPORTS.leagueLabelFor(game.sportKey) : '';
      let label = `${league ? `[${league}] ` : ''}${game.away} @ ${game.home}`;
      if (game.state === 'in') {
        label += `  🔴 LIVE • ${game.detail}`;
      } else if (game.state === 'post') {
        // Cricket finals carry a result sentence ("England won by 4 wickets") — show it over the
        // score pair, whose innings notation (191/6-190/7) reads badly in a hyphenated label.
        const sentence = game.detail && /won|no result|drawn|tied|abandoned/i.test(game.detail);
        label += sentence ? `  ✅ ${game.detail}` : `  ✅ Final ${game.awayScore}-${game.homeScore}`;
        label += dateTag(game);
      } else {
        label += `  🕐 ${game.detail}${dateTag(game)}`;
      }

      option.textContent = label;

      // Put live games at the top
      if (game.state === 'in') {
        gameSelect.insertBefore(option, gameSelect.children[1]);
      } else {
        gameSelect.appendChild(option);
      }
    });

    gameSelect.disabled = false;
    statusEl.textContent = `${games.length} game${games.length !== 1 ? 's' : ''} found`;

  } catch (err) {
    if (seq !== loadSeq) return; // superseded — the newer load owns the UI now
    gamesLoading.style.display = 'none';
    statusEl.textContent = '❌ Could not load games.';
    console.error(err);
  }
}

// ─────────────────────────────────────────
// GAME SELECTION
// ─────────────────────────────────────────
gameSelect.addEventListener('change', () => {
  selectedGameId = gameSelect.value || null;
  toggleBtn.disabled = !selectedGameId;
  if (selectedGameId) {
    statusEl.textContent = 'Ready — click Show Overlay!';
  }
});

// ─────────────────────────────────────────
// SHOW OVERLAY BUTTON
// ─────────────────────────────────────────
toggleBtn.addEventListener('click', async () => {
  if (!selectedGameId || !selectedSport) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, {
      action: 'toggleOverlay',
      sport: selectedSport,
      level: selectedLevel,
      gameId: selectedGameId,
      format: selectedFormat || undefined   // cricket format filter carries into the overlay rail
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Keep the popup open so the user can see the failure.
        statusEl.textContent = '❌ ' + chrome.runtime.lastError.message;
      } else {
        // Overlay is showing — dismiss the launcher so it doesn't sit on top of it.
        statusEl.textContent = response?.status === 'ok' ? '✅ Overlay active!' : 'Ready';
        window.close();
      }
    });
  } catch (err) {
    statusEl.textContent = '❌ ' + err.message;
    console.error(err);
  }
});