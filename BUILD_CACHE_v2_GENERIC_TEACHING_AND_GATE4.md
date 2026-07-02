# BUILD — Cache v2: Master Kill-Switch + Team-Agnostic Teaching + Gate 4 Cleanup
*Backend / Vercel only. NO EAS, NO app binary. Architect chat → Claude Code executor → Anthony runs all git. Written 2026-06-28.*

---

## 0. WHAT & WHY

**SHIPS OFF BY DEFAULT.** The headline of this build is a master kill-switch (`CACHE_ENABLED`). With zero app downloads there's no Gemini cost pressure, and live explanations are more *vivid* (named teams/players) than cached ones (generic teaching). So the entire cache ships **dormant** — every explanation goes live to Gemini at full vividness — until Anthony flips one env var when token costs actually start climbing. Building it now means it's tested and ready; flipping it later is a one-env-var change, no scramble.

Three things in one build, all backend, all on the live-explain path (highest risk — Vercel deploys instantly to the live App Store app, no review buffer). **Confirm Vercel GREEN after every push.**

**Part 0 — Master kill-switch (`CACHE_ENABLED`), DEFAULT OFF.** One env var gates the ENTIRE cache system: reads, writes, AND the generic-teaching prompt flag. When unset/not `'1'`: every cacheGet returns miss, every cacheSet is a no-op, `forCache` is always false → every explanation is vivid + named + live to Gemini (today's exact behavior). When `CACHE_ENABLED=1`: caching + situation reuse + generic teaching all activate together. Default-off is the SAFE default — forgetting the var fails into full vividness, never into a silent/possibly-wrong cache.

**Part 1 — Team-agnostic cached teaching (only matters when cache is ON).** The situation cache keys on bucketed situation type, NOT team identity. So a HIT for e.g. `lead1|closing|goal|away` can replay teaching prose that names a *different* match's teams. We confirmed a real stored entry reads *"Canada scored a goal in the 90th minute... won 1-0 against South Africa"* — that text would be served, verbatim, under a Brazil-vs-France scoreboard on a HIT. The score card, headline, and timeline are all LIVE (correct), but the cached lesson body (`simple` / `whyItMatters` / `ruleDetail`) is LLM prose that bakes in team/player names. Fix: instruct the model to teach the situation **generically** (no team/player/city names) **only on the cached path**, so cross-match reuse is correct. (This whole concern is moot while the cache is OFF — nothing is cached or replayed — but it must be built so it's ready the moment Anthony flips the switch.)

**Part 2 — Namespace split + bump.** Abandon the team-named `v1:explain:*` entries by moving explain keys to `v2`. Keep the proven `v1:ask:*` keys (unaffected by this change).

**Part 3 — Gate 4 cleanup.** Guard temp `[cache]` logs behind `CACHE_DEBUG`, add hit/miss counters, add an unused `cacheDelete` seam for the future feedback button.

### Why generic teaching is correct (not a downgrade)
The recon proved where each field renders: the **headline** ("THE PLAY") is driven by LIVE `rawPlay`/`playType` (the real ESPN play text), NOT by cached `simple`. The **score card** (teams/score) is a separate component fed by LIVE scoreboard data. So the vivid, specific, "what just happened" content the user reads is LIVE. The CACHED fields are the *teaching layer* beneath it — and teaching a situation type ("a late go-ahead goal puts the leading side in control") is inherently team-agnostic. Making it generic removes the wrong-team risk with no loss to the live experience.

### Why NOT a team-token in the key (rejected)
Adding team identity to the sig (`...|canada-southafrica`) would make each bucket collide only with the *same pairing* — Canada-SA plays once in the tournament, so its bucket would essentially never be hit again. Team identity is the highest-cardinality, most-fragmenting variable possible; appending it doesn't "tighten" the key, it effectively turns the cache OFF and reinstates the Groq cost wall. Generic teaching keeps the cross-match hit rate (the entire point) AND is correct.

### Scope decision: CACHED-PATH-ONLY, not soccer-the-sport
`buildUserPrompt` is SHARED across every sport's live-explain (soccer = cached; MLB/NFL/NBA = NOT cached). A flat edit would strip team names from *all* live explanations — bad for non-cached sports, where "Judge homered to put the Yankees up" is the natural, correct, vivid explanation and carries ZERO mismatch risk (those are never cached/replayed). So the generic rule must be **conditional**, gated to the cacheable path via a `forCache` flag. Today that's English soccer live-explain. When MLB caching later rides GUMBO Gate 3, it flips the same flag on and inherits the rule. Sports that are never cached keep their vivid named teaching.

