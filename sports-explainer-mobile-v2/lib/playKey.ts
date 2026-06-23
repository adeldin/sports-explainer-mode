// derivePlayKey (Step D Phase 2) — a stable identity for "which play is this". Used to
// decide when live Q&A answers clear ("fresh play, fresh card") vs. persist through a
// same-play 60s auto-refresh. No backend play ID exists, so identity = the play's
// content: the ESPN play description (rawPlay) when present, else the coarse playType.
// Pure + dependency-free so it's unit-testable and reusable (e.g. a future Previous Play
// feature). NOTE: sports with no rawPlay and a constant playType (rugby/MLR) yield a
// constant key — Q&A answers persist across plays there. Accepted limitation, by design.
export function derivePlayKey(rawPlay: string | undefined, playType: string | undefined): string {
  const raw = (rawPlay ?? '').trim();
  if (raw) return raw;                 // prefer the real play text (empty/whitespace → fall through)
  return (playType ?? '').trim();      // coarse fallback; '' when neither is usable
}
