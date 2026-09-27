# BUILD — Capped-State Play Tease (locked-headers upsell)

**Goal:** When a FREE user hits their daily explanation cap (5 plays) on a live game, replace the bland generic "Keep going with Pro" cap card with a **recap-style locked-headers tease**: show the play's section headers (THE PLAY / WHY IT MATTERS / THE RULE / Coach's Read) with greyed/blurred placeholder bars + Pro CTA — so the user sees *what they're missing ON THIS SPECIFIC PLAY*, not a generic upsell.

**Why:** A generic "you're out of plays" card tells the user nothing about what they're missing *right now, on the play they're watching*. Showing the locked section headers makes the value concrete ("there's an explanation of THIS moment, unlocked with Pro"). This is a **proven pattern — the recap already does exactly this** (THE STORY free, then locked TURNING POINT / KEY PERFORMANCE / WHY IT MATTERED + Pro CTA). Reusing it means visual consistency ("locked headers = Pro content") the user learns once.

**⚠️ SKELETON, NOT generate-then-blur — the right call (corrected reasoning):** the tease must show **skeleton headers + placeholder blur bars** (section labels + greyed shimmer, like the recap's locked sections), NOT generate the real explanation and blur it. 

*Corrected premise (Gate 0 recon finding): the cap is a POST-FETCH display gate, not a cost gate.* `handleFetch` fires the Groq call, derives `playKey` from the response, THEN checks the cap and discards the result if blocked. So on a capped play, the explanation was **already generated upstream** — there is NO Groq saving for the tease to "preserve" (my original premise was wrong). "Skeleton only" is STILL correct, but for these reasons: (1) the `explainBlocked` render branch itself never fetches (fetch lives in `handleFetch`, which already `return`ed with `result=null`), so a skeleton adds no *new* generation; (2) generate-then-blur would be needless complexity and worse UX. Skeleton is simpler, cleaner, and correct — just not for a cost reason.

**SEPARATE ISSUE (NOT this build — see banked note at bottom):** the recon surfaced that capped free users DO still incur discarded Groq calls (the cap is post-fetch). Fixing that is a separate `handleFetch` change (pre-fetch cap check), non-trivial because the cap unit is keyed on `playKey` derived from the response. Banked as its own decision. **This tease build does not address it and does not depend on it.**

**MOBILE-ONLY.** No backend, no new API/Groq calls (the tease branch never fetches). Ships in v1.4 (or next) EAS build.

---

## GATE 0 — RECON: ✅ DONE. Findings below.

- **Cap card (being replaced):** LiveScreen.tsx:979–1004, the `explainBlocked ?` branch → `styles.capCard` (self-contained View, clean to swap). Title `capExplainTitle`, body `capExplainBody`, primary btn → `presentPaywall` (text `capCta`), + 2 secondary links (Academy, Coach's Corner).
- **Recap locked-section pattern (to reuse) is INLINE, not a component** (RecapCard.tsx:66–73): `<View style={styles.section}><Text style={styles.sectionTitle}>🔒 {LABEL}</Text><View style={styles.lockedBars}><View lockedBar width 92%/><View lockedBar width 78%/></View></View>`. Styles: `lockedBar {height:12, borderRadius:6, backgroundColor:t.border, opacity:0.6}`, `sectionTitle {accentText,11,900,ls:1}`. CTA `unlockBtn`+`recapUnlock`. → **EXTRACT a shared `<LockedSection label />`** (honors never-delete; RecapCard + tease both use it).
- **PlayCard labels to mirror:** `🎙️ {thePlay}` (always), `💡 {whyItMatters}` (conditional), `📜 {theRule}` (conditional), + `🧠 COACH'S READ` (from CoachCard.tsx:127 — HARDCODED eyebrow, not a localized string). Four locked rows: 🎙️ THE PLAY / 💡 WHY IT MATTERS / 📜 THE RULE / 🧠 COACH'S READ.
- **Pro CTA:** `presentPaywall` (from `lib/entitlement`, L32) — reuse directly.
- **Strings:** reuse `capExplainTitle`/`capExplainBody`/`capCta`/`recapUnlock`/`thePlay`/`whyItMatters`/`theRule`. "Coach's Read" has no locale string (hardcoded in CoachCard) — mirror it hardcoded identically, OR add a locale string (small).

---

## 🏦 BANKED — SEPARATE COST BUG (surfaced by Gate 0, NOT this build)

**Capped free users still incur discarded Groq calls.** `handleFetch` (L296–336) fetches the explanation, derives `playKey` from the response, THEN checks the cap and discards the result if over-limit. So the cap is a **post-fetch display gate, not a cost gate** — every capped play still costs a Groq call whose answer is thrown away. On a live game where a capped user keeps tapping, that's repeated wasted spend.

Fixing it = a `handleFetch` change to check the cap BEFORE fetching. **Non-trivial:** the cap unit is keyed on `playKey`, which is derived from the response — so a pre-fetch check needs a way to identify "new play vs. re-read" without the response (e.g. a lightweight pre-fetch play identifier, or a cheaper pre-check). Deserves its own focused design session. **The tease build below does NOT touch this and does NOT depend on it.**

---

## GATE 1 — Build the capped tease (replace the generic cap card)

In the `explainBlocked` branch of LiveScreen's render (where the generic "Keep going with Pro" card currently shows for a capped free user on a live game):

- Replace/augment the generic card with a **locked-headers tease** that mirrors the recap's locked-section visual:
  - A brief real header line (keep the honest "X plays explored today / free plays refresh tomorrow" context — don't hide that the cap exists) OR fold it into the CTA.
  - The play's section headers as **locked rows**: **THE PLAY**, **WHY IT MATTERS**, **THE RULE**, **Coach's Read** (mirror the exact labels/icons PlayCard uses per Gate 0) — each with a 🔒 + greyed **placeholder blur bars** underneath (NO real content, NO generation).
  - The existing **Pro CTA** ("Keep going with Pro →" / "Unlock the full breakdown") — reuse the existing upgrade action from Gate 0, do NOT build a new paywall trigger.
- **Skeleton only:** the blur bars are static placeholder `View`s (like the recap's locked sections), NOT generated-then-hidden text. Confirm NO explanation fetch fires in this branch (the whole point of the cap).
- Conditional: mirror only the headers that a play of this sport WOULD have (e.g. if a sport doesn't have "Coach's Read," don't show that locked row) — reuse whatever section logic PlayCard uses.
- Keep it free-tier-appropriate: this shows for capped FREE users. Pro users never hit this branch (unlimited). Don't gate it further.
- **The quiet WatchOn TV row and the GameContextCard both still render** (they're siblings, already decoupled from this branch) — so a capped user still sees where-to-watch + game info. The tease replaces only the play-explanation area.

**Verify on-device:**
- Free account, hit the daily cap (5 plays), select a live game → see the locked-headers tease (THE PLAY / WHY IT MATTERS / THE RULE / Coach's Read, greyed, + Pro CTA) instead of the bland card. The GAME INFO block still shows below; the quiet TV row still shows above.
- Confirm via network/logs that **NO explanation Groq call fires** when the tease renders (cost check — the whole point).
- Tapping the Pro CTA triggers the existing upgrade flow.
- Pre-cap (plays remaining) → normal PlayCard, unchanged.
- Pro user → normal unlimited PlayCard, never sees the tease.

Commit: `Capped tease: replace generic cap card with recap-style locked-headers upsell (THE PLAY/WHY/RULE/Coach's Read skeletons + Pro CTA); render-layer only, no generation`

---

## SEQUENCING NON-NEGOTIABLES
- Gate 0 recon done (cap-branch location + recap locked-section pattern to reuse + PlayCard labels + `presentPaywall` CTA — all confirmed above).
- **SKELETON ONLY — no generate-then-blur.** Correct for UX/simplicity reasons (the `explainBlocked` branch never fetches; generate-then-blur would be needless complexity). NOTE: it does NOT "save" a Groq call — the cap is post-fetch (see banked cost bug); the call already fired upstream. Skeleton is right regardless.
- Reuse the recap's locked-section visual (extract a shared component if it's inline — honor "never delete", so extract-and-reuse rather than duplicate-then-diverge).
- Reuse the existing Pro CTA / paywall trigger — don't build a new one.
- Mirror PlayCard's actual section labels/icons (THE PLAY / WHY IT MATTERS / THE RULE / Coach's Read) so the tease looks like the real thing, locked.
- WatchOn + GameContextCard still render for capped users (already decoupled) — the tease replaces only the explanation area.
- Localize any new strings (interface + all 10 locales).
- Mobile-only; ships next EAS build.
- Discard any tsconfig auto-reformat before committing.
