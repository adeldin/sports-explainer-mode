# BUILD DOC — Soccer Coach's Corner ("Match Pulse") — 1.3 design

> **Status:** DESIGN / banked for 1.3. Not yet built. This synthesizes the independent, strongly-
> convergent recommendations of three AIs (ChatGPT, Perplexity, Gemini), each given the same brief
> on how SportsWise's Coach's Corner works today and asked to design a soccer version from an event
> timeline. They converged on the same architecture — that convergence is the validation.
>
> **The core reframe (unanimous):** soccer has no frozen "current situation" like NFL's down-and-
> distance or MLB's count. Its strategic unit is **what the match has become**. The equation all three
> landed on:
>
> **score + time + manpower + recent events + urgency = the strategic moment.**
>
> That is fully derivable from the Highlightly event timeline we already receive.

---

## 0. WHY THIS IS BUILDABLE NOW (recon facts)

From the World Cup recon (banked separately):
- The soccer timeline already flows end-to-end: `highlightlyEnricher.ts` maps each event to `{ minute, type, team, player, detail }`. Event types seen: Goal, Yellow Card, Red Card, Substitution, Missed Penalty.
- Coach's Corner today is gated OFF for soccer by design (double gate): backend `coachState.ts` `RICH = {nfl,nba,wnba,mlb}` → `normalizeCoachState` returns null for soccer; app `coach.ts` `hasSufficientState` has no soccer branch → returns false → "coming soon."
- `CoachSituation` only models football (down/distance/possession/redzone) + baseball (balls/strikes/outs/onBase). No soccer concept exists yet. `buildCoachPrompt` only formats football+baseball facts.
- **So the work is: add a soccer-shaped state path (a "Match Pulse") through the same seams** — not a new paradigm. Mirrors the existing two-stage pattern (deterministic state → LLM explainer).

**Critical data limitation (must be respected):** the timeline gives goals, cards, subs, missed penalties, minute, team. It does NOT give possession, formation, pressing, shot/xG, field position, or player positions. The feature must NEVER fake these (see Guardrail, §4).

---

## 1. ARCHITECTURE (unanimous across all 3 AIs): deterministic engine → LLM explainer

Two stages. Do NOT feed raw events to the LLM and hope.

**Stage 1 — `SoccerMatchPulse` deterministic engine.** Pure logic (like `lib/coach.ts` / `lib/caps.ts`), unit-testable, no React/network. Consumes the event timeline + score + minute, outputs a normalized **Match State Object** (§2). This is the soccer equivalent of down-and-distance.

**Stage 2 — LLM explainer.** Takes the Match State Object + user level, produces the three-part read (§5) under strict honesty constraints (§4). Mirrors how `coachState.ts` already sends normalized state to the model.

---

## 2. THE MATCH STATE OBJECT (what Stage 1 computes)

Computed deterministically from the timeline. Suggested shape (synthesized from all three):

```json
{
  "minute": 78,
  "score": { "home": {"team": "Spain", "goals": 1}, "away": {"team": "Japan", "goals": 0} },
  "game_phase": "late",                  // opening 0-15 / early 16-45 / adjusting 46-60 / crunch 61-80 / closing 81-90+
  "score_state": "Spain leading by one", // level / leading_by_one / leading_by_two_plus / trailing_by_one / trailing_by_two_plus
  "leverage": "high",                    // low / medium / high / extreme  (score × time)
  "manpower": { "Spain": 11, "Japan": 11, "state": "even" },  // from red cards: 11v11 / 11v10 / 10v10
  "discipline": { "Spain_yellows": 2, "Japan_yellows": 1, "reds": [] },
  "recent_events": [                     // last ~5-8 relevant events, already filtered
    {"minute": 63, "type": "substitution", "team": "Japan"},
    {"minute": 67, "type": "substitution", "team": "Japan"},
    {"minute": 74, "type": "yellow_card", "team": "Spain"}
  ],
  "substitution_posture": "trailing team made multiple changes",
  "derived_tags": [                      // the strategic labels — the heart of it
    "late one-goal game", "trailing team multiple subs",
    "leading team carrying cards", "endgame approaching"
  ],
  "trigger_reason": "75th-minute milestone, one-goal game",  // why this surfaced NOW
  "confidence": "high",                  // high when red/score/time clearly imply strategy; lower when inference rests on subs alone
  "known_limitations": ["no possession","no shots","no formation","no player positions"],
  "level": "Rookie"
}
```

