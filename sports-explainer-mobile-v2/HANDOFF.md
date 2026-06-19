# SportsWise — Project Handoff

_Last updated: 2026-06-18_

A React Native / Expo (SDK 54) mobile app that explains live sports plays at the
user's chosen expertise level, in 10 languages, with an always-on "Academy"
learning mode. This document is the single source of truth for picking the
project back up cold.

> ⚠️ **Status legend:** ✅ done & working · 🚧 in progress / uncommitted ·
> 📋 planned / not yet implemented · ❓ needs owner decision

---

## 1. Current app state — what's built and working

### Shipped & committed
- ✅ **Live tab** — real-time play explanations. Picks a sport, lists games
  (ESPN), selects a game, fetches an AI explanation (the play, why it matters,
  the rule), follow-up chips, free-text ask box, share-as-image, per-game
  past-plays (MLB/NHL/NBA/WNBA), pull-to-refresh, 60s auto-refresh.
- ✅ **Bottom-tab navigation** (React Navigation 7) — 🔴 Live / 🎓 Academy /
  ⚙️ Settings. Settings is a native stack (Settings → My Sports).
- ✅ **Onboarding + launch cinematic** (MorphCinematic) gated on first run.
- ✅ **AppStateProvider** (`lib/appState.tsx`) — shared persisted state via
  `useAppState()`; no more prop-drilling. Owns: `language, level, orderedSports,
  sportVisibility, favorites, autoRefresh, notificationsEnabled`. Auto-persists
  on change; loads from AsyncStorage on mount. (`level` + `autoRefresh` now
  survive cold start — fixed during Stage 2.)
- ✅ **Settings** — expertise level, theme (system/dark/light), language (10),
  auto-refresh + notifications toggles, My Sports (reorder + show/hide sports),
  rate/share/feedback/privacy links.
- ✅ **Season awareness** — off-season detection, date-aware end-of-season guard,
  World Cup data-driven, learn-mode sports (tennis/golf/cricket).
- ✅ **10-language i18n** (`lib/strings.ts`). en/es/fr/pt/de/it are real
  translations; ja/zh/ko/ar are a v1 first pass that **needs native review**.
