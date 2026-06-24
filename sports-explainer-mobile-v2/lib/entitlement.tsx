import React, { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { useAppState, localDateStr } from './appState';
import {
  evaluateDailyExplanation, evaluateGameQA, dailyRemaining, gameQARemaining,
  explanationKey, DAILY_FREE, QA_FREE_PER_GAME,
} from './caps';

// Central entitlement gate. `isPro` is the ONE boolean every premium gate consults — the
// two free-tier caps now, the 3 premium features later. Trial users are isPro: true.
// Entitlement is deliberately isolated from cap logic (the caps live in lib/caps.ts +
// useCaps); adding anything later is "wrap in an isPro check," never an entitlement rebuild.

const RC_ENTITLEMENT = 'pro';
// iOS public SDK key (safe to ship). Absent in dev/Expo Go without keys → we skip
// configure entirely and run as a free user; nothing crashes.
const RC_IOS_KEY: string | undefined = (Constants.expoConfig?.extra as any)?.revenueCatIosKey || undefined;

// DEV-ONLY override: flip to true to exercise Pro-gated features (caps off, full recap, vision)
// on a dev build WITHOUT a real purchase. NO effect in production (__DEV__ is false). Off by default.
const DEV_FORCE_PRO = false;

// Derive { isPro, isTrial } from a RevenueCat CustomerInfo. isPro true while the `pro`
// entitlement is active (INCLUDING the trial); isTrial true only during the trial period.
function deriveEntitlement(info: CustomerInfo | null): { isPro: boolean; isTrial: boolean } {
  const active = info?.entitlements.active[RC_ENTITLEMENT];
  if (!active) return { isPro: false, isTrial: false };
  return { isPro: true, isTrial: String(active.periodType).toUpperCase() === 'TRIAL' };
}

interface EntitlementValue {
  isPro: boolean;
  isTrial: boolean;
  loading: boolean;                         // true until the first customerInfo resolves
  restorePurchases: () => Promise<void>;
  refresh: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementValue | null>(null);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((info: CustomerInfo | null) => {
    const { isPro, isTrial } = deriveEntitlement(info);
    setIsPro(isPro);
    setIsTrial(isTrial);
  }, []);

  useEffect(() => {
    // Dev / Expo Go without a key, or any non-iOS: no RevenueCat — run as free, never crash.
    if (!RC_IOS_KEY || Platform.OS !== 'ios') {
      setLoading(false);
      return;
    }
    let mounted = true;
    try {
      Purchases.configure({ apiKey: RC_IOS_KEY });
    } catch (e) {
      console.warn('RevenueCat configure failed:', e);
      setLoading(false);
      return;
    }
    // Live updates: flips isPro on purchase / restore / trial-start / trial-expiry.
    const listener = (info: CustomerInfo) => { if (mounted) apply(info); };
    Purchases.addCustomerInfoUpdateListener(listener);
    Purchases.getCustomerInfo()
      .then(info => { if (mounted) apply(info); })
      .catch(e => console.warn('RevenueCat getCustomerInfo failed:', e))
      .finally(() => { if (mounted) setLoading(false); });
    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [apply]);

  const restorePurchases = useCallback(async () => {
    if (!RC_IOS_KEY || Platform.OS !== 'ios') return;
    try { apply(await Purchases.restorePurchases()); }
    catch (e) { console.warn('RevenueCat restore failed:', e); }
  }, [apply]);

  const refresh = useCallback(async () => {
    if (!RC_IOS_KEY || Platform.OS !== 'ios') return;
    try { apply(await Purchases.getCustomerInfo()); }
    catch (e) { console.warn('RevenueCat refresh failed:', e); }
  }, [apply]);

  const value: EntitlementValue = {
    isPro: isPro || (__DEV__ && DEV_FORCE_PRO),
    isTrial, loading, restorePurchases, refresh,
  };
  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlement(): EntitlementValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useEntitlement must be used within an EntitlementProvider');
  return ctx;
}

// Present RevenueCat's DROP-IN paywall (design / copy / packages / trial / restore /
// auto-renew + terms/privacy disclosure all configured in the RC dashboard, not here).
// Dev-safe: no-op (logs) when RevenueCat isn't configured or the native UI is unavailable.
export async function presentPaywall(): Promise<void> {
  if (!RC_IOS_KEY || Platform.OS !== 'ios') {
    console.log('[paywall] RevenueCat not configured — paywall is a no-op in this build.');
    return;
  }
  try {
    await RevenueCatUI.presentPaywall();
  } catch (e) {
    console.warn('RevenueCat presentPaywall failed:', e);
  }
}

// useCaps — composes the entitlement (isPro) with the persisted counters (AppState) and the
// PURE evaluators (lib/caps). The record* fns have STABLE identities (read latest state via a
// ref) so they're safe inside LiveScreen's memoized handleFetch without dep churn.
export function useCaps() {
  const { explainCap, setExplainCap, qaCap, setQaCap } = useAppState();
  const { isPro } = useEntitlement();

  // Latest values for the stable callbacks (synced each render — cheap + idempotent).
  const latest = useRef({ explainCap, qaCap, isPro });
  latest.current = { explainCap, qaCap, isPro };

  // Record a NEW main explanation. Returns whether it's allowed (false → caller shows paywall
  // + the blocked state). `isRefresh` (the 60s auto-refresh) and re-reads never consume.
  const recordExplanation = useCallback((gameId: string, playKey: string, isRefresh: boolean): boolean => {
    const { explainCap, isPro } = latest.current;
    const today = localDateStr(new Date());
    const d = evaluateDailyExplanation(explainCap, today, explanationKey(gameId, playKey), { isPro, isRefresh });
    if (d.nextState !== explainCap) setExplainCap(d.nextState);
    return d.allowed;
  }, [setExplainCap]);

  // Record a NEW follow-up answer for `gameId`. Returns allowed (false → paywall, don't fetch).
  const recordQA = useCallback((gameId: string): boolean => {
    const { qaCap, isPro } = latest.current;
    const d = evaluateGameQA(qaCap, gameId, { isPro });
    if (d.nextState !== qaCap) setQaCap(d.nextState);
    return d.allowed;
  }, [setQaCap]);

  // Non-mutating reads for the subtle indicators (Infinity for Pro → indicator hidden).
  const explanationsLeft = dailyRemaining(explainCap, localDateStr(new Date()), isPro);
  const qaLeft = (gameId: string) => gameQARemaining(qaCap, gameId, isPro);

  return { isPro, explanationsLeft, qaLeft, recordExplanation, recordQA, DAILY_FREE, QA_FREE_PER_GAME };
}
