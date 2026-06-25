# BUILD DOC — Progression Rank Phase 1: Make Scoring Visible & Rewarding

> **Goal of this build:** The points/rank engine already works — it's just *silent*. A correct
> quiz answer awards points invisibly; the user feels nothing. This build makes the existing
> engine **visible and rewarding**, and adds a gentle **per-difficulty mastery nudge**. It is the
> highest-retention, lowest-risk, zero-data-dependency, zero-App-Review-content work on the board.
>
> **What this build does NOT do:** It does not change the points engine math, does not add new
> game types, does not touch the backend, does not touch `entitlement.tsx`, caps, or the paywall.
> It is purely Academy-screen retention polish + one small piece of new persisted state.

---

## 0. GROUND TRUTH (from read-only recon — do not re-derive, this is confirmed current state)

**The engine — `lib/appState.tsx`:**
- `RANKS` (lines ~30–36): Rookie 0–99 → Starter 100–299 → All-Star 300–699 → Champion 700–1499 → Legend 1500+.
- `getRank(points)` (~40–48): pure fn → `{ name, min, max, next }`.
- `progression_points` (single persisted key, ~68; hydrated ~177–180; auto-persisted ~226).
- `awardPoints(amount)` (~254–259): game-agnostic, adds a raw positive amount to lifetime total, returns new total. **Knows nothing about quizzes — keep it that way.**
- Exposed on context (~264, 268): `points`, `rank: getRank(points)`, `awardPoints`.
- Daily streak: `recordQuizActivity()` (~238–248), key `quiz_daily_streak`.

**The award site — `screens/AcademyScreen.tsx`:**
- Constants (~34–36): `QUIZ_POINTS = { kid: 5, beginner: 10, intermediate: 20, expert: 40 }`, `COMBO_BONUS_CAP = 10`.
- `RANK_EMOJI` map (~38–40).
- Combo state (~71); milestone animation (~93–119); rank card markup (~280–304); rank-card styles (~438–448).
- **The award happens here (~311–320):**
  ```js
  onCorrect={() => {
    const comboBonus = Math.min(combo, COMBO_BONUS_CAP);
    awardPoints(QUIZ_POINTS[level] + comboBonus);   // ← exact amount is known right here
    setCombo(c => c + 1);
    onQuizAnswered();
  }}
  onWrong={() => { setCombo(0); onQuizAnswered(); }}  // ~321 — no points
  ```
- **Critical fact:** the exact awarded number (`QUIZ_POINTS[level] + comboBonus`) is computed at the award site. The "+N" float gets its number for FREE — no plumbing needed.

**The quiz component — `components/QuizCard.tsx`:** purely presentational; pools by `useAppState().level`, shuffles, animates green/red, reports up via `onCorrect`/`onWrong`. Does not touch points. The global `level` is the difficulty source of truth.

**The current UX gap:** on a correct answer the combo bounces and the card flashes green, but the **points number changes silently** and the **rank card is scrolled out of view above the quiz**. Scoring is invisible — exactly the roadmap's flagged problem.

**Mastery tracking:** *does not exist today.* There is no per-difficulty correct-answer counter anywhere. The nudge in Stage 3 is **net-new persisted state** — the one load-bearing addition in this build.

---

## 1. WORKFLOW & SAFETY RULES (read before any code)

- **Anthony pushes ALL git himself. You (Claude Code) NEVER push, NEVER stage with `git add`, NEVER commit.** Write files only. When a stage is done, STOP and tell Anthony exactly what changed so he can review and commit.
- **Do NOT touch `lib/entitlement.tsx`.** Not in scope. If anything seems to require it, STOP and ask.
- **Do NOT change `awardPoints` math, `QUIZ_POINTS`, `COMBO_BONUS_CAP`, or the `RANKS` thresholds.** This build makes existing scoring *visible*, it does not retune it.
- **Do NOT use `localStorage`/`sessionStorage`** — this is React Native; persistence is AsyncStorage via the existing `appState` pattern only.
- **Spell out any terminal command in full** when one is needed; Anthony runs them, not you.
- Build in the **three stages below, in order.** **STOP at each review gate** and report — do not run ahead into the next stage without Anthony's go-ahead. No per-change approvals within a stage, but no unilateral scope changes either.
- Match existing code style (the `appState` persistence pattern, the Reanimated usage already in `AcademyScreen`, the existing style-object conventions).

---

## 2. THE THREE STAGES

### ⭐ STAGE 1 — Visible "+points" feedback on a correct answer
*The single highest-impact change. Makes every correct answer *feel* like it scored.*

