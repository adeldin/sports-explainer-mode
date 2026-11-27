// The fixed allow-list for the anonymous feature-use counter (/api/usage). SINGLE SOURCE OF TRUTH:
// a name not on this list is refused and never stored. The app's FeatureName type
// (sports-explainer-mobile-v2/lib/usage.ts) must stay inside this list; run
// `node scripts/check-usage-features.mjs` before a build to confirm.
// A renamed or removed feature keeps its old name here until its tallies expire (120 days).

const ACADEMY_GAMES = [
  'quiz', 'term-match', 'read-the-score', 'crest-rush', 'kit-clash',
  'higher-or-lower', 'signal-decoder', 'zone-tap', 'jeopardy',
];

const CC_PIECES = [
  'make-the-call', 'formations', 'read-the-play', 'box-count', 'onside-or-off',
  'wheres-the-play', 'find-the-open-man', 'coach-speak', 'stat-geek', 'fourth-down-call',
  'count-leverage', 'steal-or-stay', 'press-trigger', 'counter-or-keep', 'posts-corner-or-scrum',
  'help-or-stay', 'approach-or-stay', 'go-or-lay', 'sucker-pin', 'review-or-save',
  'rpo-give-or-pull', 'motion-man-or-zone', 'read-the-coverage', 'infield-in-or-back', 'tag-up',
  'switch-the-play', 'serve-target', 'the-pinch', 'set-the-trap', 'numbers-out-wide',
  'draw-and-pass', 'how-many-in', 'wheres-the-line', 'jam-or-drift', 'commit-or-fan',
  'exit-strategy', 'one-more-phase', 'hold-short-side', 'pick-your-poison', 'two-for-one',
  'foul-up-three', 'serve-plus-one', 'pass-or-lob', 'escape-or-hero', 'pace-the-chase',
  'bowl-or-change', 'attack-the-closeout',
];

const SPORTS = [
  'nfl', 'nba', 'mlb', 'nhl', 'soccer', 'worldcup', 'rugby', 'wnba', 'epl', 'laliga',
  'seriea', 'bundesliga', 'mlr', 'tennis', 'golf', 'cricket', 'nationscup', 'sixnations',
  'nationschamp', 'superrugby', 'championscup', 'challengecup', 'cfb', 'cbb',
];

const FIXED = [
  'academy.faq', 'academy.ask', 'academy.did-you-know-next', 'streak.kept',
  'cc.strategy-tip-next',
  'live.vision', 'live.recap', 'live.share', 'live.ask', 'live.chip', 'live.faq',
  'live.watch-next', 'live.favorite-team', 'live.next-game-finder', 'live.glossary-term',
  'alerts.star-game', 'alerts.follow-team',
  'settings.reminders-on', 'settings.rate', 'settings.share-app', 'settings.feedback-email',
  'settings.restore',
  'paywall.shown', 'onboarding.complete',
];

export const FEATURES: readonly string[] = [
  ...ACADEMY_GAMES.map(g => `academy.${g}`),
  ...CC_PIECES.map(p => `cc.${p}`),
  ...SPORTS.map(s => `sport.${s}`),
  ...FIXED,
];

export const PLATFORMS: readonly string[] = ['ios', 'android', 'extension', 'web'];
