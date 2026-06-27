# BUILD DOC — Coach's Corner Gate 5 (banner, rich screen, polish)

**For:** Claude Code · **From:** Claude.ai (architect) · **Date:** 2026-06-27
**Repo:** `/Users/anthonydeldin/Desktop/sports-explainer-mode` · app `sports-explainer-mobile-v2/`
**Prereq:** Coach's Corner Gates 1–4 in the tree (the tab exists, three soccer pieces work).

This is the final gate. It turns the "boring" Coach's Corner landing screen into a real, alive destination, wires the banner, fixes two cosmetic issues, and attempts the stacked tab label.

---

## 0. HOW WE WORK
- Anthony pushes ALL git himself; you NEVER run git. STOP at each gate, summarize, say what to `git add`.
- Explicit file paths. Recon-first. No `localStorage`. No engine-math changes. Apostrophes in strings → escape/backtick.
- Where the doc and on-device reality disagree (stacked label crowding, banner sizing), ASK rather than guess.

This doc has **five sub-gates (5A–5E)**. STOP after each.

---

## ▓▓▓ GATE 5A — Extract a shared `RankCard` component ▓▓▓

**Why:** the rank card is inline JSX in `AcademyScreen.tsx` (recon §1). Coach's Corner needs the same card. Extract once (same pattern as `SportStrip`), so both screens render `<RankCard />` and the progression UI lives in one place.

