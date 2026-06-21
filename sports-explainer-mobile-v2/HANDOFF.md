# SportsWise — Project Handoff

_Last updated: 2026-06-21_

A React Native / Expo (SDK 54) mobile app that explains live sports plays at the
user's chosen expertise level, with an always-on "Academy" learning mode.

**Post-launch state:** v1.0 was **submitted to the App Store on 2026-06-21 (build 11,
launched FREE)** and is **in Apple review.** This document is the **current-state handoff**
for picking the project back up cold — what's built, where it lives, how to run it.
It is **not the roadmap.** For *what to build next*, **`FEATURE_IDEAS.md` is the live
roadmap / source of truth** (v1.1 build sequence + feature concepts); **`MONETIZATION.md`**
owns the freemium/pricing plan.

> ⚠️ **Status legend:** ✅ done & working · 🚧 in progress / uncommitted ·
> 📋 planned / not yet implemented · ❓ needs owner decision

---

## 1. Current app state — what's built and working

> **✅ v1.0 SUBMITTED to App Store 2026-06-21 (build 11), in review. Launched FREE.**

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
- ✅ **Settings** — expertise level, theme (system/dark/light), language picker
  (English + Spanish at launch), auto-refresh + notifications toggles, My Sports
  (reorder + show/hide sports), rate/share/feedback/privacy links.
- ✅ **Season awareness** — off-season detection, date-aware end-of-season guard,
  World Cup data-driven, learn-mode sports (tennis/golf/cricket).
- ✅ **i18n** (`lib/strings.ts`) — **English + Spanish exposed at launch** (`7730c01`);
  the 8 other translations (fr/pt/de/it/ja/zh/ko/ar) **remain in code but are hidden
  in the picker** (a stored/device language outside en/es self-heals to English on
  load). en/es/fr/pt/de/it are real translations; the hidden ja/zh/ko/ar are an
  AI-generated v1 first pass — moot for launch since they're not exposed.
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
- ✅ **Quiz bank** (`lib/facts.ts`) — **579 questions** across 14 sport keys with
  difficulty tiers (`kid`/`beginner`/`intermediate`/`expert`) (`cfba62f`). English-only
  (see §3).
- ✅ **First-run scrum intro** (`components/ScrumIntro.tsx`) — animated 3-beat
  "what just happened / why it matters / the rule" aha screen shown once before
  onboarding (gated on `scrum_intro_seen`), over a real licensed rugby scrum photo.
- ✅ **Welcome screen** — real Sportswise logo lockup (theme-aware dark/light),
  centered hero + features (spacing fix); Live tab tagline "Watch and ask why."
- ✅ **FIX 4** — MLR/rugby team-name + score resolution from ESPN Core API
  (`$ref` expansion, 3s timeout + `?`/`0` fallback). Verified on device pre-launch.
- ✅ **Local quiz-reminder notification** (`fd89f0e`) — a single on-device DATE-trigger
  reminder (`lib/notifications.ts` → `scheduleQuizReminder` / `cancelQuizReminder`,
  presented via `setupNotificationHandler`) scheduled for the next 7pm and re-armed on
  each quiz, so it only fires if the user goes quiet. Respects the Game Alerts toggle;
  fires only on real device builds (guarded in Expo Go / simulators). This made the
  notification permission legitimate (no orphaned-permission App Store risk).
- ✅ **Launch language trim** (`7730c01`) — picker shows English + Spanish only; the
  8 other translations stay in code, hidden, and self-heal to English on load.

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
  strings.ts              UI_STRINGS (10 translations in code; en/es exposed in picker, 8 hidden), UIStrings interface
  faqs.ts                 SPORT_FAQS (per-sport common questions, localized)
  facts.ts                FACTS + QUIZ banks (Academy), 579 Qs w/ difficulty — ENGLISH ONLY
  academyCategories.ts    ACADEMY_CATEGORIES (9 Academy-only categories + sportKeys[];
                          Soccer/Rugby pool multiple leagues, combine-on-read)
  notifications.ts        registerForPushNotificationsAsync + the local quiz reminder:
                          scheduleQuizReminder / cancelQuizReminder / setupNotificationHandler

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

> **For the prioritized v1.1+ roadmap, see `FEATURE_IDEAS.md`** (v1.1 build sequence +
> feature concepts) and **`MONETIZATION.md`** (freemium plan). This section is only the
> **near-term technical / handoff items** — not the product roadmap.

### Resolved at launch (no longer pending)
- ✅ **Verify FIX 4 (MLR/URC team names + scores)** — verified on device pre-launch; the
  Core-API `$ref`-expansion branch in `LiveScreen.tsx` resolves real team names, scores,
  and logos. Closed.
- ✅ **ja/zh/ko/ar native review "before submission"** — **RESOLVED by the en/es launch
  trim** (`7730c01`): those four languages are hidden from the picker, so their
  first-pass quality is no longer launch-exposed. Revisit only if/when they're re-enabled.
- ✅ App Store ID + contact/privacy links + Live design pass + header cog removal — all
  done pre-launch (`fa7741e`, `340fd53`).

### Still open (post-launch)
- **📋 Academy content is English-only.** `lib/facts.ts` (FACTS + QUIZ, 579 Qs) has no
  translation layer. FAQ headings/questions **do** localize (via `SPORT_FAQS`) and AI
  answers localize (via `askQuestion`), but facts + quiz text are English in all locales.
  **Not a blocker** — en/es launched and the quiz is English in both today; this is a
  **known gap tied to future language expansion**, not pre-launch work.
