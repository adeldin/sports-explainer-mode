# BUILD DOC — GUMBO / MLB Statcast enricher (pitch-by-pitch → richer baseball reads)

**For:** Claude Code · **From:** Claude.ai (architect) · **Date:** 2026-06-27
**Repo:** `/Users/anthonydeldin/Desktop/sports-explainer-mode` · backend `src/app/api/explain/`

## WHAT THIS IS
Register a GUMBO enricher in the existing `dataProvider.ts` that pulls MLB's free, keyless
StatsAPI live feed and populates the **already-defined** `pitchSequence?: PitchEvent[]` field on
`NormalizedGameData`, so the live baseball explanation can reference the actual last pitch
(type / velocity / location / result) instead of only ESPN's generic `lastPlay`. This is the
DATA foundation; the strike-zone VISUAL is a separate follow-on build (not this doc).

## WHY IT'S LOW-RISK (recon-confirmed 2026-06-27)
- Endpoint is **free, no auth, no key**: `https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live`.
- `dataProvider.ts` ALREADY has the contract: `PitchEvent { pitchType, velocity, result, location }`
  + `pitchSequence?: PitchEvent[] // GUMBO (MLB)` + a comment that GUMBO "registers here next."
  The enricher registry, merge, and normalized shape are built — this fills the empty slot.
- Live games confirmed available (3 in progress at recon time). Per-pitch shape fully verified.
- The enricher pattern already exists: `highlightlyEnricher.ts` (the soccer enricher) is the
  template to mirror.

## CONFIRMED DATA SHAPE (from the live Rangers@BlueJays feed)
- Schedule (to find live games): `https://statsapi.mlb.com/api/v1/schedule?sportId=1`
  → `dates[].games[]` each with `gamePk`, `status.abstractGameState` (Live/Final/Preview).
- Live feed: `.../game/{gamePk}/feed/live` → `liveData.plays`:
  - `allPlays[]` = at-bats; each `.playEvents[]` where `isPitch === true` is one pitch.
  - `currentPlay` = the live at-bat, with `count {balls, strikes, outs}`.
- Per pitch (`playEvents[]` entry with `isPitch:true`):
  - `details.type.code` / `details.type.description` → pitch type (SI/SL/FF…)
  - `details.call.description` → result (Ball / Called Strike / In play, out(s)…)
  - `pitchData.startSpeed` → velocity (mph)
  - `pitchData.zone` → Statcast zone (1–14)
  - `pitchData.coordinates.pX` / `pZ` → plate-crossing location (feet) [for the future visual]
  - `pitchData.strikeZoneTop` / `strikeZoneBottom` [for the future visual]
  - bonus (optional): `pitchData.breaks {spinRate, breakVertical, breakHorizontal}`, and on
    contact `hitData {launchSpeed, launchAngle, totalDistance, trajectory}`

## HOW WE WORK
- Anthony pushes ALL git himself; you NEVER run git. STOP at each gate, summarize, give `git add` targets.
- Backend deploys to the LIVE app via Vercel with NO review buffer — so backend changes are
  HIGHER-risk than app changes. Extra caution: the enricher must be **best-effort** (a failing/
  slow/missing GUMBO call leaves the ESPN base UNCHANGED — degrade to "still good," never "broken,"
  exactly like the existing enricher contract).
- No engine-math changes. Match the existing enricher's error handling exactly.

---

## ▓▓▓ GATE 1 — RECON (read-only, confirm before building) ▓▓▓
Print, do not edit:
1. `dataProvider.ts` in full — the `PitchEvent` interface, the `pitchSequence` field, the
   `enrichers` registry object, the `Enricher` type, how `ESPN_CONFIG` maps mlb, and exactly where/
   how an enricher's `Partial<NormalizedGameData>` gets MERGED onto the base (the merge seam).
2. `highlightlyEnricher.ts` in full — the EXACT pattern to mirror: its signature, how it fetches,
   how it catches/logs failures and returns `{}` (or partial) on error, how it date-matches the game.
3. How the explain path currently builds the prompt for MLB — specifically where `lastPlay` /
   situation is injected into the LLM prompt (grep route.ts for where NormalizedGameData fields
   reach the prompt), so Gate 3 knows where to add the pitch context.
