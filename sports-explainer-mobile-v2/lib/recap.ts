// Post-Game Recap (premium #1) — PURE shaping logic (no React / network), unit-testable in
// isolation (mirrors lib/caps, lib/playKey). The recap has a free TEASER and a Pro FULL view:
//   • score + story  → visible to everyone (the hook).
//   • turningPoint / keyPerformance / whyItMattered → Pro-only narrative. For free users the
//     server never sends them (cheaper + no leak); the client shows them as LOCKED rows.
// Empty string for any narrative field = the data didn't support it → omitted, never faked.

export interface RecapResponse {
  score: string;
  story: string;
  turningPoint: string;
  keyPerformance: string;
  whyItMattered: string;
  // Public ESPN recap URL (verbatim from the API — sport-specific path shape, never reconstruct).
  // Empty for golf/thin games and any error path → the "Read on ESPN" link-out simply hides.
  articleLink: string;
}

export type RecapSectionKey = 'turningPoint' | 'keyPerformance' | 'whyItMattered';
export const PRO_SECTIONS: RecapSectionKey[] = ['turningPoint', 'keyPerformance', 'whyItMattered'];

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

// Normalize a raw API payload into a full RecapResponse (missing / non-string → '').
export function normalizeRecap(raw: any): RecapResponse {
  return {
    score: str(raw?.score),
    story: str(raw?.story),
    turningPoint: str(raw?.turningPoint),
    keyPerformance: str(raw?.keyPerformance),
    whyItMattered: str(raw?.whyItMattered),
    articleLink: str(raw?.articleLink),
  };
}

export interface RecapSectionView { key: RecapSectionKey; text: string; locked: boolean }

// Which Pro sections to render:
//   • Free → all three as LOCKED rows (title-only teaser; no body needed). The pull is "there's
//     more here," so we always show the three locks regardless of which would have data.
//   • Pro → only the NON-EMPTY sections, unlocked (empty = data didn't support it → omit, don't
//     fabricate).
export function visibleProSections(recap: RecapResponse, isPro: boolean): RecapSectionView[] {
  if (!isPro) return PRO_SECTIONS.map(key => ({ key, text: '', locked: true }));
  return PRO_SECTIONS
    .filter(key => recap[key].length > 0)
    .map(key => ({ key, text: recap[key], locked: false }));
}

// Is there anything worth rendering? (Guards against an empty card when ESPN had no data.)
export function hasRecapContent(recap: RecapResponse): boolean {
  return recap.score.length > 0 || recap.story.length > 0;
}
