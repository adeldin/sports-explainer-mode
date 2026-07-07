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
  let lastInteraction = Date.now(); // last overlay interaction — drives idle-pause
  let idlePaused = false;           // true while polling is paused for inactivity
  let selectorOpen = false;
  let selectorPanelEl = null;
  let currentGames = []; // enriched score-card game list for the rail

  // ─────────────────────────────────────────
  // DEFAULT SETTINGS
  // ─────────────────────────────────────────
  let settings = {
    theme: 'dark',
    accentColor: '#e87722',
    fontSize: 'medium',
    language: 'en',
    refreshInterval: 30,
    level: 'beginner'
  };

  const FONT_SIZES = { small: '11px', medium: '13px', large: '16px', xlarge: '19px' };

  // Pause auto-poll after this much overlay-inactivity to stop wasting /api/explain (AI) calls
  // while nobody's interacting. Tune here.
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

  // SportsWise brand mark — inline SVG (transparent, mirrors logo.svg with the full-canvas
  // navy rect removed), sized to the header (22px) so it needs no manifest/web_accessible_resources
  // change and scales cleanly on the navy header. Rendered in the #se-logo slot beside "Sports Explainer".
  const SPORTSWISE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="22" height="22" style="flex-shrink:0">
    <defs><style>.st0{fill:#f5ecd7;}.st1{fill:#fff;}.st2{fill:#e87722;}</style></defs>
    <g>
      <polygon class="st1" points="484.9 768.91 498.85 769.83 484.87 770.41 484.9 768.91"/>
      <polygon class="st1" points="707.29 682.93 705.23 684.8 707.18 682.58 707.29 682.93"/>
      <polygon class="st1" points="498.88 769.83 511.3 769.3 511.28 770.65 498.88 769.83"/>
      <g>
        <path class="st2" d="M668.41,630.2c-53.42,21.65-101.79,47.1-145.85,76.73l3.54-277.29,50.32,1,.16,3.2c1.16,24.55,6.79,44.38,12.66,62.14l.18.53c11.05,31,27.91,60.58,51.54,90.37,11.18,15.22,20.14,29.34,27.44,43.32Z"/>
        <polygon class="st2" points="526.46 402.31 526.46 403.21 526.06 403.21 526.04 402.34 526.46 402.31"/>
        <path class="st2" d="M499.67,429.75l-3.67,287.91c-40.81-28.94-84.68-53.84-133.11-75.41,6.77-15.81,15.44-31.66,26.4-48.39,18.5-26.83,32.01-53.26,41.23-80.77l.13-.4c9.73-30.74,13.4-55.66,11.89-80.85l57.12-2.09Z"/>
        <path class="st2" d="M405.47,504.68c-8.46,25.24-20.93,49.58-38.09,74.43-11.92,18.16-21.38,35.44-28.78,52.76-16.78-6.9-34.1-13.43-52.04-19.61-25.22-43.95-37.35-94.7-34.1-146.08,45.22-21.46,99.51-26.7,152.03-31.77,3.94-.37,7.82-.74,11.71-1.14,1.32,21.86-2.01,43.93-10.73,71.42Z"/>
        <polygon class="st2" points="577.34 404.16 578.58 404.27 577.34 404.24 575.2 404.19 575.2 404 577.34 404.16"/>
        <path class="st2" d="M772.04,482.37c-.21,42.95-10.57,84.5-29.87,121.32-16.78,5.31-33.09,10.92-48.98,16.86-8.22-16.18-18.4-32.33-31.21-49.74-21.96-27.59-37.53-54.79-47.63-83.15-6.11-18.42-10.39-34.92-11.34-55.08,45.91,3.44,127.58,14.43,169.03,49.8Z"/>
        <path class="st2" d="M499.63,403.29l-58.62,2.14-1.35.05c-.03-.34-.05-.71-.11-1.06-6.21-63.25-42.16-104.45-100.09-115.87,44.72-39.14,98.93-61.58,157.18-65.07l2.99,179.81Z"/>
        <path class="st2" d="M671.41,277.56c-60.31,15.73-91.93,58.23-94.07,126.6-.03.03-.03.05,0,.08l-2.14-.05-48.74-.98h-.4l-.03-.87-2.96-179.07c53.92,2.46,105.12,21.17,148.33,54.29Z"/>
        <path class="st2" d="M769.47,448.22c-46.2-27.67-113.15-38.17-164.51-42l-1.24-.08c1.61-63.62,31.03-97.58,92.43-106.68,40.7,41.47,66,92.83,73.32,148.75Z"/>
        <path class="st2" d="M413.26,406.99l-11.29,1.11c-49.24,4.76-99.96,9.62-145.61,27.59,8.7-46.36,28.76-87.91,59.63-123.59,57.99,3.83,91.58,36.61,97.27,94.89Z"/>
      </g>
      <path class="st0" d="M805.17,617.04c-114.04,30.86-214.34,73.31-303.62,142.02-83.43-63.78-173.18-103.95-280.24-133.71v44.84c88.47,14.87,164.04,40.62,233.33,79.29-75.36-20.38-149.46-34.91-258.24-42.2v53.09c105.95-5.58,177.73-3.17,253.43,4.83,8.55,22.06,29.71,35.99,52.65,35.53,22.32-.44,42.18-13.83,50.5-35.6,85.78-8.84,164.04-10.75,274.61-2.53v-57.4c-115.13,6.4-197.31,21.97-280.2,44.62,77.82-43.11,161.6-69.89,257.78-84.97v-47.79Z"/>
    </g>
  </svg>`;

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

  // In-overlay selector data. SAME keys the popup/backend use. Sport labels mirror
  // popup.html; difficulty uses the display-rename rule (label "Rookie" → key "kid").
  const SPORTS = [
    { key: 'nfl', label: '🏈 NFL' },
    { key: 'mlb', label: '⚾ MLB' },
    { key: 'nba', label: '🏀 NBA' },
    { key: 'nhl', label: '🏒 NHL' },
    { key: 'soccer', label: '⚽ MLS' },
    { key: 'worldcup', label: '🌍 World Cup' },
    { key: 'rugby', label: '🏉 Rugby' }
  ];

  const LEVELS = [
    { key: 'kid', label: 'Rookie' },
    { key: 'beginner', label: 'Beginner' },
    { key: 'intermediate', label: 'Intermediate' },
    { key: 'expert', label: 'Expert' }
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
        // Bug fix 1: the popup's chosen level must win over the stored default.
        // Apply it AFTER loadSettings' merge (which would otherwise overwrite it),
        // persist it, and let the next fetch (which reads settings.level) use it.
        if (msg.level) {
          settings.level = msg.level;
          currentLevel = msg.level;
          saveSettings();
        }
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
      bg: '#0d1b3e', bodyBg: '#0d1b3e', footerBg: '#0a1530',
      text: 'rgba(245,236,215,0.92)', subtext: '#a9b4c9', label: '#d8c9a8',
      border: '#1e2f52', inputBg: '#152444', inputBorder: '#2a3d63',
      inputText: '#f5ecd7', answerBg: '#152444', selectBg: '#152444',
      settingsBg: '#0a1530', settingsItemBg: '#152444', settingsItemBorder: '#22345a',
      statusBg: '#081025', statusText: '#7f8ca6', statusDot: '#2a3d63',
      sourceBg: '#132140'
    };
    const light = {
      bg: '#f5ecd7', bodyBg: '#f5ecd7', footerBg: '#efe4c9',
      text: '#0d1b3e', subtext: '#3f4a63', label: '#5a5340',
      border: '#e0d3b3', inputBg: '#efe4c9', inputBorder: '#d8c9a8',
      inputText: '#0d1b3e', answerBg: '#efe4c9', selectBg: '#efe4c9',
      settingsBg: '#f0e7cf', settingsItemBg: '#efe4c9', settingsItemBorder: '#e0d3b3',
      statusBg: '#efe4c9', statusText: '#5a5340', statusDot: '#d8c9a8',
      sourceBg: '#f0e7cf'
    };
    return settings.theme === 'light' ? light : dark;
  }

  // Section headers + teams title are theme-aware for contrast: brand orange headers /
  // gold title on the DARK navy card; navy on the LIGHT cream card (strong on both).
  // #e87722 (bright brand orange) chosen over the deeper #d9661f — on the very dark navy
  // #0d1b3e the brighter orange has higher contrast and reads crisper for small bold caps.
  function sectionHeaderColor() { return settings.theme === 'light' ? '#0d1b3e' : '#e87722'; }
  function teamsTitleColor() { return settings.theme === 'light' ? '#0d1b3e' : '#facc15'; }

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
    // Font-size scales the WHOLE card: set the base on the root; children use em.
    overlayEl.style.fontSize = fontSize;
    const header = document.getElementById('se-header');
    if (header) header.style.background = '#0d1b3e'; // brand navy bar (logo reads on it)
    const teamsEl = document.getElementById('se-teams');
    if (teamsEl) teamsEl.style.color = teamsTitleColor();
    const expEl = document.getElementById('se-explanation');
    if (expEl) { expEl.style.color = t.text; }
    const whyEl = document.getElementById('se-why');
    if (whyEl) { whyEl.style.color = t.subtext; whyEl.style.borderTopColor = t.border; }
    const ruleEl = document.getElementById('se-rule');
    if (ruleEl) { ruleEl.style.color = t.subtext; ruleEl.style.borderTopColor = t.border; }
    overlayEl.querySelectorAll('.se-section-h').forEach(el => { el.style.color = sectionHeaderColor(); });
    const scSection = document.getElementById('se-scorecard-section');
    if (scSection) scSection.style.borderBottomColor = t.border;
    if (currentGames.length) renderScorecards(); // rebuild cards with the new theme tokens
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
    // Settings panel + its controls (so a live theme toggle re-themes them too).
    const settingsPanel = document.getElementById('se-settings-panel');
    if (settingsPanel) settingsPanel.style.background = t.settingsBg;
    ['se-lang-select', 'se-theme-select', 'se-fontsize-select'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.background = t.selectBg; el.style.color = t.inputText; el.style.borderColor = t.inputBorder; }
    });
    const settingsLinks = document.getElementById('se-settings-links');
    if (settingsLinks) settingsLinks.style.borderTopColor = t.settingsItemBorder;
    overlayEl.querySelectorAll('.se-ext-link').forEach(el => { el.style.color = t.subtext; });
    // Selector panel (floating sibling) — re-theme its shell + controls when present.
    if (selectorPanelEl) {
      selectorPanelEl.style.background = t.settingsBg;
      selectorPanelEl.style.color = t.text;
      selectorPanelEl.style.borderColor = settings.accentColor;
      ['se-sel-sport', 'se-sel-game'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.background = t.selectBg; el.style.color = t.inputText; el.style.borderColor = t.inputBorder; }
      });
      refreshSelectorPills();
    }
  }

  // ─────────────────────────────────────────
  // SHOW OVERLAY
  // ─────────────────────────────────────────
  function showOverlay() {
    if (overlayVisible && overlayEl) return;
    overlayVisible = true;
    isMinimized = false;
    sourceVisible = false;
    idlePaused = false;
    lastInteraction = Date.now(); // opening the overlay starts a fresh idle window

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
      font-size: ${fontSize} !important;
      border: 1px solid rgba(128,128,128,0.2) !important; resize: both !important; overflow: auto !important;
    `;

    overlayEl.innerHTML = `
      <div id="se-header" style="display:flex!important;justify-content:space-between!important;align-items:center!important;background:#0d1b3e!important;padding:9px 12px!important;cursor:grab!important;user-select:none!important;border-radius:10px 10px 0 0!important;position:sticky!important;top:0!important;z-index:10!important;">
        <div style="display:flex!important;align-items:center!important;gap:7px!important;min-width:0!important;">
          ${SPORTSWISE_LOGO_SVG ? `<span id="se-logo" style="display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;line-height:0!important;">${SPORTSWISE_LOGO_SVG}</span>` : ''}
          <span style="font-weight:800!important;font-size:13px!important;color:#f5ecd7!important;white-space:nowrap!important;">Sports Explainer</span>
        </div>
        <div style="display:flex!important;gap:6px!important;">
          <button id="se-selector-btn" title="Change sport / game / level" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">🎯</button>
          <button id="se-settings-btn" title="Settings" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">⚙️</button>
          <button id="se-minimize" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;font-weight:700!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">−</button>
          <button id="se-close" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;font-weight:700!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">✕</button>
        </div>
      </div>

      <div id="se-settings-panel" style="display:none!important;padding:12px!important;background:${t.settingsBg}!important;overflow-y:auto!important;">
        <div style="font-size:11px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;margin-bottom:10px!important;">⚙️ Settings</div>

        <div style="margin-bottom:10px!important;">
          <label style="display:block!important;font-size:10px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;letter-spacing:0.5px!important;margin-bottom:4px!important;">Language</label>
          <select id="se-lang-select" style="width:100%!important;padding:6px 8px!important;background:${t.selectBg}!important;color:${t.inputText}!important;border:1px solid ${t.inputBorder}!important;border-radius:6px!important;font-size:12px!important;cursor:pointer!important;">
            ${LANGUAGES.map(l => `<option value="${l.code}"${settings.language === l.code ? ' selected' : ''}>${l.label}</option>`).join('')}
          </select>
        </div>

        <div style="margin-bottom:10px!important;">
          <label style="display:block!important;font-size:10px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;letter-spacing:0.5px!important;margin-bottom:4px!important;">Theme</label>
          <select id="se-theme-select" style="width:100%!important;padding:6px 8px!important;background:${t.selectBg}!important;color:${t.inputText}!important;border:1px solid ${t.inputBorder}!important;border-radius:6px!important;font-size:12px!important;cursor:pointer!important;">
            <option value="dark"${settings.theme === 'dark' ? ' selected' : ''}>🌙 Dark</option>
            <option value="light"${settings.theme === 'light' ? ' selected' : ''}>☀️ Light</option>
          </select>
        </div>

        <div style="margin-bottom:10px!important;">
          <label style="display:block!important;font-size:10px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;letter-spacing:0.5px!important;margin-bottom:4px!important;">Font Size</label>
          <select id="se-fontsize-select" style="width:100%!important;padding:6px 8px!important;background:${t.selectBg}!important;color:${t.inputText}!important;border:1px solid ${t.inputBorder}!important;border-radius:6px!important;font-size:12px!important;cursor:pointer!important;">
            <option value="small"${settings.fontSize === 'small' ? ' selected' : ''}>Small</option>
            <option value="medium"${settings.fontSize === 'medium' ? ' selected' : ''}>Medium</option>
            <option value="large"${settings.fontSize === 'large' ? ' selected' : ''}>Large</option>
            <option value="xlarge"${settings.fontSize === 'xlarge' ? ' selected' : ''}>Extra Large</option>
          </select>
        </div>

        <div id="se-settings-links" style="border-top:1px solid ${t.settingsItemBorder}!important;margin-top:10px!important;padding-top:10px!important;margin-bottom:12px!important;display:flex!important;flex-direction:column!important;gap:7px!important;">
          <button class="se-ext-link" data-url="https://explainer-privacy.sportswise.app" style="background:none!important;border:none!important;padding:0!important;text-align:left!important;font-size:11px!important;color:${t.subtext}!important;cursor:pointer!important;text-decoration:underline!important;">Privacy Policy</button>
          <button class="se-ext-link" data-url="https://explainer-terms.sportswise.app" style="background:none!important;border:none!important;padding:0!important;text-align:left!important;font-size:11px!important;color:${t.subtext}!important;cursor:pointer!important;text-decoration:underline!important;">Terms &amp; Conditions</button>
          <button class="se-ext-link" data-url="https://apps.apple.com/app/id6781028656" style="background:none!important;border:none!important;padding:0!important;text-align:left!important;font-size:11px!important;color:${t.subtext}!important;cursor:pointer!important;text-decoration:underline!important;">Also on iOS ↗</button>
        </div>

        <button id="se-settings-done" style="width:100%!important;padding:8px!important;background:${settings.accentColor}!important;color:white!important;border:none!important;border-radius:8px!important;font-size:13px!important;font-weight:700!important;cursor:pointer!important;">✓ Done</button>
      </div>

      <div id="se-body">
        <div id="se-scorecard-section" style="padding:8px 10px 6px!important;border-bottom:1px solid ${t.border}!important;">
          <div id="se-scorecard-note" style="display:none!important;font-size:0.68em!important;color:${t.subtext}!important;margin-bottom:5px!important;"></div>
          <div id="se-scorecard-rail" style="display:flex!important;gap:7px!important;overflow-x:auto!important;padding-bottom:3px!important;">
            <div style="font-size:0.72em!important;color:${t.subtext}!important;padding:6px 2px!important;">Loading games…</div>
          </div>
          <div id="se-scorecard-channel" style="display:none!important;font-size:0.7em!important;color:${t.subtext}!important;margin-top:5px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;"></div>
        </div>

        <div style="padding: 10px 12px 6px !important;">
          <div id="se-teams" style="font-size:0.85em!important;color:${teamsTitleColor()}!important;font-weight:600!important;margin-bottom:7px!important;text-transform:uppercase!important;">Loading game...</div>

          <div id="se-h-what" class="se-section-h" style="font-size:0.68em!important;font-weight:700!important;color:${sectionHeaderColor()}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin:0 0 3px!important;">What Happened</div>
          <p id="se-explanation" style="font-size:1em!important;line-height:1.5!important;margin:0 0 8px!important;color:${t.text}!important;">Fetching latest play...</p>

          <div id="se-h-why" class="se-section-h" style="display:none!important;font-size:0.68em!important;font-weight:700!important;color:${sectionHeaderColor()}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin:0 0 3px!important;">Why It Matters</div>
          <div id="se-why" style="display:none!important;font-size:0.85em!important;color:${t.subtext}!important;margin-bottom:8px!important;line-height:1.4!important;"></div>

          <div id="se-h-rule" class="se-section-h" style="display:none!important;font-size:0.68em!important;font-weight:700!important;color:${sectionHeaderColor()}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin:0 0 3px!important;">The Rule</div>
          <div id="se-rule" style="display:none!important;font-size:0.85em!important;color:${t.subtext}!important;margin-bottom:8px!important;line-height:1.4!important;"></div>

          <div id="se-source-container" style="margin-bottom:4px!important;">
            <button id="se-source-toggle" style="background:none!important;border:none!important;padding:0!important;font-size:0.77em!important;font-weight:600!important;color:${settings.accentColor}!important;cursor:pointer!important;text-decoration:underline!important;">Show Source Play</button>
            <div id="se-source-box" style="display:none!important;margin-top:5px!important;padding:8px!important;background:${t.sourceBg}!important;border-radius:6px!important;font-size:0.85em!important;font-style:italic!important;line-height:1.4!important;color:${t.subtext}!important;"></div>
          </div>
        </div>

        <div id="se-ask-section" style="padding:8px 12px 10px!important;border-top:1px solid ${t.border}!important;background:${t.footerBg}!important;">
          <div style="display:flex!important;gap:6px!important;">
            <input id="se-question-input" type="text" placeholder="Ask anything..." style="flex:1!important;padding:6px 10px!important;background:${t.inputBg}!important;color:${t.inputText}!important;border:1px solid ${t.inputBorder}!important;border-radius:6px!important;font-size:0.92em!important;outline:none!important;"/>
            <button id="se-ask-btn" style="padding:6px 12px!important;background:${settings.accentColor}!important;color:white!important;border:none!important;border-radius:6px!important;font-size:0.92em!important;font-weight:700!important;cursor:pointer!important;">Ask</button>
          </div>
          <div id="se-answer-box" style="display:none!important;margin-top:7px!important;padding:8px 10px!important;background:${t.answerBg}!important;border-radius:6px!important;border-left:3px solid ${settings.accentColor}!important;font-size:0.92em!important;line-height:1.5!important;color:${t.text}!important;"></div>
        </div>

        <div id="se-status-bar" style="display:flex!important;align-items:center!important;justify-content:space-between!important;padding:5px 12px!important;background:${t.statusBg}!important;border-top:1px solid ${t.border}!important;border-radius:0 0 10px 10px!important;gap:6px!important;">
          <div style="display:flex!important;align-items:center!important;gap:8px!important;">
            <span id="se-status-spinner" style="display:none!important;width:8px!important;height:8px!important;border:2px solid ${t.statusDot}!important;border-top-color:${settings.accentColor}!important;border-radius:50%!important;animation:se-spin 0.7s linear infinite!important;"></span>
            <span id="se-status-timestamp" style="font-size:0.69em!important;color:${t.statusText}!important;">—</span>
            <button id="se-manual-refresh" title="Refresh Now" style="background:none!important;border:none!important;padding:0!important;cursor:pointer!important;font-size:0.92em!important;color:${t.statusText}!important;line-height:1!important;">↻</button>
          </div>
          <span id="se-status-source" style="font-size:0.69em!important;color:#555!important;"></span>
        </div>
      </div>
      <style>@keyframes se-spin { to { transform: rotate(360deg); } }</style>
    `;

    document.body.appendChild(overlayEl);

    document.addEventListener('visibilitychange', () => {
      lastInteraction = Date.now(); // a visibility change counts as activity (resets the idle window)
      if (document.visibilityState === 'hidden') {
        // Trigger 1: tab/window hidden → pause polling (no /api/explain until visible again).
        if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      } else if (overlayVisible) {
        resumeFromPause(); // back in view → one immediate fetch, then restart the cadence
      }
    });

    setTimeout(() => {
      document.getElementById('se-close').addEventListener('click', hideOverlay);
      document.getElementById('se-manual-refresh').addEventListener('click', () => {
        const wasIdle = idlePaused;
        markActivity();                   // counts as activity; if idle-paused this resumes (fetch + restart)
        if (!wasIdle) fetchLatestPlay();  // otherwise it's just a normal manual refresh
      });
      
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
          resumeFromPause();  // un-minimized → one immediate fetch + restart cadence
        } else {
          body.style.display = 'none';
          overlayEl.style.height = 'auto';
          minBtn.textContent = '+';
          isMinimized = true;
          if (pollInterval) { clearInterval(pollInterval); pollInterval = null; } // pause while minimized
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

      // ── Settings controls (wired to existing settings/applyTheme plumbing) ──
      document.getElementById('se-lang-select').addEventListener('change', (e) => {
        settings.language = e.target.value;
        saveSettings();
        fetchLatestPlay(); // re-fetch so the next explanation uses the new language
      });

      document.getElementById('se-theme-select').addEventListener('change', (e) => {
        settings.theme = e.target.value;
        saveSettings();
        applyTheme(); // live
      });

      document.getElementById('se-fontsize-select').addEventListener('change', (e) => {
        settings.fontSize = e.target.value;
        saveSettings();
        applyTheme(); // live — applyTheme sets FONT_SIZES base on the root; card scales via em
      });

      // External links MUST open a new tab (never navigate the host page, which
      // would close the game the user is watching). Own click handler + window.open
      // with noopener — no raw <a href> that could trip host-page CSP.
      overlayEl.querySelectorAll('.se-ext-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const url = link.getAttribute('data-url');
          if (url) window.open(url, '_blank', 'noopener');
        });
      });

      document.getElementById('se-ask-btn').addEventListener('click', handleAskQuestion);
      document.getElementById('se-question-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAskQuestion(); });

      // Load today's games → auto-select → THEN fetch the explanation (guarantees a valid gameId).
      loadGamesIntoOverlay().then(() => fetchLatestPlay());
      // Delegated click on the score-card rail → select that game (survives re-renders).
      document.getElementById('se-scorecard-rail').addEventListener('click', (e) => {
        const card = e.target.closest('.se-scorecard');
        if (card && card.dataset.id) selectGame(card.dataset.id);
      });

      // ── In-overlay selector panel (sport / game / difficulty) ──
      selectorPanelEl = buildSelectorPanel();
      document.body.appendChild(selectorPanelEl);

      document.getElementById('se-selector-btn').addEventListener('click', () => toggleSelector());
      selectorPanelEl.querySelector('#se-selector-close').addEventListener('click', () => toggleSelector(false));

      document.getElementById('se-sel-sport').addEventListener('change', (e) => {
        currentSport = e.target.value;   // KEY (nfl/mlb/…), same as popup
        currentGameId = null;            // force auto-select of the new sport's first live/today game
        loadGamesIntoOverlay().then(() => fetchLatestPlay()); // reload rail → auto-select → fetch
      });

      document.getElementById('se-sel-game').addEventListener('change', (e) => {
        if (e.target.value) selectGame(e.target.value);
      });

      selectorPanelEl.querySelectorAll('.se-sel-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          settings.level = pill.dataset.level;  // KEY (kid/beginner/intermediate/expert), never the label
          currentLevel = settings.level;
          saveSettings();
          refreshSelectorPills();
          fetchLatestPlay();                    // re-explain at the new difficulty
        });
      });

      window.addEventListener('resize', () => { if (selectorOpen) positionSelectorPanel(); });

      // Trigger 2: any interaction inside the overlay (click/tap/scroll/hover) marks activity and
      // wakes an idle pause. mousemove is high-frequency but markActivity is cheap (timestamp only).
      ['click', 'pointerdown', 'wheel', 'mousemove'].forEach(evt =>
        overlayEl.addEventListener(evt, markActivity, { passive: true }));

      makeDraggable(overlayEl);
      // (Initial explanation fetch is chained off loadGamesIntoOverlay above, once a game is selected.)
      restartPollInterval();
    }, 50);
  }

  // ─────────────────────────────────────────
  // SMART POLLING LOGIC
  // ─────────────────────────────────────────
  function restartPollInterval() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

    // Don't poll if tab is hidden, overlay is gone, minimized, or idle-paused.
    if (document.hidden || !overlayVisible || isMinimized || idlePaused) return;

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
      pollInterval = setInterval(pollTick, intervalMs);
    }
  }

  // Each poll tick: if the overlay has gone untouched past IDLE_TIMEOUT_MS, pause instead of
  // fetching (saves /api/explain tokens). Otherwise do the normal fetch.
  function pollTick() {
    if (Date.now() - lastInteraction >= IDLE_TIMEOUT_MS) { pauseForIdle(); return; }
    fetchLatestPlay();
  }

  // Trigger 2 pause: stop the timer and show an unobtrusive paused state in the status line.
  function pauseForIdle() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    idlePaused = true;
    const spinner = document.getElementById('se-status-spinner');
    if (spinner) spinner.style.display = 'none';
    const source = document.getElementById('se-status-source');
    if (source) { source.textContent = '⏸ Paused — click to resume'; source.style.color = getThemeColors().subtext; }
  }

  // Shared resume for ALL three triggers: one immediate fetch, then restart the cadence.
  // No-ops the fetch while still hidden/minimized (that trigger will resume later).
  function resumeFromPause() {
    idlePaused = false;
    lastInteraction = Date.now();
    if (document.hidden || !overlayVisible || isMinimized) return;
    fetchLatestPlay();      // ONE immediate fetch on resume
    restartPollInterval();  // then the normal gameContext-derived cadence
  }

  // Record overlay activity; wake an idle pause. Cheap enough to run on every mousemove.
  function markActivity() {
    lastInteraction = Date.now();
    if (idlePaused) resumeFromPause();
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

  // Live-first ordering for the rail + selector: in-progress, then scheduled, then final.
  const GAME_ORDER = { in: 0, pre: 1, post: 2 };
  function sortedGames() {
    return currentGames.slice().sort((a, b) =>
      (GAME_ORDER[a.state] ?? 3) - (GAME_ORDER[b.state] ?? 3));
  }

  // Is this ESPN event date (ISO) today, in the viewer's local time? Bad/absent date → false.
  function isTodayLocal(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  // Only today's slate belongs on the rail: any LIVE game (defensive vs. TZ-boundary rolls) plus
  // today's scheduled/finals. ESPN returns the full future schedule (Sept games in July) — drop it.
  function todaysGames(games) {
    return games.filter(g => g.state === 'in' || isTodayLocal(g.date));
  }

  // Load this sport's games, filter to today, render the rail + selector dropdown, and AUTO-SELECT
  // a game (first live, else first) whenever the current selection isn't a valid today-game — so an
  // explanation always loads. Does NOT fetch itself; the caller chains fetchLatestPlay() when a
  // fresh explanation is wanted (initial load / sport change), NOT on a mere selector-open refresh.
  async function loadGamesIntoOverlay() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'fetchGames', sport: currentSport });
      currentGames = todaysGames(response?.games || []);
    } catch (err) {
      console.error('Load games error:', err);
      currentGames = [];
    }
    // Auto-select so the fetch has a real, current gameId (BUG 1: the rail is now the selector).
    const valid = currentGameId && currentGames.some(g => g.id === currentGameId);
    if (!valid && currentGames.length) currentGameId = sortedGames()[0].id;

    renderScorecards();
    // Selector panel's game dropdown (still present) — fill from the same data.
    const sel = document.getElementById('se-sel-game');
    if (sel) {
      sel.innerHTML = '';
      if (!currentGames.length) { sel.innerHTML = '<option value="">No games today</option>'; }
      else sortedGames().forEach(game => {
        const option = document.createElement('option');
        option.value = game.id;
        option.textContent = `${game.away} @ ${game.home} ${game.state === 'in' ? '🔴 LIVE' : ''}`;
        if (game.id === currentGameId) option.selected = true;
        sel.appendChild(option);
      });
    }
  }

  // Render the horizontal score-card rail (live games first). Each card carries data-id;
  // a delegated click on the rail drives selectGame(). Re-rendered on theme change.
  function renderScorecards() {
    const rail = document.getElementById('se-scorecard-rail');
    const note = document.getElementById('se-scorecard-note');
    if (!rail) return;
    const t = getThemeColors();
    const games = sortedGames();

    if (!games.length) {
      rail.innerHTML = `<div style="font-size:0.72em!important;color:${t.subtext}!important;padding:6px 2px!important;">No games today</div>`;
      if (note) note.style.display = 'none';
      const ch = document.getElementById('se-scorecard-channel');
      if (ch) ch.style.display = 'none';
      return;
    }

    // No live games → still show the slate with a small note (fixes the "no games" emptiness).
    if (note) {
      const anyLive = games.some(g => g.state === 'in');
      if (anyLive) { note.style.display = 'none'; }
      else { note.textContent = "No live games — today's slate:"; note.style.display = 'block'; }
    }

    const teamRow = (logo, abbrev, score) => `
      <div style="display:flex!important;align-items:center!important;gap:5px!important;margin-top:2px!important;">
        ${logo ? `<img src="${logo}" width="18" height="18" style="flex:0 0 auto!important;object-fit:contain!important;" referrerpolicy="no-referrer"/>` : `<span style="width:18px!important;display:inline-block!important;"></span>`}
        <span style="font-size:0.74em!important;font-weight:700!important;color:${t.text}!important;">${abbrev || '?'}</span>
        <span style="margin-left:auto!important;font-size:0.82em!important;font-weight:800!important;color:${t.text}!important;">${score || ''}</span>
      </div>`;

    rail.innerHTML = games.map(g => {
      const selected = g.id === currentGameId;
      const isLive = g.state === 'in';
      const label = g.statusLabel || (g.state === 'post' ? 'Final' : g.state === 'pre' ? 'Scheduled' : '');
      return `<div class="se-scorecard" data-id="${g.id}" style="flex:0 0 auto!important;width:126px!important;box-sizing:border-box!important;border:1px solid ${selected ? settings.accentColor : t.inputBorder}!important;border-radius:8px!important;padding:6px 8px!important;background:${t.selectBg}!important;cursor:pointer!important;">
        <div style="display:flex!important;align-items:center!important;gap:4px!important;margin-bottom:3px!important;">
          ${isLive ? `<span style="width:6px!important;height:6px!important;border-radius:50%!important;background:${settings.accentColor}!important;flex:0 0 auto!important;"></span>` : ''}
          <span style="font-size:0.62em!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:0.04em!important;color:${isLive ? settings.accentColor : t.subtext}!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;">${label}</span>
        </div>
        ${teamRow(g.awayLogo, g.awayAbbrev, g.awayScore)}
        ${teamRow(g.homeLogo, g.homeAbbrev, g.homeScore)}
      </div>`;
    }).join('');

    updateChannelLine();
  }

  // Channel line under the rail reflects the SELECTED game's broadcasts; hidden when none.
  function updateChannelLine() {
    const ch = document.getElementById('se-scorecard-channel');
    if (!ch) return;
    const g = currentGames.find(x => x.id === currentGameId);
    if (g && g.broadcasts) { ch.textContent = `📺 ${g.broadcasts}`; ch.style.display = 'block'; }
    else { ch.style.display = 'none'; }
  }

  // Re-tint card borders to reflect the current selection (cheaper than a full re-render).
  function highlightSelectedCard() {
    const rail = document.getElementById('se-scorecard-rail');
    if (!rail) return;
    const t = getThemeColors();
    rail.querySelectorAll('.se-scorecard').forEach(card => {
      card.style.borderColor = card.getAttribute('data-id') === currentGameId ? settings.accentColor : t.inputBorder;
    });
    updateChannelLine();
  }

  // ─────────────────────────────────────────
  // IN-OVERLAY SELECTOR PANEL (sport / game / difficulty)
  // Floating sibling of the settings panel; attaches to the card edge with
  // smart left/right side-detection so it never runs off-screen.
  // ─────────────────────────────────────────
  function buildSelectorPanel() {
    const t = getThemeColors();
    const panel = document.createElement('div');
    panel.id = 'se-selector-panel';
    panel.style.cssText = `
      position: fixed !important; display: none !important; top: 0 !important; left: 0 !important;
      width: 240px !important; max-height: 80vh !important; overflow-y: auto !important;
      z-index: 2147483647 !important; background: ${t.settingsBg} !important; color: ${t.text} !important;
      border: 1px solid ${settings.accentColor} !important; border-radius: 10px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important; font-family: system-ui, sans-serif !important;
      font-size: 13px !important; padding: 12px !important;
    `;
    const labelStyle = `display:block!important;font-size:10px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;letter-spacing:0.5px!important;margin-bottom:4px!important;`;
    const selectStyle = `width:100%!important;padding:6px 8px!important;background:${t.selectBg}!important;color:${t.inputText}!important;border:1px solid ${t.inputBorder}!important;border-radius:6px!important;font-size:12px!important;cursor:pointer!important;`;
    const pillStyle = (active) => `flex:1!important;padding:6px 4px!important;border-radius:6px!important;border:1px solid ${active ? settings.accentColor : t.inputBorder}!important;background:${active ? settings.accentColor : t.selectBg}!important;color:${active ? 'white' : t.subtext}!important;font-size:10px!important;font-weight:600!important;cursor:pointer!important;text-align:center!important;`;

    panel.innerHTML = `
      <div style="display:flex!important;justify-content:space-between!important;align-items:center!important;margin-bottom:10px!important;">
        <span style="font-size:11px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;">🎯 Change</span>
        <button id="se-selector-close" style="background:none!important;border:none!important;color:${t.subtext}!important;cursor:pointer!important;font-size:14px!important;font-weight:700!important;line-height:1!important;">✕</button>
      </div>

      <div style="margin-bottom:10px!important;">
        <label style="${labelStyle}">Sport</label>
        <select id="se-sel-sport" style="${selectStyle}">
          ${SPORTS.map(s => `<option value="${s.key}"${currentSport === s.key ? ' selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>

      <div style="margin-bottom:10px!important;">
        <label style="${labelStyle}">Game</label>
        <select id="se-sel-game" style="${selectStyle}">
          <option value="">Loading games...</option>
        </select>
      </div>

      <div style="margin-bottom:2px!important;">
        <label style="${labelStyle}">Difficulty</label>
        <div id="se-sel-levels" style="display:flex!important;gap:5px!important;">
          ${LEVELS.map(l => `<div class="se-sel-pill" data-level="${l.key}" style="${pillStyle(settings.level === l.key)}">${l.label}</div>`).join('')}
        </div>
      </div>
    `;
    return panel;
  }

  // Re-tint the difficulty pills to reflect the current settings.level (the KEY).
  function refreshSelectorPills() {
    if (!selectorPanelEl) return;
    const t = getThemeColors();
    selectorPanelEl.querySelectorAll('.se-sel-pill').forEach(pill => {
      const active = pill.dataset.level === settings.level;
      pill.style.background = active ? settings.accentColor : t.selectBg;
      pill.style.color = active ? 'white' : t.subtext;
      pill.style.borderColor = active ? settings.accentColor : t.inputBorder;
    });
  }

  // Smart side-detection: open on whichever side of the card has full room for the
  // 240px panel; if neither does, use the side with more space (clamped on-screen).
  function positionSelectorPanel() {
    if (!overlayEl || !selectorPanelEl) return;
    const rect = overlayEl.getBoundingClientRect();
    const pw = 240, gap = 8;
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    let left;
    if (spaceRight >= pw + gap) left = rect.right + gap;
    else if (spaceLeft >= pw + gap) left = rect.left - gap - pw;
    else left = spaceRight >= spaceLeft ? (window.innerWidth - pw - gap) : gap;
    const ph = selectorPanelEl.offsetHeight || 280;
    const top = Math.max(8, Math.min(rect.top, window.innerHeight - ph - 8));
    selectorPanelEl.style.left = Math.max(8, left) + 'px';
    selectorPanelEl.style.top = top + 'px';
  }

  function toggleSelector(open) {
    if (!selectorPanelEl) return;
    selectorOpen = (open === undefined) ? !selectorOpen : open;
    if (selectorOpen) {
      selectorPanelEl.style.display = 'block';
      positionSelectorPanel();
      // Populate the selector's game list on first open (or if empty).
      const g = document.getElementById('se-sel-game');
      if (g && g.querySelectorAll('option').length <= 1) loadGamesIntoOverlay();
    } else {
      selectorPanelEl.style.display = 'none';
    }
  }

  // Set the current game from a score card or the selector dropdown, keep the rail +
  // selector dropdown in sync, and re-fetch the explanation.
  function selectGame(id) {
    currentGameId = id || null;
    const s = document.getElementById('se-sel-game'); if (s) s.value = currentGameId || '';
    highlightSelectedCard();
    fetchLatestPlay();
  }

  function hideOverlay() {
    overlayVisible = false;
    if (overlayEl) overlayEl.remove();
    overlayEl = null;
    if (selectorPanelEl) { selectorPanelEl.remove(); selectorPanelEl = null; }
    selectorOpen = false;
    if (pollInterval) clearInterval(pollInterval);
    if (lastUpdatedTimer) clearInterval(lastUpdatedTimer);
  }

  async function fetchLatestPlay() {
    if (!chrome.runtime?.id) return;
    const expEl = document.getElementById('se-explanation');
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
        if (teamEl && response.homeTeam) teamEl.textContent = `${response.awayTeam} @ ${response.homeTeam}`;

        // Bug fix 2: keep the on-screen play as Ask context (was always empty).
        currentPlayText = [response.playType, response.simple].filter(Boolean).join(' — ');

        // Raw play text lives ONLY in the Show Source Play box now (no redundant top sub-label).
        if (sourceBox) sourceBox.textContent = response.playType || 'No source play available.';

        // WHY IT MATTERS — header + body toggle together; never a labeled empty section.
        const whyHeader = document.getElementById('se-h-why');
        if (whyEl && response.whyItMatters) {
          whyEl.textContent = response.whyItMatters;
          whyEl.style.display = 'block';
          if (whyHeader) whyHeader.style.display = 'block';
        } else {
          if (whyEl) whyEl.style.display = 'none';
          if (whyHeader) whyHeader.style.display = 'none';
        }

        // THE RULE — header + body only when showRule is true AND ruleDetail is non-empty.
        const ruleHeader = document.getElementById('se-h-rule');
        if (ruleEl && response.showRule === true && response.ruleDetail) {
          ruleEl.textContent = response.ruleDetail;
          ruleEl.style.display = 'block';
          if (ruleHeader) ruleHeader.style.display = 'block';
        } else {
          if (ruleEl) ruleEl.style.display = 'none';
          if (ruleHeader) ruleHeader.style.display = 'none';
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
      if (['se-close','se-minimize','se-settings-btn','se-selector-btn'].includes(e.target.id)) return;
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