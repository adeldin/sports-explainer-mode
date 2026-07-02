# BUILD — Situation-Keyed Explanation Cache (v1)
*Backend / Vercel only. NO EAS, NO app binary. Written 2026-06-28 by the architect chat. Executor: Claude Code on Anthony's Mac. Anthony runs ALL git.*

---

## 0. WHAT THIS IS & WHY

The app hit the **Groq 100k/day token wall on 2026-06-24 → outage.** The World Cup friends-&-family soft-launch (~July 1–2) puts a usage spike on the exact live-explain path that hit the wall. This cache is the **structural fix that protects the launch:** two materially-identical game situations reuse one cached explanation instead of re-hitting the LLM. "The app learns, not the model."

**This build is backend-only.** It deploys via Vercel, no EAS, no binary. But it sits on the **live-explain path — the highest-risk surface** (Vercel deploys instantly to the live App Store app, no review buffer). Treat every change with backend caution. **Confirm the Vercel deploy goes GREEN after every push.**

### Scope of v1 (deliberately narrow — proven data only)
| In v1 | Deferred (why) |
|---|---|
| **Soccer** live-explain cache (structured situation key) | **MLB** structured cache → rides **GUMBO Gate 3** (MLB explain has no structured situation at the Groq site today; Gate 3's reroute through `getGameData` is what surfaces it) |
| **Q&A (`action:'ask'`)** cache — sport-agnostic, exact-normalized-question key | Semantic question clustering (needs feedback data first) |
| Upstash Redis shared store | Feedback button (app-side UI = separate doc; this build leaves a clean seam for it) |
| Namespace-versioned keys, TTL, level/lang hard-partition | Event-driven invalidation (namespace bump + TTL cover the real cases) |

### Why soccer-only for the structured path (the recon finding that shaped this)
Recon proved the live-explain Groq call site (`explainPlay`, route.ts:556) receives only **five fields: `play` (string), `gameContext` (string), `sport`, `level`, `language`** — no structured situation object. **Soccer** has `NormalizedGameData` (score, events, minute) in scope *upstream* at route.ts:752 before it collapses into `gameContext` — so a structured key is computable there. **MLB** routes through `fetchGameData` (returns only `{play, gameContext, homeTeam, awayTeam}`) — no structure at the call site at all. Forcing MLB into v1 would mean either keying off fragile play-text, or rerouting MLB through `getGameData` (= GUMBO Gate 3) *plus* a new cache dependency in one motion = risk-stacking on the live path. We build on proven data. MLB waits for Gate 3.

---

## 1. WORKING MODEL & RAILS (read before starting)

- **You (Claude Code)** do recon-first, write code, run `npx tsc --noEmit`, and **STOP at each gate.** You do **NOT run git** — Anthony runs all git himself.
- **Anthony** runs all git, sets Vercel env vars, deploys, confirms Vercel green, tests with curl, reports back at each gate.
- **Explicit file paths** in every `git add` — provided per gate. NEVER `git add .`
- **No stray root `.ts` files** — everything you create lives under `src/app/api/explain/`. (The strategy_tips 2h outage was stray root `.ts`.)
- **Don't touch** `entitlement.tsx`, caps/metering, engine math. No localStorage.
- **Output-neutrality on a cache MISS is paramount.** A cache miss must produce **byte-identical behavior** to today (compute the answer, then store it). The cache is a *wrapper*; the existing code path is untouched on a miss. If Redis is unreachable, the path must **fall through to a normal LLM call** — never error, never block an explanation. **Cache failure must be invisible to the user.**

---

## 2. THE DESIGN (locked — build to this)

### 2a. Key structure

```
LIVE EXPLAIN (soccer):   v1:explain:{sport}:{level}:{lang}:{sig}
Q&A (all sports):        v1:ask:{sport}:{level}:{lang}:{normQuestion}
```

- **`v1:`** namespace prefix → bump to `v2:` to invalidate the ENTIRE cache at once. **Bump this whenever `buildSystemPrompt` / `buildUserPrompt` / the ask prompt changes** (otherwise cached answers go stale against a new template). Store as a single exported constant `CACHE_NS = 'v1'`.
- **`level`** uses INTERNAL keys (`'kid'|'beginner'|'intermediate'|'expert'`) — the cache is a storage contract, frozen-internal per the display-rename-never-internal principle. `'kid'` stays `'kid'`.
- **`level` and `lang` are hard key components** — an expert answer can never serve a beginner; `es` never serves `en`. Partitioned by construction.

### 2b. Soccer situation signature `{sig}`

Computed from `NormalizedGameData` at route.ts:752 (the `enriched` object), BEFORE it collapses into `gameContext`.

```
sig = `${scoreState}|${phaseBucket}|${lastEventType}|${eventTeamSide}`
```

| Component | Source | Rule | Classification |
|---|---|---|---|
| `scoreState` | `homeScore`/`awayScore` | margin from the perspective of the team the last event concerns → one of `lead2plus \| lead1 \| level \| trail1 \| trail2plus` | bucketed (exact goals = noise) |
| `phaseBucket` | last `MatchEvent.minute` (max event minute, mirrors `coachState.parseSoccerMinute`) | `early(0–15) \| first(15–45) \| second(45–70) \| late(70–85) \| closing(85+)` | bucketed (exact minute = noise) |
| `lastEventType` | last `MatchEvent.type` | exact, from finite vocab: `Goal \| Yellow Card \| Red Card \| Substitution \| Missed Penalty \| Event` → slugify to lowercase-hyphen (`yellow-card`) | **exact (meaning-bearing)** |
| `eventTeamSide` | last `MatchEvent.team` vs home/away team name | `home \| away \| none` | exact (meaning-bearing) |

**If `enriched.events` is empty / no last event:** do NOT cache this request — there's no stable situation to key on. Fall through to a normal uncached LLM call. (Don't invent a key from `lastPlay` free text; that's the fragile path we're avoiding.)