- ✅ **Academy tab** — full "Duolingo-meets-sports-trivia" experience:
  - **9-category sport list** (`lib/academyCategories.ts`) — Academy-only, decoupled
    from the Live tab / My Sports. Soccer pools soccer/epl/laliga/worldcup and Rugby
    pools rugby/mlr (combine-on-read across each category's `sportKeys`).
  - **Quick Quiz** (`components/QuizCard.tsx`) — difficulty filtering by the GLOBAL
    app level (synced with Settings + Live), on-card 4-level picker (Kid/Beginner/
    Intermediate/Expert), per-question answer **shuffle** (correct answer no longer
    always first), full-pool no-repeat cycling, streak + milestone celebrations
    (3/5/10), green/red reveal with bounce/shake, graceful empty-state fallback.
  - **Did You Know** (`components/DidYouKnow.tsx`) — cross-fading per-category facts.
  - FAQ section (auto-expanded) + sport-general ask box.
  - Header "Sports**wise** Academy 🎓" + tagline; streak bar pinned below the pills.
- ✅ **Quiz bank** (`lib/facts.ts`) — 307 questions across 14 sport keys with
  difficulty tiers (`kid`/`beginner`/`intermediate`/`expert`). English-only (see §3).
- ✅ **First-run scrum intro** (`components/ScrumIntro.tsx`) — animated 3-beat
  "what just happened / why it matters / the rule" aha screen shown once before
  onboarding (gated on `scrum_intro_seen`), over a real licensed rugby scrum photo.
- ✅ **Welcome screen** — real Sportswise logo lockup (theme-aware dark/light),
  centered hero + features (spacing fix); Live tab tagline "Watch and ask why."
- ✅ **FIX 4** — MLR/rugby team-name + score resolution from ESPN Core API
  (`$ref` expansion, 3s timeout + `?`/`0` fallback). Code committed; ⚠️ still
  **needs on-device verification** of live scores (see §3).

### Built but uncommitted
- _(none — working tree clean; everything above is committed and pushed. See §4.)_

### Typecheck
`npx tsc --noEmit` is clean (exit 0) as of this writing. tsconfig extends
`expo/tsconfig.base` (no `noUnusedLocals`).

---

## 2. File locations & key files

Working directory / project root:
`/Users/anthonydeldin/Desktop/sports-explainer-mode/sports-explainer-mobile-v2/`

```
index.ts                  Entry. GestureHandlerRootView > SafeAreaProvider
                          > AppStateProvider > ThemeProvider > App
App.tsx                   Thin shell: fonts + launch gate (cinematic/onboarding)
                          + notifications + NavigationContainer + Tab.Navigator
app.json                  Expo config (name, bundle id, EAS projectId, splash)
eas.json                  EAS build/submit profiles
babel.config.js           babel-preset-expo + react-native-worklets/plugin (Reanimated 4)
tsconfig.json             extends expo/tsconfig.base, strict

screens/
  LiveScreen.tsx          Live tab (the main experience; ~780 lines)
  AcademyScreen.tsx       Academy tab (streak + quiz + facts + FAQ + ask)
  SettingsTab.tsx         Native stack: SettingsHome + MySports

components/
  DidYouKnow.tsx          Academy "Did You Know" card (Reanimated fade; props: sportKeys[])
  QuizCard.tsx            Academy quiz card (Reanimated; props: sportKeys: Sport[],
                          streak, onCorrect, onWrong). Reads global level via useAppState.
  SettingsScreen.tsx      Settings screen (reads useAppState)
  MySportsScreen.tsx      Reorder/show-hide sports (reads useAppState)
  GameCard.tsx            Game strip card (Live)
  PastPlays.tsx           Per-game play-by-play (Live)
  ShareCard.tsx           Off-screen share-image card
  EmptyState.tsx          No-games / off-season / season-ended messaging
  Onboarding.tsx          First-run level + sport picker
  ScrumIntro.tsx          First-run "what's a scrum" aha screen (before Onboarding)
  MorphCinematic.tsx      Launch animation

lib/
  appState.tsx            AppStateProvider + useAppState() (shared state + persistence)
  api.ts                  Backend calls + ESPN fetches. API_URL + fetchExplanation,
                          askQuestion, fetchPlays, translatePlays. Types: Sport,
                          Level, Language.
  theme.tsx               ThemeProvider, darkTheme/lightTheme, brand palette
  sports.ts               SPORTS list, orderSports, isOffSeason, SEASON_WINDOWS,
                          SPORT_FULL_NAME, SportTab
  strings.ts              UI_STRINGS (10 languages), UIStrings interface
  faqs.ts                 SPORT_FAQS (per-sport common questions, localized)
  facts.ts                FACTS + QUIZ banks (Academy), 307 Qs w/ difficulty — ENGLISH ONLY
  academyCategories.ts    ACADEMY_CATEGORIES (9 Academy-only categories + sportKeys[];
                          Soccer/Rugby pool multiple leagues, combine-on-read)
  notifications.ts        registerForPushNotificationsAsync

assets/                   icon.png, adaptive-icon.png, splash-icon.png, favicon.png,
                          icon-source.png,
                          onboarding-scrum.jpg (ScrumIntro photo, ~568KB),
                          logo-lockup-dark.png / logo-lockup-light.png (welcome wordmark)
                          NOTE: assets/.gitignore ignores *.png except whitelisted
                          brand PNGs (icons + the two logo lockups); .jpg is tracked.
```

### Backend (separate, not in this repo)
- **API_URL:** `https://sports-explainer-mode.vercel.app/api/explain`
  (POST `{ action: 'explain' | 'ask', ... }`). Groq LLM behind it.
- **ESPN (no key):** Site API `site.api.espn.com/.../scoreboard` and `/summary`;
  Core API `sports.core.api.espn.com/...` for rugby/MLR (`cfg.core`).

### Persisted AsyncStorage keys
`onboarding_complete`, `seen_cinematic`, `scrum_intro_seen`, `favorite_teams`,
`user_language`, `user_level`, `auto_refresh`, `notifications_enabled`,
`sport_tab_order`, `sport_visibility`, `theme_mode`.

---

## 3. Pending work

### 🚧 Verify FIX 4 on device (highest priority before commit)
MLR/rugby team names showed as `?` because ESPN **Core API** competitors carry
`team`/`score` as `$ref` pointers (Site API inlines them). The fix
(`LiveScreen.tsx`, `cfg.core` branch) expands each competitor's `team.$ref` and
`score.$ref` in parallel (`Promise.all`), with a 3s `AbortController` timeout and
`?`/`0` fallback, so `toGame` reads the Site-API shape unchanged.
- **To verify:** open MLR and URC (rugby) in the Live tab — confirm real team
  names **and** scores **and** logos appear (all three shared the same root cause).
- Note: MLR/URC may be off-season depending on date — may need to test during
  their windows (MLR Feb–Jul, URC Sep–Jun) or temporarily point at a live fixture.

### 📋 Academy content is English-only
`lib/facts.ts` (FACTS + QUIZ) has no translation layer. FAQ headings/questions
**do** localize (via `SPORT_FAQS`), and AI answers localize (via `askQuestion`),
but facts + quiz text are English in all locales. Translate before launch
(same flag as the ja/zh/ko/ar FAQ first-pass).

### ❓ Academy ↔ Live sport sync
Academy's selected sport is **local** (seeded from the first visible sport), so it
does not mirror the Live tab's current sport. Stage 2 deliberately kept the
current sport Live-local. If "Academy opens on the same sport as Live" is wanted,
add a shared `currentSport` to `AppStateProvider` that Live writes — small change,
but revisits the "Live sport independent" decision.

### 📋 Other known TODOs
- ✅ ~~App Store ID placeholder~~ — **done:** real ID `6781028656` set in `SettingsScreen.tsx`,
  with native in-app review (`expo-store-review`) (`fa7741e`).
- ✅ ~~Contact/links placeholders~~ — **done:** `feedback@sportswise.app`,
  `https://privacy.sportswise.app`, download `https://sportswise.app` confirmed live.
- ja/zh/ko/ar UI strings need native review before submission.
- `react-native-sortables` + `expo-av`/`lottie` are still in deps — audit whether
  all are still used (drag-to-reorder was replaced by My Sports).
- ✅ ~~Remove the Live header settings cog~~ — **done** in the Live design pass (`340fd53`).

### Parked onboarding idea — "wall of questions"
Concept for first-run onboarding (not yet built; alternative or precursor to the ScrumIntro screen): naive fan questions from multiple sports cascade in and overlap, piling up until the screen is deliberately overwhelming — e.g. 'What is a wicket?', 'Why did he throw a yellow handkerchief?', 'I thought nutmeg was a spice?', 'What's icing?'. Then it all clears and resolves into clarity, landing on SportsWise as the thing that makes the confusion stop. Dramatizes the feeling of being a lost fan (multi-sport = signals broad coverage) rather than explaining one play. Possible strongest flow: question-pile (the problem, felt) → resolves → ScrumIntro reveal (the proof). Note: questions must be authentically naive in phrasing but not factually wrong about each sport.

### Live Screen Design Pass — ✅ largely shipped (`340fd53`)
The focused pass shipped (cog removal + the four issues below), all in
`screens/LiveScreen.tsx`. Status per item:

1. **✅ Redundant Academy pill.** Body CTA on the empty/learn state now navigates to the
   Academy tab ("Test your knowledge in the Academy →", enlarged/centered). The small
   header "🎓 ACADEMY" chip is kept as a status indicator (fires an explainer Alert).
2. **✅ Broken text hierarchy in the "no games" empty state.** Heading centered to match
   its neighbors; the "Ask anything" heading + ask box are now wrapped in a card.
3. **✅ Active-game sections blur together.** Consistent card-grouping + spacing (no
   divider lines); follow-up ask area is now its own card.
4. **📋 Live ↔ Academy inconsistency (still partially open).** The empty-state ask box is
   now carded to match Live's, but a full unification of the "Common Questions" accordion
   between the two tabs is still open. NOTE: the broader "should the no-games screen even
   keep the ask box + common-questions?" question is now a post-launch concept in
   `FEATURE_IDEAS.md` ("Rethink the no-games / off-season screen").

---

## 4. Current git status

- **Branch:** `main`. **HEAD:** `f2ebcd3`. Working tree **clean** — nothing
  uncommitted.
- **In sync with `origin/main`** (pushed; local is no longer ahead).
- Convention: commits land on `main`; the owner pushes from their own terminal.

Recent commits (newest first):
```
f2ebcd3 feat: Academy quiz redesign — difficulty levels, shuffle, on-card picker
8311bb7 feat: Academy 9-category sport list, decoupled from Live
d31f50d feat: expand quiz bank to 307 questions with difficulty tiers
93f8036 feat: Academy header + layout polish
2bc3027 feat: real scrum photo on intro screen + welcome-screen spacing fix
f9a475b feat: first-run scrum intro 'aha' screen + real logo on welcome screen
8d1f3ba feat: Academy tab — streak, animated quiz, did-you-know, FAQ + ask; Live tagline; MLR/rugby core-API team-name fix
b9de6a6 feat: AppStateProvider shared context — eliminates prop drilling
```

---

## 5. Running the app

All commands run from the project root (`sports-explainer-mobile-v2/`).

### Dev server
```bash
npm install
npx expo start -c        # -c clears Metro cache — REQUIRED after Reanimated/
                         # native-dep changes; Reanimated needs a full reload
```
- Scan the QR in **Expo Go** (same Wi-Fi) or type the `exp://<LAN-IP>:8081` URL.
- Push notifications + some native features need a **dev build** (not Expo Go) —
  expo-notifications is unsupported in Expo Go since SDK 53 (the app already
  guards this via `Constants.appOwnership === 'expo'`).
- Reanimated is configured (`babel.config.js` → `react-native-worklets/plugin`).
  If animations error, restart with `-c`.

### Typecheck
```bash
npx tsc --noEmit
```

### EAS builds (profiles in `eas.json`; `appVersionSource: remote`)
```bash
# one-time: npm i -g eas-cli && eas login   (owner: adeldin)
eas build --profile development --platform ios   # dev client, internal dist
eas build --profile preview     --platform ios   # internal testing build
eas build --profile production   --platform ios   # store build (autoIncrement)
eas submit --profile production  --platform ios   # upload to App Store Connect
```
- **EAS projectId:** `5019919d-136b-46ec-8cf7-259dd6259e8f` (owner `adeldin`).
- iOS bundle id / Android package: `com.adeldin.sportswise`.
- New Architecture is enabled (`newArchEnabled: true`).

---

## 6. Brand decisions

### Names
- **App name:** SportsWise (displayed wordmark: "Sports" + "**wise**" in orange).
- **Tagline:** _"Watch and ask why."_
- **Academy** = the learn/trivia tab (🎓).
- Bundle id / package: `com.adeldin.sportswise`. Expo slug:
  `sports-explainer-mobile-v2`. Expo owner: `adeldin`.

### Colors (source of truth: `lib/theme.tsx` → `brand`)
| Token | Hex | Use |
|---|---|---|
| Navy (background) | `#0d1b3e` | primary bg, splash, `onAccent` |
| Navy deep | `#0a1733` | explanation card bg |
| Navy surface | `#1a2d52` | cards/surfaces (dark) |
| **Orange (accent)** | `#E87722` | primary accent, "wise", LIVE/learn, CTAs |
| Amber | `#F5A623` | `accentText` (dark) |
| White | `#ffffff` | primary text (dark) |

- Full themed tokens (dark + light) live in `darkTheme` / `lightTheme`.
- Quiz uses literal **green `#34C759`** (correct) / **red `#FF3B30`** (wrong).
- Splash background `#0d1b3e`; Android adaptive-icon bg `#000000`.

### Fonts
- **Space Grotesk** via `@expo-google-fonts/space-grotesk`: `500Medium` (tagline),
  `600SemiBold` (headers/wordmark), `700Bold` (cinematic wordmark). Loaded in
  `App.tsx` via `useFonts`; splash held until fonts ready.

---

## 7. IAP plan 📋 (NOT yet implemented — proposed; needs owner sign-off ❓)

There is **no IAP / RevenueCat code in the repo yet**. This section is a plan, not
a record of decisions. Treat pricing as a starting proposal to confirm before build.

### Recommended approach
- **RevenueCat** (`react-native-purchases`) as the IAP/subscription layer — wraps
  StoreKit 2 / Google Billing, handles entitlements, receipts, restore.
- Single entitlement, e.g. `pro`, gating premium features.
- Use a config plugin / dev build (RevenueCat needs native modules — Expo Go won't
  work; build via EAS dev client).

### Proposed tiers (❓ confirm)
| Tier | Price (proposed) | Unlocks |
|---|---|---|
| Free | $0 | Live explanations at one level, limited daily asks, Academy basics |
| Pro Monthly | ~$3.99/mo | All expertise levels, unlimited asks, full Academy, no limits |
| Pro Annual | ~$24.99/yr | Same as monthly, discounted; primary conversion target |
| (Optional) Lifetime | ~$49.99 | One-time unlock |

### What would gate behind Pro (❓ confirm)
Candidate gates: unlimited AI asks/follow-ups, all expertise levels (Free = one),
full Academy (quiz history/streaks), share-card customization, more sports. Decide
the free/paid line before wiring.

### Implementation checklist (when greenlit)
- [ ] App Store Connect + Google Play: create subscription products + group.
- [ ] RevenueCat project; map products to entitlement `pro`; add API keys.
- [ ] `expo install react-native-purchases` (+ config plugin); EAS dev build.
- [ ] Paywall screen + `useEntitlement()`-style hook; gate features.
- [ ] Restore purchases (required by Apple); manage-subscription link.
- [ ] Sandbox testing (iOS sandbox tester, Android license testers).
- [ ] Privacy: declare purchase data; subscription terms + EULA links.

---

## 8. App Store submission checklist 📋

Build/infra (mostly ready):
- [x] Bundle id `com.adeldin.sportswise`, EAS project configured.
- [x] `ITSAppUsesNonExemptEncryption: false` set (no export-compliance prompt).
- [x] Portrait-only, iPhone-only (`supportsTablet: false`).
- [ ] Production build via `eas build --profile production -p ios`.
- [ ] `eas submit` to App Store Connect.

Assets & metadata:
- [ ] App icon final (1024×1024) — verify `assets/icon.png` is store-ready.
- [ ] Screenshots for required iPhone sizes (6.7" + others as required).
- [ ] App name, subtitle, description, keywords, category (Sports).
- [x] Support URL + privacy/marketing URLs confirmed live (`sportswise.app`,
      `privacy.sportswise.app`, `feedback@sportswise.app` — all tested working).
- [ ] App Privacy "nutrition label" (data collected: none/diagnostics? + IAP if added).

Code/content gates before submission:
- [x] **APP_ID set** — real App Store ID `6781028656` in `SettingsScreen.tsx`; Rate action
      now uses native in-app review (`expo-store-review`) with an
      `apps.apple.com?action=write-review` deep-link fallback (`fa7741e`).
- [x] Contact/links confirmed live — `feedback@sportswise.app` + privacy/download URLs tested.
- [x] **Live design pass shipped** (`340fd53`) — header cog removed, Academy CTA navigates,
      section cards, enlarged centered empty-state CTA + carded ask area.
- [ ] Native review of ja/zh/ko/ar UI strings + Academy facts/quiz translation.
- [ ] Verify FIX 4 (MLR/URC names) on a real device.
- [ ] If IAP ships: paywall, restore purchases, subscription terms (Apple rejects
      subscriptions without working restore + terms).
- [ ] Notifications: confirm APNs/push setup if game alerts are enabled at launch
      (currently guarded; needs a dev/production build to exercise).

Pre-flight:
- [ ] `npx tsc --noEmit` clean.
- [ ] Smoke test all 3 tabs, onboarding, theme/language switches, cold-start
      persistence (level + auto-refresh), My Sports hide/reorder.
- [ ] TestFlight internal pass.

---

## Conventions for the next session
- **Expo SDK 54** — read the versioned docs at
  `https://docs.expo.dev/versions/v54.0.0/` before writing native/config code
  (per `AGENTS.md`).
- Commit on `main`; **do not push** (owner pushes). Don't commit unless asked.
- After edits, run `npx tsc --noEmit`.
- Keep new screens reading shared state via `useAppState()` (don't reintroduce
  prop-drilling). Keep the current sport **Live-local** unless the sync decision
  (§3) is made.