---

## 1. RAILS (unchanged from prior gates)
- Recon-first. NO git by Claude Code — Anthony runs all git.
- Explicit file paths in `git add` (provided per gate). NEVER `git add .`
- No stray root `.ts`. Don't touch `entitlement.tsx`, caps/metering. No localStorage. No engine-math changes.
- **Miss path stays byte-identical to today.** The non-cached paths (MLB/NFL/etc. live-explain, learn-mode, recap, vision, coach, ask, translate) must be UNCHANGED. Cache/Redis failure = invisible fall-through.

---

## 2. DESIGN (build to this)

### 2a. Master kill-switch (Part 0) — the gate everything else hangs off
In `explanationCache.ts`:
```
const CACHE_ENABLED = process.env.CACHE_ENABLED === '1';   // DEFAULT OFF
export function cacheIsEnabled(): boolean { return CACHE_ENABLED; }
```
- `cacheGet`: if `!CACHE_ENABLED` → return `null` immediately (miss), BEFORE touching Upstash. (Keep the existing env-absent disabled-mode check too, as a second safety net.)
- `cacheSet`: if `!CACHE_ENABLED` → no-op return immediately, BEFORE touching Upstash.
- This means with the switch off, ZERO Upstash calls happen — no reads, no writes, no latency, no cost.
- The switch ALSO gates `forCache` (see 2d) so generic teaching never activates while off.
- Flip ON: set `CACHE_ENABLED=1` in Vercel prod env, redeploy (or it applies on next deploy). Flip OFF: unset it (or set to anything but `'1'`).

### 2b. Namespace split (Part 2)
In `explanationCache.ts`, replace the single `CACHE_NS = 'v1'` with two path-specific constants:
```
export const ASK_NS = 'v1';        // unchanged — preserves proven v1:ask:* keys
export const EXPLAIN_NS = 'v2';    // bumped — abandons team-named v1:explain:* entries
```
- `askKey(...)` uses `ASK_NS` → keys stay `v1:ask:...`
- `explainKey(...)` uses `EXPLAIN_NS` → keys become `v2:explain:...`
- The orphaned `v1:explain:*` entries are never read again (explainKey only builds `v2:`) and TTL out (~6h). No manual deletion needed.
- **Reminder comment:** bump `EXPLAIN_NS` whenever the cached teaching prompt changes; bump `ASK_NS` whenever the ask prompt changes.

### 2c. `forCache` flag on `buildUserPrompt` (Part 1)
- Add a trailing optional param: `buildUserPrompt(play, gameContext, sport, level, forCache = false)`.
- When `forCache === true`, append ONE instruction adjacent to the existing CRITICAL GROUNDING RULE block (~route.ts:485), governing the output text fields. Suggested text:
  > "GENERIC TEACHING (this explanation may be reused across different matches): In `simple`, `whyItMatters`, and `ruleDetail`, do NOT name specific teams, players, clubs, or cities. Refer to roles instead — 'the attacking side', 'the leading team', 'the home side', 'the defender'. Teach the *type* of situation, not this specific match's participants. The live play headline and scoreboard supply the actual identities separately."
- When `forCache === false` (default): byte-identical to today's prompt. **Every existing call site that does not pass the flag is unchanged.**

### 2d. Pass `forCache` only on the cacheable path AND only when enabled
- `explainPlay` is the single call site of `buildUserPrompt` (route.ts:561). It needs to know whether THIS explanation will be cached, so it can pass `forCache`.
- Add a `forCache` param to `explainPlay(play, gameContext, sport, level, language, forCache = false)`, threaded into its `buildUserPrompt(play, gameContext, sport, level, forCache)` call.
- In the live-explain path, the soccer-cacheable branch already computes `eKey` (non-null only for English soccer with a usable event). **`eKey` itself must already be gated by `CACHE_ENABLED`** — i.e. in the soccer branch, compute the sig/key only when `cacheIsEnabled()`:
  ```
  const sig = (cacheIsEnabled() && language === 'en') ? soccerSig(enriched) : null;
  eKey = sig ? explainKey({ sport, level, lang: language, sig }) : null;
  ```
  So when the cache is OFF, `eKey` is always null → no HIT check, no cacheSet, AND `forCache` is false.
