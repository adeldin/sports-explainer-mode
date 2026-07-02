# BUILD — Chrome Extension v1.1 (Live-Explain Parity)
*Written 2026-06-28. Architect: Claude.ai chat. Executor: Claude Code. Git: Anthony only.*

---

## 0. WHAT THIS IS

A gated build doc to bring the **Chrome extension's live-explain core** up to parity with the
current backend — NOT full feature parity with the iOS app. The extension is a glanceable live
overlay; it should match the app on what happens *during a live play* and skip app-surface depth
(Academy, quizzes, streaks, Coach's Corner, Pro gating).

**Status precondition:** v1.0.1 (the permissions+icon fix) is IN REVIEW with Google. Do NOT
upload anything from this doc until that review clears. Build and stage now; ship as v1.1 after.

**Governing principle (drives most decisions here):** keep every change INSIDE the extension.
Do NOT make the app's live `/api/explain` backend absorb risk for an extension-only feature
while the app is mid-launch (World Cup soft-launch ~July 1). The backend is the higher-risk
surface (Vercel deploys straight to the live app). Frontend-only changes have a blast radius
contained to the extension.

**Extension dir:** `/Users/anthonydeldin/Desktop/sports-explainer-mode/chrome-extension/`
Files: `manifest.json`, `background.js`, `content.js`, `popup.html`, `popup.js`, `overlay.css`,
`icon{16,48,128}.png`.

---

## 1. DATA PROOF (already done — do not re-litigate)

Verified live on 2026-06-28 against `/api/explain` with a real live MLB game (`401815937`,
Reds @ Pirates, Top 3rd). The current backend response shape is:

```json
{
  "simple": "...",
  "whyItMatters": "...",
  "ruleDetail": "",
  "showRule": false,
  "complexity": "medium",
  "playType": "Pitch 4 : Ball 3",
  "homeTeam": "Pittsburgh Pirates",
  "awayTeam": "Cincinnati Reds",
  "gameContext": "Cincinnati Reds vs Pittsburgh Pirates — Top 3rd"
}
```

**Contract drift confirmed vs. what the overlay (`content.js`) currently reads:**

| Overlay reads | Backend returns | Verdict |
|---|---|---|
| `simple` | ✅ | OK |
| `playType` | ✅ | OK |
| `homeTeam` / `awayTeam` | ✅ | OK |
| `whyItMatters` | ✅ | OK |
| `rawPlay` ?? `play` | ❌ **absent** | "Show Source Play" is DEAD |
| `state` | ❌ **absent** (replaced by `gameContext`) | smart-poll cadence + status label DEGRADED |
| — | `gameContext` ✅ (ignored) | available, unused |
| — | `ruleDetail` / `showRule` ✅ (ignored) | free teaching feature, unused |
| — | `complexity` ✅ (ignored) | difficulty signal, unused |

**`expert` level proven:** the backend honors `level:"expert"` on real live games and returns
genuinely advanced, play-grounded text (it referenced the actual 3-0 count). 4th level is safe.

**Request contract (unchanged, confirmed working):**
- Play: `POST /api/explain` body `{ sport, level, gameId, language }` (no `action`).
- Ask: `POST /api/explain` body `{ action:"ask", sport, level, question, context, language }`.

---

## 2. CURRENT EXTENSION STATE (from recon, for reference)

- **Sports (7):** `nfl`, `mlb`, `nba`, `nhl`, `soccer` (labeled "MLS", league `usa.1`),
  `worldcup` (`fifa.world`), `rugby` (ESPN Core API).
- **Levels (3):** `kid`, `beginner` (default), `intermediate`.
- **Languages (10):** `en`(default), `es`, `fr`, `pt`, `de`, `ja`, `zh`, `ko`, `it`, `ar`.
- **Known defects:**
  - Overlay settings panel has NO control to change level or language → both stuck at
    `beginner`/`en` in the overlay (only the popup can set level, and only before launch).
  - `context` on "Ask" is wired to `currentPlayText`, which is never updated after init →
    every question is sent with empty context (Q&A answers blind).
  - "Show Source Play" reads `rawPlay`/`play` → always "No raw data available."
  - Status label / poll cadence read `state` → always undefined.

---

## 3. SCOPE — FOUR TIERS, GATED

### Tier 0 — Re-sync the response contract (priority zero: fixes live degradation)

**0a. Status label → `gameContext`.** Wherever the overlay sets the status/label from the dead
`state` field, use `gameContext` instead (the human string e.g. "…— Top 3rd"). Render it as the
status line.

**0b. Smart-poll cadence — RECOMMENDED: frontend-parse from `gameContext`.**
`state` is gone; the overlay needs *some* cadence signal. Two options:

- **(RECOMMENDED) Frontend-only parse.** Derive cadence by matching tokens in `gameContext`:
  - contains `"Final"` → STOPPED (poll very slow / not at all)
  - contains `"Halftime"`, `"End "`, `"Mid "` → SLOW cadence
  - contains `"Top "`, `"Bot "`, a clock, or live tokens → LIVE cadence (current fast default)
  - **no match → default to LIVE cadence** (safe: never freezes a live game; worst case is
    polling a stopped game slightly too often).
  - *Pro:* zero backend risk, blast radius entirely in the extension. *Con:* `gameContext` is a
    human string; if the backend reword it, parsing drifts — mitigated by the safe default.
- **(FALLBACK) Backend re-adds a machine-readable `state`.** Cleaner data contract, but edits
  the FROZEN explain path for an extension-only benefit while the app is mid-launch. Only do this
  if Anthony explicitly accepts backend risk. **Architect recommendation: do NOT; use the parse.**

> **DECISION FOR ANTHONY:** confirm frontend-parse (recommended) vs. backend-add at Gate 0.

**0c. "Show Source Play" — RECOMMENDED: remove it.**
`rawPlay` is gone; the feature is dead. Options:
- **(RECOMMENDED) Remove** the "Show Source Play" toggle + `#se-source-box` from the overlay
  and its handler. It's the lowest-value, least-glanceable feature; removing it declutters the
  overlay and touches nothing risky. Backend untouched.
- **(FALLBACK) Keep** and have the backend re-include `rawPlay` — again edits the frozen path
  for low payoff. **Architect recommendation: remove.**

> **DECISION FOR ANTHONY:** confirm remove (recommended) vs. keep+backend at Gate 0.

**0d. Render `ruleDetail` when `showRule` is true (free teaching win).**
The backend already returns `ruleDetail` (string) + `showRule` (bool). When `showRule === true`,
render `ruleDetail` in a reveal box (reuse the existing `whyItMatters` styling pattern; hide when
`showRule` is false or `ruleDetail` is empty). This is on-brand ("teach, don't display") and pure
upside — data is already on the wire.

**Gate 0:** Anthony tests overlay on a live MLB game (use the ESPN scoreboard curl to find one):
status label shows `gameContext`; polling feels right (live game keeps updating, doesn't freeze);
no "No raw data available" box (if removed); `ruleDetail` appears on a rule-worthy play. Report back.

---

### Tier 1 — Wire the inert level + language controls into the overlay

The overlay's settings panel currently only has "Done." Add:

**1a. Level control** — a row of pills (Rookie / Beginner / Intermediate / Expert — see Tier 2 for
the 4th + the Rookie rename) in the overlay settings panel. On change: update `settings.level`,
persist to `seSettings` (chrome.storage.local), and trigger a re-fetch so the next explanation
uses the new level immediately.

**1b. Language control** — a dropdown of the existing 10 languages in the settings panel. On
change: update `settings.language`, persist, re-fetch.

**1c. Fix the empty `context` on Ask.** Assign `currentPlayText` from the latest explanation the
overlay receives (use `response.simple`, optionally + `response.playType`) so that when the user
asks a question, `context` carries the actual on-screen play. Small change, large quality jump —
directly serves "watch and ask why."

**Gate 1:** Anthony tests on a live game: changing level in the overlay visibly changes
explanation difficulty; changing language changes output language; asking a question returns an
answer that references the current play (not generic). Report back.

> Backend risk: NONE. The backend already accepts all level/language values (proven). All changes
> are frontend.

---

### Tier 2 — Add `expert` (4th level) + display `kid` as "Rookie"

**2a. Add `expert`** to the overlay level control (Tier 1a) and to the popup pills
(`popup.html` + `VALID_LEVELS` in `background.js`). Backend already honors it (proven live).

**2b. Display-rename `kid` → "Rookie"** in BOTH the overlay and popup UI. **CRITICAL — match the
app's frozen pattern:** rename only the DISPLAY label. The internal key stays `kid` everywhere
(the data-level attribute, `settings.level`, `VALID_LEVELS`, the `/api/explain` request body, and
`seSettings` persistence). Per handoff §9: display-rename, never internal.

- `VALID_LEVELS` becomes `['kid', 'beginner', 'intermediate', 'expert']`.
- Pill labels: `Rookie` (key `kid`), `Beginner`, `Intermediate`, `Expert`.

**Gate 2:** Anthony confirms 4 pills in both popup and overlay; "Rookie" displays but the request
still sends `level:"kid"` (check via DevTools Network or a console log); `expert` returns advanced
text. Report back.

---

### Tier 3 — Sport verification + label fix

**3a. Fix the misleading soccer label.** The picker shows "⚽ MLS" but the key is `soccer` and the
league is `usa.1`. Either relabel to "⚽ Soccer (MLS)" for honesty, or leave as MLS if that's the
intended scope. Low stakes; Anthony's call.

**3b. Verify the 7 sports against the current backend.** For each of nfl/mlb/nba/nhl/soccer/
worldcup/rugby, confirm `/api/explain` still returns a sane response shape (especially that
`gameContext`/`homeTeam`/`awayTeam` populate). Out-of-season sports (NFL/NHL/NBA in late June)
won't have live games — verify with the empty-state fallback shape at minimum; full live
verification deferred to their seasons.

**3c. (Optional, defer) New play-by-play sports.** If the backend has gained any *play-by-play-
shaped* sports since the extension froze, they could be added to the picker. NOTE: special-format
sports (golf=leaderboard, tennis=unbuilt) do NOT fit the play-by-play overlay and are OUT of scope.
This sub-tier is optional and can be its own future doc.

**Gate 3:** Anthony confirms the 7 sports return sane shapes; label fixed. Report back.

---

## 4. VERSION + SHIP (after all gates pass AND v1.0.1 review has cleared)

1. Bump `manifest.json` version `1.0.1` → `1.1.0`.
2. Pre-ship grep: confirm no debug `console.log` left in the shipped path.
3. Rebuild the zip (contents at root, per the v1.0.1 process):
   `cd chrome-extension && zip -r ../sports-explainer-1.1.0.zip . -x "*.DS_Store"`
   then `unzip -l` to confirm 9 files at top level, icon128 small.
4. Upload to Developer Dashboard → Package → Upload new package → Submit (NOT appeal).
5. Expect the `<all_urls>` in-depth-review warning again (accepted tradeoff).

---

## 5. GIT DISCIPLINE (Anthony runs all git; explicit paths only)

Per-tier commits, never `git add .`. Example targets:
- Tier 0: `git add chrome-extension/content.js chrome-extension/overlay.css`
- Tier 1: `git add chrome-extension/content.js chrome-extension/popup.js chrome-extension/popup.html chrome-extension/overlay.css`
- Tier 2: `git add chrome-extension/popup.html chrome-extension/background.js chrome-extension/content.js`
- Tier 3: `git add chrome-extension/popup.html chrome-extension/background.js`

After every push: confirm Vercel goes GREEN (these are extension-only changes, so it should be a
no-op for the Next.js build — but confirm, per the backend-safety rule).

---

## 6. OUT OF SCOPE (do NOT build in v1.1)

Glossary tap-mechanic, game-state cards beyond the status line, Coach's Corner, streaks, quizzes,
onboarding, Pro/RevenueCat gating, golf/tennis/leaderboard formats. These are app-surface depth or
special-format; they work against the overlay's glanceable job. Bank them, don't build them.

---

## 7. RECON-FIRST REMINDER FOR CLAUDE CODE

Before editing, re-read the actual current `content.js`, `popup.js`, `popup.html`, `overlay.css`,
`background.js` (this doc is based on a recon that may be a few commits stale). Confirm the exact
element IDs (`#se-explanation`, `#se-play-type`, `#se-teams`, `#se-why`, `#se-source-box`,
`#se-answer-box`, the settings panel container) before wiring new controls. Stop at each gate.

---

## 8. MONETIZATION — PLACEHOLDER (POST-APPROVAL, POST-INSTALL-BASE — NOT v1.1)

**Do NOT build any of this during v1.1.** This is captured so the decisions aren't lost. It gets
its own gated build doc later, AFTER: (a) the free extension is approved and live, and (b) it has
built up an install base + reviews. A paywall on a zero-install extension converts nobody.

**Access model (DECIDED): "solo OR companion" — unified under ONE product: SportsWise Pro.**
Naming is already established and consistent: FREE = "SportsWise", PAID = "SportsWise Pro" (same
as the iOS app). The overlay's upsell says "upgrade to Pro" — matches the app, no brand friction.

SportsWise Pro is ONE entitlement that unlocks Pro on EVERY surface (iOS app + extension + future
Apple TV). It can be entered through different doors:
- Bought via app IAP (RevenueCat) → Pro everywhere, incl. the extension (companion).
- Bought solo via Stripe on web/extension → same SportsWise Pro, just a different purchase door.
There are NOT two separate paid products; there is one Pro subscription, many surfaces. A user who
only wants the extension buys SportsWise Pro without ever using the app.

**Architecture (RECOMMENDED): RevenueCat as the single entitlement brain, Stripe as one payment door.**
- Anthony already runs Stripe (balloonandtusk.com) and RevenueCat (the app) — both rails exist.
- RevenueCat supports web/Stripe purchases AND the existing app subscription → unify both into ONE
  "is this user entitled?" answer.
- The extension's backend (`/api/explain`) is the natural enforcement chokepoint — every unit of
  value is already a backend call. Gate there.
- App subscriber → RevenueCat says entitled (companion). Solo buyer → Stripe charge → RevenueCat →
  entitled. Backend asks RevenueCat one question regardless of payment path.
- Alternative (NOT recommended): run Stripe and RevenueCat entitlements as two separate systems and
  OR them manually → two sources of truth to reconcile. Higher maintenance.

**Free / paid split (DECIDED — freemium):**
- FREE tier: English only + limited AI calls per game.
- PAID tier: all 10 languages + unlimited (or higher) calls per game.
- Rationale: both gates map to real cost/value. Calls = direct backend AI token cost (cap free
  users' cost). Languages = premium value, no extra cost to offer. Free tier stays genuinely usable
  (English explanations work) → builds install base before paywall.

**Design constraint (IMPORTANT): the paywall moment must feel like an OFFER, not a FAILURE.**
When a free user hits the per-game call cap MID-GAME, the overlay must NOT go silent or error (that
generates "stopped working" 1-star reviews). Instead, render an in-overlay upsell in place of the
next explanation. Confirmed copy direction (one glanceable line, offer-framed, names the unlock,
uses established "Pro" branding), e.g.:
  "You've used your free explanations for this game — upgrade to Pro for unlimited."
  or: "Free plays used up for this game — upgrade to Pro for unlimited explanations in 10 languages."
Same moment becomes conversion instead of breakage.

**OPEN QUESTIONS (decide with real usage data, post-launch):**
- Free call limit: how many per game? Reset per-game (generous, demo-friendly) vs. per-day (harder
  cost cap)? Decide after seeing real average session cost.
- Price point for solo purchase (one-time vs. subscription).
- Whether Expert level (v1.1 Tier 2) is also a paid gate or stays free.

**Sequencing note:** the free-approval milestone IS step one of the monetization plan, not separate
from it. Free launch → install base → freemium paywall. Do not paywall before there are users.
