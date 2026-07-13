let selectedLevel = 'beginner';
let selectedGameId = null;
let selectedSport = null;

const sportSelect = document.getElementById('sport-select');
const gameSelect = document.getElementById('game-select');
const gameListSection = document.getElementById('game-list-section');
const gamesLoading = document.getElementById('games-loading');
const toggleBtn = document.getElementById('toggle-btn');
const statusEl = document.getElementById('status');
const accountChip = document.getElementById('account-chip');
const accountRow = document.getElementById('account-row');

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

  // Header chip.
  if (signedIn) {
    accountChip.innerHTML =
      `<span class="chip-badge ${isPro ? 'pro' : ''}" title="${escapeHtml(email)}">${isPro ? 'Pro' : 'Free'}</span>`;
  } else {
    accountChip.innerHTML = `<button class="chip-link" id="chip-signin">Sign in</button>`;
    document.getElementById('chip-signin').addEventListener('click', openAccountInOverlay);
  }

  // Entry-screen row.
  if (!signedIn) {
    accountRow.innerHTML =
      `<div class="who">Sign in to sync your Pro across devices.</div>` +
      `<button id="row-signin">Sign in</button>`;
    document.getElementById('row-signin').addEventListener('click', openAccountInOverlay);
    return;
  }
  if (isPro) {
    accountRow.innerHTML =
      `<div class="who">Signed in as <strong>${escapeHtml(email)}</strong> · <span class="tier-pro">Pro</span></div>`;
    return;
  }
  // Signed in + Free → the game-independent upgrade path (works with no live game on).
  accountRow.innerHTML =
    `<div class="who">Signed in as <strong>${escapeHtml(email)}</strong> · Free</div>` +
    `<button id="row-upgrade">Upgrade to Pro</button>`;
  document.getElementById('row-upgrade').addEventListener('click', () => {
    // Background opens the tab (it owns the purchase URL + the email as app_user_id). It must —
    // the popup closes on click, which would kill a window.open() started here.
    chrome.runtime.sendMessage({ action: 'openUpgrade' }, () => window.close());
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
// SPORT CHANGE → LOAD GAMES
// ─────────────────────────────────────────
sportSelect.addEventListener('change', async () => {
  selectedSport = sportSelect.value || null;   // '' = the "Choose a sport…" placeholder
  selectedGameId = null;
  toggleBtn.disabled = true;
  toggleBtn.textContent = 'Show Overlay';

  // Back to the placeholder → collapse the game list and reset the prompt.
  if (!selectedSport) {
    gameListSection.style.display = 'none';
    gameSelect.innerHTML = '<option value="">— Pick a game —</option>';
    gameSelect.disabled = true;
    statusEl.textContent = 'Start by selecting your sport';
    return;
  }

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

    const games = response?.games || [];
    gamesLoading.style.display = 'none';
    gameSelect.style.display = 'block';

    if (games.length === 0) {
      statusEl.textContent = 'No games found for today.';
      gameSelect.innerHTML = '<option value="">— No games today —</option>';
      return;
    }

    // Populate game list
    gameSelect.innerHTML = '<option value="">— Pick a game —</option>';
    games.forEach(game => {
      const option = document.createElement('option');
      option.value = game.id;

      // Build label based on game state
      let label = `${game.away} @ ${game.home}`;
      if (game.state === 'in') {
        label += `  🔴 LIVE • ${game.detail}`;
      } else if (game.state === 'post') {
        label += `  ✅ Final ${game.awayScore}-${game.homeScore}`;
      } else {
        label += `  🕐 ${game.detail}`;
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
    gamesLoading.style.display = 'none';
    statusEl.textContent = '❌ Could not load games.';
    console.error(err);
  }
});

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
      gameId: selectedGameId
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