**What to build:**
1. When `onCorrect` fires, trigger a floating **"+N"** indicator (N = the exact `QUIZ_POINTS[level] + comboBonus` already computed at the award site). It should rise and fade — a quick, satisfying micro-reward.
2. When a **combo bonus** is in play (combo > 0), make the float read the bonus too — e.g. `+12 🔥` — so the streak's effect on score is *felt*, not hidden.
3. Briefly **pulse/scale the points number** (or the rank card's points value) so the running total visibly ticks up, even if the card is only partially in view.

**Constraints:**
- All in `AcademyScreen.tsx`. No `appState` change (the data already flows). `QuizCard.tsx` change is **optional** — only if Anthony wants the float to originate at the tapped option, which would need the amount passed via a new callback param. **Default: keep it in AcademyScreen, anchored near the combo/rank area.** Confirm preference at the gate.
- Use the **Reanimated** pattern already present in `AcademyScreen` (the milestone animation at ~93–119 is the reference). Don't introduce a new animation library.
- The float must not block taps or shift layout (absolute-positioned overlay).
- Respect reduced-motion if the app already does anywhere; if not, don't add it now — note it as a follow-up.

**✋ REVIEW GATE 1 — STOP HERE.** Report: what file(s) changed, where the float renders, how the number is passed, and how to see it on device. Anthony reviews + commits before Stage 2.

---

### STAGE 2 — Polish the rank card so the journey reads clearly
*The card exists and is decent; this makes it unmistakably "your overall journey" and makes it react.*

**What to build:**
1. **React to point gains:** when points increase, animate the **progress-bar fill** smoothly to its new width (not an instant jump), and briefly highlight the card. Ties Stage 1's "+N" to a visible bar movement.
2. **Clarify identity:** ensure the card reads clearly as the **overall journey across the Academy** (rank name + emoji + "X / Y to {next}"), visually distinct from the per-question difficulty pills — this resolves the rank-vs-difficulty confusion noted in prior on-device testing. Small copy/heading/spacing tweaks, not a redesign.
3. **Rank-up moment:** when a correct answer crosses a rank threshold (e.g. 99→100 = Rookie→Starter), fire a one-time celebratory beat (the new badge + a short callout). Detect by comparing `getRank(before).name !== getRank(after).name`. Keep it tasteful, not a takeover.

**Constraints:**
- All in `AcademyScreen.tsx` (markup ~280–304, styles ~438–448, `RANK_EMOJI` ~38–40). Engine/tiers in `appState.tsx` unchanged. Optional: extract a `components/RankCard.tsx` **only if it makes the code cleaner** — Anthony's call at the gate; default is to keep it inline to minimize churn.
- Do not retune thresholds or emojis without asking.

**✋ REVIEW GATE 2 — STOP HERE.** Report changes + on-device check steps. Anthony reviews + commits before Stage 3.

---

### STAGE 3 — Per-difficulty mastery nudge (the one piece of net-new state)
*Gentle "you're ready to level up" prompt, driven by performance — never forced.*

**What to build:**
1. **New persisted state in `appState.tsx`**, following the existing persistence pattern exactly (new AsyncStorage key, hydrate on load, auto-persist on change — mirror how `progression_points` / `quiz_daily_streak` are done): a small per-difficulty **correct-answer counter**, e.g. `quizMasteryByLevel: { kid: number, beginner: number, intermediate: number, expert: number }`. Increment the current `level`'s count on each correct answer. (Wrong answers don't decrement — never punish, consistent with the engine.)
2. Expose a tiny helper on context (e.g. `recordQuizMastery(level)` and the counts) so `AcademyScreen` can read/write it. Keep `awardPoints` untouched and separate — **mastery is its own concern, not folded into points.**
3. In `AcademyScreen`, when the current level's correct count crosses a threshold (start with a **tunable constant**, e.g. `MASTERY_THRESHOLD = 8` correct at the current level) AND the user isn't already at Expert, show a **dismissable, non-blocking nudge**: "You've nailed N {level} questions — ready to try {nextLevel}?" with **Try it** (calls `setLevel(next)`) and **Not yet** (dismiss).
4. The nudge must be **dismissable and never forced** — difficulty stays manually changeable at all times; this only *offers*. Once dismissed for a given level, don't nag again that session (a simple in-memory "dismissed this session" flag is fine for Phase 1; persisting the dismissal is a possible follow-up).

**Constraints:**
- This is the only stage that adds persisted state — get the `appState` pattern exactly right (hydrate + persist + sane default when the key is absent on first run).
- `QuizCard.tsx` does **not** need to change: the current `level` is the global level the quiz already filters by, so "correct at this level" = "correct answer while global level = X." Confirm this assumption holds before building (it did at recon time).
- Keep the threshold a single named constant so Anthony can tune it on device.

**✋ REVIEW GATE 3 — STOP HERE.** Report: the new `appState` key + helpers, the nudge behavior, the threshold constant, and how to test crossing it. Anthony reviews + commits.

---

## 3. DEFINITION OF DONE (all three stages)
- A correct answer produces a visible, satisfying "+N" (with 🔥 when a combo bonus applies).
- The rank card's bar animates to its new fill and the card reads clearly as the overall journey; crossing a rank tier produces a tasteful rank-up beat.
- After consistent correct answers at a level, a dismissable, never-forced nudge offers the next difficulty; difficulty remains freely changeable.
- No change to engine math, thresholds, backend, caps, or `entitlement.tsx`. No `git add`/commit/push performed by Claude Code.

## 4. OUT OF SCOPE (explicitly — bank, don't build)
- New Academy game types (term-match, this-or-that, daily challenge) — the *next* build after this.
- Post-game recap / retrieval quiz — separate meaty build.
- Persisting nudge-dismissal across sessions, per-sport ranks, richer celebration art/sound — Phase 2 polish.
- Characters/mascot — later, with the graphic designer.
- Any data-provider / backend work.

## 5. FIRST ACTION FOR CLAUDE CODE
Re-open the three files (`lib/appState.tsx`, `screens/AcademyScreen.tsx`, `components/QuizCard.tsx`) to confirm the line references above still hold (they may have shifted slightly), then begin **Stage 1 only**. Build Stage 1, then STOP at Review Gate 1 and report. Do not proceed to Stage 2 until told.
