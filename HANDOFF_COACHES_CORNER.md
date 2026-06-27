# SportsWise — Session Handoff (Coach's Corner / Formation work)
**Date:** 2026-06-27
**Last commit:** ddd7ef1 (pushed to origin/main) — "Add soccer formation diagram + read-the-play quiz; Coach's Corner roadmap & ideas catalog"

## HOW WE WORK (read first)
- Claude.ai = architect/reviewer (NO repo access). Claude Code = executor on Anthony's Mac. Anthony relays between them.
- **Anthony pushes ALL git himself.** Claude Code NEVER runs git add/commit/push.
- Claude Code instructions go in a single "📋 PASTE INTO CLAUDE CODE:" block; terminal commands in "📋 RUN IN TERMINAL:" blocks, spelled out fully.
- Always use explicit file paths in `git add` (never `git add .`).
- Recon-first before touching unfamiliar code. Build docs use review GATES — Claude Code STOPS at each for review.
- Anthony tests on-device via EXPO GO (not a dev build). Start: `cd /Users/anthonydeldin/Desktop/sports-explainer-mode/sports-explainer-mobile-v2 && npx expo start -c` (press `s` if "Using development build," `r` to reload).
- Safety rails: never touch entitlement.tsx (except DEV_FORCE_PRO when explicitly testing); no engine-math changes; no localStorage; apostrophes in strings → double-quote/backtick/template-literal.
- Backend deploys to LIVE app instantly via Vercel (no review buffer) — higher risk, extra caution.
- Anthony's working style: "I work as long as possible every day. I will let you know when I'm done." Do NOT prompt him to stop/rest.

## WHAT WE BUILT THIS SESSION (✅ committed in ddd7ef1, pushed)
1. **Formation diagram** — react-native-svg component (components/FormationDiagram.tsx) drawing a team's starting XI on a pitch from ESPN summary.rosters data, with a "COACH'S READ" explanation slot scaled to all 4 levels. Verified on-device (Expo Go). Supporting libs:
   - lib/formationLayout.ts — pure layout engine (position abbreviation → x/y), with a narrowly-gated compactDoublePivot fix (only fires when formation's first mid band == 2 + two wide-labeled mids; fixes France 4-2-3-1's ESPN mislabel without touching real 4-3-3s).
   - lib/formationSvg.ts — standalone SVG-string renderer (the desktop-preview path; the RN component is the in-app path). Exports wrap() (7-line + ellipsis).
   - lib/formationExplanations.ts — FORMATION_EXPLANATIONS: 12 formations × 4 levels = 48 entries (authored by ChatGPT, curated). Keys: 4-3-3, 4-2-3-1, 4-4-2, 4-1-4-1, 4-5-1, 3-5-2, 3-4-3, 5-3-2, 4-4-1-1, 5-4-1, 4-2-2-2, 3-4-1-2.
2. **Read-the-play quiz** — soccer formation quiz reusing the Academy quiz scoring (live Academy QuizCard/QuizGame UNTOUCHED — used dedicated copies):
   - lib/canonicalFormations.ts — CANONICAL_FORMATIONS (12 textbook shapes) + synthTeam() (synthetic rosters that feed layoutFormation/FormationDiagram — no real game needed).
   - lib/formationQuiz.ts — generator. kid/beginner = NAME-THE-FORMATION; intermediate/expert = WEAKNESS. Mines weakness phrases from FORMATION_EXPLANATIONS.
   - components/academy/FormationQuizCard.tsx + FormationQuizGame.tsx — dedicated components copying QuizOption + scoring wrapper (QUIZ_POINTS, COMBO_BONUS_CAP, awardPoints, rank-up).
