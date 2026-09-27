# Academy v2 — seven new visual games across all 10 sports

Takes the Academy from **2 text-heavy games** (Quick Quiz, Match Up) to **9**, adding seven visual/interactive games built on the registry seam — one descriptor per game, no changes to `GameHost` or the Academy shell.

## The games

| Game | Sports | What it is |
|---|---|---|
| 🔢 Read the Score | all 10 | Scoreboard literacy — read an SVG scoreboard/scorecard (240 scenarios) |
| 🛡️ Crest Rush | 8 team sports | Name the team from its crest (live ESPN, keyless) |
| 🎨 Kit Clash | 8 team sports | Name the team from its two brand colors (live ESPN) |
| ⚖️ Higher or Lower | 8 team sports | Which team is ahead? — live standings, Sporcle-style |
| 🚩 Signal Decoder | 8 sports | Read the official's **animated** signal (86 pictograms, 168 scenarios) |
| 📍 Zone Tap | all 10 | Tap the spot on the playing surface (240 scenarios, 6 new field surfaces) |
| 🎪 Sportswise Jeopardy | all 10 | The capstone board — each column a game, each row a tier, real completion summary |

Every category clears the "2–3 per sport" goal: eight sports get 7 new games each; tennis and golf get 3 (no crests, signals, or standings — individual sports).

## Principles held throughout

- **Duolingo for sports:** every game awards XP, feeds the day streak, and has a teaching beat that explains *why* at the user's level (the pre-existing Coach's Corner games awarded zero points — fixed here).
- **Content is rule-based or live-fetched, never remembered:** scoring laws, officials' signals, positions (evergreen), or live ESPN data (crests, colors, standings). No hardcoded player/record trivia anywhere — it hallucinates and it rots.
- **Difficulty tiers are real** (kid/beginner/intermediate/expert) with a never-blank fallback, and the Pro gate is left open (one-line `isPro` wrap) — **nothing is gated; all free.**
- **Live-data games degrade gracefully offline** — cached pool or a friendly retry, never a crash.
- Mobile only (the Chrome extension has no Academy); all art lives in swappable modules for a future designer.

## Post-review fixes already included

- Live games no longer open on the error card (an AbortController-on-fetch bug specific to RN's New Architecture).
- Higher or Lower names its season and says "final table" for finished seasons, "so far" only for in-progress ones (detected from the games-played column, not the clock).
- Signal Decoder hands cleaned up (ball by default, exact finger counts where they matter); jump-ball thumbs no longer read as raised middle fingers.
- Zone Tap gained orienting context (reference balls, context players) and a fixed line-of-scrimmage label.

## Known items for review (not blockers)

- Jeopardy's 6-column board on a team sport hasn't been eyeballed on a device — worth a look for cramping.
- Golf has the lightest content (no crests/signals/standings; leans on Read the Score + Zone Tap + Terms).

Recon and full build spec: `BUILD_ACADEMY_GAMES_v2.md`. Built across autonomous gates; typechecks clean.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
