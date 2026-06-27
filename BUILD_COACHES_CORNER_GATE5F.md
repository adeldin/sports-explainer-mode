# BUILD DOC — Coach's Corner Gate 5F (tap active tab → exit piece/game)

**For:** Claude Code · **From:** Claude.ai (architect) · **Date:** 2026-06-27
**Repo:** `/Users/anthonydeldin/Desktop/sports-explainer-mode` · app `sports-explainer-mobile-v2/`
**Prereq:** Coach's Corner Gates 1–5E in the tree.

The closing gate. When you're drilled into a piece (Coach's Corner) or a game (Academy) and you tap that tab's icon in the bottom bar, it currently does nothing (you're already on the tab). This makes it pop back to the tab's landing screen — the standard "tap the active tab to go to root" behavior. Applied to BOTH Coach's Corner and Academy for consistency.

This is ONE gate (no sub-gates). Recon already done — findings baked in below.

---

## 0. HOW WE WORK
- Anthony pushes ALL git himself; you NEVER run git. STOP at the end, summarize, say what to `git add`.
- Explicit paths. No `localStorage`. No engine-math changes. Apostrophes in strings → escape/backtick.
- This is additive behavior only — it must NOT change anything about switching to a *different* tab, or any existing back path (the top-left arrows / GameHost onBack stay exactly as they are).

---

## RECON FINDINGS (already gathered — use these, don't re-recon)
- React Navigation **v7** (`@react-navigation/bottom-tabs ^7.18.2`). The `tabPress` event + `navigation.addListener('tabPress', …)` + `e.preventDefault()` are all available.
- **No existing** `tabPress`/`addListener`/`useFocusEffect` usage anywhere — you're introducing the pattern.
- Both screens are mounted via `component={…}` in `App.tsx`, so they're inside the navigator context → **`useNavigation()` from `@react-navigation/native` works inside them** (no prop threading needed, no `App.tsx` change).
- **Coach's Corner** (`screens/CoachesCornerScreen.tsx`): `const [activePiece, setActivePiece] = useState<CCPieceId | null>(null)` (:41). `activePiece !== null` = inside a piece. `setActivePiece(null)` = pop to landing.
- **Academy** (`screens/AcademyScreen.tsx`): `const [activeGameId, setActiveGameId] = useState<AcademyGameId | null>(null)` (:57). `activeGameId !== null` = inside a game. `setActiveGameId(null)` = pop to landing. (The game view is an early `return <GameHost … />` when `activeGameId` is set, ~:148–153.)

**Do NOT thread `navigation` through props or touch `App.tsx`.** Use `useNavigation()` inside each screen — it's cleaner and avoids LiveScreen's minimal-typing problem.

---

## THE FIX

### Pattern (apply to both screens)
Add a `useEffect` that subscribes to the navigator's `tabPress` event. When the event fires AND the screen currently has something to pop (state is non-null), prevent the default (which would otherwise do nothing useful / could jump focus) and clear the drill-in state instead.

```tsx
import { useNavigation } from '@react-navigation/native';
// ... inside the component:
const navigation = useNavigation();

// Tap the active tab while inside a piece/game → pop back to this tab's landing screen
// (standard "tap active tab = go to root" behavior). Does nothing when already on the landing.
useEffect(() => {
  const unsub = navigation.addListener('tabPress', (e) => {
    if (activePiece !== null) {          // Academy: activeGameId !== null
      e.preventDefault();                // stop the default tab-press handling
      setActivePiece(null);              // Academy: setActiveGameId(null)
    }
  });
  return unsub;
}, [navigation, activePiece]);           // Academy: [navigation, activeGameId]
```

**Why `preventDefault()`:** when you tap the tab you're already on, the default `tabPress` behavior is a no-op for our purposes (you stay put, still drilled in). We intercept it and pop to landing instead. `preventDefault()` ensures the default doesn't also run (e.g. any scroll-to-top or focus side effects) and the only effect is our state reset.

**Why the `activePiece !== null` guard inside the listener:** the listener fires on EVERY tap of this tab. If we're already on the landing (state is null), we do nothing and DON'T call `preventDefault()` — letting normal tab behavior proceed. We only intercept when there's actually something to pop. This is important: tapping the tab from the landing screen must behave normally.

### 5F.1 — Coach's Corner
In `screens/CoachesCornerScreen.tsx`:
- Add `import { useNavigation } from '@react-navigation/native';` (and ensure `useEffect` is imported from react).
- Inside the component, add `const navigation = useNavigation();`.
- Add the `useEffect` above, using `activePiece`/`setActivePiece`.
- Dependency array: `[navigation, activePiece]`.
- Place the effect near the top of the component body (after the state declarations), not inside any conditional.

### 5F.2 — Academy
In `screens/AcademyScreen.tsx`:
- Same imports (`useNavigation`; `useEffect` is almost certainly already imported — check).
- Add `const navigation = useNavigation();` (Academy currently destructures only `route` from props — leave that as-is; `useNavigation()` is independent and additive).
- Add the `useEffect`, using `activeGameId`/`setActiveGameId`. Dependency array: `[navigation, activeGameId]`.
- Place after the state declarations, before the early-return game-view block.

### 5F.3 — Typing note
`useNavigation()` returns a typed navigation object; `addListener('tabPress', cb)` is valid on a bottom-tab navigation. If TypeScript complains about the `tabPress` event name (it can, if `useNavigation()` infers a generic/parent type), type it with the bottom-tabs navigation type:
```tsx
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
const navigation = useNavigation<BottomTabNavigationProp<any>>();
```
Use `any` for the param-list generic (we're not navigating with params here, just listening). Only add the explicit type if `tsc` complains with the bare `useNavigation()` — try the simple form first.

### 5F.4 — Verify
- `npx tsc --noEmit` → exit 0.
- Confirm the diff is ONLY: the two imports + `const navigation` + the `useEffect`, in each of the two screens. Nothing else — no change to the existing back buttons, GameHost mounts, `setActivePiece('…')`/`setActiveGameId(id)` open calls, or `App.tsx`.
- STOP and report.

---

## ON-DEVICE TEST (Anthony)
**Coach's Corner:**
1. Open Coach's Corner → tap into **Formations** (or Make the Call / Read the Play).
2. Tap the **Coach's Corner tab icon** at the bottom → should pop back to the Coach's Corner landing screen (same as the top-left arrow). ✅ the thing we built.
3. From the landing screen, tap the Coach's Corner tab icon again → nothing weird happens (you're already home; normal behavior).
4. The top-left back arrow inside a piece STILL works (unchanged).
5. Switching to a DIFFERENT tab (Live/Academy/Settings) still works normally.

**Academy:**
6. Open Academy → tap into a game (Quick Quiz / Match Up).
7. Tap the **Academy tab icon** → pops back to the Academy landing. ✅
8. Top-left back arrow inside a game still works; switching tabs still works.

**Edge:** while inside a Coach's Corner piece, tapping a DIFFERENT tab (e.g. Academy) should switch to Academy normally (NOT pop-then-switch in a janky way). Confirm the cross-tab jump still feels clean.

---

## GIT (Anthony runs)
```
git add sports-explainer-mobile-v2/screens/CoachesCornerScreen.tsx sports-explainer-mobile-v2/screens/AcademyScreen.tsx
```

After this verifies on-device, **Coach's Corner is fully done** — the tab, all three soccer pieces, the enriched landing screen, the matched header, the reordered/stacked tab, and tap-to-exit navigation. A strong moment to commit the whole feature.