**Excluded as noise (must NOT enter the key):** team names, player names, exact score, exact minute, possession %, shots, `lastPlay` text, `statusDetail`.

### 2c. Q&A normalized question `{normQuestion}`

The `ask` path interpolates `question` verbatim (recon confirmed — normalized nowhere). The cache normalizes it:
```
normQuestion = question.toLowerCase().trim().replace(/[^\w\s]/g,'').replace(/\s+/g,' ').trim()
```
- Exact-match only. **No semantic clustering** in v1.
- **`context` is NOT in the key** in v1 (definitional questions dominate at beginner/rookie level and are context-independent; feedback later tells us if state-dependent questions need context bucketing).
- If `normQuestion` is empty after normalization, skip the cache (fall through).

### 2d. Stored value

Store the **exact JSON object the endpoint returns to the client** (the parsed completion result), as a JSON string. On a hit, return it through the identical response path as a fresh result — same shape, same headers. The client must not be able to tell a hit from a miss except by latency.

**Do NOT cache:**
- Non-200 / error results.
- Empty or malformed completions.
- The concurrent `translatePlayText` call (out of scope for v1 — English-only caching first; note left for v2).

### 2e. TTL

| Path | TTL | Why |
|---|---|---|
| `v1:explain:*` (soccer) | **6 hours** (`21600` s) | situation-teaching isn't hour-to-hour time-sensitive; long enough to reuse across simultaneous + nearby-day matches |
| `v1:ask:*` | **24 hours** (`86400` s) | definitional answers are very stable |

Set TTL via Redis `EX` on write. No manual TTL bookkeeping.

### 2f. Storage — Upstash Redis

- New dep: `@upstash/redis` (REST SDK — no connection pools, clean in Node serverless).
- New env vars (Anthony sets in Vercel prod AND `.env.local`): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Runtime is Node.js (recon confirmed — no `export const runtime`), SDK works.
- **Graceful degradation is mandatory:** if env vars are missing OR Redis throws, the cache module's get/set must **swallow the error and behave as a miss / no-op** (log once, don't throw). The explain path must work with zero cache infra present — that's how we keep the live path safe and how local dev runs without Upstash.

---

## 3. GATES

Each gate: you build, run `npx tsc --noEmit`, STOP and report. Anthony does git + deploy + verify, then releases the next gate.

---

### GATE 1 — Recon + cache module (no wiring yet, output-invisible)

**Goal:** create the cache module in isolation. Nothing calls it yet → zero behavior change → safe first deploy.