- **❓ Academy ↔ Live sport sync.** Academy's selected sport is **local** (seeded from the
  first visible sport), so it does not mirror the Live tab's current sport — a deliberate
  Stage-2 decision. If "Academy opens on the same sport as Live" is wanted, add a shared
  `currentSport` to `AppStateProvider` that Live writes (small change; revisits the
  "Live sport independent" decision). Verify current behavior before changing.
- **📋 Dependency audit.** `react-native-sortables` + `expo-av` / `lottie` are still in
  deps — audit whether all are still used (drag-to-reorder was replaced by My Sports;
  `lottie-react-native` is retained for the planned Coach's Corner, see `FEATURE_IDEAS.md`).
- **📋 Common-Questions accordion unification.** The empty-state ask box is now carded to
  match Live's, but full unification of the "Common Questions" accordion between the Live
  and Academy tabs is still open. NOTE: the broader "should the no-games screen even keep
  the ask box + common-questions?" question is a post-launch concept in `FEATURE_IDEAS.md`
  ("Rethink the no-games / off-season screen").
- **💡 Parked onboarding idea — "wall of questions."** First-run concept (not built;
  alternative or precursor to ScrumIntro): naive fan questions from multiple sports cascade
  in and overlap until the screen is deliberately overwhelming — e.g. 'What is a wicket?',
  'Why did he throw a yellow handkerchief?', 'I thought nutmeg was a spice?', 'What's
  icing?'. Then it all clears and resolves into clarity, landing on SportsWise as the thing
  that makes the confusion stop. Dramatizes being a lost fan (multi-sport = broad coverage)
  rather than explaining one play. Possible strongest flow: question-pile (the problem,
  felt) → resolves → ScrumIntro reveal (the proof). Questions must be authentically naive
  in phrasing but not factually wrong about each sport.

---

## 4. Current git status

- **Branch:** `main`. **HEAD:** `20e4e01`. Working tree **clean** — nothing
  uncommitted.
- Convention: commits land on `main`; the owner pushes from their own terminal.

Recent commits (newest first):
```
20e4e01 docs: capture v1.0 launch milestone, north star, Coach's Corner + recap, v1.1 sequence, freemium plan
7730c01 feat: limit launch languages to English + Spanish; coerce hidden-language preferences to English on load
fd89f0e feat: local quiz reminder notification — fires next 7pm if user is away, respects Game Alerts toggle
cfba62f content: add 272 quiz questions (307 → 579) — deepen thin tiers across all sports
79ef2f0 fix: TestFlight feedback — LIVE-only header, Academy CTA opens matching sport, add NHL Academy category
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
| Navy (background) | `#0D1B3E` | primary bg, splash, `onAccent` |
| Navy deep | `#0a1733` | explanation card bg |
| Navy surface | `#1a2d52` | cards/surfaces (dark) |
| **Orange (accent)** | `#E87722` | primary accent, "wise", LIVE/learn, CTAs |
| Amber | `#F5A623` | `accentText` (dark) |
| White | `#ffffff` | primary text (dark) |

- Full themed tokens (dark + light) live in `darkTheme` / `lightTheme`.
- Quiz uses literal **green `#34C759`** (correct) / **red `#FF3B30`** (wrong).
- Splash background `#0D1B3E`; Android adaptive-icon bg `#000000`.

### Fonts
- **Space Grotesk** via `@expo-google-fonts/space-grotesk`: `500Medium` (tagline),
  `600SemiBold` (headers/wordmark), `700Bold` (cinematic wordmark). Loaded in
  `App.tsx` via `useFonts`; splash held until fonts ready.

---

## 7. Monetization 📋 (v1.1 — NOT in launched v1.0)

**v1.0 shipped FREE, no IAP / RevenueCat code in the repo.** Monetization is **freemium,
planned as v1.1.** Confirmed pricing **$4.99/mo · $49.99/yr**, via **RevenueCat + StoreKit**.

**`MONETIZATION.md` is the source of truth** — full plan, the "gate what costs money"
principle, and the privacy-re-declaration flag (App Privacy must be revisited when accounts
+ subscriptions ship) all live there. **Do not duplicate pricing or gating decisions here.**

---

## 8. App Store submission — ✅ complete 2026-06-21 (historical record)

**✅ Submitted 2026-06-21 — app in review.** v1.0, **build 11**, **FREE**, **age 4+**.

What was submitted (record):
- **Build/infra:** production build via EAS, `eas submit` to App Store Connect; bundle
  `com.adeldin.sportswise`; `ITSAppUsesNonExemptEncryption: false`; portrait-only,
  iPhone-only.
- **Assets & metadata:** name "SportsWise: Watch & Ask Why," subtitle/description/keywords,
  category Sports, app icon (1024×1024), **5 iPhone 6.7" screenshots** (1290×2796,
  cream/navy/orange); support + privacy + marketing URLs live (`sportswise.app`,
  `privacy.sportswise.app`, `feedback@sportswise.app`).
- **App Privacy "nutrition label":** collects **"Other User Content"** (typed questions)
  → **App Functionality**, **not linked to identity**, **not used for tracking** (true
  because the app is fully anonymous — no accounts). ⚠️ **Revisit when v1.1 adds accounts +
  subscriptions** — see `MONETIZATION.md`.
- **Code/content gates:** real APP_ID `6781028656` + native in-app review (`fa7741e`);
  Live design pass (`340fd53`); FIX 4 verified on device; ja/zh/ko/ar review mooted by the
  en/es launch trim; `npx tsc --noEmit` clean; TestFlight internal pass done.

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
