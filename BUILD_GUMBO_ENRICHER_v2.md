# BUILD DOC — GUMBO / MLB Statcast enricher v2 (with live-explain reroute)

**For:** Claude Code · **From:** Claude.ai (architect) · **Date:** 2026-06-27
**Repo:** `/Users/anthonydeldin/Desktop/sports-explainer-mode` · backend `src/app/api/explain/`
**Supersedes** the first GUMBO doc. Gate-1 recon is DONE — findings baked in below.

## WHAT CHANGED FROM v1 (why this doc is bigger)
Gate-1 recon found the MLB live-explanation path does **NOT** go through `getGameData`/enrichers.
It uses a separate `fetchGameData` (route.ts:766). So registering `mlb: gumboEnricher` alone makes
the enricher run only via Coach's Corner — pitch data never reaches the live baseball read. To
enrich the live read we must **reroute MLB live-explain through `getGameData`** (mirroring the
soccer branch at route.ts:752). That touches the LIVE EXPLAIN PATH — the highest-risk backend
surface, deploying instantly via Vercel with no review buffer. So this build is gated tighter.

## THE SAFETY CONTRACT (non-negotiable, applies to every gate)
1. **Best-effort enrichment:** any GUMBO failure (no match, no live feed, no pitches, fetch error)
   → the enricher returns `{}` and the MLB read is **byte-identical to today's production output.**
2. **The reroute must be output-neutral when unenriched:** routing MLB through `getGameData`
   instead of `fetchGameData` must produce the SAME play text + game context as today whenever
   there's no pitch data. The plumbing changes; the output does not — unless real pitch data is present.
3. **No other sport changes.** Soccer/NFL/etc. reads identical before and after, every gate.
4. **You never run git.** Stop at each gate; Anthony tests on a LIVE MLB game; Anthony commits.
5. Backend = live deploy on push. Test on-device at the live-path gates ESPECIALLY hard.

## CONFIRMED FROM RECON
- `PitchEvent { index?, pitchType?, velocity?, result?, location? }` (dataProvider.ts:20) + `pitchSequence?: PitchEvent[]` (:47) — the contract, currently never populated.
- `Enricher` type (:56); `enrichers` registry (:61, soccer-only, no mlb); merge seam (:87-100): `{ ...base, ...depth, enrichedBy }`, best-effort try/catch returns base on throw.
- `highlightlyEnricher.ts` is the pattern: returns `{}` (not throw) for the soft "no enrichment" cases; reconciles ESPN↔Highlightly by **date + team-name match** (NOT id), memoizes in `idCache`, 60s `eventsCache`.
- MLB live play/context come from `fetchGameData` (route.ts:766), bypassing enrichers. Prompt built in `buildUserPrompt` (:453), injection points `Game situation:` (:457) + `Play data:` (:458), called via `explainPlay` (:776).
- **Grounding-rule collision:** route.ts:484 (and :437) forbids naming a "pitch count, pitch sequence" not in the data. Must be conditionally relaxed for enriched MLB (Gate 4).
- GUMBO feed: `statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live` (keyless). Schedule: `statsapi.mlb.com/api/v1/schedule?sportId=1`. ESPN gameId ≠ MLB gamePk (different id spaces).

---

## ▓▓▓ GATE 1 — Prove the gameId → gamePk cross-walk (recon/spike, no production wiring) ▓▓▓
This is the foundational risk. Before building anything that depends on it, PROVE we can resolve an
ESPN MLB game to its MLB `gamePk` reliably.
- Write a THROWAWAY script (or a temp function you'll delete) that: takes an ESPN MLB game (use a
  real live one — get its ESPN gameId + team names + date the way the app does), then queries
  `statsapi.mlb.com/api/v1/schedule?sportId=1` and matches by **date + home/away team names** to
  find the `gamePk`. Mirror `highlightlyEnricher`'s reconcile approach (token-sort team names, alias
  map for naming mismatches — e.g. ESPN "Athletics" vs MLB naming).
- TEST it against 2-3 live MLB games right now. Print: ESPN gameId, team names, the matched gamePk,
  and confirm the gamePk's feed is the correct game.
- **If the match is reliable** → report the exact matching logic; we lock it into Gate 2.
- **If team names don't cleanly cross-walk** (abbreviations, "Athletics" edge cases, etc.) → STOP and
  show me the mismatches; we decide the alias strategy before building. Do NOT paper over it.
- No production files touched this gate. tsc not required (throwaway). STOP, report.

---

