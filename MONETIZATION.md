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
