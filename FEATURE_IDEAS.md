# Feature Ideas & Roadmap

## 🎯 Core audience reframe

The primary audience is **"sports-curious" people** — partners, friends, and family of
fans who want to feel included. The app's job is to make someone **feel like they belong
in the conversation**, not to serve existing experts.

## ⭐ North star use case

> A girlfriend's boyfriend loses his mind over Shohei Ohtani's complete-game one-hitter.
> She opens the app, gets a **Kid-level** explanation of *what* happened **and** *why* it's
> historically significant (the Babe Ruth comparison), and can now **participate in the
> conversation**.

## 🧭 Three product modes

- **Live Companion** *(built)* — explains plays in real time, ask anything, follow along
  during games.
- **Team Knowledge Companion** *(new)* — learn about a specific team before/outside games:
  standings context, player spotlights, key stats explained for non-fans.
  Use case: *"I just started dating a Bears fan, teach me about the Bears."*
- **News Companion** *(new, complex)* — breaking sports news translated for non-fans.
  Proactive / push-based. Requires a notification system or feed — **later phase**.

## 🔒 V1.0 scope lock

**IN:** translation fix · team logos · dark mode · past plays (MLB/NHL first) · FAQ chips ·
soccer/rugby UI · App Store submission.

**OUT (explicitly v2.0):** TV app · GovWise · StockWise · full language
UI (backend done, UI later) · pop-up facts system · Team Knowledge Companion mode ·
historical data · past plays for soccer.

**Timeline:** ~6 weeks to App Store submission at 3–5 hours/night. **Mid-to-late July target.**

---

## ✅ Completed and live (backend expansion)

- ✅ **Languages backend** — all user-facing fields, including `playType`, translate consistently.
- ✅ **Soccer / World Cup backend** — ESPN site API (`usa.1` / `fifa.world`); play text via the summary `keyEvents` path (soccer has no `plays[]` array).
- ✅ **Rugby backend** — ESPN Core-API two-step `$ref` fetch (default league: URC `270557`).
- ✅ **Stray root `babel.config.js` removed** — it was silently breaking **all** Vercel deploys (Next picked up an Expo/React-Native babel config and failed every build). Fixed in `7f25d22`.
- ✅ **`playType` translation** — dedicated `translatePlayText()` Groq call running in parallel with the explanation (no added latency); replaced the unreliable model-returned `playSummary` field.
- ✅ **Debug instrumentation** — added to diagnose translation, then removed cleanly (`eb019ca`).

**Remaining backend: nothing — the backend expansion is complete.**

## 🔜 Next phase — Mobile UI

