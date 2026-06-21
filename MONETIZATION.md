# Monetization

**Intent:** the app generates revenue via **freemium subscription** (model now chosen — see below).

**🚀 Launch decision (2026-06-21):** v1.0 shipped **FREE, no IAP.** Freemium is the **v1.1**
build. Rationale: (a) avoid first-submission **subscription review risk** (Apple scrutinizes
paywall/disclosure technicalities — a clean free app is a low-risk first review), and (b)
**calibrate usage limits with real launch data** instead of guessing. Build was never the
blocker (~8–10h with RevenueCat); review risk + calibration were.

## Sponsorship model *(preferred over banner ads)*

A **"Brought to you by [partner]"** placement in the **launch animation**. Preferred partners
are **brand-aligned** — especially **education brands like Khan Academy**.

- **Premium feel, non-intrusive** — plays once per session in the animation, not in the
  content flow.
- **Post-traction play** — needs an audience before partners will engage.
- **Action:** build the **slot now** (trivial — the launch cinematic already exists), **sell
  the sponsor later.**

**Avoid:** generic banner/video ad networks — see Yahoo Sports as a cautionary example of
what cheapens the experience.

## Freemium / subscription *(primary revenue model)*

- **Free tier:** Groq / Llama 3.3 70B — fast, good, and **very cheap** (fractions of a cent
  per query). Rate-limited once paying users exist.
- **Paid tier:** GPT-4o, Claude, or Gemini — **noticeably better on complex / historical /
  nuanced queries** (the Ohtani historical-context type of question). At ~50 queries/month:
  **$0.25–0.50 API cost per user.**
- **Confirmed pricing:** **$4.99/month or $49.99/year** (annual ≈ 2 months free — nudges toward
  the lower-churn annual plan).
- **Value of paid tier:** better AI + all sports verticals + eventually **all "[Topic]
  Explainer" verticals bundled.**
- **Honest note:** the free tier already handles ~90% of standard play explanations well —
  **don't oversell** the AI upgrade as a differentiator for basic use.

## 🎯 What to gate (core principle)

**Gate what costs money; keep zero-marginal-cost features free.**

- **Gate (paid):** ask-anything **daily volume** (best lever — directly ties to API cost), the
  **picture/video** vision feature (highest per-call cost), the **better AI model** (free =
  Groq/Llama cheap tier, paid = better model via the `GROQ_MODEL` hook), **more languages**,
  and eventually **live data** (SportRadar licensing cost).
- **Keep FREE:** the **quiz / Academy** — it's the **retention engine** with **zero marginal
  cost** (local content). Throttling it works *against* retention. Let the free quiz drive daily
  engagement; monetize the AI-powered live experience.

## 🎯 Premium AI stat/coaching layer (a PACKAGING layer — builds AFTER the free teaching loop)

> **Part of a larger design — now validated & re-sequenced (2026-06-21).** The premium **"moment"**
> layer (leverage / win-probability / quantified significance) below is **one slice** — and per two
> independent external AI critiques, a **later** slice — of the full live-explanation learning
> design in **FEATURE_IDEAS.md → 📚 The live explanation (AUTHORITATIVE)**. It is **Step E** there:
> a packaging layer built **AFTER** the free teaching loop proves its value, **not the POC**. The **FREE core** — **leveled explanations** (a different *lesson* per difficulty, not
> just tone) + **tappable glossary definitions** + the **coach's read / plain-language
> significance** + basic numbers — is the **higher-priority build**: it improves the experience for
> *every* user (not just payers) and is a **reusable platform engine**. The premium "moment"
> enrichment follows.

**Core reframe — expertise is per-SPORT, not per-person.** A user can be a rugby beginner AND an
MLB expert at once. The rich, stat-dense "impress your friends" content isn't for "advanced
users" in the abstract — it's for someone watching a sport they already know well, who wants the
deeper stat/coaching read. This maps onto the existing two-layer model: **Layer 1 difficulty
(per-sport) is the dial** — beginner difficulty in a sport you don't know = simple "what
happened"; Expert difficulty in a sport you know = the deep stat/coaching layer. So GUMBO depth =
what Expert difficulty DELIVERS for data-rich sports. It's not a separate paywall axis; it's the
difficulty system finally having real depth to offer at the top end.