### Computed variables (the deterministic rules)
- **Score state** per team: margin → level / leading_by_one / leading_by_two_plus / trailing_by_one / trailing_by_two_plus.
- **Game phase** from minute: opening 0-15 / early 16-45 / adjusting 46-60 / crunch 61-80 / closing 81-90+.
- **Leverage** = score_state × phase (trailing by one at 82' = extreme; trailing by one at 18' = low).
- **Manpower** from red cards: count per team → 11v11 / 11v10 / 10v10, with which team and the minute.
- **Discipline pressure**: yellow counts per team; flag "at risk" if a side has multiple cautions.
- **Substitution posture** (even without positions): trailing+multiple subs after 60 = chasing; leading+subs after 75 = game management; sub soon after a red = structural repair; both teams subbing ~60-70 while tied = tactical chess.
- **Recent event pressure** (NOT "momentum" — see guardrail): cluster of events in a short window → "match volatility / reset moment." Never claim possession-based momentum.

---

## 3. TRIGGER SYSTEM (unanimous: event-driven, NOT every minute)

"Only speak when the incentives of the game have changed" — the soccer equivalent of 3rd-and-long. Generate a new Coach's Corner read on:

**Tier 1 — always trigger (major state changes):**
- **Goal** — opener / equalizer / go-ahead / insurance; early (≤15') or late (≥75') flavor.
- **Red card** — the STRONGEST signal the timeline gives (all 3 flagged it). Compute man-advantage; angle depends on score (protect-with-10 / chase-with-10 / exploit-advantage).
- **Missed penalty** — emotional/momentum swing; missed-equalizer / missed-lead-chance.

**Tier 2 — conditional triggers:**
- **Substitution after ~55'** if tied or one-goal game (tactical window).
- **Yellow card after ~60'** if carded team leads by one, is tied/late, or already has multiple yellows.

**Tier 3 — time milestones** (if no recent major event already fired):
- 45'/HT (first-half reset), 60' (adjustment), 75' (risk calculation), 85' (endgame), 90'+ (final push / game management).

**Narrative priority** (so it talks about the most important thing):
red card > goal state change > penalty event > late score-time pressure > sub pattern > card accumulation.

**Suppression:** don't repeat the same strategic point every refresh; only re-speak when the state meaningfully changed (track an "event delta since last message").

---

## 4. ⚠️ THE HONESTY GUARDRAIL (unanimous, emphatic — the make-or-break)