- Pass `forCache: !!eKey` into the `explainPlay` call inside the `Promise.all` (route.ts ~803). So: cache ON + English soccer + usable event → `eKey` set → generic teaching + caching. Otherwise (cache OFF, or MLB, or non-English, or no-event soccer, or any other sport) → `forCache` false → today's vivid named teaching, no caching.
- **Critical consistency:** `eKey` is the single source of truth. It gates the HIT read, the `cacheSet` write, AND `forCache`. And `eKey` is null whenever `CACHE_ENABLED` is off. So with the switch off, the system is fully inert and every explanation is vivid + named + live. With it on, only-cached explanations get generic teaching, and only generic teaching gets cached. No path can cache team-named prose; no non-cached path loses its team names.

### 2e. Gate 4 cleanup (Part 3)
- **Logs:** replace the temporary `console.log('[cache] ...')` calls (ask HIT/MISS in the ask block, explain HIT/MISS in the soccer block) with a single guarded helper in `explanationCache.ts`:
  ```
  const CACHE_DEBUG = process.env.CACHE_DEBUG === '1';
  export function cacheLog(...args: unknown[]) { if (CACHE_DEBUG) console.log(...args); }
  ```
  Replace each inline `console.log('[cache] ...', key)` with `cacheLog('[cache] ...', key)`. Silent by default; flip `CACHE_DEBUG=1` in Vercel env to re-enable.
- **Counters:** module-level integers in `explanationCache.ts`, incremented inside `cacheGet` (hit when a value is returned, miss when null) — e.g. `let cacheHits = 0, cacheMisses = 0;` plus an exported `getCacheStats()` returning `{ hits, misses }`. No endpoint needed; just available for a future admin read.
- **Delete seam:** export an unused `cacheDelete(key: string): Promise<void>` mirroring `cacheSet`'s best-effort try/catch (issues a Redis `DEL`). This is the hook the future feedback-button doc uses to blacklist a bad cache key. Unused now — just present and typed.

---

## 3. GATES

### GATE 1 — `explanationCache.ts` changes (kill-switch, namespace split, logging helper, counters, delete seam)
1. Recon: re-read `explanationCache.ts`. Confirm current `CACHE_NS`, `askKey`, `explainKey`, `cacheGet`, `cacheSet`, the warn-once flags.
2. Edits:
   - Add the master kill-switch: `CACHE_ENABLED = process.env.CACHE_ENABLED === '1'` (default off) + exported `cacheIsEnabled()`. Gate `cacheGet` (→ null) and `cacheSet` (→ no-op) on it FIRST, before any Upstash call.
   - Replace `CACHE_NS = 'v1'` with `ASK_NS = 'v1'` and `EXPLAIN_NS = 'v2'`. Point `askKey` → `ASK_NS`, `explainKey` → `EXPLAIN_NS`. Add the bump-reminder comment.
   - Add `CACHE_DEBUG` + `cacheLog(...)` exported helper.
   - Add `cacheHits`/`cacheMisses` counters incremented in `cacheGet`; add exported `getCacheStats()`.
   - Add exported best-effort `cacheDelete(key)`.
3. `npx tsc --noEmit` (expect exit 0). Confirm: kill-switch defaults OFF, the only key-format change is explain `v1:`→`v2:`, ask unchanged.
4. STOP. Report the diff. No git.

> Anthony: `git add src/app/api/explain/explanationCache.ts` → commit → push → confirm Vercel GREEN. (No behavior change: `CACHE_ENABLED` is unset so the cache is fully OFF — every ask/explain goes live, byte-identical to today. Do NOT set `CACHE_ENABLED` yet. Spot-check: ask + soccer explain still work and are vivid/named.)

### GATE 2 — `forCache` generic-teaching prompt + kill-switch gating on eKey (route.ts)
1. Recon: re-read `buildUserPrompt` (~454–486, esp. the CRITICAL GROUNDING RULE ~485), `explainPlay` (~553–566), and the soccer-cacheable branch + `Promise.all` (~800–805) where `eKey` is in scope. Confirm `eKey` is computed BEFORE the `Promise.all` (it is, per Gate-3 wiring) so it can be passed into `explainPlay`.
2. Edits:
   - Gate `eKey` on the kill-switch: change the soccer-branch sig computation to `const sig = (cacheIsEnabled() && language === 'en') ? soccerSig(enriched) : null;` (import `cacheIsEnabled`). So `eKey` is null whenever the cache is OFF → the whole cache path (HIT check, cacheSet, forCache) is inert.
   - `buildUserPrompt(..., forCache = false)`: append the generic-teaching instruction (2c) only when `forCache`. Default path unchanged.
   - `explainPlay(..., forCache = false)`: thread into its `buildUserPrompt(...)` call.
   - In the live-explain `Promise.all`, change the explainPlay call to pass `forCache: !!eKey`:
     `explainPlay(play, gameContext, sport, level, language, !!eKey)`
   - Replace the temporary `[cache]` `console.log`s (ask + explain HIT/MISS) with `cacheLog(...)` imported from explanationCache.
   - Import `cacheLog` and `cacheIsEnabled` (clean up any now-unused import churn).