**North-star check:** this still serves LEARNING. The MLB-expert watching a game genuinely learns
from "highest-leverage at-bat of the game, win prob swung 20%" — it's an "oh, I didn't know that"
for someone who already knows the basics. Richness teaches when matched to the right expertise
level. **Stat quality bar:** a stat earns its place only if it makes someone go "I didn't know
that" — surprising/teaching, not just dense. (GUMBO's leverage/drama indexes can even PICK which
plays deserve a callout.)

**The free/paid split (decision: option C).** The line is **plain-language significance = FREE;
quantified significance = PAID** (and the **coach's read** is FREE — it's qualitative
interpretation, part of the teaching loop, not a gated metric):
- **Free (single GUMBO fetch — costs nothing extra):** basic supporting stats enrich the Expert
  experience and drive word-of-mouth delight — season slash line, ERA/WHIP, today's line
  ("0-for-4, 3 K"), team records, game situation.
- **Paid (second fetch — the premium differentiator):** the **quantified** "moment" layer —
  leverage index ("highest-leverage at-bat of the game"), win-probability swing ("this play moved
  win prob 20%"), drama index, charts / historical comps. (The qualitative coach's read stays
  free.)

**Carrot-dangling mechanics (require RevenueCat — Phase B):** meter, don't block. Free users get
N premium stats/day, then the box GREYS OUT → "upgrade for unlimited." Plus a **7-day free trial**
of the full unlimited experience. Learning is never locked — just nudged toward more. Let them
TASTE the premium layer (you can't sell what they haven't felt), then hit the wall while still
wanting it.

**Build sequence** *(this is the premium layer's own sub-plan — it starts only after the free
teaching loop in FEATURE_IDEAS Steps A–D has shipped; the premium layer is Step E):*
- **Phase A — POC (after the free teaching loop):** build the premium stat layer, **always-on, NO
  metering yet.** Real GUMBO data, the **leverage / win-prob quantified** stats at Expert
  difficulty for baseball, displayed in-app. Goal: validate it's a genuine "I'd pay for this"
  moment. The whole carrot strategy only works if the carrot is delicious — prove that first.
- **Phase B — RevenueCat + metering:** subscriptions, 7-day trial, daily free quota + greying,
  entitlement checks.
- **Phase C — wire together:** Expert stat layer respects quota/entitlement.

**Data reality (from recon):** one GUMBO fetch
(`statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live`) gives the play + both players' season & game
stats + team records + live situation — joined by player ID into the boxscore (the **free** basic
stats). The win-probability/leverage endpoint (`/api/v1/game/{gamePk}/winProbability`) is a
**second** fetch — the **premium** differentiator. Pre-baked summary strings
(`stats.batting.summary` → "0-4 | 3 K") mean clean numbers to feed the AI. Official free APIs
exist for **MLB & NHL**; NFL/NBA/others rely on ESPN or paid sources — so the rich-stat layer
rolls out **baseball & hockey first**, others later.

## Tiered AI architecture note ✅ *(shipped — 74fe7d9)*

**Done.** The model name is now a **config / environment variable** in `route.ts`: all three
call sites (explain, ask, `translatePlayText`) use
`GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'`. Set `GROQ_MODEL` in
Vercel's env vars to swap/upgrade tiers — no code change. This is the hook for the free/paid
model split.

## Platform expansion

Government / Finance verticals follow the **same tiered model.** The paid tier becomes **more
valuable as verticals expand** ("all verticals + better AI" vs. free "sports only + standard
AI").

## Future infrastructure needed for monetization

- User accounts
- Usage tracking
- Paywall logic
- **App Store in-app purchase** via **RevenueCat** (wraps StoreKit — handles receipts, restore,
  renewals; the standard fast path). Apple takes **15–30%**.
- Possibly a database

## Decision pending

**Which premium model to use** — evaluate **GPT-4o vs. Claude vs. Gemini** on quality,
pricing, and terms of service **at build time.**

## ⚠️ Privacy declaration flag (revisit when accounts ship)

At launch (2026-06-21), the App Store **App Privacy** declaration is: collects **"Other User
Content"** (the user's typed questions) → **App Functionality**, **NOT linked to identity**,
**NOT used for tracking.** That "not linked" answer is true *only because there are no accounts*
— the app is fully anonymous, no identifiers on requests.

**When v1.1 adds accounts + subscriptions, REVISIT this.** If logged-in users' questions become
associated with their account, the declaration may change to **linked to identity**, and adding
RevenueCat/StoreKit introduces **Purchases** data. Update the App Privacy section in App Store
Connect at that time, or the declaration becomes inaccurate (a compliance issue). Also confirm
what the **Vercel backend** and **Groq** retain re: the typed questions.