Every model stressed this hardest. The timeline CANNOT know possession, pressing height, formation, which flank, shot quality, xG, field tilt, or whether a sub was like-for-like. **The feature must never pretend to.** This is what keeps it trustworthy in front of real soccer fans (e.g. Anthony's D1 soccer friends — the launch audience).

The pattern: **turn what you can't know into a "watch for" cue, not a false claim.**
- ❌ FORBIDDEN: "France is dominating possession and pinning Argentina deep." (unknowable)
- ✅ GOOD: "France is trailing late, so they'll likely push more players forward — watch whether Argentina gets space to counter."

Prompt must explicitly instruct: *Do not claim to know possession, formation, pressing, shot quality, or field location unless provided. Explain the strategic incentives created by score, time, cards, substitutions, and recent events. Use "watch for" when something is a likely tactical response rather than a known fact. Separate fact from inference.*

---

## 5. OUTPUT FORMAT (two of three converged on this; matches existing app pattern)

Three-part card (render as prose or structured):
- **Strategic read** — one sentence: what the situation is.
- **Why it matters** — one sentence: the stakes.
- **Watch next** — one concrete viewing cue.

Internally the LLM can return:
```json
{ "headline": "Now it's a man-advantage game",
  "strategic_read": "...", "why_it_matters": "...", "watch_for": "...",
  "confidence": "high" }
```

Example (78', Spain 1-0 Japan, Japan made 2 subs):
> **Strategic read:** Japan is running out of time, and two recent subs suggest they're trying to change the attack before it gets desperate.
> **Why it matters:** Spain can protect the lead, but with a couple of yellows they must defend carefully and avoid cheap fouls near goal.
> **Watch next:** Look for Japan to push more players forward while Spain tries to slow the rhythm and counter when space opens.

---

## 6. DIFFICULTY SCALING (same state, different pedagogy — not just length)

Gemini's sharp point: the level must change *vocabulary and teaching goal*, NOT just make Rookie shorter / Expert longer.

- **Rookie:** explain why the moment matters; plain language, no jargon ("defense" not "low block"); stakes + consequences of rules.
- **Starter/Beginner:** introduce basic strategy (organized, fouls, space).
- **Pro/Intermediate:** explain the tradeoff (pressure vs counterattack space).
- **Expert:** real tactical nuance — low block, transition space, numerical superiority, rest defense — WITHOUT pretending to see unseen things; frame as "watch whether…".

Note the app's internal level key for Rookie is still `'kid'` (display-only rename) — preserve that contract.

---

## 7. NAMED STRATEGIC STATES (the trigger→angle library to build)

| State | Conditions | Angle | Watch cue |
|---|---|---|---|
| Protecting a one-goal lead | lead by 1, min ≥65 | manage risk, avoid fouls, keep shape, counter | does the leader keep an attacking outlet or drop everyone back? |
| Chasing the match | trail by 1, min ≥60 | more pressure/risk over time; vulnerable to counters | do they push more players forward in the final 15? |
| Desperation chase | trailing, min ≥80 | urgency > patience; direct play, set pieces, numbers up | every restart near goal matters more now |
| Playing with 10 | any red card | depends on score: survive / protect draw / high-risk chase | do they pull an attacker to rebuild the back line? |
| Man advantage but chasing | up a player, tied/trailing | must turn advantage into pressure; opponent compact | do they stretch the field vs force it through the middle? |
| Tied late | tied, min ≥70 | both weigh risk vs fear; subs reveal intent | are subs trying to win, or protect against losing? |
| Two-goal cushion | lead by 2+, min ≥60 | leader controls; trailer must open up | if the trailing team scores once, the mood flips |
| Card accumulation | one side 3+ yellows / multiple after 60 | defensive aggression risky; fouls near goal dangerous | does the booked team start defending more cautiously? |
| Post-goal response | within 5-10 min of a goal | scorer pushes or settles; conceder wobbles or responds | next few minutes reveal who's shaken vs confident |

---

## 8. UI / NAMING

Keep the user-facing feature name **Coach's Corner** (consistent across sports). Internally the soccer engine = `SoccerMatchPulse`. Optionally a soccer sub-label like "what the game script means right now." Reuse the existing teal Coach's Corner card styling.

---

## 9. BUILD PLAN (when 1.3 starts — gate it like the Academy)

Likely gates:
- **Gate A — the deterministic engine.** New `lib/soccerPulse.ts` (app) + the backend counterpart in `coachState.ts`: compute the Match State Object from the timeline. Unit-test the rules (score state, phase, manpower, posture, tags, triggers, confidence). No LLM yet — prove the state is correct first.
- **Gate B — wire the gates open for soccer.** Add soccer to backend `RICH` and a soccer branch to app `hasSufficientState` (gated on having a computed pulse, not on football/baseball fields). Extend `CoachSituation`/the prompt path to carry the soccer state. Prove Coach's Corner now renders for soccer instead of "coming soon."
- **Gate C — the LLM explainer + prompt.** `buildCoachPrompt` soccer branch with the honesty guardrail + level-scaling + three-part output. Test against real World Cup matches (live data available). Tune.
- **Gate D — triggers + suppression.** Event-driven generation + don't-repeat logic. Polish.

Same safety rules as always: Anthony pushes all git; no `entitlement.tsx`; no engine-math changes elsewhere; prove on device against live matches before committing; test the honesty guardrail hard (try to make it fake possession — it must refuse).

---

## 10. THE ONE-LINE ESSENCE
Soccer Coach's Corner answers **"what has the match become, and what does that force each team to do next?"** — derived from score + time + manpower + recent events, explained honestly (never faking possession/formation), only speaking when the strategic phase changes.
