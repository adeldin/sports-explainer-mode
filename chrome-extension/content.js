(function() {
  if (window.__sportsExplainerLoaded) return;
  window.__sportsExplainerLoaded = true;

  let overlayVisible = false;
  let overlayEl = null;
  let currentLevel = 'beginner';
  let currentSport = 'nfl';
  let currentGameId = null;
  let currentPlayText = '';
  let pollInterval = null;
  let isMinimized = false;
  let settingsOpen = false;
  let lastUpdatedTime = null;
  let lastUpdatedTimer = null;
  let sourceVisible = false;
  let currentGameState = 'in'; // Track game state for smart polling

  // ─────────────────────────────────────────
  // DEFAULT SETTINGS
  // ─────────────────────────────────────────
  let settings = {
    theme: 'dark',
    accentColor: '#cc0000',
    fontSize: 'medium',
    language: 'en',
    refreshInterval: 30,
    level: 'beginner'
  };

  const FONT_SIZES = { small: '11px', medium: '13px', large: '15px' };

  const LANGUAGES = [
    { code: 'en', label: '🇺🇸 English' },
    { code: 'es', label: '🇪🇸 Spanish' },
    { code: 'fr', label: '🇫🇷 French' },
    { code: 'pt', label: '🇧🇷 Portuguese' },
    { code: 'de', label: '🇩🇪 German' },
    { code: 'ja', label: '🇯🇵 Japanese' },
    { code: 'zh', label: '🇨🇳 Chinese' },
    { code: 'ko', label: '🇰🇷 Korean' },
    { code: 'it', label: '🇮🇹 Italian' },
    { code: 'ar', label: '🇸🇦 Arabic' }
  ];

  // ─────────────────────────────────────────
  // LOAD SETTINGS
  // ─────────────────────────────────────────
  function loadSettings(callback) {
    chrome.storage.local.get(['seSettings'], (data) => {
      if (data.seSettings) {
        settings = { ...settings, ...data.seSettings };
        currentLevel = settings.level;
      }
      if (callback) callback();
    });
  }

  function saveSettings() {
    chrome.storage.local.set({ seSettings: settings });
  }

  // ─────────────────────────────────────────
  // MESSAGE LISTENER
  // ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'toggleOverlay') {
      currentSport = msg.sport;
      currentGameId = msg.gameId || null;
      loadSettings(() => {
        overlayVisible ? hideOverlay() : showOverlay();
      });
      sendResponse({ status: 'ok' });
    }
    return true;
  });

  // ─────────────────────────────────────────
  // THEME HELPERS
  // ─────────────────────────────────────────
  function getThemeColors() {
    const dark = {
      bg: '#0f0f0f', bodyBg: '#0f0f0f', footerBg: '#0a0a0a',
      text: 'rgba(255,255,255,0.9)', subtext: '#aaa', label: '#666',
      border: '#1a1a1a', inputBg: '#1a1a1a', inputBorder: '#333',
      inputText: 'white', answerBg: '#1a1a1a', selectBg: '#1a1a1a',
      settingsBg: '#111', settingsItemBg: '#1a1a1a', settingsItemBorder: '#2a2a2a',
      statusBg: '#080808', statusText: '#555', statusDot: '#333',
      sourceBg: '#151515'
    };
    const light = {
      bg: '#ffffff', bodyBg: '#ffffff', footerBg: '#f5f5f5',
      text: '#111111', subtext: '#555', label: '#888',
      border: '#e0e0e0', inputBg: '#f0f0f0', inputBorder: '#ccc',
      inputText: '#111', answerBg: '#f0f0f0', selectBg: '#f0f0f0',
      settingsBg: '#fafafa', settingsItemBg: '#f0f0f0', settingsItemBorder: '#ddd',
      statusBg: '#f0f0f0', statusText: '#999', statusDot: '#ccc',
      sourceBg: '#f9f9f9'
    };
    return settings.theme === 'light' ? light : dark;
  }

  // ─────────────────────────────────────────
  // STATUS BAR HELPERS
  // ─────────────────────────────────────────
  function setStatusFetching() {
    const spinner = document.getElementById('se-status-spinner');
    const timestamp = document.getElementById('se-status-timestamp');
    const source = document.getElementById('se-status-source');
    if (spinner) spinner.style.display = 'inline-block';
    if (timestamp) timestamp.textContent = 'Updating...';
    if (source) source.textContent = '';
  }

  function setStatusReady(hasData, stateLabel = '') {
    const spinner = document.getElementById('se-status-spinner');
    const timestamp = document.getElementById('se-status-timestamp');
    const source = document.getElementById('se-status-source');
    if (spinner) spinner.style.display = 'none';
    lastUpdatedTime = Date.now();
    if (timestamp) timestamp.textContent = 'Just now';
    if (source) {
      source.textContent = stateLabel || (hasData ? '📡 ESPN' : '⚠️ No live data');
      source.style.color = hasData ? '#34d399' : '#f59e0b';
    }
    if (lastUpdatedTimer) clearInterval(lastUpdatedTimer);
    lastUpdatedTimer = setInterval(() => {
      if (!lastUpdatedTime) return;
      const el = document.getElementById('se-status-timestamp');
      if (!el) { clearInterval(lastUpdatedTimer); return; }
      const secs = Math.floor((Date.now() - lastUpdatedTime) / 1000);
      if (secs < 60) el.textContent = `${secs}s ago`;
      else el.textContent = `${Math.floor(secs / 60)}m ago`;
    }, 1000);
  }

  function setStatusError(msg) {
    const spinner = document.getElementById('se-status-spinner');
    const timestamp = document.getElementById('se-status-timestamp');
    const source = document.getElementById('se-status-source');
    if (spinner) spinner.style.display = 'none';
    if (timestamp) timestamp.textContent = msg || 'Error';
    if (source) { source.textContent = '❌ Failed'; source.style.color = '#ef4444'; }
  }

  // ─────────────────────────────────────────
  // APPLY THEME
  // ─────────────────────────────────────────
  function applyTheme() {
    if (!overlayEl) return;
    const t = getThemeColors();
    const fontSize = FONT_SIZES[settings.fontSize] || '13px';
    overlayEl.style.background = t.bg;
    overlayEl.style.color = t.text;
    const header = document.getElementById('se-header');
    if (header) header.style.background = settings.accentColor;
    const expEl = document.getElementById('se-explanation');
    if (expEl) { expEl.style.color = t.text; expEl.style.fontSize = fontSize; }
    const whyEl = document.getElementById('se-why');
    if (whyEl) { whyEl.style.color = t.subtext; whyEl.style.borderTopColor = t.border; }
    const ruleEl = document.getElementById('se-rule');
    if (ruleEl) { ruleEl.style.color = t.subtext; ruleEl.style.borderTopColor = t.border; }
    const gameSection = document.getElementById('se-game-section');
    if (gameSection) gameSection.style.borderTopColor = t.border;
    const gameSelect = document.getElementById('se-game-select');
    if (gameSelect) { gameSelect.style.background = t.selectBg; gameSelect.style.color = t.inputText; gameSelect.style.borderColor = t.inputBorder; }
    const askSection = document.getElementById('se-ask-section');
    if (askSection) { askSection.style.borderTopColor = t.border; askSection.style.background = t.footerBg; }
    const questionInput = document.getElementById('se-question-input');
    if (questionInput) { questionInput.style.background = t.inputBg; questionInput.style.color = t.inputText; questionInput.style.borderColor = t.inputBorder; }
    const askBtn = document.getElementById('se-ask-btn');
    if (askBtn) askBtn.style.background = settings.accentColor;
    const answerBox = document.getElementById('se-answer-box');
    if (answerBox) { answerBox.style.background = t.answerBg; answerBox.style.borderLeftColor = settings.accentColor; answerBox.style.color = t.text; }
    const statusBar = document.getElementById('se-status-bar');
    if (statusBar) { statusBar.style.background = t.statusBg; statusBar.style.borderTopColor = t.border; }
    const refreshBtn = document.getElementById('se-manual-refresh');
    if (refreshBtn) refreshBtn.style.color = t.statusText;
    const sourceBox = document.getElementById('se-source-box');
    if (sourceBox) { sourceBox.style.background = t.sourceBg; sourceBox.style.color = t.subtext; }
    const sourceToggle = document.getElementById('se-source-toggle');
    if (sourceToggle) sourceToggle.style.color = settings.accentColor;
  }

  // ─────────────────────────────────────────
  // SHOW OVERLAY
  // ─────────────────────────────────────────
  function showOverlay() {
    if (overlayVisible && overlayEl) return;
    overlayVisible = true;
    isMinimized = false;
    sourceVisible = false;

    const t = getThemeColors();
    const fontSize = FONT_SIZES[settings.fontSize] || '13px';

    overlayEl = document.createElement('div');
    overlayEl.id = 'sports-explainer-overlay';
    overlayEl.style.cssText = `
      position: fixed !important; top: 20px !important; right: 20px !important;
      width: 380px !important; min-width: 280px !important; min-height: 100px !important;
      max-width: 90vw !important; max-height: 90vh !important; z-index: 2147483647 !important;
      background: ${t.bg} !important; color: ${t.text} !important; border-radius: 10px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important; font-family: system-ui, sans-serif !important;
      border: 1px solid rgba(128,128,128,0.2) !important; resize: both !important; overflow: auto !important;
    `;

    overlayEl.innerHTML = `
      <div id="se-header" style="display:flex!important;justify-content:space-between!important;align-items:center!important;background:${settings.accentColor}!important;padding:9px 12px!important;cursor:grab!important;user-select:none!important;border-radius:10px 10px 0 0!important;position:sticky!important;top:0!important;z-index:10!important;">
        <span style="font-weight:800!important;font-size:13px!important;color:white!important;">🏟️ SPORTS EXPLAINER</span>
        <div style="display:flex!important;gap:6px!important;">
          <button id="se-settings-btn" title="Settings" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">⚙️</button>
          <button id="se-minimize" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;font-weight:700!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">−</button>
          <button id="se-close" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;font-weight:700!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">✕</button>
        </div>
      </div>

      <div id="se-settings-panel" style="display:none!important;padding:12px!important;background:${t.settingsBg}!important;overflow-y:auto!important;">
        <div style="font-size:11px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;margin-bottom:10px!important;">⚙️ Settings</div>
        <button id="se-settings-done" style="width:100%!important;padding:8px!important;background:${settings.accentColor}!important;color:white!important;border:none!important;border-radius:8px!important;font-size:13px!important;font-weight:700!important;cursor:pointer!important;">✓ Done</button>
      </div>

      <div id="se-body">
        <div style="padding: 10px 12px 6px !important;">
          <div id="se-teams" style="font-size:11px!important;color:#facc15!important;font-weight:600!important;margin-bottom:2px!important;text-transform:uppercase!important;">Loading game...</div>
          <span id="se-play-type" style="display:block!important;font-size:10px!important;font-weight:700!important;color:#34d399!important;text-transform:uppercase!important;letter-spacing:0.05em!important;margin-bottom:6px!important;"></span>
          <p id="se-explanation" style="font-size:${fontSize}!important;line-height:1.5!important;margin:0 0 6px!important;color:${t.text}!important;">Fetching latest play...</p>
          
          <div id="se-source-container" style="margin-bottom:8px!important;">
            <button id="se-source-toggle" style="background:none!important;border:none!important;padding:0!important;font-size:10px!important;font-weight:600!important;color:${settings.accentColor}!important;cursor:pointer!important;text-decoration:underline!important;">Show Source Play</button>
            <div id="se-source-box" style="display:none!important;margin-top:5px!important;padding:8px!important;background:${t.sourceBg}!important;border-radius:6px!important;font-size:11px!important;font-style:italic!important;line-height:1.4!important;color:${t.subtext}!important;"></div>
          </div>

          <div id="se-why" style="display:none!important;font-size:11px!important;color:${t.subtext}!important;border-top:1px solid ${t.border}!important;padding-top:6px!important;margin-bottom:4px!important;line-height:1.4!important;"></div>

          <div id="se-rule" style="display:none!important;font-size:11px!important;color:${t.subtext}!important;border-top:1px solid ${t.border}!important;padding-top:6px!important;margin-bottom:4px!important;line-height:1.4!important;"></div>
        </div>

        <div id="se-game-section" style="padding:4px 12px 8px!important;border-top:1px solid ${t.border}!important;">
          <select id="se-game-select" style="width:100%!important;padding:5px 8px!important;background:${t.selectBg}!important;color:${t.inputText}!important;border:1px solid ${t.inputBorder}!important;border-radius:6px!important;font-size:11px!important;cursor:pointer!important;">
            <option value="">Loading games...</option>
          </select>
        </div>

        <div id="se-ask-section" style="padding:8px 12px 10px!important;border-top:1px solid ${t.border}!important;background:${t.footerBg}!important;">
          <div style="display:flex!important;gap:6px!important;">
            <input id="se-question-input" type="text" placeholder="Ask anything..." style="flex:1!important;padding:6px 10px!important;background:${t.inputBg}!important;color:${t.inputText}!important;border:1px solid ${t.inputBorder}!important;border-radius:6px!important;font-size:12px!important;outline:none!important;"/>
            <button id="se-ask-btn" style="padding:6px 12px!important;background:${settings.accentColor}!important;color:white!important;border:none!important;border-radius:6px!important;font-size:12px!important;font-weight:700!important;cursor:pointer!important;">Ask</button>
          </div>
          <div id="se-answer-box" style="display:none!important;margin-top:7px!important;padding:8px 10px!important;background:${t.answerBg}!important;border-radius:6px!important;border-left:3px solid ${settings.accentColor}!important;font-size:12px!important;line-height:1.5!important;color:${t.text}!important;"></div>
        </div>

        <div id="se-status-bar" style="display:flex!important;align-items:center!important;justify-content:space-between!important;padding:5px 12px!important;background:${t.statusBg}!important;border-top:1px solid ${t.border}!important;border-radius:0 0 10px 10px!important;gap:6px!important;">
          <div style="display:flex!important;align-items:center!important;gap:8px!important;">
            <span id="se-status-spinner" style="display:none!important;width:8px!important;height:8px!important;border:2px solid ${t.statusDot}!important;border-top-color:${settings.accentColor}!important;border-radius:50%!important;animation:se-spin 0.7s linear infinite!important;"></span>
            <span id="se-status-timestamp" style="font-size:9px!important;color:${t.statusText}!important;">—</span>
            <button id="se-manual-refresh" title="Refresh Now" style="background:none!important;border:none!important;padding:0!important;cursor:pointer!important;font-size:12px!important;color:${t.statusText}!important;line-height:1!important;">↻</button>
          </div>
          <span id="se-status-source" style="font-size:9px!important;color:#555!important;"></span>
        </div>
      </div>
      <style>@keyframes se-spin { to { transform: rotate(360deg); } }</style>
    `;

    document.body.appendChild(overlayEl);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (pollInterval) clearInterval(pollInterval);
      } else if (overlayVisible) {
        restartPollInterval();
      }
    });

    setTimeout(() => {
      document.getElementById('se-close').addEventListener('click', hideOverlay);
      document.getElementById('se-manual-refresh').addEventListener('click', fetchLatestPlay);
      
      document.getElementById('se-source-toggle').addEventListener('click', () => {
        const box = document.getElementById('se-source-box');
        const btn = document.getElementById('se-source-toggle');
        sourceVisible = !sourceVisible;
        box.style.display = sourceVisible ? 'block' : 'none';
        btn.textContent = sourceVisible ? 'Hide Source Play' : 'Show Source Play';
      });

      document.getElementById('se-minimize').addEventListener('click', (e) => {
        e.stopPropagation();
        const body = document.getElementById('se-body');
        const minBtn = document.getElementById('se-minimize');
        if (isMinimized) {
          body.style.display = 'block';
          overlayEl.style.height = 'auto';
          minBtn.textContent = '−';
          isMinimized = false;
        } else {
          body.style.display = 'none';
          overlayEl.style.height = 'auto';
          minBtn.textContent = '+';
          isMinimized = true;
        }
      });

      document.getElementById('se-settings-btn').addEventListener('click', () => {
        const panel = document.getElementById('se-settings-panel');
        const body = document.getElementById('se-body');
        settingsOpen = !settingsOpen;
        panel.style.display = settingsOpen ? 'block' : 'none';
        body.style.display = settingsOpen ? 'none' : 'block';
      });

      document.getElementById('se-settings-done').addEventListener('click', () => {
        document.getElementById('se-settings-panel').style.display = 'none';
        document.getElementById('se-body').style.display = 'block';
        settingsOpen = false;
      });

      document.getElementById('se-ask-btn').addEventListener('click', handleAskQuestion);
      document.getElementById('se-question-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAskQuestion(); });

      loadGamesIntoOverlay();
      document.getElementById('se-game-select').addEventListener('change', (e) => {
        if (e.target.value) { currentGameId = e.target.value; fetchLatestPlay(); }
      });

      makeDraggable(overlayEl);
      fetchLatestPlay();
      restartPollInterval();
    }, 50);
  }

  // ─────────────────────────────────────────
  // SMART POLLING LOGIC
  // ─────────────────────────────────────────
  function restartPollInterval() {
    if (pollInterval) clearInterval(pollInterval);
    
    // Don't poll if tab is hidden or overlay is gone
    if (document.hidden || !overlayVisible) return;

    let intervalMs = settings.refreshInterval * 1000;

    // Adjust based on game state
    if (currentGameState === 'pre') {
      intervalMs = 300000; // 5 minutes for pre-game
    } else if (currentGameState === 'post') {
      return; // Stop polling entirely for final games
    } else if (currentGameState === 'halftime' || currentGameState === 'mid') {
      intervalMs = 120000; // 2 minutes for halftime
    }

    if (intervalMs > 0) {
      pollInterval = setInterval(fetchLatestPlay, intervalMs);
    }
  }

  // response.state is gone from the backend — derive the polling bucket from the
  // human gameContext string (e.g. "Yankees vs Rays — Bot 1st" / "... — Final").
  // Maps to the buckets restartPollInterval() already understands:
  //   'post' → stop, 'pre' → 5m, 'mid' → 2m, 'in' → live default.
  // No match → 'in' (live cadence) so we NEVER freeze a live game.
  function deriveStateFromContext(gameContext) {
    const ctx = String(gameContext || '');
    if (/\bFinal\b/i.test(ctx)) return 'post';
    if (/Halftime|End\s|Mid\s|Delay/i.test(ctx)) return 'mid';
    if (/\bPre\b|Scheduled/i.test(ctx)) return 'pre';
    return 'in'; // live (Top/Bot/quarter/clock) or unmatched → safe live cadence
  }

  // Cleaned status label from gameContext: prefer the part after the "—"
  // ("... — Bot 1st" → "📡 Bot 1st"). Neutral "📡 Live" when unavailable.
  function statusLabelFromContext(gameContext) {
    const ctx = String(gameContext || '').trim();
    if (!ctx) return '📡 Live';
    const dashIdx = ctx.lastIndexOf('—');
    const tail = dashIdx >= 0 ? ctx.slice(dashIdx + 1).trim() : '';
    return tail ? `📡 ${tail}` : '📡 Live';
  }

  async function loadGamesIntoOverlay() {
    const gameSelect = document.getElementById('se-game-select');
    if (!gameSelect) return;
    try {
      const response = await chrome.runtime.sendMessage({ action: 'fetchGames', sport: currentSport });
      const games = response?.games || [];
      gameSelect.innerHTML = '';
      if (games.length === 0) { gameSelect.innerHTML = '<option value="">No games today</option>'; return; }
      games.forEach(game => {
        const option = document.createElement('option');
        option.value = game.id;
        option.textContent = `${game.away} @ ${game.home} ${game.state === 'in' ? '🔴 LIVE' : ''}`;
        if (game.id === currentGameId) option.selected = true;
        gameSelect.appendChild(option);
      });
    } catch (err) { console.error('Load games error:', err); }
  }

  function hideOverlay() {
    overlayVisible = false;
    if (overlayEl) overlayEl.remove();
    overlayEl = null;
    if (pollInterval) clearInterval(pollInterval);
    if (lastUpdatedTimer) clearInterval(lastUpdatedTimer);
  }

  async function fetchLatestPlay() {
    if (!chrome.runtime?.id) return;
    const expEl = document.getElementById('se-explanation');
    const typeEl = document.getElementById('se-play-type');
    const teamEl = document.getElementById('se-teams');
    const whyEl = document.getElementById('se-why');
    const ruleEl = document.getElementById('se-rule');
    const sourceBox = document.getElementById('se-source-box');

    setStatusFetching();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchPlay', sport: currentSport, level: settings.level, gameId: currentGameId, language: settings.language
      });

      if (response) {
        // Update game state for smart polling — derived from gameContext now
        // that response.state is gone (parse "... — Bot 1st" / "... — Final").
        const newState = deriveStateFromContext(response.gameContext);
        if (newState !== currentGameState) {
          currentGameState = newState;
          restartPollInterval(); // Re-adjust timer frequency
        }

        expEl.textContent = response.simple || 'Waiting for next play...';
        typeEl.textContent = response.playType || '';
        if (teamEl && response.homeTeam) teamEl.textContent = `${response.awayTeam} @ ${response.homeTeam}`;
        
        if (sourceBox) sourceBox.textContent = response.playType || 'No source play available.';

        if (whyEl && response.whyItMatters) {
          whyEl.textContent = `💡 ${response.whyItMatters}`;
          whyEl.style.display = 'block';
        } else if (whyEl) {
          whyEl.style.display = 'none';
        }

        if (ruleEl && response.showRule === true && response.ruleDetail) {
          ruleEl.textContent = `⚖️ ${response.ruleDetail}`;
          ruleEl.style.display = 'block';
        } else if (ruleEl) {
          ruleEl.style.display = 'none';
        }

        // Status label = cleaned gameContext (part after "—"), or a neutral fallback.
        const stateLabel = statusLabelFromContext(response.gameContext);

        setStatusReady(!!response.homeTeam, stateLabel);
      }
    } catch (err) {
      setStatusError('Fetch failed');
    }
  }

  async function handleAskQuestion() {
    const input = document.getElementById('se-question-input');
    const answerBox = document.getElementById('se-answer-box');
    const askBtn = document.getElementById('se-ask-btn');
    const question = input?.value?.trim();
    if (!question || !answerBox) return;

    askBtn.textContent = '...';
    askBtn.disabled = true;
    answerBox.style.display = 'block';
    answerBox.textContent = 'Thinking...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'askQuestion', sport: currentSport, level: settings.level, question, context: currentPlayText, language: settings.language
      });
      answerBox.textContent = response?.answer || '⚠️ Could not get an answer.';
      input.value = '';
    } catch (err) {
      answerBox.textContent = '⚠️ Request timed out.';
    } finally {
      askBtn.textContent = 'Ask';
      askBtn.disabled = false;
    }
  }

  function makeDraggable(el) {
    const header = document.getElementById('se-header');
    let isDragging = false, startX, startY, startLeft, startTop;
    header.addEventListener('mousedown', (e) => {
      if (['se-close','se-minimize','se-settings-btn'].includes(e.target.id)) return;
      const rect = el.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      isDragging = true; startX = e.clientX; startY = e.clientY;
      el.style.right = 'auto'; el.style.left = startLeft + 'px'; el.style.top = startTop + 'px';
      header.style.cursor = 'grabbing'; e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      el.style.left = Math.max(10, Math.min(startLeft + (e.clientX - startX), window.innerWidth - el.offsetWidth - 10)) + 'px';
      el.style.top = Math.max(10, Math.min(startTop + (e.clientY - startY), window.innerHeight - el.offsetHeight - 10)) + 'px';
    });
    window.addEventListener('mouseup', () => {
      if (isDragging) chrome.storage.local.set({ overlayPosition: { left: el.style.left, top: el.style.top } });
      isDragging = false; header.style.cursor = 'grab';
    });
  }
})();