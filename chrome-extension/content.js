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
  let answerGameId = null; // which game the Ask/chip answer belongs to (clear on game change)
  let currentPlays = [];       // play-by-play list for the selected game (Tier D)
  let pbpExpanded = false;     // is the Play-by-Play section expanded
  let selectedPlayText = null; // a manually-tapped play's text — pauses polling until "back to live"
  let openGlossaryTerm = null;  // which glossary term's definition box is open (Tier E)
  let lastRenderedSimple = null; // last explanation text rendered (skip re-segmenting identical polls)

  // ── Entitlement + free-tier caps (mirrors the iOS app: lib/entitlement.tsx + lib/caps.ts) ──
  // sePro is the ONE boolean every gate consults. Kept current by refreshProState() and by the
  // Account flows (sign-in / sign-out). Trials count as Pro, exactly as on iOS.
  let sePro = false;
  // The signed-in email, mirrored from storage (background writes seAuth = { email, session }).
  // Cached so openUpgrade() can show the "sign in first" nudge instantly without an async hop.
  // Background re-checks the email authoritatively before opening the purchase tab.
  let seAuthEmail = null;
  // True while a purchase tab is open, so the focus handler knows to force-recheck on return.
  let sePurchasePending = false;
  // Persisted cap counters (raw, isPro-agnostic — the decision lives in caps.js, never here).
  let seDailyCap = { date: '', count: 0, keys: [] };  // seeded from SE_CAPS.EMPTY_DAILY on load
  let seGameQA = { gameId: '', count: 0 };            // seeded from SE_CAPS.EMPTY_GAME on load
  // NOTE: these client counters are COSMETIC — they drive the experience (the "N left" pill, the
  // upsell), not security. They're trivially bypassable by editing chrome.storage.local. Real
  // enforcement is a later server-side phase; don't ship to paying users until it exists.

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

  // CHANGE-panel width. Used by BOTH the panel's own CSS and positionSelectorPanel's placement
  // math — they must agree, so it lives in one place. 320 (was 240) leaves real headroom for the
  // four difficulty pills on one row: at 300 they total ~277px against ~276px usable, which would
  // have wrapped "Expert" to a second line.
  const SELECTOR_PANEL_W = 320;

  const LEVELS = [
    { key: 'kid', label: 'Rookie' },
    { key: 'beginner', label: 'Beginner' },
    { key: 'intermediate', label: 'Intermediate' },
    { key: 'expert', label: 'Expert' }
  ];

  // Sports whose ESPN feed exposes a plays[] list (Tier D). Others hide the Play-by-Play section.
  const PLAYS_SPORTS = ['nfl', 'mlb', 'nba', 'nhl'];

  // "Ask a follow-up" quick-question chips (play-specific — hidden in recap mode). Each sends
  // its canned prompt through the SAME ask path a typed question uses.
  const CHIPS = [
    { label: '🤔 Why it mattered', q: 'Why did that play matter?' },
    { label: '📜 Explain the rule', q: 'Explain the rule behind what just happened.' },
    { label: '🧒 Explain simply', q: 'Explain what just happened in the simplest possible terms.' },
    { label: "👀 What's next?", q: "What's likely to happen next in this game?" }
  ];

  // ─────────────────────────────────────────
  // LOAD SETTINGS
  // ─────────────────────────────────────────
  function loadSettings(callback) {
    // One get for settings + the two cap counters + the entitlement cache (written by
    // background.js). Reading the cache here means sePro is already right on the FIRST fetch —
    // refreshProState() then revalidates it against the server in the background.
    chrome.storage.local.get(['seSettings', 'seDailyCap', 'seGameQA', 'seEntitlement', 'seAuth'], (data) => {
      if (data.seSettings) {
        settings = { ...settings, ...data.seSettings };
        currentLevel = settings.level;
      }
      // accentColor is NOT user-facing (no accent picker) — it only landed in storage accidentally.
      // Force the brand orange AFTER the merge so a pre-brand-pass stored red ('#cc0000') can't win.
      // Self-heals every accent element; re-persists as orange on the next saveSettings.
      settings.accentColor = '#e87722';

      const CAPS = window.SE_CAPS;
      seDailyCap = data.seDailyCap || (CAPS ? { ...CAPS.EMPTY_DAILY } : { date: '', count: 0, keys: [] });
      seGameQA = data.seGameQA || (CAPS ? { ...CAPS.EMPTY_GAME } : { gameId: '', count: 0 });
      // Startup: the overlay isn't up yet, so setPro's refresh is a no-op here (it guards on
      // overlayVisible). Routed through it anyway so there's exactly one writer.
      setPro(!!(data.seEntitlement && data.seEntitlement.isPro));
      seAuthEmail = (data.seAuth && data.seAuth.email) || null;

      refreshProState();   // revalidate entitlement (async; updates sePro + re-renders indicators)
      if (callback) callback();
    });
  }

  function saveSettings() {
    chrome.storage.local.set({ seSettings: settings });
  }

  // Cap-counter persistence — same fire-and-forget style as saveSettings.
  function saveDailyCap() { chrome.storage.local.set({ seDailyCap }); }
  function saveGameQA() { chrome.storage.local.set({ seGameQA }); }

  // Pull the current entitlement from background (15-min cached there; force=false). Safe to call
  // often. Not signed in → not Pro.
  function refreshProState() {
    if (!chrome.runtime?.id) return;
    chrome.runtime.sendMessage({ action: 'checkEntitlement' }, (ent) => {
      if (chrome.runtime.lastError) return;         // service worker asleep / no receiver — keep cache
      // Pro bought elsewhere (another tab / the popup) lands HERE. setPro re-fetches a stale
      // locked recap — which would otherwise never repair itself, since final games don't poll.
      setPro(!!(ent && ent.isPro));
      renderCapIndicators();                        // Pro → pills disappear immediately
    });
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

    // The popup's "Sign in" routes here rather than duplicating the email/code UI: show the
    // overlay (if hidden) and open it straight to the Account section. NOT a toggle — clicking
    // Sign in must never hide an overlay that's already up.
    if (msg.action === 'openAccount') {
      loadSettings(() => {
        if (!overlayVisible) showOverlay();
        // showOverlay attaches its listeners in a setTimeout(0); wait a tick so the settings
        // panel + account body are live before we open them.
        setTimeout(() => openAccountSettings(), 50);
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
      sourceBg: '#132140',
      // Teal = secondary/navigational accent (back-to-live, scoring dots). Balanced teal that
      // reads on both navy and cream. TODO: swap to the app's exact teal if Anthony provides it.
      teal: '#14b8a6'
    };
    const light = {
      bg: '#f5ecd7', bodyBg: '#f5ecd7', footerBg: '#efe4c9',
      text: '#0d1b3e', subtext: '#3f4a63', label: '#5a5340',
      border: '#e0d3b3', inputBg: '#efe4c9', inputBorder: '#d8c9a8',
      inputText: '#0d1b3e', answerBg: '#efe4c9', selectBg: '#efe4c9',
      settingsBg: '#f0e7cf', settingsItemBg: '#efe4c9', settingsItemBorder: '#e0d3b3',
      statusBg: '#efe4c9', statusText: '#5a5340', statusDot: '#d8c9a8',
      sourceBg: '#f0e7cf',
      // Teal = secondary/navigational accent (back-to-live, scoring dots). Same hex on both themes.
      // TODO: swap to the app's exact teal if Anthony provides it.
      teal: '#14b8a6'
    };
    return settings.theme === 'light' ? light : dark;
  }

  // ─────────────────────────────────────────
  // PRO-GATE VISUALS (shared by the daily-cap card, the ask-cap row, and the recap locked rows,
  // so "🔒 locked header = Pro content" is learned ONCE — mirrors the app's <LockedSection>).
  // Every rule carries !important: host-page-CSS defense, same as the rest of the overlay.
  // ─────────────────────────────────────────
  const AMBER = '#f0a500';   // scarcity pill — warning, not error (never red)

  // A locked Pro section: 🔒 title over greyed skeleton bars. No real content, no fetch.
  function lockedRowHtml(label) {
    const t = getThemeColors();
    const bar = (w) => `<div style="height:8px!important;width:${w}!important;background:${t.settingsItemBg}!important;border:1px solid ${t.settingsItemBorder}!important;border-radius:4px!important;margin-bottom:4px!important;"></div>`;
    return `<div style="margin:0 0 9px!important;">` +
      `<div class="se-section-h" style="font-size:0.68em!important;font-weight:700!important;color:${t.subtext}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin:0 0 4px!important;">🔒 ${label}</div>` +
      bar('92%') + bar('78%') +
    `</div>`;
  }

  // An unlocked (Pro) recap section — same eyebrow rhythm as the rest of the card. Built via DOM
  // with textContent (NEVER innerHTML of response text — same rule as renderExplanation).
  function proRowEl(label, text) {
    const t = getThemeColors();
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin:0 0 9px!important;';
    const h = document.createElement('div');
    h.className = 'se-section-h';
    h.style.cssText = `font-size:0.68em!important;font-weight:700!important;color:${sectionHeaderColor()}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin:0 0 3px!important;`;
    h.textContent = label;
    const body = document.createElement('div');
    body.style.cssText = `font-size:0.85em!important;line-height:1.4!important;color:${t.subtext}!important;`;
    body.textContent = text;
    wrap.appendChild(h); wrap.appendChild(body);
    return wrap;
  }

  // The one primary "go Pro" button style (accent-filled).
  function proBtnHtml(id, label) {
    return `<button id="${id}" style="width:100%!important;box-sizing:border-box!important;padding:8px!important;margin-top:4px!important;background:${settings.accentColor}!important;color:#fff!important;border:none!important;border-radius:6px!important;font-size:0.85em!important;font-weight:700!important;cursor:pointer!important;">${label}</button>`;
  }

  // ONE upgrade entry point for every Pro CTA (cap card, ask row, recap locked rows).
  // The purchase URL itself lives in background.js (single source of truth — the popup needs it
  // too). Background opens the tab, so there's no window.open/user-gesture dependency here.
  function openUpgrade() {
    markActivity();

    // Fast local check so the sign-in nudge is instant. Background re-checks authoritatively.
    if (!seAuthEmail) {
      showToast('Sign in first to unlock Pro.');
      openAccountSettings();
      return;
    }

    sePurchasePending = true;   // the focus handler re-checks entitlement when they come back
    chrome.runtime.sendMessage({ action: 'openUpgrade' }, (res) => {
      if (chrome.runtime.lastError) { sePurchasePending = false; return; }
      if (res && res.ok === false) {
        // Background found no stored email (e.g. session cleared in another tab) — don't leave
        // the pending flag set for a tab that never opened.
        sePurchasePending = false;
        seAuthEmail = null;
        showToast('Sign in first to unlock Pro.');
        openAccountSettings();
      }
    });
  }

  // Open the settings panel (where the Account / sign-in section lives). Mirrors the ⚙️ button's
  // own handler — no-op if the overlay isn't up.
  function openAccountSettings() {
    const panel = document.getElementById('se-settings-panel');
    const body = document.getElementById('se-body');
    if (!panel || !body || settingsOpen) return;
    settingsOpen = true;
    panel.style.display = 'block';
    body.style.display = 'none';
    refreshAccountState();
  }

  // ── THE ONE PLACE sePro CHANGES VALUE ────────────────────────────────────────────────────
  // Every entitlement path routes through here (startup cache, background refresh, sign-in,
  // purchase return, settings panel), so the false→true flip is detected ONCE and consistently.
  // Returns true only on a genuine gain — a user who was ALREADY Pro never triggers a re-fetch.
  function setPro(next) {
    const gained = !!next && !sePro;
    sePro = !!next;
    if (gained) refreshAfterProGained();
    return gained;
  }

  let seProRefreshInFlight = false;   // one re-fetch per transition; never a loop

  // Pro just arrived → whatever is on screen is stale and Pro-gated. Re-fetch it.
  // This matters MOST for the recap: a Final game is a ONE-SHOT fetch (the poll interval is
  // cleared for final games), so there is no next cycle to repair it — without this, the locked
  // TURNING POINT / KEY PERFORMANCE / WHY IT MATTERED rows would stay locked until the user
  // re-selected the game. The play view has the same problem with a stuck cap card.
  // fetchLatestPlay() already routes Final games to fetchRecapAndRender(), so this ONE call
  // covers both surfaces — and re-requests the recap with isPro:true, which is what makes the
  // backend send the three narrative fields at all.
  function refreshAfterProGained() {
    if (seProRefreshInFlight || !overlayVisible) return;
    seProRefreshInFlight = true;
    Promise.resolve(fetchLatestPlay())
      .catch(() => {})
      .finally(() => { seProRefreshInFlight = false; });
  }

  // Coming back from the checkout tab is the natural "they may have purchased" signal. Force a
  // fresh entitlement check (bypassing background's 15-min cache) so Pro unlocks immediately.
  window.addEventListener('focus', () => {
    if (!sePurchasePending) return;
    sePurchasePending = false;
    if (!chrome.runtime?.id) return;
    chrome.runtime.sendMessage({ action: 'checkEntitlement', force: true }, (ent) => {
      if (chrome.runtime.lastError) return;
      // setPro fires the re-fetch on a flip (cap card → real explanation, locked recap rows →
      // narrative fields). Don't ALSO call fetchLatestPlay here — that would double-fetch.
      const gained = setPro(!!(ent && ent.isPro));
      renderCapIndicators();                       // pills/limits disappear the moment Pro lands
      if (settingsOpen) refreshAccountState();     // flip the Free → Pro badge
      if (gained) showToast("You're Pro — unlimited unlocked.");
    });
  });

  // Minimal transient toast inside the overlay (sign-in nudge, purchase confirmation).
  function showToast(text) {
    if (!overlayEl) return;
    const t = getThemeColors();
    let el = document.getElementById('se-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'se-toast';
      el.style.cssText = `position:absolute!important;left:50%!important;bottom:14px!important;transform:translateX(-50%)!important;z-index:10!important;padding:7px 12px!important;border-radius:14px!important;background:${t.settingsBg}!important;color:${t.text}!important;border:1px solid ${t.border}!important;font-size:0.75em!important;font-weight:600!important;box-shadow:0 3px 12px rgba(0,0,0,0.28)!important;pointer-events:none!important;`;
      overlayEl.appendChild(el);
    }
    el.textContent = text;
    el.style.display = 'block';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { if (el) el.style.display = 'none'; }, 2600);
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
    // Glossary accent is brand orange in BOTH themes (guaranteed, not the possibly-stale settings.accentColor).
    overlayEl.querySelectorAll('.se-gloss-term').forEach(el => { el.style.color = '#e87722'; });
    const gBox = document.getElementById('se-glossary-box');
    if (gBox) { gBox.style.background = t.answerBg; gBox.style.borderLeftColor = '#e87722'; }
    const gTerm = document.getElementById('se-glossary-term');
    if (gTerm) gTerm.style.color = '#e87722';
    const gDef = document.getElementById('se-glossary-def');
    if (gDef) gDef.style.color = t.text;
    const gClose = document.getElementById('se-glossary-close');
    if (gClose) gClose.style.color = t.subtext;
    const whyEl = document.getElementById('se-why');
    if (whyEl) { whyEl.style.color = t.subtext; whyEl.style.borderTopColor = t.border; }
    const ruleEl = document.getElementById('se-rule');
    if (ruleEl) { ruleEl.style.color = t.subtext; ruleEl.style.borderTopColor = t.border; }
    overlayEl.querySelectorAll('.se-section-h').forEach(el => { el.style.color = sectionHeaderColor(); });
    const recapScore = document.getElementById('se-recap-score');
    if (recapScore) recapScore.style.color = t.text;
    const recapStory = document.getElementById('se-recap-story');
    if (recapStory) recapStory.style.color = t.text;
    const recapLink = document.getElementById('se-recap-link');
    if (recapLink) recapLink.style.color = settings.accentColor;
    const scSection = document.getElementById('se-scorecard-section');
    if (scSection) scSection.style.borderBottomColor = t.border;
    if (currentGames.length) renderScorecards(); // rebuild cards with the new theme tokens
    const askSection = document.getElementById('se-ask-section');
    if (askSection) { askSection.style.borderTopColor = t.border; askSection.style.background = t.footerBg; }
    const chipsLabel = document.getElementById('se-chips-label');
    if (chipsLabel) chipsLabel.style.color = t.label;
    overlayEl.querySelectorAll('.se-chip').forEach(chip => {
      chip.style.background = t.selectBg; chip.style.color = t.text; chip.style.borderColor = t.inputBorder;
    });
    const pbpSection = document.getElementById('se-pbp-section');
    if (pbpSection) pbpSection.style.borderTopColor = t.border;
    const pbpHint = document.getElementById('se-pbp-hint');
    if (pbpHint) pbpHint.style.color = t.subtext;
    const pbpChevron = document.getElementById('se-pbp-chevron');
    if (pbpChevron) pbpChevron.style.color = t.subtext;
    const backLive = document.getElementById('se-back-to-live');
    if (backLive) backLive.style.color = t.teal; // secondary/navigational = teal
    const pbpLegendDot = document.getElementById('se-pbp-legend-dot');
    if (pbpLegendDot) pbpLegendDot.style.color = t.teal;
    if (pbpExpanded && currentPlays.length) renderPlays(); // rebuild rows with new theme tokens (highlight + teal dot)
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
      overscroll-behavior: contain !important;
    `;

    overlayEl.innerHTML = `
      <div id="se-header" style="display:flex!important;justify-content:space-between!important;align-items:center!important;background:#0d1b3e!important;padding:9px 12px!important;cursor:grab!important;user-select:none!important;border-radius:10px 10px 0 0!important;position:sticky!important;top:0!important;z-index:10!important;">
        <div style="display:flex!important;align-items:center!important;gap:7px!important;min-width:0!important;">
          ${SPORTSWISE_LOGO_SVG ? `<span id="se-logo" style="display:inline-flex!important;align-items:center!important;flex:0 0 auto!important;line-height:0!important;">${SPORTSWISE_LOGO_SVG}</span>` : ''}
          <span style="font-weight:800!important;font-size:13px!important;color:#f5ecd7!important;white-space:nowrap!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;">Sports Explainer</span>
        </div>
        <div style="display:flex!important;gap:6px!important;flex:0 0 auto!important;">
          <button id="se-selector-btn" title="Change sport &amp; game" aria-label="Change sport and game" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">🔄</button>
          <button id="se-settings-btn" title="Settings" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">⚙️</button>
          <button id="se-minimize" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;font-weight:700!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">−</button>
          <button id="se-close" style="background:rgba(255,255,255,0.2)!important;border:none!important;color:white!important;cursor:pointer!important;font-size:14px!important;font-weight:700!important;padding:1px 8px!important;border-radius:4px!important;line-height:1.4!important;">✕</button>
        </div>
      </div>

      <div id="se-settings-panel" style="display:none!important;padding:12px!important;background:${t.settingsBg}!important;overflow-y:auto!important;">
        <div style="font-size:11px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;margin-bottom:10px!important;">⚙️ Settings</div>

        <!-- ACCOUNT — FIRST. This panel is where the sign-in ACTION lives (the main-screen strip
             only shows status), so it must be the first thing you see, not buried under Font Size. -->
        <div id="se-account-section" style="margin-bottom:12px!important;padding-bottom:10px!important;border-bottom:1px solid ${t.settingsItemBorder}!important;">
          <label style="display:block!important;font-size:10px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;letter-spacing:0.5px!important;margin-bottom:6px!important;">Account</label>
          <div id="se-account-body"><!-- rendered by renderAccount() --></div>
        </div>

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
        <!-- ACCOUNT STRIP — directly under the header, above the slate. One thin line; filled by
             renderAccountStrip(). Signed out leads with "start free" (an account is NOT required);
             signed-in Free gets the game-independent Upgrade CTA. -->
        <div id="se-account-strip" style="display:none!important;align-items:center!important;gap:8px!important;padding:6px 10px!important;border-bottom:1px solid ${t.border}!important;background:${t.footerBg}!important;">
          <div id="se-account-strip-text" style="flex:1!important;min-width:0!important;font-size:0.68em!important;line-height:1.35!important;color:${t.subtext}!important;"></div>
          <button id="se-account-strip-btn" style="display:none!important;flex:0 0 auto!important;padding:3px 8px!important;background:${settings.accentColor}!important;color:#fff!important;border:none!important;border-radius:5px!important;font-size:0.64em!important;font-weight:700!important;cursor:pointer!important;white-space:nowrap!important;">Upgrade to Pro</button>
          <!-- Secondary action — a muted link, never a prominent button. It's the escape hatch when
               the WRONG account is signed in, so it must be reachable without opening settings. -->
          <button id="se-account-strip-signout" style="display:none!important;flex:0 0 auto!important;background:none!important;border:none!important;padding:0!important;font-size:0.64em!important;font-weight:600!important;color:${t.subtext}!important;cursor:pointer!important;text-decoration:underline!important;white-space:nowrap!important;">Sign out</button>
        </div>

        <div id="se-scorecard-section" style="padding:8px 10px 6px!important;border-bottom:1px solid ${t.border}!important;">
          <div id="se-scorecard-note" style="display:none!important;font-size:0.68em!important;color:${t.subtext}!important;margin-bottom:5px!important;"></div>
          <div id="se-scorecard-rail" style="display:flex!important;gap:7px!important;overflow-x:auto!important;overscroll-behavior-x:contain!important;overscroll-behavior:contain!important;padding-bottom:3px!important;">
            <div style="font-size:0.72em!important;color:${t.subtext}!important;padding:6px 2px!important;">Loading games…</div>
          </div>
          <div id="se-scorecard-channel" style="display:none!important;font-size:0.7em!important;color:${t.subtext}!important;margin-top:5px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;"></div>
        </div>

        <div style="padding: 10px 12px 6px !important;">
          <div id="se-teams" style="font-size:0.85em!important;color:${teamsTitleColor()}!important;font-weight:600!important;margin-bottom:7px!important;text-transform:uppercase!important;">Loading game...</div>

          <!-- LIVE / scheduled content — hidden and replaced by the recap block for Final games -->
          <div id="se-live-content">
            <button id="se-back-to-live" style="display:none!important;background:none!important;border:none!important;padding:0!important;margin:0 0 6px!important;font-size:0.72em!important;font-weight:700!important;color:${t.teal}!important;cursor:pointer!important;">▶ Back to live</button>

            <!-- 6a. DAILY-CAP CARD — replaces the explanation when a free user hits the daily limit.
                 Positive framing + locked rows echoing the real card + one Pro CTA + a still-free
                 surface (play-by-play). Shown/hidden by showDailyCapCard()/hideDailyCapCard(). -->
            <div id="se-cap-card" style="display:none!important;">
              <div class="se-section-h" style="font-size:0.68em!important;font-weight:700!important;color:${sectionHeaderColor()}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin:0 0 4px!important;">🔒 Daily limit reached</div>
              <p id="se-cap-body" style="font-size:0.92em!important;line-height:1.5!important;margin:0 0 10px!important;color:${t.text}!important;">You've explored ${window.SE_CAPS ? window.SE_CAPS.DAILY_FREE : 5} plays today — nice work. Keep going with Pro for unlimited explanations.</p>
              ${lockedRowHtml('What Happened')}${lockedRowHtml('Why It Matters')}${lockedRowHtml('The Rule')}
              ${proBtnHtml('se-cap-upgrade', 'Unlock unlimited with Pro')}
              <button id="se-cap-pbp" style="width:100%!important;background:none!important;border:none!important;padding:7px 0 0!important;font-size:0.75em!important;font-weight:600!important;color:${settings.accentColor}!important;cursor:pointer!important;text-decoration:underline!important;">Browse the play-by-play — still free →</button>
            </div>

            <!-- 6d. Scarcity pill — amber, only when a free user has ≤2 explanations left today. -->
            <div id="se-cap-pill" style="display:none!important;margin:0 0 6px!important;"><span id="se-cap-pill-text" style="display:inline-block!important;font-size:0.62em!important;font-weight:700!important;color:#0d1b3e!important;background:${AMBER}!important;padding:2px 8px!important;border-radius:10px!important;letter-spacing:0.04em!important;"></span></div>

            <div id="se-h-what" class="se-section-h" style="font-size:0.68em!important;font-weight:700!important;color:${sectionHeaderColor()}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin:0 0 3px!important;">What Happened</div>
            <p id="se-explanation" style="font-size:1em!important;line-height:1.5!important;margin:0 0 8px!important;color:${t.text}!important;">Fetching latest play...</p>

            <!-- Glossary definition box (Tier E) — single shared box, shown when a tappable term is tapped -->
            <div id="se-glossary-box" style="display:none!important;margin:0 0 8px!important;padding:8px 10px!important;background:${t.answerBg}!important;border-radius:6px!important;border-left:4px solid #e87722!important;">
              <div style="display:flex!important;justify-content:space-between!important;align-items:flex-start!important;gap:6px!important;">
                <span id="se-glossary-term" style="font-weight:800!important;font-size:0.82em!important;color:#e87722!important;"></span>
                <button id="se-glossary-close" style="background:none!important;border:none!important;color:${t.subtext}!important;cursor:pointer!important;font-size:0.85em!important;font-weight:700!important;line-height:1!important;padding:0 2px!important;">✕</button>
              </div>
              <div id="se-glossary-def" style="font-size:0.8em!important;line-height:1.4!important;color:${t.text}!important;margin-top:3px!important;"></div>
            </div>

            <div id="se-h-why" class="se-section-h" style="display:none!important;font-size:0.68em!important;font-weight:700!important;color:${sectionHeaderColor()}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin:0 0 3px!important;">Why It Matters</div>
            <div id="se-why" style="display:none!important;font-size:0.85em!important;color:${t.subtext}!important;margin-bottom:8px!important;line-height:1.4!important;"></div>

            <div id="se-h-rule" class="se-section-h" style="display:none!important;font-size:0.68em!important;font-weight:700!important;color:${sectionHeaderColor()}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin:0 0 3px!important;">The Rule</div>
            <div id="se-rule" style="display:none!important;font-size:0.85em!important;color:${t.subtext}!important;margin-bottom:8px!important;line-height:1.4!important;"></div>

            <div id="se-source-container" style="margin-bottom:4px!important;">
              <button id="se-source-toggle" style="background:none!important;border:none!important;padding:0!important;font-size:0.77em!important;font-weight:600!important;color:${settings.accentColor}!important;cursor:pointer!important;text-decoration:underline!important;">Show Source Play</button>
              <div id="se-source-box" style="display:none!important;margin-top:5px!important;padding:8px!important;background:${t.sourceBg}!important;border-radius:6px!important;font-size:0.85em!important;font-style:italic!important;line-height:1.4!important;color:${t.subtext}!important;"></div>
            </div>

            <!-- PLAY-BY-PLAY (Tier D) — collapsed by default; only for plays-capable sports (see PLAYS_SPORTS) -->
            <div id="se-pbp-section" style="display:none!important;margin-top:8px!important;border-top:1px solid ${t.border}!important;padding-top:7px!important;">
              <div id="se-pbp-header" style="display:flex!important;align-items:center!important;gap:6px!important;cursor:pointer!important;user-select:none!important;">
                <span id="se-h-pbp" class="se-section-h" style="font-size:0.68em!important;font-weight:700!important;color:${sectionHeaderColor()}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;">Play-by-Play</span>
                <span id="se-pbp-chevron" style="font-size:0.7em!important;color:${t.subtext}!important;">▸</span>
              </div>
              <div id="se-pbp-hint" style="display:none!important;font-size:0.62em!important;color:${t.subtext}!important;margin:4px 0 6px!important;">Tap any play to explain it&nbsp;·&nbsp;<span id="se-pbp-legend-dot" style="color:${t.teal}!important;">●</span>&nbsp;scoring play</div>
              <div id="se-pbp-list" style="display:none!important;max-height:180px!important;overflow-y:auto!important;overscroll-behavior:contain!important;"></div>
            </div>
          </div>

          <!-- RECAP content — shown INSTEAD of live content when the selected game is Final ('post') -->
          <div id="se-recap-content" style="display:none!important;">
            <div id="se-h-recap" class="se-section-h" style="font-size:0.68em!important;font-weight:700!important;color:${sectionHeaderColor()}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin:0 0 4px!important;">Recap</div>
            <div id="se-recap-score" style="display:none!important;font-size:1.15em!important;font-weight:800!important;color:${t.text}!important;margin:0 0 8px!important;"></div>
            <p id="se-recap-story" style="display:none!important;font-size:1em!important;line-height:1.5!important;margin:0 0 8px!important;color:${t.text}!important;"></p>
            <!-- The 3 Pro narrative fields (turningPoint / keyPerformance / whyItMattered).
                 Pro → real sections; free → locked teaser rows + upsell. Filled by
                 renderRecapProSections(); empty until a recap loads. -->
            <div id="se-recap-pro" style="display:none!important;"></div>
            <button id="se-recap-link" style="display:none!important;background:none!important;border:none!important;padding:0!important;font-size:0.85em!important;font-weight:600!important;color:${settings.accentColor}!important;cursor:pointer!important;text-decoration:underline!important;">Read full recap ↗</button>
          </div>
        </div>

        <div id="se-ask-section" style="padding:8px 12px 10px!important;border-top:1px solid ${t.border}!important;background:${t.footerBg}!important;">
          <div id="se-chips-row" style="margin-bottom:8px!important;">
            <div id="se-chips-label" style="font-size:0.62em!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;letter-spacing:0.08em!important;margin-bottom:5px!important;">Ask a follow-up</div>
            <div style="display:flex!important;flex-wrap:wrap!important;gap:5px!important;">
              ${CHIPS.map(c => `<button class="se-chip" data-q="${c.q}" style="background:${t.selectBg}!important;color:${t.text}!important;border:1px solid ${t.inputBorder}!important;border-radius:12px!important;padding:4px 9px!important;font-size:0.72em!important;font-weight:600!important;cursor:pointer!important;white-space:nowrap!important;">${c.label}</button>`).join('')}
            </div>
          </div>
          <div id="se-ask-input-row" style="display:flex!important;gap:6px!important;">
            <input id="se-question-input" type="text" placeholder="Ask anything..." style="flex:1!important;padding:6px 10px!important;background:${t.inputBg}!important;color:${t.inputText}!important;border:1px solid ${t.inputBorder}!important;border-radius:6px!important;font-size:0.92em!important;outline:none!important;"/>
            <button id="se-ask-btn" style="padding:6px 12px!important;background:${settings.accentColor}!important;color:white!important;border:none!important;border-radius:6px!important;font-size:0.92em!important;font-weight:700!important;cursor:pointer!important;">Ask</button>
          </div>

          <!-- 6b. ASK-CAP ROW — replaces the ask input when a free user hits the per-game limit. -->
          <div id="se-ask-cap-row" style="display:none!important;padding:8px 10px!important;background:${t.answerBg}!important;border-radius:6px!important;border-left:3px solid ${AMBER}!important;">
            <div style="font-size:0.8em!important;font-weight:700!important;color:${t.text}!important;margin-bottom:2px!important;">That's ${window.SE_CAPS ? window.SE_CAPS.QA_FREE_PER_GAME : 3} questions this game.</div>
            <div style="font-size:0.75em!important;line-height:1.4!important;color:${t.subtext}!important;margin-bottom:6px!important;">Unlock unlimited questions with Pro — or pick another game for a fresh set.</div>
            ${proBtnHtml('se-ask-cap-upgrade', 'Unlock unlimited questions →')}
          </div>

          <!-- 6d (Q&A). Scarcity hint — only when a free user has ≤1 question left in this game. -->
          <div id="se-qa-hint" style="display:none!important;margin-top:5px!important;font-size:0.68em!important;font-weight:600!important;color:${AMBER}!important;"></div>
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
      
      // Paint the account strip immediately on open (don't wait for the first fetch); the
      // entitlement refresh kicked off by loadSettings will repaint it a moment later.
      renderAccountStrip();

      // ── Pro CTAs (every one routes through the single openUpgrade()) ──
      document.getElementById('se-cap-upgrade').addEventListener('click', openUpgrade);
      document.getElementById('se-ask-cap-upgrade').addEventListener('click', openUpgrade);
      // Capped users keep a free surface: jump to the (free) play-by-play list.
      document.getElementById('se-cap-pbp').addEventListener('click', () => {
        const section = document.getElementById('se-pbp-section');
        if (section) section.style.display = 'block';
        if (!pbpExpanded) togglePbp();
        section?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
        if (settingsOpen) refreshAccountState(); // reflect stored session in the Account section
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

      // Quick-question chips → same ask path with the chip's canned prompt.
      overlayEl.querySelectorAll('.se-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const q = chip.getAttribute('data-q');
          if (q) handleAskQuestion(q);
        });
      });

      // Play-by-Play: header toggles the list; delegated tap on a row explains that play; back-to-live resumes.
      document.getElementById('se-pbp-header').addEventListener('click', togglePbp);
      document.getElementById('se-pbp-list').addEventListener('click', (e) => {
        const row = e.target.closest('.se-pbp-row');
        if (row && row.dataset.idx != null) {
          const p = currentPlays[Number(row.dataset.idx)];
          if (p) selectPlay(p.text);
        }
      });
      document.getElementById('se-back-to-live').addEventListener('click', backToLive);

      // Glossary (Tier E): delegated tap on a term span toggles the shared definition box.
      document.getElementById('se-explanation').addEventListener('click', (e) => {
        const span = e.target.closest('.se-gloss-term');
        if (span) toggleGlossary(span.dataset.term, span.dataset.def);
      });
      document.getElementById('se-glossary-close').addEventListener('click', closeGlossary);

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
        clearAskAnswer();
        resetPlayByPlay();               // drop the old sport's play list + any manual play selection
        closeGlossary(); lastRenderedSimple = null; // drop stale term box; force re-render for the new sport
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

    // A manually-selected play (Tier D) is static — never poll it (the poll would overwrite the
    // user's chosen play with the latest).
    if (selectedPlayText) return;

    // Final games are static — never poll them (recap is fetched once). Uses the rail's
    // authoritative state, so it holds even before a fetch sets currentGameState.
    const selForPoll = currentGames.find(g => g.id === currentGameId);
    if (selForPoll && selForPoll.state === 'post') return;

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
    fetchLatestPlay(true);   // AUTO-refresh → never consumes a daily credit (see caps.js)
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
    fetchLatestPlay(true);  // ONE immediate fetch on resume — automatic, so it must not consume
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
  // ─────────────────────────────────────────
  // ACCOUNT (Phase 2 4a — sign in + persist session + show status. Identity only:
  // NO feature gating (4c) and NO entitlement check (4b). Pro badge shows "Free" for everyone.)
  // ─────────────────────────────────────────
  let seAuthPhase = 'email';    // 'email' → 'code' → (signed in)
  let seAuthPendingEmail = '';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function setAuthMsg(text) {
    const el = document.getElementById('se-auth-msg');
    if (el) el.textContent = text || '';
  }

  // Renders the Account section based on current auth state. Styles use !important to match the
  // overlay's host-page-CSS defense (every sibling in the panel does the same).
  function renderAccount(state) {
    const box = document.getElementById('se-account-body');
    if (!box) return;
    const t = getThemeColors();          // no-arg accessor (reads settings.theme internally)
    const accent = settings.accentColor;

    const inputStyle =
      `width:100%!important;box-sizing:border-box!important;background:${t.selectBg}!important;color:${t.inputText}!important;` +
      `border:1px solid ${t.inputBorder}!important;border-radius:6px!important;font-size:12px!important;padding:7px 8px!important;margin-bottom:6px!important;`;
    const btnStyle =
      `width:100%!important;box-sizing:border-box!important;background:${accent}!important;color:#fff!important;border:none!important;border-radius:6px!important;` +
      `font-size:12px!important;font-weight:700!important;padding:8px!important;cursor:pointer!important;`;
    const linkStyle =
      `background:none!important;border:none!important;color:${t.subtext}!important;font-size:11px!important;cursor:pointer!important;padding:0!important;text-decoration:underline!important;`;

    if (state && state.signedIn) {
      // SIGNED IN — compact, NOT a form. Same shape as the main-screen strip so the two read as
      // one thing: status · tier, then the two actions (Upgrade only when Free).
      const isPro = !!state.isPro;
      const emailStyle =
        `display:inline-block!important;max-width:150px!important;vertical-align:bottom!important;overflow:hidden!important;` +
        `text-overflow:ellipsis!important;white-space:nowrap!important;color:${t.text}!important;font-weight:700!important;`;
      const upgradeStyle =
        `background:${accent}!important;color:#fff!important;border:none!important;border-radius:5px!important;` +
        `padding:4px 9px!important;font-size:11px!important;font-weight:700!important;cursor:pointer!important;white-space:nowrap!important;`;
      box.innerHTML =
        `<div style="font-size:12px!important;color:${t.subtext}!important;margin-bottom:7px!important;">` +
          `Signed in as <span title="${escapeHtml(state.email)}" style="${emailStyle}">${escapeHtml(state.email)}</span>` +
          ` · <span style="font-weight:700!important;color:${isPro ? t.teal : t.subtext}!important;">${isPro ? 'Pro' : 'Free'}</span>` +
        `</div>` +
        `<div style="display:flex!important;align-items:center!important;gap:10px!important;">` +
          (isPro ? '' : `<button id="se-acct-upgrade" style="${upgradeStyle}">Upgrade to Pro</button>`) +
          `<button id="se-signout-btn" style="${linkStyle}">Sign out</button>` +
        `</div>`;
      const up = document.getElementById('se-acct-upgrade');
      if (up) up.addEventListener('click', openUpgrade);
      document.getElementById('se-signout-btn').addEventListener('click', doSignOut);
      return;
    }

    // STEP 2 — code entry. The old copy ("Code sent to …") never told the user to go LOOK.
    if (seAuthPhase === 'code') {
      box.innerHTML =
        `<div style="font-size:12px!important;font-weight:700!important;color:${t.text}!important;margin-bottom:2px!important;">Check your email for a 6-digit code</div>` +
        `<div style="font-size:11px!important;color:${t.subtext}!important;margin-bottom:6px!important;">Sent to ${escapeHtml(seAuthPendingEmail)}</div>` +
        `<input id="se-code-input" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="${inputStyle}" />` +
        `<button id="se-verify-btn" style="${btnStyle}">Verify</button>` +
        `<div style="margin-top:6px!important;"><button id="se-code-back" style="${linkStyle}">Use a different email</button></div>` +
        `<div id="se-auth-msg" style="font-size:11px!important;color:${t.subtext}!important;margin-top:6px!important;"></div>`;
      document.getElementById('se-verify-btn').addEventListener('click', doVerifyCode);
      document.getElementById('se-code-back').addEventListener('click', () => {
        seAuthPhase = 'email'; renderAccount({ signedIn: false });
      });
      return;
    }

    // STEP 1 — email entry. The button is the ACTION the user wants ("Sign in"), not the
    // mechanism ("Send code") — the code step is an implementation detail they meet next.
    box.innerHTML =
      `<input id="se-email-input" type="email" placeholder="you@email.com" style="${inputStyle}" />` +
      `<button id="se-sendcode-btn" style="${btnStyle}">Sign in</button>` +
      `<div id="se-auth-msg" style="font-size:11px!important;color:${t.subtext}!important;margin-top:6px!important;"></div>`;
    document.getElementById('se-sendcode-btn').addEventListener('click', doSendCode);
  }

  function doSendCode() {
    const input = document.getElementById('se-email-input');
    const email = (input ? input.value : '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setAuthMsg('Enter a valid email.'); return; }
    setAuthMsg('Sending…');
    chrome.runtime.sendMessage({ action: 'authRequestCode', email }, (res) => {
      if (res && res.error) { setAuthMsg(res.error); return; }
      // request-code always returns generic ok; move to code entry regardless.
      seAuthPendingEmail = email;
      seAuthPhase = 'code';
      renderAccount({ signedIn: false });
    });
  }

  function doVerifyCode() {
    const input = document.getElementById('se-code-input');
    const code = (input ? input.value : '').trim();
    if (!/^\d{6}$/.test(code)) { setAuthMsg('Enter the 6-digit code.'); return; }
    setAuthMsg('Verifying…');
    chrome.runtime.sendMessage(
      { action: 'authVerifyCode', email: seAuthPendingEmail, code },
      (res) => {
        if (res && res.ok) {
          seAuthPhase = 'email';
          seAuthEmail = res.email || null;   // the app_user_id openUpgrade() will purchase against
          // Paint signed-in immediately, then force a fresh entitlement check (the cache
          // was just cleared on sign-in) so the badge is correct without a panel reopen.
          renderAccount({ signedIn: true, email: res.email, isPro: false });
          chrome.runtime.sendMessage({ action: 'checkEntitlement', force: true }, (ent) => {
            // Signing in AS an existing Pro is a genuine false→true flip → setPro re-fetches, so a
            // recap already on screen fills in its narrative rows without a reselect.
            setPro(!!(ent && ent.isPro));   // gates unlock immediately on sign-in, no reload
            renderAccount({ signedIn: true, email: res.email, isPro: sePro, isTrial: !!(ent && ent.isTrial) });
            renderCapIndicators();
          });
        } else {
          setAuthMsg('Incorrect or expired code.');
        }
      },
    );
  }

  function doSignOut() {
    chrome.runtime.sendMessage({ action: 'authSignOut' }, () => {
      seAuthPhase = 'email';
      setPro(false);              // back to the free tier immediately (never a "gain" → no re-fetch)
      seAuthEmail = null;         // no app_user_id → Unlock CTAs nudge to sign in, never purchase
      renderAccount({ signedIn: false });
      renderCapIndicators();      // pills/limits reappear if the free allowance is spent
    });
  }

  // Call when the settings panel opens to reflect the stored session.
  function refreshAccountState() {
    chrome.runtime.sendMessage({ action: 'authCheckSession' }, (res) => {
      if (res && res.signedIn) {
        seAuthEmail = res.email || seAuthEmail;
        // Render signed-in immediately with Free, then update the badge when entitlement returns.
        renderAccount({ signedIn: true, email: res.email, isPro: false });
        chrome.runtime.sendMessage({ action: 'checkEntitlement' }, (ent) => {
          if (ent && ent.signedIn === false) {
            seAuthPhase = 'email';
            setPro(false);
            seAuthEmail = null;   // session died — don't purchase against a stale email
            renderAccount({ signedIn: false });
            renderCapIndicators();
            return;
          }
          setPro(!!(ent && ent.isPro));   // flip → re-fetch a stale locked recap / cap card
          renderAccount({ signedIn: true, email: res.email, isPro: sePro, isTrial: !!(ent && ent.isTrial) });
          renderCapIndicators();
        });
      } else {
        seAuthPhase = 'email';
        setPro(false);
        seAuthEmail = null;
        renderAccount({ signedIn: false });
      }
    });
  }

  function buildSelectorPanel() {
    const t = getThemeColors();
    const panel = document.createElement('div');
    panel.id = 'se-selector-panel';
    // F1: 240px was too tight — "Expert" clipped to "Expe" and team pairs truncated to "Pi…".
    panel.style.cssText = `
      position: fixed !important; display: none !important; top: 0 !important; left: 0 !important;
      width: ${SELECTOR_PANEL_W}px !important; max-height: 80vh !important; overflow-y: auto !important;
      z-index: 2147483647 !important; background: ${t.settingsBg} !important; color: ${t.text} !important;
      border: 1px solid ${settings.accentColor} !important; border-radius: 10px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important; font-family: system-ui, sans-serif !important;
      font-size: 13px !important; padding: 12px !important;
    `;
    const labelStyle = `display:block!important;font-size:10px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;letter-spacing:0.5px!important;margin-bottom:4px!important;`;
    // Long team pairs ellipsize rather than overflow — it's a native <select>, so the full name
    // is visible the moment it's opened.
    const selectStyle = `width:100%!important;box-sizing:border-box!important;padding:6px 8px!important;background:${t.selectBg}!important;color:${t.inputText}!important;border:1px solid ${t.inputBorder}!important;border-radius:6px!important;font-size:12px!important;cursor:pointer!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;`;
    // flex:1 1 auto + nowrap: pills size to their text instead of being squeezed to a quarter each,
    // so nothing clips. If a label ever outgrows the row, the container wraps to a second line
    // rather than cutting the word.
    const pillStyle = (active) => `flex:1 1 auto!important;min-width:56px!important;white-space:nowrap!important;padding:6px 6px!important;border-radius:6px!important;border:1px solid ${active ? settings.accentColor : t.inputBorder}!important;background:${active ? settings.accentColor : t.selectBg}!important;color:${active ? 'white' : t.subtext}!important;font-size:10px!important;font-weight:600!important;cursor:pointer!important;text-align:center!important;`;

    panel.innerHTML = `
      <div style="display:flex!important;justify-content:space-between!important;align-items:center!important;margin-bottom:10px!important;">
        <span style="font-size:11px!important;font-weight:700!important;color:${t.label}!important;text-transform:uppercase!important;">Change sport &amp; game</span>
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
        <div id="se-sel-levels" style="display:flex!important;flex-wrap:wrap!important;gap:5px!important;">
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

  // Smart side-detection: open on whichever side of the card has full room for the panel;
  // if neither does, use the side with more space (clamped on-screen).
  function positionSelectorPanel() {
    if (!overlayEl || !selectorPanelEl) return;
    const rect = overlayEl.getBoundingClientRect();
    const pw = SELECTOR_PANEL_W, gap = 8;
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

  // Clear + hide the Ask/chip answer and the question input. The answer box only ever shows
  // content for the currently-selected game.
  function clearAskAnswer() {
    const answerBox = document.getElementById('se-answer-box');
    if (answerBox) { answerBox.textContent = ''; answerBox.style.display = 'none'; }
    const input = document.getElementById('se-question-input');
    if (input) input.value = '';
    answerGameId = null;
  }

  // Set the current game from a score card or the selector dropdown, keep the rail +
  // selector dropdown in sync, and re-fetch the explanation.
  function selectGame(id) {
    currentGameId = id || null;
    const s = document.getElementById('se-sel-game'); if (s) s.value = currentGameId || '';
    clearAskAnswer(); // stale answer belongs to the previous game — drop it immediately
    resetPlayByPlay(); // drop the old game's play list + any manual play selection
    closeGlossary(); lastRenderedSimple = null; // drop stale term box; force re-render for the new game
    highlightSelectedCard();
    fetchLatestPlay();
  }

  // ─────────────────────────────────────────
  // PLAY-BY-PLAY (Tier D)
  // ─────────────────────────────────────────
  // Reset PBP state on any game change: clear selection (resume live), collapse, empty the list.
  function resetPlayByPlay() {
    selectedPlayText = null;
    currentPlays = [];
    pbpExpanded = false;
    const back = document.getElementById('se-back-to-live'); if (back) back.style.display = 'none';
    const list = document.getElementById('se-pbp-list'); if (list) { list.innerHTML = ''; list.style.display = 'none'; }
    const hint = document.getElementById('se-pbp-hint'); if (hint) hint.style.display = 'none';
    const chevron = document.getElementById('se-pbp-chevron'); if (chevron) chevron.textContent = '▸';
  }

  function togglePbp() {
    pbpExpanded = !pbpExpanded;
    const list = document.getElementById('se-pbp-list');
    const hint = document.getElementById('se-pbp-hint');
    const chevron = document.getElementById('se-pbp-chevron');
    if (list) list.style.display = pbpExpanded ? 'block' : 'none';
    if (hint) hint.style.display = pbpExpanded ? 'block' : 'none';
    if (chevron) chevron.textContent = pbpExpanded ? '▾' : '▸';
    if (pbpExpanded) loadPlays(); // lazy — only hit ESPN when the user opens the list
  }

  async function loadPlays() {
    const list = document.getElementById('se-pbp-list');
    const t = getThemeColors();
    if (list) list.innerHTML = `<div style="padding:6px 4px!important;font-size:0.72em!important;color:${t.subtext}!important;">Loading plays…</div>`;
    try {
      const response = await chrome.runtime.sendMessage({ action: 'fetchPlays', sport: currentSport, gameId: currentGameId });
      currentPlays = response?.plays || [];
    } catch (err) {
      currentPlays = [];
    }
    renderPlays();
  }

  // Render the tappable play list (built via DOM, so play text needs no HTML-escaping).
  function renderPlays() {
    const list = document.getElementById('se-pbp-list');
    if (!list) return;
    const t = getThemeColors();
    list.innerHTML = '';
    if (!currentPlays.length) {
      const empty = document.createElement('div');
      empty.style.cssText = `padding:6px 4px!important;font-size:0.72em!important;color:${t.subtext}!important;`;
      empty.textContent = 'No plays available yet.';
      list.appendChild(empty);
      return;
    }
    currentPlays.forEach((p, i) => {
      const selected = selectedPlayText != null && p.text === selectedPlayText; // match by text (how selection is tracked)
      const row = document.createElement('div');
      row.className = 'se-pbp-row';
      row.dataset.idx = String(i);
      // Selected play: orange (primary accent) left border + subtly highlighted bg. Every row keeps a
      // 3px left border (transparent when unselected) so text alignment is identical selected/unselected.
      row.style.cssText = `padding:5px 4px 5px 6px!important;border-bottom:1px solid ${t.border}!important;border-left:3px solid ${selected ? settings.accentColor : 'transparent'}!important;background:${selected ? t.selectBg : 'transparent'}!important;cursor:pointer!important;display:flex!important;align-items:flex-start!important;gap:6px!important;`;

      const dot = document.createElement('span');
      // Scoring dot uses TEAL (secondary accent), not the primary orange.
      dot.style.cssText = `flex:0 0 auto!important;width:6px!important;height:6px!important;border-radius:50%!important;margin-top:5px!important;background:${p.scoring ? t.teal : 'transparent'}!important;`;
      row.appendChild(dot);

      const txt = document.createElement('span');
      txt.style.cssText = `flex:1!important;font-size:0.78em!important;line-height:1.35!important;color:${t.text}!important;`;
      txt.textContent = p.text;
      row.appendChild(txt);

      const per = document.createElement('span');
      per.style.cssText = `flex:0 0 auto!important;font-size:0.62em!important;color:${t.subtext}!important;white-space:nowrap!important;margin-top:2px!important;`;
      per.textContent = p.period || '';
      row.appendChild(per);

      list.appendChild(row);
    });
  }

  // Tapping a play → explain THAT play (via playText) and PAUSE polling so the live poll
  // doesn't clobber the user's selection.
  function selectPlay(text) {
    if (!text) return;
    selectedPlayText = text;
    const back = document.getElementById('se-back-to-live');
    if (back) back.style.display = 'inline-block';
    renderPlays(); // re-render so the tapped row shows the selected highlight
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; } // stop the live poll
    fetchLatestPlay(); // sends playText: selectedPlayText → explains this specific play
  }

  // Clear the manual selection and resume normal latest-play polling.
  function backToLive() {
    selectedPlayText = null;
    const back = document.getElementById('se-back-to-live');
    if (back) back.style.display = 'none';
    renderPlays();         // clear the selected-row highlight
    fetchLatestPlay();     // latest play
    restartPollInterval(); // resume cadence
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

  // Fetch + render the post-game RECAP for a Final game. Called ONCE (no repeat interval).
  // Renders score + story + article link only; the 3 Pro fields are always empty (see comment below).
  async function fetchRecapAndRender(game) {
    if (!chrome.runtime?.id) return;
    // A Final game is static — make sure no poll interval is running.
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

    // Drop a stale answer from a different game when switching into this recap.
    if (answerGameId && answerGameId !== currentGameId) clearAskAnswer();

    const liveEl = document.getElementById('se-live-content');
    const recapEl = document.getElementById('se-recap-content');
    if (liveEl) liveEl.style.display = 'none';
    if (recapEl) recapEl.style.display = 'block';
    // Hide the play-specific chips in recap mode (their prompts reference "that play" / "what's next").
    const chipsRow = document.getElementById('se-chips-row');
    if (chipsRow) chipsRow.style.display = 'none';

    // Teams title (recap payload carries no team names — use the selected rail game).
    const teamEl = document.getElementById('se-teams');
    if (teamEl && game) teamEl.textContent = `${game.awayAbbrev} @ ${game.homeAbbrev} — FINAL`;

    setStatusFetching();
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'recap', sport: currentSport, gameId: currentGameId, level: settings.level, language: settings.language,
        isPro: sePro   // backend withholds turningPoint/keyPerformance/whyItMattered unless true
      });
      if (response) {
        const scoreEl = document.getElementById('se-recap-score');
        const storyEl = document.getElementById('se-recap-story');
        const linkEl = document.getElementById('se-recap-link');

        // Score — prominent. Guard: only render when non-empty.
        if (scoreEl) {
          if (response.score) { scoreEl.textContent = response.score; scoreEl.style.display = 'block'; }
          else scoreEl.style.display = 'none';
        }
        // Story — render whatever came back (quality varies, may be thin). Guard non-empty.
        if (storyEl) {
          if (response.story) { storyEl.textContent = response.story; storyEl.style.display = 'block'; }
          else storyEl.style.display = 'none';
        }
        // "Read full recap ↗" — ONLY when articleLink is non-empty (it's sometimes ''). New tab, noopener.
        if (linkEl) {
          if (response.articleLink) {
            linkEl.style.display = 'inline-block';
            linkEl.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.open(response.articleLink, '_blank', 'noopener'); };
          } else {
            linkEl.style.display = 'none';
            linkEl.onclick = null;
          }
        }

        // The 3 narrative fields are Pro-gated SERVER-side (the backend only sends them when
        // isPro:true), so this is a real gate, not a cosmetic one. Pro → render them; free →
        // locked teaser rows + upsell.
        renderRecapProSections(response);

        currentPlayText = [response.score, response.story].filter(Boolean).join(' — '); // Ask context
        setStatusReady(!!response.score, '✅ Final');
        renderCapIndicators();   // Ask is still per-game capped while viewing a recap
      }
    } catch (err) {
      setStatusError('Recap failed');
    }
  }

  // ─────────────────────────────────────────
  // GLOSSARY (Tier E) — render tappable terms in the main explanation + a shared definition box.
  // ─────────────────────────────────────────
  // Rebuild #se-explanation with tappable glossary terms. English-only; falls back to plain text for
  // other languages / sports with no list. Built via DOM (textContent) — never innerHTML of response text.
  function renderExplanation(simpleText) {
    const expEl = document.getElementById('se-explanation');
    if (!expEl) return;
    const text = simpleText || 'Waiting for next play...';
    if (text === lastRenderedSimple) return; // unchanged (same poll) → keep DOM + any open term box
    lastRenderedSimple = text;
    closeGlossary(); // a NEW explanation loaded → drop any stale term box

    const segs = (settings.language === 'en' && window.SE_segmentText)
      ? window.SE_segmentText(text, currentSport)
      : [{ type: 'text', value: text }];

    expEl.textContent = ''; // clear
    segs.forEach(s => {
      if (s.type === 'term') {
        const span = document.createElement('span');
        span.className = 'se-gloss-term';
        span.textContent = s.value;          // safe: textContent, not innerHTML
        span.dataset.term = s.term;
        span.dataset.def = s.def;
        // Brand orange in BOTH themes (hardcoded, not settings.accentColor — a pre-brand-pass stored
        // accent could be the old muted red, which reads low-contrast on navy). Matches the app.
        span.style.cssText = `color:#e87722!important;text-decoration:underline!important;cursor:pointer!important;`;
        expEl.appendChild(span);
      } else {
        expEl.appendChild(document.createTextNode(s.value));
      }
    });
  }

  // Single shared definition box: tap a term to open; tap the same term (or ✕) to close; a different
  // term swaps the content. Mirrors the app's toggle behavior.
  function toggleGlossary(term, def) {
    if (openGlossaryTerm === term) { closeGlossary(); return; }
    const box = document.getElementById('se-glossary-box');
    const termEl = document.getElementById('se-glossary-term');
    const defEl = document.getElementById('se-glossary-def');
    if (!box || !termEl || !defEl) return;
    openGlossaryTerm = term;
    termEl.textContent = term;
    defEl.textContent = def;
    box.style.display = 'block';
  }

  function closeGlossary() {
    openGlossaryTerm = null;
    const box = document.getElementById('se-glossary-box');
    if (box) box.style.display = 'none';
  }

  // ─────────────────────────────────────────
  // FREE-TIER CAP UX (gate → offer, never a hard block)
  // ─────────────────────────────────────────
  // The play sections the cap card stands in for. Play-by-Play is deliberately NOT hidden —
  // it stays free and reachable, so a capped user still has somewhere to go.
  const CAP_HIDDEN_IDS = ['se-h-what', 'se-explanation', 'se-glossary-box', 'se-h-why', 'se-why',
                          'se-h-rule', 'se-rule', 'se-source-container', 'se-cap-pill'];

  function showDailyCapCard() {
    const card = document.getElementById('se-cap-card');
    if (!card) return;
    CAP_HIDDEN_IDS.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    card.style.display = 'block';
    // The free-surface link only makes sense where a play-by-play list exists (soccer/rugby/
    // worldcup have none — the link would open an empty section).
    const pbpLink = document.getElementById('se-cap-pbp');
    if (pbpLink) pbpLink.style.display = PLAYS_SPORTS.includes(currentSport) ? 'block' : 'none';
    lastRenderedSimple = null;   // force a fresh render when the user unblocks (re-read / Pro)
  }

  function hideDailyCapCard() {
    const card = document.getElementById('se-cap-card');
    if (card) card.style.display = 'none';
    // Only restore the ALWAYS-shown sections; why/rule/glossary manage their own visibility in
    // the render below (they're conditional on the response).
    ['se-h-what', 'se-explanation', 'se-source-container'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'block';
    });
  }

  function showAskCapRow() {
    const row = document.getElementById('se-ask-cap-row');
    const inputRow = document.getElementById('se-ask-input-row');
    const hint = document.getElementById('se-qa-hint');
    if (inputRow) inputRow.style.display = 'none';
    if (hint) hint.style.display = 'none';
    if (row) row.style.display = 'block';
  }

  function hideAskCapRow() {
    const row = document.getElementById('se-ask-cap-row');
    const inputRow = document.getElementById('se-ask-input-row');
    if (row) row.style.display = 'none';
    if (inputRow) inputRow.style.display = 'flex';
  }

  // Account status strip under the header. Three states; called on every render + whenever auth or
  // entitlement changes, so it updates live on sign-in and on return from a purchase.
  //   • signed out  → "Start free — no account needed." An account is NOT required; sign-in is a
  //                   quiet link, never a demand.
  //   • Free        → "Signed in as X · Free" + Upgrade (the ONLY upgrade path that doesn't
  //                   require a live game — the others sit behind a cap or a recap).
  //   • Pro         → "Signed in as X · Pro" (teal), no button.
  function renderAccountStrip() {
    const strip = document.getElementById('se-account-strip');
    const textEl = document.getElementById('se-account-strip-text');
    const btn = document.getElementById('se-account-strip-btn');
    const signOut = document.getElementById('se-account-strip-signout');
    if (!strip || !textEl || !btn || !signOut) return;
    const t = getThemeColors();
    strip.style.display = 'flex';
    textEl.textContent = '';
    btn.onclick = null;
    signOut.onclick = null;
    signOut.style.display = 'none';

    if (!seAuthEmail) {
      // One thin line — the overlay is content-dense, so no multi-line block here.
      textEl.appendChild(document.createTextNode('Start free — no account needed. '));
      const link = document.createElement('button');
      link.textContent = 'Sign in';
      link.style.cssText = `background:none!important;border:none!important;padding:0!important;font-size:1em!important;font-weight:700!important;color:${settings.accentColor}!important;cursor:pointer!important;text-decoration:underline!important;`;
      link.addEventListener('click', () => { markActivity(); openAccountSettings(); });
      textEl.appendChild(link);
      textEl.appendChild(document.createTextNode(' to sync Pro.'));
      btn.style.display = 'none';
      return;
    }

    // Signed in — email via textContent (never innerHTML of stored user data).
    textEl.appendChild(document.createTextNode('Signed in as '));
    const em = document.createElement('span');
    em.textContent = seAuthEmail;
    em.title = seAuthEmail;
    em.style.cssText = `display:inline-block!important;max-width:140px!important;vertical-align:bottom!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:${t.text}!important;font-weight:700!important;`;
    textEl.appendChild(em);
    textEl.appendChild(document.createTextNode(' · '));
    const tier = document.createElement('span');
    tier.textContent = sePro ? 'Pro' : 'Free';
    tier.style.cssText = `font-weight:700!important;color:${sePro ? t.teal : t.subtext}!important;`;
    textEl.appendChild(tier);

    // Sign out is always available when signed in — that's the fix for "wrong account, stuck".
    signOut.style.display = 'inline-block';
    signOut.onclick = () => { markActivity(); doSignOut(); };

    if (sePro) {
      btn.style.display = 'none';
    } else {
      btn.style.display = 'inline-block';
      btn.onclick = openUpgrade;
    }
  }

  // The subtle scarcity indicators. Pro → dailyRemaining/gameQARemaining return Infinity, so both
  // are hidden and the ask box is always restored. Safe to call often (idempotent).
  function renderCapIndicators() {
    // The account strip tracks the same state (sePro / seAuthEmail), so it refreshes wherever the
    // indicators do — sign-in, sign-out, entitlement refresh, purchase return, every fetch.
    // Deliberately BEFORE the guards below: the strip must render even if caps.js failed to load.
    renderAccountStrip();

    const CAPS = window.SE_CAPS;
    if (!CAPS || !overlayEl) return;

    // Daily explanations — amber pill at ≤2 left.
    const left = CAPS.dailyRemaining(seDailyCap, CAPS.localDateStr(new Date()), sePro);
    const pill = document.getElementById('se-cap-pill');
    const pillText = document.getElementById('se-cap-pill-text');
    const capCardOpen = (document.getElementById('se-cap-card') || {}).style?.display === 'block';
    if (pill && pillText) {
      if (Number.isFinite(left) && left <= 2 && !capCardOpen) {
        pillText.textContent = left === 1 ? '1 explanation left today' : `${left} explanations left today`;
        pill.style.display = 'block';
      } else {
        pill.style.display = 'none';   // Pro (Infinity), plenty left, or the cap card already says it
      }
    }

    // Per-game Q&A — hint at 1 left; swap in the cap row proactively at 0 (don't make them type
    // a question just to be told no). handleAskQuestion still holds the authoritative check.
    const hint = document.getElementById('se-qa-hint');
    if (!currentGameId) { hideAskCapRow(); if (hint) hint.style.display = 'none'; return; }
    const qaLeft = CAPS.gameQARemaining(seGameQA, currentGameId, sePro);
    if (Number.isFinite(qaLeft) && qaLeft <= 0) {
      showAskCapRow();
      return;
    }
    hideAskCapRow();
    if (hint) {
      if (Number.isFinite(qaLeft) && qaLeft <= 1) {
        hint.textContent = '1 question left in this game';
        hint.style.display = 'block';
      } else {
        hint.style.display = 'none';
      }
    }
  }

  // Recap: the 3 narrative fields. Pro → real sections (server sent them); free → locked rows +
  // one upsell. Server-enforced, so a free user genuinely has no text to leak here.
  function renderRecapProSections(response) {
    const box = document.getElementById('se-recap-pro');
    if (!box) return;
    box.textContent = '';   // clear
    const FIELDS = [
      { key: 'turningPoint', label: 'Turning Point' },
      { key: 'keyPerformance', label: 'Key Performance' },
      { key: 'whyItMattered', label: 'Why It Mattered' },
    ];

    if (sePro) {
      // Only the non-empty ones — an empty field means the data didn't support it (never faked).
      const present = FIELDS.filter(f => response && typeof response[f.key] === 'string' && response[f.key].trim());
      if (!present.length) { box.style.display = 'none'; return; }
      present.forEach(f => box.appendChild(proRowEl(f.label, response[f.key].trim())));
      box.style.display = 'block';
      return;
    }

    // FREE — always all three locks (the pull is "there's more here"), plus the honest caveat that
    // each only appears when the game's data supports it. Static HTML only; no response text.
    const t = getThemeColors();
    box.innerHTML =
      FIELDS.map(f => lockedRowHtml(f.label)).join('') +
      `<div style="font-size:0.68em!important;line-height:1.35!important;color:${t.subtext}!important;margin:0 0 6px!important;">Included with Pro when the game's data supports them.</div>` +
      proBtnHtml('se-recap-upgrade', 'Unlock the full recap with Pro');
    box.style.display = 'block';
    const btn = document.getElementById('se-recap-upgrade');
    if (btn) btn.addEventListener('click', openUpgrade);
  }

  // `isRefresh` = this fetch was AUTOMATIC (the poll tick / idle-resume), not user-initiated.
  // It never consumes a free daily credit — see the cap check below and caps.js.
  async function fetchLatestPlay(isRefresh = false) {
    if (!chrome.runtime?.id) return;

    // Final games → show a RECAP once, not a live play (and no polling — see restartPollInterval).
    const selected = currentGames.find(g => g.id === currentGameId);
    if (selected && selected.state === 'post') { fetchRecapAndRender(selected); return; }

    // Drop a stale answer from a DIFFERENT game (but keep it across poll refreshes of the same game).
    if (answerGameId && answerGameId !== currentGameId) clearAskAnswer();

    // Live / scheduled → ensure live content is visible and the recap block is hidden.
    const liveEl = document.getElementById('se-live-content');
    const recapEl = document.getElementById('se-recap-content');
    if (liveEl) liveEl.style.display = 'block';
    if (recapEl) recapEl.style.display = 'none';
    const chipsRow = document.getElementById('se-chips-row');
    if (chipsRow) chipsRow.style.display = 'block'; // play-specific chips make sense for live games
    // Play-by-Play only for plays-capable sports (hidden for soccer/worldcup/rugby; recap hides it via #se-live-content).
    const pbpSection = document.getElementById('se-pbp-section');
    if (pbpSection) pbpSection.style.display = PLAYS_SPORTS.includes(currentSport) ? 'block' : 'none';

    const expEl = document.getElementById('se-explanation');
    const teamEl = document.getElementById('se-teams');
    const whyEl = document.getElementById('se-why');
    const ruleEl = document.getElementById('se-rule');
    const sourceBox = document.getElementById('se-source-box');

    setStatusFetching();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchPlay', sport: currentSport, level: settings.level, gameId: currentGameId, language: settings.language,
        playText: selectedPlayText || undefined // Tier D: explain a manually-tapped play instead of the latest
      });

      if (response) {
        // Update game state for smart polling — derived from gameContext now
        // that response.state is gone (parse "... — Bot 1st" / "... — Final").
        const newState = deriveStateFromContext(response.gameContext);
        if (newState !== currentGameState) {
          currentGameState = newState;
          restartPollInterval(); // Re-adjust timer frequency
        }

        // ── FREE-TIER DAILY CAP ──────────────────────────────────────────────
        // Enforced HERE (post-fetch) because the per-(gameId, playKey) unit needs the response
        // to identify the play — that's what tells a re-read (free) from a genuinely new play.
        // Re-reads and auto-refreshes are allowed:true and don't consume; Pro always passes.
        const CAPS = window.SE_CAPS;
        if (CAPS) {
          const today = CAPS.localDateStr(new Date());
          const key = CAPS.playKeyFor(currentGameId, response.simple, response.playType);
          const decision = CAPS.evaluateDailyExplanation(seDailyCap, today, key, { isPro: sePro, isRefresh });
          if (!decision.allowed) {
            // Free user, genuinely new play, at the limit → show the upsell INSTEAD of the
            // explanation. Nothing is rendered from `response` and no state is consumed.
            showDailyCapCard();
            setStatusReady(false, '🔒 Daily limit reached');
            return;
          }
          if (decision.nextState !== seDailyCap) { seDailyCap = decision.nextState; saveDailyCap(); }
          hideDailyCapCard();
        }

        renderExplanation(response.simple); // Tier E: tappable glossary terms (English only)
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
        renderCapIndicators();   // refresh the "N left today" pill (hidden for Pro)
      }
    } catch (err) {
      setStatusError('Fetch failed');
    }
  }

  // Shared ask path for BOTH the text input and the quick-question chips. A chip passes its
  // canned prompt as `presetQuestion` (a string); the text-input handlers pass no string
  // (the click Event they pass is ignored by the typeof check), so the input value is used.
  async function handleAskQuestion(presetQuestion) {
    const input = document.getElementById('se-question-input');
    const answerBox = document.getElementById('se-answer-box');
    const askBtn = document.getElementById('se-ask-btn');
    const preset = typeof presetQuestion === 'string' ? presetQuestion.trim() : null;
    const question = preset || input?.value?.trim();
    if (!question || !answerBox) return;

    // ── FREE-TIER PER-GAME Q&A CAP ────────────────────────────────────────────
    // Gated BEFORE the fetch (no play key needed), and ONLY when a real game is selected.
    // Gameless "learn mode" asks (no currentGameId — off-season, or a sport with no games today)
    // stay UNGATED, exactly as on iOS. Chips and typed questions both land here, so they count
    // equally — also matching the app.
    const CAPS = window.SE_CAPS;
    if (CAPS && currentGameId) {
      const decision = CAPS.evaluateGameQA(seGameQA, currentGameId, { isPro: sePro });
      if (!decision.allowed) {
        showAskCapRow();   // upsell in place of the ask box; no request is sent
        return;
      }
      if (decision.nextState !== seGameQA) { seGameQA = decision.nextState; saveGameQA(); }
    }

    askBtn.textContent = '...';
    askBtn.disabled = true;
    setChipsDisabled(true);   // same loading behavior for chips as the text Ask
    answerBox.style.display = 'block';
    answerBox.textContent = 'Thinking...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'askQuestion', sport: currentSport, level: settings.level, question, context: currentPlayText, language: settings.language
      });
      answerBox.textContent = response?.answer || '⚠️ Could not get an answer.';
      answerGameId = currentGameId; // this answer belongs to the current game (survives poll refreshes)
      if (!preset && input) input.value = ''; // only clear the typed input, not on chip taps
    } catch (err) {
      answerBox.textContent = '⚠️ Request timed out.';
    } finally {
      askBtn.textContent = 'Ask';
      askBtn.disabled = false;
      setChipsDisabled(false);
      renderCapIndicators();   // refresh the "1 question left" hint (hidden for Pro)
    }
  }

  // Enable/disable the quick-question chips (during an in-flight ask).
  function setChipsDisabled(disabled) {
    if (!overlayEl) return;
    overlayEl.querySelectorAll('.se-chip').forEach(chip => {
      chip.disabled = disabled;
      chip.style.opacity = disabled ? '0.5' : '1';
      chip.style.cursor = disabled ? 'not-allowed' : 'pointer';
    });
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