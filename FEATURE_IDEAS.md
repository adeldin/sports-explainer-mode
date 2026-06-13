# Feature Ideas & Roadmap

## ✅ Completed and live (backend expansion)

- ✅ **Languages backend** — all user-facing fields, including `playType`, now translate consistently.
- ✅ **Soccer / World Cup backend** — ESPN site API (`usa.1` / `fifa.world`); play text via the summary `keyEvents` path (soccer has no `plays[]` array).
- ✅ **Rugby backend** — ESPN Core-API two-step `$ref` fetch (default league: URC `270557`, the longest year-round season).
- ✅ **Stray root `babel.config.js` removed** — it was silently breaking **all** Vercel deploys (Next picked up an Expo/React-Native babel config and failed every build), so route.ts changes weren't reaching production. Fixed in `7f25d22`.
- ✅ **`playType` translation** — dedicated `translatePlayText()` Groq call running in parallel with the explanation (no added latency); replaced the unreliable model-returned `playSummary` field.
- ✅ **Debug instrumentation** — added to diagnose the translation issue, then removed cleanly (`eb019ca`).

**Remaining backend: nothing — the backend expansion is complete.**

## 🔜 Next phase — Mobile UI (surface what the backend now supports)

Active tasks, in order:

1. **Widen `Sport` type** in `sports-explainer-mobile-v2/lib/api.ts` to include `soccer` / `worldcup` / `rugby`.
2. **Add soccer, World Cup, rugby to the sport picker** in the mobile app (and port the per-sport game-listing logic — soccer via the normal scoreboard API, rugby via the Core-API two-step fetch from the extension's `background.js`).
3. **Add a language picker UI** that sends the `language` param (`SettingsScreen.tsx` already exists to host it).
4. **Past plays** — scroll back through a game's plays and tap one to explain it. Start with **MLB / NHL** (play-by-play `plays[]` confirmed available; NBA confirmed too; NFL verify in-season; soccer uses `commentary[]`/`keyEvents[]`).

## 🧊 Parked

- **Cricket** — dropped for now. ESPN's public API has no usable cricket data (site API 404s; Core API lists the sport but exposes zero leagues/events). Revisit with ESPNcricinfo or a paid source. A code comment in `route.ts` marks where it would slot in.