### 5A.1 Build `components/RankCard.tsx`
A self-contained component that reads `points`/`rank`/`RANK_EMOJI` from `useAppState` and owns the bar animation. Takes the kicker label as a prop (so it isn't hardcoded "YOUR ACADEMY RANK").

```tsx
import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useAppState, RANK_EMOJI } from '../lib/appState';
import { useTheme, Theme } from '../lib/theme';

export default function RankCard({ kicker = 'YOUR RANK' }: { kicker?: string }) {
  const { points, rank } = useAppState();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const barWidth = useSharedValue(0);
  const rankPct = rank.next
    ? Math.min(100, Math.max(0, ((points - rank.min) / (rank.next.min - rank.min)) * 100))
    : 100;
  useEffect(() => {
    barWidth.value = withTiming(rankPct, { duration: 600, easing: Easing.out(Easing.quad) });
  }, [rankPct]);
  const rankBarFillStyle = useAnimatedStyle(() => ({ width: `${barWidth.value}%` }));

  return (
    <View style={styles.rankCard}>
      <View style={styles.rankTopRow}>
        <Text style={styles.rankEmoji}>{RANK_EMOJI[rank.name] ?? '🔰'}</Text>
        <View style={styles.rankNameCol}>
          <Text style={styles.rankKicker}>{kicker}</Text>
          <Text style={styles.rankName}>{rank.name}</Text>
        </View>
        <Text style={styles.rankPts}>{points} pts</Text>
      </View>
      {rank.next ? (
        <>
          <View style={styles.rankBarTrack}>
            <Animated.View style={[styles.rankBarFill, rankBarFillStyle]} />
          </View>
          <Text style={styles.rankProgressText}>
            {points} / {rank.next.min} → {rank.next.name} {RANK_EMOJI[rank.next.name] ?? ''}
          </Text>
        </>
      ) : (
        <Text style={styles.rankMaxed}>👑 Legend — maxed</Text>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // COPY these values EXACTLY from AcademyScreen's rank* styles (recon §1) so Academy looks identical.
  rankCard: { backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 16 },
  rankTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankEmoji: { fontSize: 30 },
  rankNameCol: { flex: 1 },
  rankKicker: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  rankName: { color: t.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 1 },
  rankPts: { color: t.accent, fontSize: 14, fontWeight: '800' },
  rankBarTrack: { height: 10, borderRadius: 5, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border, marginTop: 14, overflow: 'hidden' },
  rankBarFill: { height: '100%', backgroundColor: t.accent, borderRadius: 5 },
  rankProgressText: { color: t.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 8 },
  rankMaxed: { color: t.accent, fontSize: 14, fontWeight: '800', marginTop: 12, textAlign: 'center' },
});
```

### 5A.2 Wire Academy to use it
In `AcademyScreen.tsx`, replace the inline rank-card JSX (recon §1, the `<View style={styles.section}><View style={styles.rankCard}>…</View></View>` block) with `<View style={styles.section}><RankCard kicker="YOUR ACADEMY RANK" /></View>`. Remove the now-unused `barWidth`/`rankPct`/`rankBarFillStyle` body code AND the `rank*` styles from AcademyScreen ONLY IF confident nothing else references them (grep first); otherwise leave them and note it (small diff preferred). Import `RankCard`.

### 5A.3 Verify
`npx tsc --noEmit` → exit 0. STOP. Anthony tests Academy on-device: **the rank card looks and animates exactly as before.** (This is the faithful-extraction proof, same as SportStrip Gate 1.)

**END 5A.** `git add` targets: `components/RankCard.tsx`, `screens/AcademyScreen.tsx`. Anthony verifies Academy before 5B.

---

## ▓▓▓ GATE 5B — The strategy-tip content bank + `StrategyTipCard` ▓▓▓

A "Today's Strategy Tip" card mirroring `DidYouKnow` (recon §2), but backed by a new strategy-tip bank (the curated 3-AI content). DidYouKnow uses general trivia FACTS; strategy tips are a separate bank.

### 5B.1 Build `lib/strategyTips.ts`
The content bank. Anthony has 42 curated tips (soccer 14, NFL 14, MLB 14) in three files I'll provide — paste all three into ONE array here.

```ts
export interface StrategyTip {
  id: string;
  sport: "soccer" | "mlb" | "nfl";
  tip: string;
  conceptTag: string;   // bridge hook, unused in v1
}

export const STRATEGY_TIPS: StrategyTip[] = [
  // ... paste the 42 curated tips here (soccer, then nfl, then mlb) ...
];

// Tips for a logical sport. Soccer's four Sport keys all map to the "soccer" bank.
import type { Sport } from "./api";
export function tipsForSport(sport: Sport): StrategyTip[] {
  if (sport === "mlb") return STRATEGY_TIPS.filter(t => t.sport === "mlb");
  if (sport === "nfl") return STRATEGY_TIPS.filter(t => t.sport === "nfl");
  if (sport === "soccer" || sport === "worldcup" || sport === "epl" || sport === "laliga")
    return STRATEGY_TIPS.filter(t => t.sport === "soccer");
  return [];
}
```

**Anthony provides the 42 tip objects** (the three `strategy_tips_*.ts` files from the architect). Paste them verbatim into `STRATEGY_TIPS`. They're already in the right shape.

### 5B.2 Build `components/StrategyTipCard.tsx`
Mirror `DidYouKnow.tsx` exactly (recon §2 has the full source), with these changes:
- Prop: `{ sport: Sport }` (not `sportKeys`), pulls `tipsForSport(sport)` instead of `FACTS`.
- Label: `🧠 TODAY'S STRATEGY TIP` (instead of `💡 DID YOU KNOW?`).
- Body renders `tip.tip`; "Next tip →" instead of "Next fact →".
- Same orange-left-accent card, same fade-and-next mechanic, same empty-guard (`if (tips.length === 0) return null`).
- Re-pool on `sport` change (like DidYouKnow re-pools on `sportKeys.join(',')`).

Copy DidYouKnow's styles verbatim.

### 5B.3 Verify
`npx tsc --noEmit` → exit 0. STOP. (Not visible until 5D mounts it — that's fine.)

**END 5B.** `git add`: `lib/strategyTips.ts`, `components/StrategyTipCard.tsx`.

---

## ▓▓▓ GATE 5C — Fix the two FormationDiagram cosmetics ▓▓▓

Both in `components/FormationDiagram.tsx` (recon §4). These touch a SHARED component (used by the live formation diagram too), so keep changes minimal + backward-compatible.

### 5C.1 The "· starting XI" empty-name artifact
Recon §4a: line 73 renders `${teamName} · starting XI`; in the browser `teamName` is empty, so it shows " · starting XI" (orphan bullet). Fix: make the subtitle conditional — when `teamName` is empty, render just `Starting XI` (no bullet). Change the rendered string to: `teamName ? \`${teamName} · starting XI\` : 'Starting XI'`. This is correct in BOTH contexts (live games have a team name → unchanged; browser has none → clean "Starting XI").

### 5C.2 The tiny explanation text — render it natively, not in the SVG
Recon §4b: the explanation renders inside the SVG, so the browser's 80%-width scaling shrinks it to ~8px. The robust fix decouples the readable text from the SVG scale:
- `FormationDiagram` already supports a `hideExplanation?` prop (recon §3 references it). In `FormationBrowser`, render the diagram with `hideExplanation` (so the SVG draws only the pitch + players), and render the COACH'S READ explanation as a **native `<Text>` block below the diagram** at a real font size (e.g. 14–15px), pulling the same explanation string from `FORMATION_EXPLANATIONS[formation][level]`.
- This means `FormationBrowser.tsx` (not FormationDiagram) gains the explanation rendering. Import `FORMATION_EXPLANATIONS` and render: a small teal "COACH'S READ · {formation}" label + the explanation paragraph in native Text. Style it like the live card's COACH'S READ slot (teal label, muted body) but at native readable sizes.
- ALSO remove the `diagramWrap: { width: '80%' }` constraint — let the diagram be full-width now that the explanation is separate (the pitch alone is fine wide). Use `width: '100%'` or a sensible max.
- Confirm `hideExplanation` exists on FormationDiagram's props; if the prop is actually named differently (recon mentioned `hideExplanation` and `hideFormationLabel`), use the correct one. If no such prop exists, tell Anthony and we'll add it.

### 5C.3 Verify
`npx tsc --noEmit` → exit 0. STOP. Anthony tests on-device: the live formation diagram (in a real soccer game's Coach's Read, if reachable) is unchanged; the browser shows a clean "Starting XI" subtitle and a readable explanation below the diagram.

**END 5C.** `git add`: `components/FormationDiagram.tsx`, `components/FormationBrowser.tsx`.

---

## ▓▓▓ GATE 5D — Enrich the Coach's Corner screen ▓▓▓

Now make the landing screen alive. Currently it's banner-placeholder + sport strip + piece tiles, with dead space below. Add: the real banner, the rank card, a "Today's Call" featured slot, and the strategy-tip card.

### 5D.1 The banner
Anthony drops the clipboard banner image into `assets/coaches-corner-header.png`. Update `components/CoachesCornerHeader.tsx`:
- If the asset exists, render `<Image source={require('../assets/coaches-corner-header.png')}>` at `CC_HEADER_HEIGHT` (88), `resizeMode="cover"`, with the navy `#0d1b3e` background behind it, and the "Coach's Corner" title overlaid in Space Grotesk (the app's loaded font) centered. The faded image edges blend into the navy.
- Keep the current text-only fallback if the asset isn't present (so it never crashes). A simple pattern: try the `require` at module top; if Anthony hasn't added the file yet, the build will error on `require` — so instead, Anthony confirms the file is in place BEFORE this step, OR you gate the Image behind a flag. Simplest: tell Anthony to add the PNG first, then wire the `<Image>`; if he hasn't, leave the text fallback and note it.
- Export `CC_HEADER_HEIGHT` (already done) so a future Academy banner can match.

### 5D.2 Restructure `CoachesCornerScreen.tsx` main view
The main view (not the full-screen piece view) becomes, top to bottom inside the ScrollView:
1. `<CoachesCornerHeader />` (banner — stays above the SportStrip, outside the ScrollView, as now)
2. `<SportStrip … />` (as now)
3. **NEW: `<RankCard kicker="YOUR RANK" />`** — the shared component from 5A. (Wrap in the same section spacing as the tiles.)
4. **NEW: "Today's Call" featured card** — mirror Academy's FEATURED hero (recon §3), accent-bordered, with kicker "FEATURED", icon 📋, title "Today's Call", blurb "One scenario — make the right call", ▶ on the right. `onPress` → `setActivePiece('make-the-call')`. Only render if the selected sport actually HAS make-the-call in its pieces (check `pieces.includes('make-the-call')`); otherwise skip it (e.g. a future sport with only formations).
5. The existing `SECTION · N WAYS TO LEARN` label + the piece tiles grid (as now).
6. **NEW: `<StrategyTipCard sport={activeSport} />`** — the tip card from 5B, at the bottom.

Order rationale: identity/progress (rank) → today's hook (featured) → the full menu (tiles) → a teaching nugget (tip). Mirrors Academy's rhythm (rank → featured → games → did-you-know) so the two tabs feel like a family, but with strategy content.

Keep all the existing piece-mounting / full-screen logic untouched — this is additive to the main view only.

### 5D.3 Verify
`npx tsc --noEmit` → exit 0. STOP. Anthony tests on-device: Coach's Corner now shows banner + rank card + Today's Call + tiles + strategy tip; tapping Today's Call opens Make the Call; the tip card shows soccer/MLB/NFL tips as the sport changes; the screen no longer feels empty.

**END 5D.** `git add`: `components/CoachesCornerHeader.tsx`, `screens/CoachesCornerScreen.tsx`, and the asset `assets/coaches-corner-header.png` (Anthony adds the PNG).

---

## ▓▓▓ GATE 5E — Tab label + placement ▓▓▓

### 5E.1 Move Coach's Corner to second position
In `App.tsx`, reorder the `<Tab.Screen>` elements so the order is: **Live · Coach's Corner · Academy · Settings** (Coach's Corner moves up, next to Live — the two game-understanding tabs adjacent).

### 5E.2 Attempt the stacked two-line label
Recon §5: `tabBarLabel` accepts a render function. Replace the Coach's Corner `tabBarLabel: "Coach's"` with a stacked label:
```tsx
options={{
  tabBarLabel: ({ color }) => (
    <View style={{ alignItems: 'center', marginTop: -2 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '600', lineHeight: 12 }}>Coach's</Text>
      <Text style={{ color, fontSize: 10, fontWeight: '600', lineHeight: 12 }}>Corner</Text>
    </View>
  ),
}}
```
(Match the font size/weight of the other tab labels as closely as possible — check what the default tab label style is; the goal is the stacked label looks intentional next to the single-line ones, not cramped.)

### 5E.3 Verify + ASK
`npx tsc --noEmit` → exit 0. STOP. **This one needs Anthony's eyes — it's a judgment call.** Anthony checks on-device: does the stacked "Coach's / Corner" look good in the tab bar, or does it crowd the icon / look cramped next to Live/Academy/Settings? Report to Anthony and let HIM decide: keep stacked, or fall back to a single word (he'll pick). Do NOT force the stacked version if it looks bad — present both options.

**END 5E.** `git add`: `App.tsx`.

---

## GATE SUMMARY
- **5A** — extract shared `RankCard`; wire Academy; verify Academy identical.
- **5B** — `lib/strategyTips.ts` (42 tips) + `StrategyTipCard` (mirror DidYouKnow).
- **5C** — FormationDiagram: conditional subtitle + native-text explanation in the browser.
- **5D** — banner + rank card + Today's Call featured + strategy tip on the CC screen.
- **5E** — move CC to 2nd; attempt stacked "Coach's / Corner" label; Anthony judges.

Each gate: STOP, summarize, `git add` targets (Anthony runs git), wait for go-ahead. Ask, don't guess, on the banner-asset-presence and the stacked-label look.