4. Confirm: does `mlb` currently have any enricher? (Expected: no — ESPN base only today.)
STOP. Report all four. I'll confirm the Gate 2 plan against what you find.

---

## ▓▓▓ GATE 2 — Build the enricher (data only, not wired to prompt yet) ▓▓▓
Create `src/app/api/explain/gumboEnricher.ts`, mirroring `highlightlyEnricher.ts`'s structure:
- Signature matches the `Enricher` type: `(base: NormalizedGameData, gameId: string) => Promise<Partial<NormalizedGameData>>`.
- **gameId mapping caveat (flag if uncertain):** the enricher receives the app's `gameId` (an
  ESPN id). MLB StatsAPI uses `gamePk`. These are DIFFERENT id spaces. Recon how the soccer
  enricher date-matches ESPN↔Highlightly (it matches on date/teams, not id), and do the analogous
  thing: use the schedule endpoint + the base's `startTime`/team names to resolve the `gamePk` for
  this game. **If ESPN gameId and MLB gamePk can't be reliably cross-walked, STOP and tell me** —
  this is the one real integration risk and I want to decide the resolution strategy, not have you guess.
- Fetch the live feed, parse the LAST pitch (or last few) from `currentPlay`/`allPlays`, map to
  `PitchEvent[]`: `{ pitchType: details.type.description, velocity: pitchData.startSpeed,
  result: details.call.description, location: <zone or pX/pZ string> }`.
- BEST-EFFORT: wrap everything in try/catch; on ANY failure (fetch error, no live feed, parse miss,
  no pitches yet — e.g. a mound-visit at-bat with zero pitches) return `{}` so the ESPN base is
  unchanged. Log like the existing enricher does.
- Register it: add `mlb: gumboEnricher` to the `enrichers` registry in `dataProvider.ts` (one line).
- Run `npx tsc --noEmit` (from the backend's tsconfig location). STOP. Report + `git add` targets.
- DO NOT wire it into the prompt yet — this gate only populates `pitchSequence`; verify it compiles
  and the registry picks it up. (Optionally: a temp console.log of the resolved pitchSequence for one
  live game to prove the data flows, removed before commit.)

---

## ▓▓▓ GATE 3 — Feed pitch context into the explanation ▓▓▓
Now consume `pitchSequence` in the MLB explanation prompt (the place Gate-1 recon found):
- When `pitchSequence` is present (MLB, enriched), add a concise line to the prompt context, e.g.
  "Last pitch: 84mph Slider, Called Strike, lower-outside (zone 7)." so the LLM can reference the
  actual pitch. Keep it SHORT — one line of pitch context, not the whole sequence (cost + focus).
- Degrade gracefully: when `pitchSequence` is absent (non-MLB, or GUMBO failed), the prompt is
  EXACTLY as today — no change to other sports, no change to MLB-without-enrichment.
- **Cost note:** this adds tokens to MLB reads. Keep the added context to one line. Do NOT increase
  call count. (We're already near the Groq daily wall — see the standing cost concern.)
- Run `npx tsc --noEmit`. STOP. Report + `git add` targets.

---

## ON-DEVICE / LIVE TEST (Anthony)
- Open a LIVE MLB game in the app. Confirm the explanation now references the actual pitch
  (type/speed/result) rather than a generic line — and that it's accurate vs. what's happening.
- Confirm NON-MLB sports are completely unchanged (soccer/football reads identical to before).
- Confirm an MLB game with no live feed (a Final game, or between-pitch mound visit) still produces
  a normal read (best-effort fallback working — degrades to ESPN base, never breaks).
- Watch the Groq usage — if this noticeably accelerates the daily burn, that's the cache's business
  case (banked separately).

## GIT (Anthony runs, per gate)
Gate 2: `git add src/app/api/explain/gumboEnricher.ts src/app/api/explain/dataProvider.ts`
Gate 3: `git add src/app/api/explain/route.ts` (or wherever the prompt is built)

## AFTER THIS
The strike-zone VISUAL (box + plotted pitch dot at pX/pZ) is the follow-on build — the coordinates
are confirmed present, and it reuses the formation-diagram's data-driven-SVG pattern. Separate doc.