3. `npx tsc --noEmit` (expect exit 0). Report, with explicit confirmation:
   - (a) With `CACHE_ENABLED` unset, `eKey` is always null → no cache reads/writes, `forCache` false → every explanation vivid + named + live (today's exact behavior). Confirm this is the default.
   - (b) Non-cached paths are byte-identical: any `buildUserPrompt`/`explainPlay` call that does NOT pass `forCache` produces today's exact prompt (default `false`). Quote the MLB/other-sport path to show it's unchanged.
   - (c) `forCache` is `!!eKey` — true ONLY when cache enabled AND English-soccer-with-usable-event; false everywhere else.
   - (d) The generic instruction appends ONLY when `forCache` true; show the prompt diff for both branches.
   - (e) The `[cache]` logs are now `cacheLog` (silent unless `CACHE_DEBUG=1`).
4. STOP. Report the diff. No git.

> Anthony: `git add src/app/api/explain/route.ts` → commit → push → confirm Vercel GREEN. Cache still OFF (`CACHE_ENABLED` unset) — verify the app is unchanged: explanations vivid + named, no `v2:explain:*` keys being written.

### GATE 3 — Verify: OFF by default, then ON when you choose
> Anthony, this verifies both states. Do the OFF check now; do the ON check only when you actually want to enable caching (e.g. costs climbing).
>
> **OFF check (do now, after Gate 2 deploy — this is the ship state):**
> - `CACHE_ENABLED` unset. Trigger a soccer live-explain → explanation is VIVID + NAMED (e.g. "Canada scored in the 90th..."). In Upstash, confirm NO new `v2:explain:*` keys are written (cache is inert). `v1:ask:*` keys may still exist from before but no NEW ask keys write either (ask cache also gated off). Every explanation goes live to Gemini. This is correct — full vividness, zero caching.
>
> **ON check (do later, when you flip it):**
> - Set `CACHE_ENABLED=1` in Vercel prod env, redeploy. (Optionally `CACHE_DEBUG=1` too, to watch logs.)
> - Trigger a soccer live-explain on a clear situation. In Upstash, find the new `v2:explain:soccer:*` (or `:worldcup:`) key.
> - **Confirm the stored `simple`/`whyItMatters`/`ruleDetail` name NO teams/players/cities** — generic ("the attacking side scored late to take a one-goal lead..."). That's the team-agnostic fix proven.
> - Confirm the on-screen headline + score card still show the REAL teams (live data, unaffected).
> - With `CACHE_DEBUG=1`, confirm `[cache] explain MISS/HIT` logs appear; unset it → silent.
> - To turn back OFF: unset `CACHE_ENABLED`, redeploy. Everything returns to vivid/live.

---

## 4. DONE =
- **Cache ships OFF by default** (`CACHE_ENABLED` unset) → every explanation vivid + named + live to Gemini, exactly like today. Zero Upstash calls. Flip `CACHE_ENABLED=1` in Vercel to activate when costs climb; unset to deactivate.
- When ON: cached soccer teaching is team-agnostic → a HIT across different matches serves correct generic teaching under the correct live scoreboard. No wrong-country prose.
- Non-cached sports (MLB/NFL/etc.) keep vivid, named live explanations — always, on or off.
- Explain keys are `v2:`; team-named `v1:explain:*` orphaned + TTL'd out; `v1:ask:*` preserved.
- `[cache]` logs guarded behind `CACHE_DEBUG`; hit/miss counters + `cacheDelete` seam in place for the feedback-button doc.

## 5. v2 NOTES (don't build now)
- When MLB situation caching lands (rides GUMBO Gate 3), it passes `forCache: !!eKey` the same way → inherits generic teaching automatically. Bump `EXPLAIN_NS` if the cached prompt changes again.
- Translation cache (`translatePlayText` keyed on play-text+language) still deferred.
- Feedback button consumes `cacheDelete` + `getCacheStats`.