1. **Recon (read-only first):** re-read route.ts:573–795 (the POST handler, the `ask` block at ~612, the soccer-enriched block at ~752, and `explainPlay` at ~553). Confirm the variable names: in the soccer block, the object is `enriched` (`NormalizedGameData`); confirm `enriched.events`, `enriched.homeScore`, `enriched.awayScore`, `enriched.homeTeam`, `enriched.awayTeam`, and `MatchEvent.{minute,type,team}`. Report the exact field names you'll read. **If any differ from §2b, STOP and report the discrepancy before writing code** — the key design depends on these names.

2. **Create `src/app/api/explain/explanationCache.ts`:**
   - Lazily construct an Upstash client from env vars. If either env var is absent, the module is in **disabled mode** (all ops are no-ops / misses, logged once).
   - Export `CACHE_NS = 'v1'`.
   - Export pure key-builders (no I/O): `soccerSig(enriched): string | null` (returns `null` when no usable last event → signals "don't cache"), `explainKey({sport,level,lang,sig})`, `normalizeQuestion(q): string`, `askKey({sport,level,lang,normQuestion})`.
   - Export `cacheGet(key): Promise<string | null>` and `cacheSet(key, value, ttlSeconds): Promise<void>` — both wrapped in try/catch that swallows errors (get → returns null on error; set → no-op on error). Log failures at most once per cold start (a module-level boolean flag).
   - Type-only import of `NormalizedGameData` / `MatchEvent` from `dataProvider` (mirror the `import type` pattern used by `gumboEnricher.ts` / `highlightlyEnricher.ts`).
   - Include the score-state and phase-bucket helpers exactly per §2b.

3. `npx tsc --noEmit` clean (`noUnusedLocals` OFF).

4. **STOP. Report:** the recon field-name confirmation, the full module, and confirm nothing imports it yet.

> **Anthony's gate actions:**
> - Add the dep: `cd /Users/anthonydeldin/Desktop/sports-explainer-mode && npm install @upstash/redis`
> - Create an Upstash Redis DB (free tier) at upstash.com → copy REST URL + REST TOKEN.
> - Set in Vercel prod env: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Also add both to `.env.local`.
> - `git add` (EXPLICIT paths): `git add src/app/api/explain/explanationCache.ts package.json package-lock.json`
> - Commit, push. **Confirm Vercel deploy GREEN.** (Behavior is unchanged — nothing calls the module — so the live app must be byte-identical. Spot-check one soccer explain + one ask in the app: still working.)

---

### GATE 2 — Wire Q&A cache (`action:'ask'`) — lowest-risk path first

**Why ask first:** it's a self-contained block (route.ts ~612), sport-agnostic, and a miss/failure trivially falls through. Proves the read-compute-write loop with minimal live-path exposure.

1. In the `ask` block (route.ts ~612), wrap the `createChatCompletion` call:
   - Compute `nq = normalizeQuestion(question)`. If empty → skip cache entirely (existing behavior).
   - `key = askKey({sport, level, lang: language, normQuestion: nq})`.
   - `const hit = await cacheGet(key)` → if non-null, return it through the **identical response path** the block uses today (same JSON shape/headers). Add a `console.log('[cache] ask HIT', key)` for the gate test (temporary, removed in Gate 4).
   - On miss: run the existing call unchanged, and **after** a successful 200 result, `await cacheSet(key, <serialized result>, 86400)`. Log `[cache] ask MISS` (temporary).
   - **Miss path must be byte-identical to today.** Only additions: a get before, a set after.

2. `npx tsc --noEmit` clean.

3. **STOP. Report** the exact diff (the wrapped block), confirming the miss path is unchanged.

> **Anthony's gate actions:**
> - `git add src/app/api/explain/route.ts`
> - Commit, push. **Confirm Vercel GREEN.**
> - **Verify with curl** (spelled out — run twice, same question, expect MISS then HIT in Vercel function logs):
>   ```
>   curl -s -X POST https://sports-explainer-mode.vercel.app/api/explain \
>     -H "Content-Type: application/json" \
>     -d '{"action":"ask","sport":"soccer","level":"beginner","language":"en","question":"What is offside?","context":"test"}'
>   ```
>   Run it a second time. Check Vercel function logs: first call `[cache] ask MISS`, second `[cache] ask HIT`. Both responses identical. Test a different `level` → MISS (confirms level partitions). Test in the live app: ask flow still works.

---

### GATE 3 — Wire soccer live-explain cache (the live path — careful)

