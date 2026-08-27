# BUILD — Recap Article Enrichment (ESPN AP recap → level-appropriate story)

**Goal:** Fix the bland recap ("The Cubs' offense erupted for 23 runs, securing a 23-3 victory") by grounding it in ESPN's own AP game recap, which is **already in the `summary?event=` response `fetchRecapData` fetches** — we just discard it. Output becomes "Dansby Swanson's 3 HRs and 8 RBIs power a 23-3 Cubs blowout," rewritten at the reader's expertise level.

**Scope (locked after external legal recon):**
- ✅ Use `article.headline` + `article.description` (clean plain-text lede) as GROUNDING for the recap prompt.
- ✅ Add a "Read on ESPN →" link from `article.links.web.href`.
- ❌ NO ESPN image/thumbnail. NO video poster. NO cached ESPN CDN asset. (Unofficial API + Disney/AP/Getty rights — not licensed for commercial redisplay. Branded thumbnail is a separate, later, optional task — NOT in this build.)

**Risk profile:** Backend change on the LIVE recap path — deploys instantly to App Store users via Vercel. Treat as higher-risk. Recon-first, one gate at a time, Vercel-green check after the deploying commit. Output must stay **byte-identical for sports without an article** (golf, thin games) — pure additive enrichment where data exists.

**Critical design shift — the cardinal rule changes meaning:** Today the recap prompt's rule is NEVER FABRICATE (because it was handed bare stats). With a real AP recap as grounding, the task becomes SUMMARIZE-AT-LEVEL, not invent. The rule transforms to: *"Rewrite the provided recap at the reader's level. Do not add facts beyond what the recap + stats support. Do NOT reproduce the recap's wording — rewrite in plain, level-appropriate language."* This is the load-bearing part of the build. Both grounding (use the story) and copyright (don't copy the words) must hold.

---

## GATE 0 — RECON (read-only, confirm before any edit)

**📋 PASTE INTO CLAUDE CODE:**

```
RECON ONLY — read-only, no edits, no git, no restart. Probing public ESPN endpoints with the python/urllib pattern is fine. Report, change nothing, STOP.

cd /Users/anthonydeldin/Desktop/sports-explainer-mode

echo "=== R1: exact current recap extraction (what we keep vs discard) ==="
sed -n '340,392p' src/app/api/explain/route.ts

echo ""
echo "=== R2: buildRecapPrompt current shape (where grounding gets injected) ==="
sed -n '389,420p' src/app/api/explain/route.ts

echo ""
echo "=== R3: the recap action handler (return shape) ==="
sed -n '979,1012p' src/app/api/explain/route.ts

echo ""
echo "=== R4: RecapData type + does it have room for article fields? ==="
grep -n "type RecapData\|RecapData = {" src/app/api/explain/route.ts
sed -n '240,246p' src/app/api/explain/route.ts

echo ""
echo "=== R5: does article.description reliably exist + is it clean plain text? (live probe, 5 sports) ==="
python3 << 'EOF'
import json, urllib.request
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
    try: return json.load(urllib.request.urlopen(req, timeout=20))
    except Exception as e: return {'__err__': str(e)}
tests = [
    ("baseball/mlb","MLB"), ("basketball/nba","NBA"),
    ("hockey/nhl","NHL"), ("football/nfl","NFL"), ("soccer/eng.1","EPL"),
]
for path,label in tests:
    found=None
    for dt in ["", "?dates=20260701","?dates=20260628","?dates=20260201","?dates=20260112"]:
        sb=get(f"https://site.api.espn.com/apis/site/v2/sports/{path}/scoreboard{dt}")
        evs=sb.get('events',[]) if isinstance(sb,dict) else []
        fin=[x for x in evs if x.get('status',{}).get('type',{}).get('state')=='post']
        if fin: found=fin[0]; break
    if not found: print(f"{label}: no final found"); continue
    s=get(f"https://site.api.espn.com/apis/site/v2/sports/{path}/summary?event={found['id']}")
    a=s.get('article') if isinstance(s,dict) else None
    if not isinstance(a,dict): print(f"{label}: NO article"); continue
    desc=a.get('description') or ''
    link=((a.get('links') or {}).get('web',{}) or {}).get('href','')
    has_html = '<' in desc  # description should be clean; story has HTML
    print(f"{label}: desc_len={len(desc)} html_in_desc={has_html} | link_ok={'recap' in link or 'espn.com' in link}")
    print(f"   lede: {desc[:130]}")
    print(f"   link: {link[:70]}")
EOF

Report R1-R5. Confirm: (a) exactly where in buildRecapPrompt to inject the AP grounding, (b) that article.description is clean plain text (no HTML) across sports, (c) the link field shape. STOP.
```

