# SportsWise — Project Handoff

_Last updated: 2026-06-17_

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

### Built but uncommitted (Stage 3 + fixes — see §4)
- 🚧 **Academy tab** — full "Duolingo-meets-sports-trivia" experience:
  - Sport selector (mirrors Live styling, filtered by My Sports visibility).
  - **Streak counter** with Reanimated bounce + milestone celebrations at 3/5/10.
  - **Did You Know** card (`components/DidYouKnow.tsx`) — cross-fading facts.
  - **Quick Quiz** card (`components/QuizCard.tsx`) — animated correct/wrong
    (green/red fill, bounce, shake), encouragement/consolation lines,
    explanation, "Next question" (no-repeat-within-3 logic).
  - FAQ section (auto-expanded) + sport-general ask box.
- 🚧 **Header polish** — Live tab tagline "Watch and ask why."; Academy header
  reads "Sports**wise** Academy 🎓" so the wordmark stays anchored across tabs.
- 🚧 **FIX 4** — MLR/rugby team-name + score resolution from ESPN Core API
  (`$ref` expansion). **Needs on-device verification** (see §3).

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
  DidYouKnow.tsx          Academy "Did You Know" card (Reanimated fade)
  QuizCard.tsx            Academy quiz card (Reanimated; props: sport, streak,
                          onCorrect, onWrong)
  SettingsScreen.tsx      Settings screen (reads useAppState)
  MySportsScreen.tsx      Reorder/show-hide sports (reads useAppState)
  GameCard.tsx            Game strip card (Live)
  PastPlays.tsx           Per-game play-by-play (Live)
  ShareCard.tsx           Off-screen share-image card
  EmptyState.tsx          No-games / off-season / season-ended messaging
  Onboarding.tsx          First-run level + sport picker
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
  facts.ts                FACTS + QUIZ banks (Academy) — ENGLISH ONLY
  notifications.ts        registerForPushNotificationsAsync

assets/                   icon.png, adaptive-icon.png, splash-icon.png, favicon.png,
                          icon-source.png
```

### Backend (separate, not in this repo)
- **API_URL:** `https://sports-explainer-mode.vercel.app/api/explain`
  (POST `{ action: 'explain' | 'ask', ... }`). Groq LLM behind it.
- **ESPN (no key):** Site API `site.api.espn.com/.../scoreboard` and `/summary`;
  Core API `sports.core.api.espn.com/...` for rugby/MLR (`cfg.core`).

### Persisted AsyncStorage keys
`onboarding_complete`, `seen_cinematic`, `favorite_teams`, `user_language`,
`user_level`, `auto_refresh`, `notifications_enabled`, `sport_tab_order`,
`sport_visibility`, `theme_mode`.

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
- App Store ID placeholder: `APP_ID = 'APP_ID'` in `SettingsScreen.tsx` (rate-app
  deep link). Replace once registered in App Store Connect.
- Contact/links in `SettingsScreen.tsx` are placeholders: `feedback@sportswise.app`,
  `https://privacy.sportswise.app`, download `https://sportswise.app` — confirm or
  swap for real endpoints.
- ja/zh/ko/ar UI strings need native review before submission.
- `react-native-sortables` + `expo-av`/`lottie` are still in deps — audit whether
  all are still used (drag-to-reorder was replaced by My Sports).

### Parked onboarding idea — "wall of questions"
Concept for first-run onboarding (not yet built; alternative or precursor to the ScrumIntro screen): naive fan questions from multiple sports cascade in and overlap, piling up until the screen is deliberately overwhelming — e.g. 'What is a wicket?', 'Why did he throw a yellow handkerchief?', 'I thought nutmeg was a spice?', 'What's icing?'. Then it all clears and resolves into clarity, landing on SportsWise as the thing that makes the confusion stop. Dramatizes the feeling of being a lost fan (multi-sport = signals broad coverage) rather than explaining one play. Possible strongest flow: question-pile (the problem, felt) → resolves → ScrumIntro reveal (the proof). Note: questions must be authentically naive in phrasing but not factually wrong about each sport.

---

## 4. Current git status

- **Branch:** `main` (commits land on main per project convention; push is done
  by the owner from their own terminal — do **not** push).
- **Latest commit:** `b9de6a6` — _AppStateProvider shared context_.

```
b9de6a6 feat: AppStateProvider shared context — eliminates prop drilling, persists level + autoRefresh across cold starts
9eb33be feat: bottom tab navigation — Live, Academy (placeholder), Settings tabs + Context architecture Stage 1
1c54444 fix: date-aware end-of-season guard — fixes MLB showing no games between slates
7058c48 fix: LIVE/LEARN pill, off-season guard, MLR championship, learn mode badge, ...
```

### Uncommitted (Stage 3 + the 4 fixes) — NOT yet committed
```
 M screens/AcademyScreen.tsx     (full Academy build + header fix)
 M screens/LiveScreen.tsx        (Live tagline + FIX 4 core-API ref expansion)
?? components/DidYouKnow.tsx      (new)
?? components/QuizCard.tsx        (new)
?? lib/facts.ts                   (new — FACTS + QUIZ banks)
?? HANDOFF.md                     (this file)
```
**Suggested next commit** (after FIX 4 device verification), e.g.:
`feat: Academy tab — streak, animated quiz, did-you-know, FAQ + ask; Live tagline; MLR/rugby core-API team-name fix`

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
- [ ] Support URL + marketing URL (placeholders today: `sportswise.app`).
- [ ] **Privacy policy URL** live (placeholder `privacy.sportswise.app`).
- [ ] App Privacy "nutrition label" (data collected: none/diagnostics? + IAP if added).

Code/content gates before submission:
- [ ] Replace `APP_ID = 'APP_ID'` placeholder in `SettingsScreen.tsx`.
- [ ] Confirm/replace `feedback@sportswise.app` + privacy/download URLs.
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
