// Anonymous feature-use counter. trackFeature('cc.box-count') tells the server "one app session
// opened this feature", as { f: name, p: 'ios' | 'android' }. Nothing else is ever sent: no user
// id, device id, install id, email, level, language, team or sport preference.
//
// Fire and forget: never awaited by callers, never throws, never shows anything, gives up after
// 5 seconds, ignores every response (including 404 from a server that does not have /api/usage
// yet). Once per feature per app session: a name already sent is skipped until the app returns to
// the foreground after 30+ minutes in the background.
//
// The names must stay inside the server allow-list (src/app/api/usage/features.ts at the repo
// root); `node scripts/check-usage-features.mjs` at the repo root checks this.

import { AppState, Platform } from 'react-native';
import { API_URL } from './api';
import type { Sport } from './api';
import type { AcademyGameId } from './academyGames';
import type { CCPieceId } from './coachesCorner';

export const FIXED_FEATURES = [
  'academy.faq', 'academy.ask', 'academy.did-you-know-next', 'streak.kept',
  'cc.strategy-tip-next',
  'live.vision', 'live.recap', 'live.share', 'live.ask', 'live.chip', 'live.faq',
  'live.watch-next', 'live.favorite-team', 'live.next-game-finder', 'live.glossary-term',
  'alerts.star-game', 'alerts.follow-team',
  'settings.reminders-on', 'settings.rate', 'settings.share-app', 'settings.feedback-email',
  'settings.restore',
  'paywall.shown', 'onboarding.complete',
] as const;

export type FeatureName =
  | `academy.${AcademyGameId}`
  | `cc.${CCPieceId}`
  | `sport.${Sport}`
  | (typeof FIXED_FEATURES)[number];

const USAGE_URL = API_URL.replace('/api/explain', '/api/usage');
const SESSION_GAP_MS = 30 * 60 * 1000;

const sent = new Set<FeatureName>();
let backgroundedAt: number | null = null;

try {
  AppState.addEventListener('change', state => {
    if (state === 'active') {
      if (backgroundedAt !== null && Date.now() - backgroundedAt >= SESSION_GAP_MS) sent.clear();
      backgroundedAt = null;
    } else if (backgroundedAt === null) {
      backgroundedAt = Date.now();
    }
  });
} catch { /* no AppState (tests): every launch is one session */ }

export function trackFeature(name: FeatureName): void {
  try {
    if (sent.has(name)) return;
    sent.add(name);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    fetch(USAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ f: name, p: Platform.OS }),
      signal: controller.signal,
    })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  } catch { /* counting must never affect the app */ }
}
