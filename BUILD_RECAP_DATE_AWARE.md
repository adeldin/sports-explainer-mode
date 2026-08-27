# BUILD — Backend Recap Date-Awareness (summary-direct game lookup)

**Goal:** Make `fetchRecapData` resolve ANY game by `gameId` — including past days the date strip reaches — instead of searching only today's bare scoreboard. Fixes the diagnosed bug: tapping yesterday's final returns an empty recap because the game isn't in today's scoreboard.

**Root cause (diagnosed, live-probed):** `fetchRecapData` (route.ts:337 site branch, :322 core branch) locates the game by `data.events.find(id === gameId)` against the **bare/today scoreboard**. A past gameId (e.g. 401815979, yesterday's White Sox@Orioles) is NOT in today's scoreboard → `game` undefined → empty teams → recap handler's `if (!data.homeTeam && !data.awayTeam)` returns all-empty → mobile `hasRecapContent` false → nothing renders.

**The fix — summary-direct:** the `summary?event={gameId}` endpoint resolves ANY gameId directly (probe confirmed: past game 401815979 → `article.headline` present, teams/score in `summary.header.competitions[0].competitors`). The current code *already* fetches this summary for `sum.article` — so going summary-direct **removes the fragile scoreboard round-trip entirely** (one fewer network hop) AND makes recaps date-agnostic. Simpler and more correct.

**⚠️ THIS IS A LIVE BACKEND CHANGE.** `fetchRecapData` is in the Vercel backend — deploys INSTANTLY to all current App Store users. Recon-first, one gate at a time, Vercel-green after push. It also improves TODAY's recaps (removes the round-trip), so all users benefit, which raises the stakes on getting the extraction right.

**⚠️ CROSS-SPORT RISK (recon-flagged, load-bearing):** `summary.header` field names for teams/score/winner DIFFER from the scoreboard shape the current code reads. A naive rewrite could work for MLB and silently break soccer/rugby recaps. The extraction helpers MUST be verified against `summary.header` across sports (MLB, soccer, core/rugby) BEFORE rewriting.

---

## GATE 0 — RECON: map `summary.header` shape across sports (read-only)

**📋 PASTE INTO CLAUDE CODE:**
```
RECON ONLY — read-only, no edits, no git. Probing public ESPN summary endpoints is fine. Report, STOP.

CONTEXT: Making fetchRecapData resolve any gameId via summary?event= directly (not today's scoreboard). Need the summary.header shape for teams/score/winner/status across sports, since it differs from the scoreboard shape and must work for MLB + soccer + core/rugby, not just MLB.

python3 << 'PYEOF'
import json, urllib.request, datetime
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    try: return json.load(urllib.request.urlopen(req,timeout=25))
    except Exception as e: return {'__err__':str(e)}

def find_final(path):
    today=datetime.date.today()
    for dt in ["", f"?dates={(today-datetime.timedelta(days=1)).strftime('%Y%m%d')}",
               f"?dates={(today-datetime.timedelta(days=3)).strftime('%Y%m%d')}",
               f"?dates=20260628", f"?dates=20260201", f"?dates=20260112"]:
        d=get(f"https://site.api.espn.com/apis/site/v2/sports/{path}/scoreboard{dt}")
        fin=[e for e in (d.get('events') or []) if e.get('status',{}).get('type',{}).get('state')=='post']
        if fin: return fin[0]['id']
    return None

for path,label in [("baseball/mlb","MLB"),("soccer/eng.1","EPL"),("basketball/nba","NBA"),("hockey/nhl","NHL")]:
    gid=find_final(path)
    if not gid: print(f"\n{label}: no final found"); continue
    s=get(f"https://site.api.espn.com/apis/site/v2/sports/{path}/summary?event={gid}")
    print(f"\n===== {label} (event {gid}) =====")
    print("top-level keys:", sorted(s.keys()))
    hdr=s.get('header') or {}
    print("header keys:", sorted(hdr.keys()))
    comp=(hdr.get('competitions') or [{}])[0]
    print("header.competitions[0] keys:", sorted(comp.keys()))
    print("  status:", (comp.get('status') or {}).get('type'))
    for c in (comp.get('competitors') or []):
        t=c.get('team',{}) or {}
        print(f"    {c.get('homeAway','?'):5} name={t.get('displayName')!r:28} score={c.get('score')!r} winner={c.get('winner')!r}")
    # confirm article still reachable the same way
    a=s.get('article') or {}
    print("  article.headline present?:", bool(a.get('headline')), "| link:", ((a.get('links') or {}).get('web') or {}).get('href','')[:50])
PYEOF
```
**Gate 0 pass:** confirm for EACH sport how to read teams (`header.competitions[0].competitors[].team.displayName`), score (`.score`), winner (`.winner`), and status (`header.competitions[0].status.type`). Note any sport where the shape differs (soccer/core especially). Confirm `article` is still at `s.article` (unchanged). If core/rugby uses a different structure, flag it — the core branch may need its own handling.

---

## GATE 1 — Rewrite `fetchRecapData` to summary-direct lookup

Replace the scoreboard round-trip with a direct `summary?event={gameId}` fetch:
- Fetch `summary?event={gameId}` once. Read teams/score/winner/status from `summary.header.competitions[0]` (per Gate 0's confirmed field paths, per-sport-correct).
- `sum.article`, `sum.leaders`, `sum.scoringPlays`, `sum.keyEvents` extraction stays as-is (already read from this same response — the article-grounding work from the recap build is untouched).
- **Requires `gameId`:** summary-direct needs a gameId. If `gameId` is missing (shouldn't happen from the recap path, which always has a selected game), fall back gracefully to empty (the existing no-data path) — do NOT reintroduce a scoreboard scan.
- **Core/rugby branch:** if Gate 0 shows core summary differs, handle it; otherwise unify. Keep core recaps working (they were thin/honest before — don't regress).
- **Output-neutral for TODAY:** a today game's recap must be byte-identical to before (same teams/score/story/article) — summary-direct returns the same data for today's games, just without the scoreboard hop. Verify a today final's recap is unchanged.

**Verify:**
- A today final: recap byte-identical to before (teams, score, story, article all present).
- A yesterday final (the bug): recap now RESOLVES — teams/score/story/article populate (previously empty). This is the fix.
- Soccer + core final: recaps still work (cross-sport — the Gate 0 risk).
- tsc clean.

Commit: `Recap: resolve game via summary?event={gameId} directly (date-agnostic; fixes past-day recaps + removes today-scoreboard round-trip)`

**⚠️ Deploys live. Vercel-green. Test on-device: today's recap unchanged, yesterday's recap now works, soccer recap works.**

---

## SEQUENCING NON-NEGOTIABLES
- Gate 0 recon (cross-sport `summary.header` shapes) BEFORE the rewrite. The cross-sport extraction is the #1 risk.
- Output-neutral for today's recaps — verify byte-identical before shipping.
- Don't reintroduce a scoreboard scan; summary-direct requires gameId, fall back to empty if absent.
- Keep core/rugby recaps working (don't regress the thin-but-honest path).
- Vercel-green after push; on-device test (today unchanged + yesterday works + soccer works).
- Discard any VS Code tsconfig auto-reformat before committing.
- The article-grounding logic (headline/lede/link + leaders/scoringPlays) is UNCHANGED — it already reads from `sum`, which we still fetch. Only the game-LOOKUP changes.
