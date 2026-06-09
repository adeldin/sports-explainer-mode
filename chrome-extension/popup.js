let selectedLevel = 'beginner';
let selectedGameId = null;
let selectedSport = null;

const sportSelect = document.getElementById('sport-select');
const gameSelect = document.getElementById('game-select');
const gameListSection = document.getElementById('game-list-section');
const gamesLoading = document.getElementById('games-loading');
const toggleBtn = document.getElementById('toggle-btn');
const statusEl = document.getElementById('status');

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
  selectedSport = sportSelect.value;
  selectedGameId = null;
  toggleBtn.disabled = true;
  toggleBtn.textContent = 'Show Overlay';

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
        statusEl.textContent = '❌ ' + chrome.runtime.lastError.message;
      } else {
        statusEl.textContent = response?.status === 'ok' ? '✅ Overlay active!' : 'Ready';
        setTimeout(() => statusEl.textContent = 'Ready', 2000);
      }
    });
  } catch (err) {
    statusEl.textContent = '❌ ' + err.message;
    console.error(err);
  }
});