**This is the highest-risk gate.** It touches the live-explain path. Output-neutrality on miss is non-negotiable.

1. In the soccer-enriched block (route.ts ~752), after `enriched` is obtained and BEFORE `explainPlay` is called:
   - `const sig = soccerSig(enriched)`. If `null` (no usable event) → **skip cache, proceed exactly as today** (uncached).
   - `key = explainKey({sport, level, lang: language, sig})`.
   - `const hit = await cacheGet(key)` → if non-null, return it through the identical response path used after `explainPlay` resolves (match the exact response shape — recon the lines after route.ts:776 to mirror the JSON the endpoint returns). Log `[cache] explain HIT` (temp).
   - On miss: run `explainPlay(...)` unchanged, and after a successful result, `await cacheSet(key, <serialized result>, 21600)`. Log `[cache] explain MISS` (temp).
   - **Only the soccer branch is wrapped.** MLB / `fetchGameData` branch is UNTOUCHED. Non-soccer, learn-mode, playText, vision, recap, coach, translate paths all UNTOUCHED.

2. `npx tsc --noEmit` clean.

3. **STOP. Report** the diff, explicitly confirming: (a) only the soccer `enriched` branch changed, (b) the miss path calls `explainPlay` exactly as before, (c) the response shape on a hit matches the response shape on a miss (quote both).

> **Anthony's gate actions:**
> - `git add src/app/api/explain/route.ts`
> - Commit, push. **Confirm Vercel GREEN.**
> - **Verify against a LIVE World Cup match** (situation keys need real events). Open soccer in the app on a live game; trigger an explain; check Vercel logs for `[cache] explain MISS` then, on a repeat of the same situation-type, `HIT`. **Critically: confirm the explanation TEXT is correct and on-level for the situation** (this is the correctness check — a wrong serve shows here). Confirm MLB, golf, and other sports are unchanged (smoke-test one each).
> - If anything looks off → report; we can revert this one commit (cache module + ask cache survive independently).

---

### GATE 4 — Cleanup + observability seam

1. Remove all temporary `[cache] … HIT/MISS` `console.log`s **OR** convert them to a single guarded debug line behind an env flag `CACHE_DEBUG === '1'` (recommend the latter — keeps a toggle for the launch without log noise by default).
2. Add a tiny **hit/miss counter** (module-level integers in `explanationCache.ts`, incremented in get) — no endpoint, just available for a future admin read. This is the **seam for the later feedback-button doc**: feedback will need a "delete this key" path; add an exported `cacheDelete(key)` now (unused), so the feedback build is trivial.
3. `npx tsc --noEmit` clean.
4. **STOP. Report** the final diff.

> **Anthony's gate actions:**
> - `git add src/app/api/explain/route.ts src/app/api/explain/explanationCache.ts`
> - Commit, push. **Confirm Vercel GREEN.** Final smoke test: soccer explain + ask both work, hits are silent (no log spam) unless `CACHE_DEBUG=1`.

---

## 4. DONE = 

- Soccer live-explain and all-sport `ask` results are cached in Upstash, keyed by bucketed situation / normalized question, partitioned by sport/level/lang, namespaced `v1:`, TTL 6h / 24h.
- Cache miss = byte-identical to today. Cache/Redis failure = invisible fall-through.
- MLB structured caching documented as **v2 riding GUMBO Gate 3**.
- A clean seam (`cacheDelete`, hit/miss counters, `CACHE_NS` bump) left for the feedback-button doc and for invalidation.

## 5. NOTES FOR v2 (don't build now — record so it's not lost)
- **MLB structured cache:** once GUMBO Gate 3 reroutes MLB explain through `getGameData`, `situation.{balls,strikes,outs,onBase}` + inning(from `statusDetail`) + scoreState become available at the call site. MLB sig = `${count}|${outs}|${baseState}|${inningPhase}|${scoreState}|${lastEventType}`. **GUMBO pitch detail stays OUT of the key** (high-cardinality telemetry = noise; explosion kills hit rate).
- **Translation cache:** key `translatePlayText` on `(play text, language)` to halve non-English cost.
- **Q&A context bucketing** + **semantic question clustering:** revisit once the feedback button yields data on which questions/paraphrases actually recur.
- **Namespace bump reminder:** any edit to `buildSystemPrompt` / `buildUserPrompt` / the ask prompt → bump `CACHE_NS` in the same commit.