## ▓▓▓ GATE 2 — Build `gumboEnricher.ts` (populates pitchSequence; not yet in any prompt) ▓▓▓
Create `src/app/api/explain/gumboEnricher.ts`, mirroring `highlightlyEnricher.ts`:
- Signature matches `Enricher`. Type-only import of the shape (avoid runtime cycle), like the soccer one.
- Use the Gate-1-proven cross-walk to resolve `gamePk` from `base` (date + team names), memoized in a local `idCache`.
- Fetch the live feed; parse the last pitch (and maybe the prior 1-2 for sequence) from `currentPlay`/`allPlays`:
  `{ pitchType: details.type.description, velocity: pitchData.startSpeed, result: details.call.description, location: <zone # or a short pX/pZ-derived label> }`.
- **Soft-fail to `{}`** (NOT throw) for: no gamePk match, no live feed, game not live, no pitches yet
  (mound-visit at-bats have zero pitches — handle this explicitly). Let hard fetch/JSON errors throw
  into dataProvider's catch. Cache the feed briefly (a short TTL like the 60s eventsCache) so the
  auto-refresh doesn't hammer statsapi.
- Register `mlb: gumboEnricher` in the `enrichers` registry (one line).
- `npx tsc --noEmit`. STOP. Report + `git add` targets.
- Optional proof: a temp `console.log` of the resolved `pitchSequence` for one live game (removed before commit).
- NOTE: at this gate the enricher runs only via Coach's Corner (which doesn't read pitchSequence yet),
  so there's NO observable change to any read. That's expected — Gate 3 makes it observable.

---

## ▓▓▓ GATE 3 — Reroute MLB live-explain through getGameData (OUTPUT-NEUTRAL when unenriched) ▓▓▓
**The dangerous gate. The goal: change the plumbing, NOT the output (unless pitch data is present).**
- In route.ts, the MLB live-explain path currently uses `fetchGameData` (:766). Reroute it so MLB
  (like soccer at :752) gets its data via `getGameData` → which runs the GUMBO enricher.
- CRITICAL: when `pitchSequence` is absent (no live feed / no match / between pitches), the play text
  and gameContext fed to the prompt must be **identical to what `fetchGameData` produced before.**
  If `getGameData`'s ESPN base yields different play text than the old `fetchGameData` path, RECONCILE
  them so the unenriched output is byte-identical to today. (Recon note: `fetchGameData` scrapes the
  ESPN summary `plays[]` for MLB at :201-211; confirm `getGameData`'s base produces the same `lastPlay`,
  or thread the existing play-text logic through.)
- Do NOT yet change the prompt or the grounding rule — this gate ONLY changes where the data comes
  from, and must be provably output-neutral when there's no pitch data.
- `npx tsc --noEmit`. STOP. Report + `git add` targets.
- **TEST (Anthony, live MLB game):** with the enricher TEMPORARILY forced to return `{}` (or on a
  Final/non-live game), confirm the MLB read is identical to current production. This proves the
  reroute didn't change the baseline. ONLY once that's confirmed do we let real pitch data flow in Gate 4.

---

## ▓▓▓ GATE 4 — Use the pitch data: relax grounding rule + inject one line of pitch context ▓▓▓
Now make enrichment observable, carefully.
- In `buildUserPrompt`, when `pitchSequence` is present (enriched MLB), add ONE concise line to the
  prompt context, e.g. `Last pitch: 84mph Slider, Called Strike, zone 7 (low-outside).` Keep it to one
  line (cost + focus; we're near the Groq wall).
- **Relax the grounding rule conditionally:** the CARDINAL RULE (:484, :437) forbids naming a pitch
  type/sequence "not in the data." When pitch data IS in the data (enriched MLB), that clause must not
  gag the model from using it. Make the grounding rule conditional: the "don't invent pitch
  specifics" prohibition applies ONLY when pitch data is absent. When present, the model may (must,
  even) reference the real pitch — but still must not invent specifics BEYOND what's given. Word this
  carefully so non-MLB and unenriched-MLB behavior is unchanged.
- Everything degrades: absent `pitchSequence` → prompt and grounding rule EXACTLY as today.
- `npx tsc --noEmit`. STOP. Report + `git add` targets.

---

## ▓▓▓ GATE 5 — Live verification ▓▓▓
On a LIVE MLB game (Anthony):
- The read now references the actual pitch (type/speed/result) accurately vs. what's happening.
- An MLB game with no pitch (mound visit / Final) → normal read, no breakage (soft-fail works).
- NON-MLB sports unchanged.
- The unenriched MLB read still matches production (Gate 3 contract holds end-to-end).
- Watch Groq burn — note if pitch context meaningfully accelerates it (cache business case).

## GIT (Anthony, per gate)
- G2: `git add src/app/api/explain/gumboEnricher.ts src/app/api/explain/dataProvider.ts`
- G3: `git add src/app/api/explain/route.ts`
- G4: `git add src/app/api/explain/route.ts`

## AFTER THIS
Strike-zone VISUAL (box + pitch dot at pX/pZ) — separate follow-on; coordinates confirmed present;
reuses the formation-diagram SVG pattern.