3. **Docs:** FEATURE_IDEAS.md updated (Strategy/Coach's Corner tab architecture, launch plan, naming decisions). COACHES_CORNER_IDEAS.md created (2108-line all-sports idea catalog synthesized from 3 AI brainstorms — a REFERENCE catalog, not a build queue).

## KEY DECISIONS LOCKED THIS SESSION
- **The tab is "Coach's Corner"** (was originally going to be this; Anthony made a chalkboard "COACHES CORNER" header image, on his machine, for the tab banner — crop/fade into navy, the cream frame-surround needs handling).
- **The live in-context card → renamed "Coach's Read"** (DISPLAY-ONLY rename per the Kid→Rookie pattern; leave internal identifiers/keys/storage untouched). Tidy family: "Coach's Corner (the place) contains Coach's Reads (the insights)." Not yet applied.
- **Coach's Corner is PROACTIVE** (a destination you go to learn) vs Live's "Coach's Read" which is REACTIVE (explains this moment). A "Learn more in Coach's Corner →" bridge link goes on the Live card.
- **Game source for the tab: INDEPENDENT selection for v1** (own game strip via fetchScoreboard + own rosters fetch). The selected game is currently LOCAL to LiveScreen (useState), NOT in shared useAppState — lifting it (so Live & Coach's Corner share the game) is a deferred B→A upgrade. Extract fetchSummaryRosters(sport, gameId) when building the tab.
- **THE SCOPE INSIGHT:** the formation diagram + read-the-play are SOCCER-ONLY, but Coach's Corner must serve all ~14 sports. The resolution (confirmed by all 3 AI brainstorms): the UNIVERSAL spine is the "Make the Call" judgment quiz ("Cover 2 → which play?" / "3-2 count → what pitch?" / "formation weakness?"). Formations are SOCCER'S slice, not the tab's identity. So the tab is all-sports because its spine is universal; soccer formations are bonus depth.

## WHAT'S PARKED / UNCOMMITTED (intentionally — in the working tree)
- **Gate D-1 backend** (src/app/api/explain/coachState.ts, dataProvider.ts, soccerPulse.ts) — possession/shots enrichment of the soccer Coach's Read. Built + smoke-tested both ways, but PENDING a live DIVERGENT soccer game to verify read quality (does it tie claims to numbers without overclaiming?). Then revert temp flags + commit. coachState.ts also bundles the Gate C soccer Coach's Read work.
- **HANDOFF.md** (pre-existing, dated 2026-06-21) — not ours, ignore.

## NEXT STEPS (priority order for the new chat)
1. **Build "Make the Call" — the universal all-sports judgment quiz.** THIS is the priority — it's what makes Coach's Corner genuinely multi-sport (not soccer-only). Mechanic is cheap (reuse the Academy quiz framework: scenario → 4 options → reveal + why); CONTENT is the work (author scenarios per sport per level — candidate for the crowd-source-3-AIs-and-curate workflow, or LLM-pregenerate + curate). Start with 2-3 sports that are cheap to author (baseball is in-season + text-only scenarios like "3-2 count, what pitch?" need no diagram; soccer you have). See COACHES_CORNER_IDEAS.md Part 1 (consensus #1 pick) + Part 3 (MVP).
2. **Stand up the Coach's Corner tab** with both pieces (Make the Call universal + soccer formations/read-the-play as soccer's slice), the chalkboard header, and the "Coach's Read" card rename. App.tsx Tab.Navigator (~line 181-187): Live/Academy/Settings tabs; TAB_ICONS map (~:35); add a 4th Tab.Screen. Extract fetchSummaryRosters util.
3. **Read-the-play polish** (small): replace mined weakness phrases with a curated uniform FORMATION_WEAKNESS map (~3-6 words each, same register — right now the correct answer is often the longest option = a gameable tell). Drafts were proposed; Anthony (exercise-science prof) should verify soccer accuracy. Also bias name-the-formation distractors toward same-defender-count formations.
4. **Gate D-1 live test + commit** (the parked backend) — needs a live divergent soccer game.

## KEY PATHS / FACTS
- Repo root: /Users/anthonydeldin/Desktop/sports-explainer-mode; mobile app: sports-explainer-mobile-v2/; backend: src/app/api/explain/
- Level type (lib/api.ts): 'kid' | 'beginner' | 'intermediate' | 'expert'. Display names: Rookie/Beginner/Intermediate/Expert (kid = Rookie display).
- ESPN soccer summary: https://site.api.espn.com/apis/site/v2/sports/{league}/summary?event={id}. France-Norway World Cup test gameId=760475 (league fifa.world). summary.rosters[] per team has .formation, .team.displayName, .roster[] with .starter/.jersey/.position.abbreviation/.athlete.shortName. No x/y coords.
- react-native-svg 15.12.1 installed. Space Grotesk loaded via @expo-google-fonts/space-grotesk (families SpaceGrotesk_700Bold/_600SemiBold/_500Medium) — use those RN family names in SVG, not the web CSS string.
- Academy quiz framework: ACADEMY_GAMES registry (lib/academyGames.ts); QuizGame (scoring wrapper: QUIZ_POINTS={kid:5,beginner:10,intermediate:20,expert:40}, COMBO_BONUS_CAP=10, awardPoints) + QuizCard (question UI, pulls QUIZ[sport] from lib/facts.ts). QuizQuestion shape: {q, options[], answer(0-based index), explanation, difficulty}.
- Brand: navy #0d1b3e, orange #E87722, amber #F5A623, teal #14B8A6.
- Stack: React Native/Expo SDK 54, Next.js/Vercel backend, Groq/Llama (live AI), ESPN free API, RevenueCat. App LIVE on App Store with paid Pro working.
