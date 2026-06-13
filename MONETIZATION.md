# Monetization

**Intent:** the app is intended to generate revenue. **No model is locked in yet.**

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
  **$0.25–0.50 API cost per user.** Suggested price: **$4.99–9.99/month.**
- **Value of paid tier:** better AI + all sports verticals + eventually **all "[Topic]
  Explainer" verticals bundled.**
- **Honest note:** the free tier already handles ~90% of standard play explanations well —
  **don't oversell** the AI upgrade as a differentiator for basic use.

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
- App Store in-app purchase (**StoreKit** for iOS — Apple takes a **15–30% cut**)
- Possibly a database

## Decision pending

**Which premium model to use** — evaluate **GPT-4o vs. Claude vs. Gemini** on quality,
pricing, and terms of service **at build time.**
