// Store rating ask: runtime side. Games call markHappyMoment() on a clear win and
// clearHappyMoment() on a wrong answer; the Academy / Coach's Corner back button calls
// askForReviewIfHappy(). The rule itself is the pure decideReviewAsk() in lib/reviewDecision.ts.
// Only the system sheet (expo-store-review) is ever shown; never a store link, never a pre-question.
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { decideReviewAsk, loadReviewRecord, ReviewRecord } from './reviewDecision';

const STORAGE_KEY = 'review_prompt';
const SETTLE_MS = 1500;

// In memory only: dies when the app closes.
let pending: string | null = null;
let blockedThisSession = false;
let isFirstSession = true;        // safe default until initReviewPrompt has loaded the record
let record: ReviewRecord | null = null;
let initPromise: Promise<void> | null = null;

const appVersion = (): string => Constants.expoConfig?.version ?? 'unknown';
const devLog = (msg: string) => { if (__DEV__) console.log(msg); };

export function initReviewPrompt(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      let raw: string | null = null;
      try { raw = await AsyncStorage.getItem(STORAGE_KEY); } catch { raw = null; }
      const loaded = loadReviewRecord(raw, Date.now());
      record = loaded.record;
      isFirstSession = loaded.isFirstSession;
      if (isFirstSession) {
        try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch {}
      }
    })();
  }
  return initPromise;
}

export function markHappyMoment(reason: string): void { pending = reason; }
export function clearHappyMoment(): void { pending = null; }
export function blockReviewThisSession(): void { blockedThisSession = true; pending = null; }

// Call right after leaving a game for the Academy / Coach's Corner home. isStillHere() is
// re-checked after the settle wait (the home is still shown and its tab is focused).
export function askForReviewIfHappy(isStillHere: () => boolean): void {
  if (!pending) return; // nothing to do; skip the wait entirely
  setTimeout(() => { void runAsk(isStillHere); }, SETTLE_MS);
}

async function runAsk(isStillHere: () => boolean): Promise<void> {
  try {
    await initReviewPrompt();
    if (!isStillHere()) { devLog('review ask: no, reason left-screen'); return; }
    if (AppState.currentState !== 'active') { devLog('review ask: no, reason background'); return; }
    const version = appVersion();
    const now = Date.now();
    const d = decideReviewAsk({
      pending: pending !== null,
      isFirstSession,
      appVersion: version,
      lastAskedAt: record?.lastAskedAt ?? null,
      lastAskedVersion: record?.lastAskedVersion ?? null,
      blockedThisSession,
      now,
    });
    if (!d.ask) { devLog(`review ask: no, reason ${d.reason}`); return; }
    if (!(await StoreReview.isAvailableAsync())) { devLog('review ask: no, reason not-available'); return; }
    devLog(`review ask: yes (${pending})`);
    pending = null;
    record = { firstSeenAt: record?.firstSeenAt ?? now, lastAskedAt: now, lastAskedVersion: version };
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch {}
    await StoreReview.requestReview();
  } catch {
    // Never let the rating ask break the app (e.g. ERR_STORE_REVIEW_FAILED).
  }
}
