# SportsWise ops checks

Recurring checks that act as the app's IT, security and marketing teams. Each one updates its own row in the Notion **Ops Status** database (Status, Summary, Action needed, Timestamp) every run. The source of truth for the wider ops setup is the Notion page **Ops Brief for Claude**.

Nothing here sends, publishes, deploys, deletes or pays for anything. The only outgoing action is an email to the owner when a row first turns ACTION NEEDED for a **security** or **payment** problem.

## The checks

All run on **Mondays**. Times are US Central.

| # | Check (Ops Status row) | Team | Where it runs | When | Model | Why this model |
|---|---|---|---|---|---|---|
| 1 | App health | IT | Cloud routine `trig_01PUaUBHnaLi83heXQa77i7S` | 7:10 | Haiku 5.5 (`claude-haiku-5-5`) | Pass/fail on about 18 public URLs, no judgment needed |
| 2 | API errors | IT | Mac (`sw-api-errors`) | 7:30 | Sonnet 5.5 (`claude-sonnet-5-5`) | Must tell harmless noise from a real breakage in raw error logs |
| 3 | Extension sign-in | Security | Mac (`sw-signin`) | 7:35 | Haiku 5.5 | Did the test email arrive: yes or no |
| 4 | Keys and secrets | Security | Mac (`sw-keys`) | 7:40 | Haiku 5.5 | Script does the scanning; model applies fixed rules |
| 5 | Quotas, spend and renewals | IT | Mac (`sw-quotas`) | 7:45 | Haiku 5.5 | Numbers against thresholds, plus a date list |
| 6 | App Store and Play status | IT | Mac (`sw-store`) | 7:50 | Haiku 5.5 | Maps store states to a fixed table |
| 7 | Store ratings and listing | Marketing | Mac (`sw-ratings`) | 7:55 | Haiku 5.5 | Counts and short review quotes |

Opus is not used by any check. It is kept for fixing what the checks find, in a normal chat.

**Usage:** 7 short runs a week, about 1 a day on average, all on Monday morning. The paid AI cost to SportsWise itself is one test explanation a week (check 1).

### What each check looks at

1. **App health:** saved-answers cache, live tennis, golf leaderboard, cricket, rugby, one real test explanation (with timing), six ESPN scoreboards, the ESPN rugby feed, play-by-play shape, and the App Store listing page. (Google Play's page is checked in #6 because the cloud sandbox cannot reach play.google.com.)
2. **API errors:** 7 days of production error logs from Vercel, grouped by feature, compared with last week.
3. **Extension sign-in:** asks the live API to email a sign-in code to a dedicated test address, confirms it arrived in Gmail, then trashes it. Weekly use also stops Brevo from marking the key inactive again.
4. **Keys and secrets:** Vercel variable names (flags any `NEXT_PUBLIC_` or `EXPO_PUBLIC_` secret, and new or removed names), key-file permissions, secret files sitting in iCloud-synced folders, GitHub secret-scanning and Dependabot alerts (split into server and phone-app build tools), and secrets tracked in this public repo.
5. **Quotas, spend and renewals:** remaining quota on RapidAPI golf and tennis and on Highlightly, the Upstash cache, renewals due within 14 days in Vendors & Subscriptions, and billing or budget-alert emails from the last 8 days.
6. **App Store and Play status:** iOS version states, App Store availability, Play release tracks, both public listing pages.
7. **Store ratings and listing:** rating counts and averages on both stores, new reviews (App Store 30 days, Play 7 days), and whether the live App Store subtitle and keywords still match `APP_STORE_METADATA.md`.

## Where the pieces live

- **Mac checks:** `~/ops/sportswise/` (outside this repo and outside iCloud).
  - `run.sh <check>`: runs `gather/<check>.sh` (a plain script that collects facts; no AI), then hands only those facts to the Claude subagent.
  - `gather/`: one fact script per check, plus `stores.mjs` for App Store Connect and Google Play.
  - `logs/`: each run's facts and result, kept 60 days.
- **Subagents** (prompt plus model in the frontmatter): `~/.claude/agents/sw-<check>.md`. Each one can only use Notion (its own row) and, where needed, Gmail. It has no file or terminal access.
- **Schedules:** `~/Library/LaunchAgents/com.adeldin.ops.sportswise.<check>.plist`. The Mac mini never sleeps, so they fire on time. If it was off, launchd runs a missed job at next wake.
- **Cloud check:** claude.ai routine, environment `env_01HwdVxUWsmbgudjoW2tJFum` (network allowlist: sports-explainer-mode.vercel.app, statsapi.mlb.com, apps.apple.com, *.espn.com).

## How to pause

- **One Mac check:** `touch ~/ops/sportswise/PAUSED.<check>` (for example `PAUSED.signin`). Delete the file to resume.
- **All Mac checks:** `touch ~/ops/sportswise/PAUSED`. Delete it to resume.
- **Remove a Mac check from the schedule:** `launchctl bootout gui/$(id -u)/com.adeldin.ops.sportswise.<check>`
- **Cloud check:** turn it off at claude.ai/code/routines (SportsWise · IT · App health), or ask Claude to disable it.
- **Run one now:** `~/ops/sportswise/run.sh <check>`

## Still done by hand

RevenueCat dashboard (trials, conversions, refunds), Chrome Web Store developer dashboard, and the Gemini and OpenAI spending alerts (these email on their own once set).