**Shipped:**
- ✅ Widened `Sport` type (+`soccer`/`worldcup`/`rugby`) in `lib/api.ts`.
- ✅ Soccer, World Cup, rugby in the sport picker (rugby via the Core-API two-step `$ref` fetch; leagues match the backend so `gameId`s align). (`ae35462`)
- ✅ Language picker in `SettingsScreen.tsx` — 10 languages, persisted, re-fetches on change. (`ae35462`)
- ✅ Team logos on game cards (ESPN logo URLs, graceful fallback). (`3126058`)
- ✅ Dark / light / system theme (`ThemeProvider` + semantic tokens; `userInterfaceStyle: automatic`). (`d5561f2`)
- ✅ Per-sport "Common Questions" FAQ — collapsed-by-default section above the games, routed through the ask path; pre-translated into all 10 languages (`lib/faqs.ts`).
  - ⚠️ **Before App Store submission:** the CJK + Arabic FAQ translations (ja / zh / ko / ar) are an AI-generated **v1 first pass** and need **native-speaker review**. (es/fr/pt/de/it are higher-confidence but a proofread wouldn't hurt.)

**Active, in order:**
1. **Past plays** — scroll back through a game's plays and tap one to explain. Start with **MLB / NHL** (`plays[]` confirmed; NBA confirmed too; NFL verify in-season; soccer uses `commentary[]`/`keyEvents[]`).
2. **App Store submission.**

---

## 💡 Feature concepts

### AMC pop-up format
While a game is selected, small contextual **fact-cards float up periodically**
(non-blocking, dismissable). Tap for a full explanation; ignore it and it fades.
Genuinely distinct from what any current sports app does.
Examples: team-history facts, "did you know," context beyond the play itself.

### FAQ / common questions *(low lift, do soon)*
A browsable list of commonly-asked questions per sport when a game is selected.
Tap one → routes through the existing ask path → level-appropriate answer.
An expanded version of the existing follow-up chips.

### Capture user questions *(medium-high, later)*
Log free-text questions users type (anonymized) to find real patterns, and promote the
most common into the curated FAQ. Requires a datastore + privacy consideration.

### "What did the announcer mean?" *(low, mostly works already)*
Viewers don't understand broadcast jargon. The free-text box already handles this — it's
mostly a **surfacing/prompting** problem. Add framing near the ask box like
*"Heard a term you don't know? Ask what it means."*

### 📸 Image / video upload — "show me what's on screen" *(v2, post-launch)*

**Concept:** User points their phone at the TV, takes a photo or screenshot of a confusing
moment, and uploads it. An AI **vision** model analyzes the image and returns a
**level-appropriate** explanation of what it sees. Fills the gap when the live data feed
misses something that's only visible on the broadcast.

**Use cases:**
- A confusing play the ESPN API didn't capture clearly.
- A referee/official explanation graphic shown on screen.
- A replay graphic showing penalty or call details.
- A booth-review decision displayed on the broadcast.
- A stats or standings graphic the user doesn't understand.
- Anything on screen the live data feed misses.

**Technical path:**
- **Still photos preferred over video** — faster upload, cheaper, more reliable.
- **Vision model:** GPT-4o vision (most capable), Claude vision, or Gemini — pick during build.
- **Backend:** new `/api/explain-image` endpoint accepting **base64 image + sport + level + language**.
- Same **four expertise levels** and **language support** as the text explanations.
- **Prompt shape:** *"This is a screenshot from a live [sport] broadcast. Describe what is
  happening and explain it at a [level] level."*

**Monetization:** a natural **paid-tier** feature. Free = live API explanations; Paid = image
upload for the moments the API misses. (See `MONETIZATION.md`.)

**Platform extension:** the same capability applies to every future vertical —
courtroom broadcast screenshot → **LegalWise**; financial news chart → **StockWise**;
government hearing graphic → **GovWise**. Ties into the "[Topic]Wise" family above.

**Challenges:**
- Phone-camera angle / glare on TV screens (manageable).
- Video too large/slow — **stick to still frames for v1**.
- Higher cost per query than text — reinforces the paid-tier positioning.

**Priority:** post-launch **v2**. Build **after App Store submission**.

---

## 🧲 Yahoo Sports features to steal

- **Team logos on game cards** — already on the list; **reprioritize as a fast win.**
- **Recent games (last 5) per team** — W/L and scores for context.
- **More Info section per game** — venue, broadcast channel, weather.
- **Compact pill-style game cards** — more important as the sport count grows.
- **Team stats / rankings bar chart** — context before explaining plays.
- **SKIP:** pick-your-winner/odds (conflicts with brand), community/discuss (too complex),
  generic banner ads (see `MONETIZATION.md`).

---

## 📺 TV app vision

- A **true overlay** over another app is **OS-level impossible** on all TV platforms.
- **Streaming live sports** is a **legal wall** (broadcast rights), not a technical one.
- **Buildable:** an **Apple TV app (tvOS)** via the **Expo TV target** — same codebase,
  different build. The user watches the game through their own service; the app runs alongside.
- **Picture-in-Picture:** user puts YouTube TV in a PiP corner, SportsWise fills the
  main screen — the closest thing to the overlay vision, and it **works today on tvOS**.
- **TV provider integration** *(longer term)*: user signs in with YouTube TV/cable, the app
  knows what game they're watching = more relevant explanations.
- **Living-room use case:** family watching together; non-fans see explanations without
  picking up a phone.
- **Priority:** after the mobile App Store launch.

---

## 🌐 Platform vision — the "[Topic]Wise" family

The core product is a **real-time complexity translator**. Sports is the beachhead.

**Test for a new vertical:** Live/event-based · Complex · Outsiders feel locked out ·
Repeated explanation needed · Wildly different expertise levels.

**Candidate verticals:**
1. **Government / News** — *highest-priority second vertical.* Live legislation, Supreme
   Court rulings, election results, political terminology. The AMC pop-up format fits
   perfectly. Enormous underserved audience.
2. **Finance / Markets** — Fed decisions, earnings, market moves, economic terms. Strong fit.
3. **Legal proceedings** — trials, verdicts, contract language. Strong fit.
4. **Medical / Health** — needs liability guardrails. Later.
5. **Science / Space** — more episodic than real-time; a different mode.

**Key:** all verticals share the **same engine** (Groq + four expertise levels + ask
anything). New verticals = **new data feeds + prompt context, not new architecture.**
Brand asset: the **"[Topic]Wise"** naming pattern is clean and scalable.

**Sequencing:** prove SportsWise fully first, then expand — but keep the architecture
**topic-agnostic**: no sports-specific hardcoding in the explanation layer.

---

## 🧊 Parked

- **Cricket** — dropped for now. ESPN's public API has no usable cricket data (site API
  404s; Core API lists the sport but exposes zero leagues/events). Revisit with ESPNcricinfo
  or a paid source. A code comment in `route.ts` marks where it would slot in.