**Gate 0 pass criteria:** `article.description` is confirmed clean plain-text across the sports that have it; the injection point in `buildRecapPrompt` is identified; the link shape is confirmed. If `description` turns out to contain HTML on some sports, add a tag-strip step to the build. Do NOT proceed to Gate 1 until this is confirmed.

---

## GATE 1 — Backend: capture the article fields in RecapData (no behavior change yet)

Add `articleHeadline`, `articleLede`, `articleLink` to the `RecapData` type (route.ts:240) and populate them in `fetchRecapData` from the SAME summary response already fetched (the `sum.article` block, right where `sum.leaders`/`scoringPlays` are read at route.ts:346). **Do not wire them into the prompt yet** — this gate only captures the data and must be output-neutral (the prompt still ignores them, so recaps are byte-identical). This proves the capture works before it changes any output.

Fields to add to `RecapData` (route.ts:240–243):
- `articleHeadline: string` ← `sum.article?.headline` (or '')
- `articleLede: string` ← `sum.article?.description` (or '') — **CLEAN plain text confirmed 5/5 sports, no HTML strip needed.** BUT strip the AP dateline artifact: `.replace(/^—\s*/, '')` (MLB/NBA/NHL/NFL ledes start with "— "; EPL doesn't — the replace is a no-op when absent).
- `articleLink: string` ← `sum.article?.links?.web?.href` (or '') — **TAKE VERBATIM. Do NOT construct the URL.** The path is sport-specific: MLB/NBA/NHL/NFL are `/{sport}/recap?gameId=…` but **soccer is `/soccer/report/_/gameId/…`** — a different shape. Constructing a pattern would break soccer. Read `links.web.href` as-is.

Initialize all three to '' in the `out` object (route.ts:311). Populate inside the existing `try` that reads the summary. Golf/thin sports with no `article`, and the error `catch`, → all three stay '' (graceful, matches existing "thin → honest recap").

**Verify output-neutral:** a recap request before and after this gate returns identical JSON (the new fields are captured but unused). Commit with explicit path. This gate does NOT change output — but it DOES deploy (Vercel), so confirm green.

Commit: `Recap: capture ESPN article headline/lede/link into RecapData (dateline-stripped, link verbatim, unused/output-neutral)`

---

## GATE 2 — Backend: rewrite buildRecapPrompt to use the AP recap as grounding

This is the load-bearing gate. Modify `buildRecapPrompt` (route.ts:393) so that WHEN `articleLede` is present, the prompt grounds the recap in it AND softens the cardinal rule so it stops fighting the richer source.

**Recon-confirmed mechanics:**
- **Injection point:** the `user` DATA block (route.ts:415+), where `Final:`/`Winner:`/`Key facts:` live. Add an `Official AP recap:` line carrying `articleHeadline` + `articleLede`. Because `storyLine` (route.ts:399) already says "lead with the SINGLE most CONSEQUENTIAL storyline IN THE DATA below," a headline/lede placed in this block becomes legal grounding the model leads with — the story structure already supports it.
- **THE CRITICAL SOFTENING (recon flagged this — do not skip):** today the CARDINAL rule (route.ts:411) says "never add records/drama/importance the data doesn't contain." That was correct for BARE STATS. With an AP recap present, *the drama is now IN the data* — so that clause will FIGHT the source and flatten the story you're feeding it. When `articleLede` is present, the rule must change to: *"The Official AP recap above IS authoritative source narrative — use the significance, turning points, and standout performances it describes. Do NOT add anything beyond what the AP recap + stats support, and CRITICALLY do NOT reproduce the AP recap's wording — rewrite it in your own plain, {level}-appropriate language."* This is the transformed rule: use the story, don't invent past it, don't copy the words.

**Two branches, both must exist:**

**Branch A — article present (`articleLede` non-empty):** AP recap injected as grounding + softened cardinal rule (above). Pro sections (turningPoint/keyPerformance/whyItMattered) now draw from real narrative — they can finally be good, sourced from the AP recap not just box-score stats.

**Branch B — no article (`articleLede` empty — golf, thin games):** the existing NEVER-FABRICATE-from-stats prompt, **byte-identical to today.** The `goalRule` soccer path also unchanged. This is the safety guarantee — sports without an article regress nowhere.

**Copyright discipline (non-negotiable, in the prompt):** REWRITE at level; never reproduce AP's wording. Output is a level-appropriate summary in SportsWise's voice, not a copy of the AP lede. This is what keeps the feature clean.

**Verify:**
- MLB Cubs/Padres-type game: recap now names Swanson + the HRs/RBIs, at each level (test Rookie AND Expert — outputs should differ in simplicity).
- A golf final: recap byte-identical to today (Branch B untouched).
- Spot-check the output does NOT echo the AP lede's sentences verbatim (copyright check — if mirroring, tighten the "own words" instruction before shipping).

Commit: `Recap: ground buildRecapPrompt in ESPN AP recap when present (soften cardinal rule to use in-data narrative, rewrite-not-reproduce); stats-only fallback byte-identical for sports without article`

**⚠️ Deploys live. Vercel-green check. Test on-device via Expo Go against a real final game before done.**

---

## GATE 3 — Mobile: the "Read on ESPN →" link

Thread `articleLink` through the recap response type (`lib/recap.ts` `RecapResponse`) and `fetchRecap` (`lib/api.ts`), and render a "Read on ESPN →" link in `RecapCard.tsx` when present. Opens `articleLink` in the browser (Linking.openURL).

- Add `articleLink: string` to `RecapResponse` + `normalizeRecap`.
- Backend recap handler (route.ts ~1002) already has the field in `RecapData` (Gate 1) — add it to the returned JSON.
- `RecapCard.tsx`: below THE STORY, a subtle "Read the full recap on ESPN →" tappable row when `recap.articleLink` is non-empty. Text link, ESPN as plain text (not logo). No image. Opens `recap.articleLink` **verbatim** via `Linking.openURL` — the URL is already a complete espn.com link from the API, and soccer uses a different path shape (`/soccer/report/…` vs `/{sport}/recap?…`), so never reconstruct it.
- Absent link (golf/thin) → row simply doesn't render. Graceful.

Commit(s), explicit paths:
- Backend: `Recap: include articleLink in recap response JSON`
- Mobile: `Recap card: add "Read on ESPN" link-out when article link present (text only, no image)`

---

## OUT OF SCOPE (do NOT build here)
- ❌ Any ESPN image/thumbnail/video (legal recon: not licensed).
- ❌ Branded recap-card art — separate optional future task (SportDevs free logos or own template). Not on this build's critical path.
- ❌ Widening to non-ESPN news APIs (GNews/Mediastack) — later, if ESPN's article coverage proves insufficient. It doesn't appear to (5/5 major sports covered).

## LOCKED LEGAL CONCLUSION — ESPN images (settled, do not re-litigate)
Three independent research passes (ChatGPT ×2 + Perplexity deep-dive) converged: **do NOT display ESPN/AP/Getty images in the app.** The stacked risks:
- **ESPN/Disney ToU:** the `site.api.espn.com` endpoints are unofficial/reverse-engineered (public API shut down Dec 2014); Disney's terms ban commercial use + automated access. No compliant path exists.
- **AP/Getty (the real financial risk):** ESPN's photos are wire-licensed to ESPN's platforms only, non-sublicensable. **AP uses PicRights — automated web-scanning enforcement, independent of whether ESPN cares.** Statutory damages $750–$150k PER image. "We're small" is not a defense against statutory claims, and automated matching doesn't care about your scale.
- **Link-preview fair use:** GRAY and weaker than founders assume — the Kelly/Perfect-10 thumbnail protections were for *image search engines* (orthogonal purpose); a sports app showing sports images to sports fans lacks that. Warhol v. Goldsmith (2023) narrowed transformative use further for commercial same-purpose uses.
- **Caching makes it WORSE:** the only thin protection (9th Cir. server test) covers *hotlinking* only; copying to your own CDN is an affirmative copy that forfeits it. No engineering framing rescues the image.

**Text is clean** because you REWRITE the AP recap at level (transform), not reproduce it — and you link back. **Visual relief comes from YOUR OWN imagery** (SportDevs free logos, or a SportsWise-templated card), never third-party photos. Revisit licensed images (Getty embed, AP API, SportsDataIO/Sportradar editorial) only with revenue + a 1-hour IP-attorney consult. This is research synthesis, not legal advice.

## SEQUENCING NON-NEGOTIABLES
- Gate 0 (recon) confirmed before Gate 1.
- Gate 1 output-neutral before Gate 2 changes output.
- Each gate its own commit, explicit file paths, never `git add .`.
- Vercel-green after every backend push (Gates 1, 2, 3-backend).
- Golf + thin-game recaps must stay byte-identical throughout (Branch B / empty-article path untouched).
- Copyright: rewrite-at-level, never reproduce AP wording. If output mirrors the lede, tighten the prompt before shipping.
- Discard the recurring VS Code tsconfig.json auto-reformat (`git restore tsconfig.json`) before committing backend.
