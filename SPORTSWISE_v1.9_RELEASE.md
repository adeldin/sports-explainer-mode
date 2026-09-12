# SportsWise v1.9 — release notes & build manifest

*Cut 2026-09-11. Previous binaries: **iOS v1.8.0 (build 39, 2026-08-18)** · **Android v1.8.0 (versionCode 3, 2026-08-30 — first Play release).* This is the **first release cut for both stores together** (see the ship-together rule in the authoring standard).

Branch: `feat/event-context` · marketing version **1.9.0** · App Store version string **1.9** (x.y precedent from 1.0–1.5) · Android versionCode **4**.

**iOS:** build **40** (`10cba03d-01e0-4e67-b1f3-4b42a1321176`) → App Store Connect version 1.9 `dae30b77-e5b1-4810-88d4-67246e4e2294`, review submission `923cda0f-4e45-410f-bc72-7ab5f64e4d42`, state **WAITING_FOR_REVIEW** (2026-09-11).
**Android:** build `d87e6c9d-ad1f-402c-88eb-e64f7a3fca58`, versionCode 4 — release-build orientation tap-test **4/4 genuine passes** on Pixel_9 (API 36) before upload.

---

## What's New (store copy — identical intent on both stores; Play uses the ≤500-char form)

> NEW IN 1.9 — five rugby drills in Coach's Corner:
> • Jam or Drift? — outnumbered on defense: rush the carrier, drift and buy time, or shoot the spare man?
> • Commit or Fan? — a tackle is made: go for the steal, or fan out and set the line? The cleaner's distance is the read.
> • Exit Strategy — pinned in your own 22: box kick, long clearance, or run it out? Read their backfield.
> • One More Phase? — numbers wide, but is their 13 still free to drift? Fix him, then cash the overlap.
> • Hold the Short Side? — why a defender guards the quiet strip while the crowd forms elsewhere.
>
> Each drill has three scenarios and a coach's read at every level from Rookie to Expert.
>
> Fixes — first-run screens lay out correctly on every device, and the privacy and share links are corrected.

Rugby Coach's Corner goes from 5 pieces to 10 (`piecesForSport('rugby')`).

---

## Ships in this binary

### Coach's Corner — 5 new rugby read modules (2026-09-04)
All on the new shared `components/academy/RugbyReadEngine.tsx` (one canonical component; frozen scene → option buttons → graded verdict + declared reveal lines). Content is data in `lib/`.

| Module | lib file | The decision |
|---|---|---|
| Jam or Drift? | `jamOrDrift.ts` | last defender in a 2-v-1: jam / drift / shoot |
| Commit or Fan? | `commitOrFan.ts` | tackle made: steal or set the line (cleaner distance) |
| Exit Strategy | `exitStrategy.ts` | the 9 in the 22: box / long / run (their backfield shape) |
| One More Phase? | `oneMorePhase.ts` | crash to fix their 13, or ship wide |
| Hold the Short Side? | `holdShortSide.ts` | stay / fold / shoot the 9 |

Authored to `COACHES_CORNER_AUTHORING_STANDARD.md` (punishers declared in data; slate cross-examined by three AIs — the advantage and mark ideas were killed for World Rugby law errors, the lineout idea as a coin-flip). 15 scenarios, four levels each. Verified in Expo Go on the iOS Simulator and the Android emulator, correct and wrong paths.

### Fixes since 1.8.0
- Android drill dead-touch race fixed (`GameHost.scheduleLock`, see commit cd5209a) — the reason 1.8.0 Android needed a fast follow.
- `Onboarding.tsx` / `ScrumIntro.tsx`: `useWindowDimensions` instead of module-scope `Dimensions.get` (stale early read broke first-run layout on Android).
- `SettingsScreen.tsx`: privacy link → `explainer-privacy.sportswise.app`; share link → working site.
- RevenueCat per-platform key plumbing (`lib/entitlement.tsx`), Pro UI gated on key presence.

### Pending tactical review
The five rugby modules ship on the strength of law citations + multi-AI critique; Anthony's Chicago Hounds contact reviews them post-release for tactical truth. Copy adjustments, if any, are data-only.

---

## Release procedure (both stores)
1. `eas build --platform all --profile production` (Android d87e6c9d… · iOS 10cba03d…).
2. Android: bundletool universal APK → release-build orientation tap-test on Pixel_9 (the race only shows in release builds) → `upload_aab.py` pushes the AAB to the production track with release notes and commits (auto-sent for review; managed publishing off).
3. iOS: `eas submit --platform ios --latest` → `asc_release.py create-version` → `set-notes` → `attach-build <n>` → `submit`.
4. Store version string `1.9`; review notes rewritten (landscape drills, how to reach them without a subscription).
