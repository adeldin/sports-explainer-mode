# BUILD DOC — Coach's Corner tab

**For:** Claude Code (executor on Anthony's Mac)
**From:** Claude.ai (architect/reviewer — no repo access)
**Date:** 2026-06-27
**Repo:** `/Users/anthonydeldin/Desktop/sports-explainer-mode` · mobile app `sports-explainer-mobile-v2/`
**Prereq:** the Make the Call build (BUILD_MAKE_THE_CALL.md, Gates 1–3) must be in the tree. This doc REPLACES the temp dev mount from that build.

---

## 0. HOW WE WORK (read first)

- **Anthony pushes ALL git himself.** You NEVER run `git add`/`commit`/`push`. At each gate, STOP and tell Anthony what to commit.
- Explicit file paths in any git instructions — never `git add .`.
- **Recon-first** before touching unfamiliar code. STOP at every GATE, summarize, wait for go-ahead.
- The Live screen is the highest-risk surface (caps metering, explanation path, auto-refresh). The gate that touches it is LAST and isolated. If anything looks off before it, stop before touching Live.
- Never touch `entitlement.tsx`, `caps.ts`, or the live `explain` path. No engine-math changes. No `localStorage`. Apostrophes in string literals → double-quote/backtick/escape.
- Display-only renames (the "Coach's Read" rename) change ONLY the user-facing string — leave component names, style names, storage keys, analytics, identifiers untouched (the Kid→Rookie pattern).

---

## 1. WHAT WE'RE BUILDING

A 4th tab, **Coach's Corner** — the proactive strategy-learning destination. Structure is **sport-first**: a sport strip at top (showing only sports that have Coach's Corner content) → tap a sport → its available pieces appear as tiles → tap a piece → it opens full-screen. Soccer has three pieces (Make the Call, Formations, Read the Play); MLB and NFL have Make the Call only. The sport list is **data-driven** — a sport appears iff it has at least one piece, so it grows itself as content is authored.

This build also: extracts the duplicated sport picker into a shared `SportStrip` component (used by all three tabs), renames the live "Coach's Corner" card to "Coach's Read", and wires in the chalkboard header banner.

**Five gates:**
1. Extract `SportStrip` shared component; point Academy at it; verify.
2. Point Live at `SportStrip`; verify (the careful, isolated one).
3. The "Coach's Read" display rename in `CoachCard.tsx`.
4. Build the Coach's Corner screen + register the tab; remove the temp MTC dev mount.
5. Wire the banner asset + the FormationQuizGame props fix + a tiny formations-content helper.

---

## ▓▓▓ GATE 1 — Extract `SportStrip`, wire Academy ▓▓▓

**Why:** the sport picker is currently duplicated inline in `AcademyScreen.tsx` and `LiveScreen.tsx` with byte-identical styles. Coach's Corner would make a third copy. Extract once so selection styling lives in one place. The two screens differ in DATA and HANDLERS, not styles — so `SportStrip` is **presentational**: it takes items + selectedKey + onSelect, knows nothing about sports.

### 1.1 Recon first
Read `screens/AcademyScreen.tsx` lines ~212–227 (the picker JSX) and ~402–410 (the `sportTab`/`sportTabActive`/`sportEmoji`/`sportLabel`/`sportLabelActive` styles). Read `screens/LiveScreen.tsx` ~622–637 and ~980–985 (confirm the styles are identical — they should be). Confirm before building.

### 1.2 Build `components/SportStrip.tsx`

A presentational horizontal strip. Proposed shape:

```tsx
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme, Theme } from '../lib/theme';

export interface SportStripItem {
  key: string;        // the selection key (sport key, category key — caller's choice)
  emoji: string;
  label: string;
}

export default function SportStrip({
  items, selectedKey, onSelect,
}: {
  items: SportStripItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.tabsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportTabsContent}>
        {items.map(it => {
          const active = selectedKey === it.key;
          return (
            <TouchableOpacity
              key={it.key}
              style={[styles.sportTab, active && styles.sportTabActive]}
              onPress={() => onSelect(it.key)}>
              <Text style={styles.sportEmoji}>{it.emoji}</Text>
              <Text style={[styles.sportLabel, active && styles.sportLabelActive]} numberOfLines={1}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // COPY these values EXACTLY from the current AcademyScreen/LiveScreen styles so nothing changes visually.
  tabsContainer: { height: 70, marginBottom: 4 },
  sportTabsContent: { paddingHorizontal: 16, gap: 8 },
  sportTab: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, minWidth: 64 },
  sportTabActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  sportEmoji: { fontSize: 20 },
  sportLabel: { color: t.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  sportLabelActive: { color: t.accentText },
});
```

**IMPORTANT:** copy the exact style VALUES from the existing screens — do not redesign. Note `tabsContainer.marginBottom` differs between screens (Academy uses 4, Live uses 10). Handle this by either (a) keeping `marginBottom` OUT of `SportStrip` and letting each screen wrap it / add its own spacing, or (b) adding an optional `marginBottom` prop. Pick the cleaner one and tell Anthony which; the goal is each screen looks pixel-identical to today.

### 1.3 Wire Academy to use it
In `AcademyScreen.tsx`, replace the inline picker JSX (the `<View style={styles.tabsContainer}><ScrollView>…</ScrollView></View>` block) with:

```tsx
<SportStrip
  items={ACADEMY_CATEGORIES.map(c => ({ key: c.key, emoji: c.emoji, label: c.label }))}
  selectedKey={category.key}
  onSelect={(key) => { const c = ACADEMY_CATEGORIES.find(x => x.key === key); if (c) handleCategoryChange(c); }}
/>
```

Leave the now-unused `sportTab*` styles in `AcademyScreen.tsx` for this gate (removing them is cleanup; do it in a later pass to keep the diff small and reviewable). Actually — DO remove them only if confident nothing else references them; otherwise leave and note it.

### 1.4 Verify
`npx tsc --noEmit` → exit 0. Then STOP and have Anthony test on-device: **the Academy sport-category strip must look and behave EXACTLY as before** — same spacing, same selected-state (accent border + accent label), same scroll, switching categories still works. This is the proof that `SportStrip` is a faithful extraction before we touch Live.

**END GATE 1.** STOP. Tell Anthony: new file `components/SportStrip.tsx`, `AcademyScreen.tsx` edited. `git add` targets when ready: `sports-explainer-mobile-v2/components/SportStrip.tsx sports-explainer-mobile-v2/screens/AcademyScreen.tsx`. Anthony tests Academy on-device before Gate 2.

---

## ▓▓▓ GATE 2 — Wire Live to `SportStrip` (the careful one) ▓▓▓

Only after Anthony confirms Academy looks identical. Live is the high-risk screen — touch only the picker JSX, nothing else.

### 2.1 Recon
Re-read `LiveScreen.tsx` ~622–637 (the picker) and how it derives `visibleSports`, the `selectedKey` comparison (`sport === s.key`), and `handleSportChange`. Note: Live uses **localized labels** (SPORT_NAME_KEY/localized fallback to `s.label`) — preserve that. The label each item gets must be the SAME localized string Live shows today.

### 2.2 Wire it
Replace the inline picker block with:

```tsx
<SportStrip
  items={visibleSports.map(s => ({ key: s.key, emoji: s.emoji, label: /* the SAME localized label Live computes today */ }))}
  selectedKey={sport}
  onSelect={(key) => handleSportChange(key as Sport)}
/>
```

Use whatever localized-label expression Live currently uses inside the map (do not regress localization). Do NOT touch `visibleSports` derivation, `handleSportChange` internals, caps, the game strip, or anything below the picker.

### 2.3 Verify
`npx tsc --noEmit` → exit 0. STOP. Anthony tests **Live** on-device: sport strip looks identical, localized labels intact, selecting a sport still loads its games/explanation, the live flow is unbroken. Extra caution here per the rules.

**END GATE 2.** STOP. `git add` target: `sports-explainer-mobile-v2/screens/LiveScreen.tsx`. Anthony verifies Live before Gate 3.

---

## ▓▓▓ GATE 3 — "Coach's Read" display rename ▓▓▓

Display-only rename in `components/CoachCard.tsx`. The live card currently shows `🧠 COACH'S CORNER`; it becomes `🧠 COACH'S READ` so the tab ("Coach's Corner", the place) and the live card ("Coach's Read", the insight) form a tidy family.

### 3.1 Do it
In `components/CoachCard.tsx`, change the literal string `🧠 COACH'S CORNER` → `🧠 COACH'S READ` at all FOUR occurrences (recon found them at ~127, 137, 154, 188 — the four render branches: loading, coming-soon, soccer, 4-sports-Pro). Change NOTHING else: leave the component name `CoachCard`, the `eyebrow` style name, the comment at ~222 (`// Teal "Coach's Corner" accent`), the LiveScreen mount key `coach|…`, and all storage/analytics/identifiers untouched.

### 3.2 Verify
`npx tsc --noEmit` → exit 0. STOP. Anthony spot-checks on a live (or recent) game that the card eyebrow now reads "COACH'S READ".

**END GATE 3.** STOP. `git add` target: `sports-explainer-mobile-v2/components/CoachCard.tsx`.

---

## ▓▓▓ GATE 4 — The Coach's Corner screen + tab registration ▓▓▓

The main event. Build the screen, register the tab, remove the temp MTC dev mount.

### 4.1 A tiny content-signal helper
Coach's Corner needs to know which sports have which pieces. Make the Call has `sportsWithContent(level)`; formations have no per-sport helper (they're soccer-only). Add a small module — `lib/coachesCorner.ts` — that computes the tab's sport list and each sport's pieces:

```ts
import type { Sport, Level } from "./api";
import { sportsWithContent, resolveBank, type MTCSport } from "./makeTheCall";

// The pieces a sport can offer in Coach's Corner.
export type CCPieceId = "make-the-call" | "formations" | "read-the-play";

// Formations + read-the-play are soccer-only by construction.
const SOCCER_KEYS: Sport[] = ["soccer", "epl", "laliga", "worldcup"];
function isSoccer(sport: Sport): boolean { return SOCCER_KEYS.includes(sport); }

// Which pieces does this sport have, at this level?
// (level matters for Make the Call — a sport with no scenarios at this level shouldn't list it.)
export function piecesForSport(sport: Sport, level: Level): CCPieceId[] {
  const pieces: CCPieceId[] = [];
  const bank = resolveBank(sport);
  if (bank && sportsWithContent(level).includes(bank)) pieces.push("make-the-call");
  if (isSoccer(sport)) { pieces.push("formations", "read-the-play"); }
  return pieces;
}

// A stable display list for the Coach's Corner sport strip: the sports that have ANY piece.
// Each entry carries a representative Sport key + emoji + label for the strip.
export interface CCSport { key: Sport; emoji: string; label: string; }

// The candidate sports CC can show (one representative key per logical sport).
// Soccer is represented by 'soccer'. Extend this as content for new sports lands.
const CC_CANDIDATES: CCSport[] = [
  { key: "soccer", emoji: "⚽", label: "Soccer" },
  { key: "mlb", emoji: "⚾", label: "MLB" },
  { key: "nfl", emoji: "🏈", label: "NFL" },
];

// The sports that actually have content right now (at the given level), in display order.
export function coachesCornerSports(level: Level): CCSport[] {
  return CC_CANDIDATES.filter(c => piecesForSport(c.key, level).length > 0);
}
```

Note for the future: when Make the Call adds a new sport (say `nba`), add it to `CC_CANDIDATES` and it appears automatically. Formations stay soccer-only until a non-soccer formation system is built. Confirm the soccer representative key (`'soccer'`) is the right one for feeding the formation pieces — recon showed formation content is keyed by FormationKey, not Sport, so the formation pieces don't actually need a sport key; they're shown whenever the selected CC sport `isSoccer`.

### 4.2 Build `screens/CoachesCornerScreen.tsx`

Mirror the `AcademyScreen` structure (recon §3): a SafeAreaView, the banner header, the `SportStrip`, then the pieces for the selected sport as tiles, with a full-screen swap when a piece is tapped (the `activeGameId`-style local-state pattern — no nav stack).

Structure:

```tsx
// state
const { level } = useAppState();
const ccSports = coachesCornerSports(level);          // data-driven sport list
const [selectedSport, setSelectedSport] = useState<Sport>(ccSports[0]?.key ?? "soccer");
const [activePiece, setActivePiece] = useState<CCPieceId | null>(null);

const pieces = piecesForSport(selectedSport, level);

// FULL-SCREEN PIECE VIEW (early return, like AcademyScreen's activeGame branch)
if (activePiece) {
  // mount the piece full-screen with a back bar (reuse GameHost where the piece is AcademyGameProps-shaped)
  return <PieceHost piece={activePiece} sport={selectedSport} onBack={() => setActivePiece(null)} />;
}

// MAIN VIEW
return (
  <SafeAreaView edges={['top']}>
    {/* Banner header — Gate 5 wires the real image; for now a navy bar with the title */}
    <CoachesCornerHeader />
    <SportStrip
      items={ccSports.map(s => ({ key: s.key, emoji: s.emoji, label: s.label }))}
      selectedKey={selectedSport}
      onSelect={(key) => setSelectedSport(key as Sport)}
    />
    <ScrollView>
      <Text style={styles.sectionLabel}>{/* e.g. `${selectedLabel.toUpperCase()} · ${pieces.length} WAYS TO LEARN` */}</Text>
      <View style={styles.pieceGrid}>
        {pieces.map(p => (
          <TouchableOpacity key={p} style={styles.pieceTile} onPress={() => setActivePiece(p)}>
            <Text style={styles.pieceIcon}>{PIECE_META[p].icon}</Text>
            <Text style={styles.pieceTitle}>{PIECE_META[p].title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
);
```

with a `PIECE_META` map:

```ts
const PIECE_META: Record<CCPieceId, { icon: string; title: string }> = {
  "make-the-call": { icon: "📋", title: "Make the Call" },
  "formations":    { icon: "🗺️", title: "Formations" },
  "read-the-play": { icon: "🎯", title: "Read the Play" },
};
```

**Use the `gameGrid`/`gameTile` style pattern from AcademyScreen** (2-column tile grid, `gameTile`/`gameTileIcon`/`gameTileTitle` — recon ~402–407) so the tiles match the Academy games visually. Copy those style values into this screen's styles.

### 4.3 The `PieceHost` — mounting each piece full-screen

Each piece mounts differently:
- **`make-the-call`** → `<GameHost game={MTC_GAME} sportKeys={sportKeysFor(selectedSport)} categoryEmoji={…} onBack={…} />` where `MTC_GAME` is a real descriptor `{ id, title, icon, blurb, Component: MakeTheCallGame }`. `sportKeysFor` returns the Sport keys for the selected CC sport (for soccer, the four soccer keys so the pool resolves; for mlb/nfl, just that key). You can reuse the `MTC_DEV_GAME` shape from the temp mount — but now it's permanent and lives here, not in AcademyScreen.
- **`formations`** → the formation browser. Recon: `FormationDiagram` takes `{ team, level, hideFormationLabel?, hideExplanation? }` and is fed `synthTeam(formationKey)`. This is a VISUAL browser, not a GameHost game — it needs a small formation-picker UI (pick a formation → render its diagram + explanation). **If a formation-browser screen does not already exist, building it is a separate sub-task** — for THIS build, if it's not trivial, mount a placeholder ("Formations browser — coming in the next pass") and flag to Anthony, OR mount the read-the-play quiz only and defer the browser. Do NOT invent a complex browser unprompted; ask Anthony how much to build here.
- **`read-the-play`** → `<GameHost game={…, Component: FormationQuizGame} … />` — BUT `FormationQuizGame` currently takes NO props (recon §4). Gate 5 applies the one-line props fix; until then, mount it directly under a back bar instead of via GameHost, OR sequence Gate 5's fix before this. Recommend: do the FormationQuizGame props fix (Gate 5.2) BEFORE wiring this piece, so all pieces mount uniformly via GameHost. Tell Anthony if you reorder.

### 4.4 Register the tab
In `App.tsx`:
- Add to `TAB_ICONS`: `"Coach's Corner": 'clipboard'` (an Ionicons glyph — verify `'clipboard'` exists in `Ionicons.glyphMap`; if not, use `'easel'` or `'clipboard-outline'`). **The key MUST exactly match the `<Tab.Screen name=…>`.**
- Add a `<Tab.Screen name="Coach's Corner" component={CoachesCornerScreen} options={{ tabBarLabel: "Coach's" }} />` (short tabBarLabel so it fits the tab bar — confirm width on-device; "Coach's Corner" may be too long for a 4-tab bar). Place it between Academy and Settings (so order is Live · Academy · Coach's · Settings) — or wherever Anthony prefers; ask if unsure.

### 4.5 Remove the temp MTC dev mount
In `AcademyScreen.tsx`, DELETE the entire comment-fenced TEMP DEV MOUNT block (the `MTC_DEV_GAME` descriptor, the `showMTC` state, the `if (showMTC)` render, and the 🧪/📋 dev button in the games grid). Make the Call now has its real home in Coach's Corner. Confirm `AcademyScreen.tsx` has no remaining references to `MakeTheCallGame` or `showMTC` after deletion.

### 4.6 Verify
`npx tsc --noEmit` → exit 0. STOP. Anthony tests on-device: the new tab appears; tapping it shows the banner + sport strip (soccer/MLB/NFL) + pieces; selecting MLB shows one tile (Make the Call), soccer shows its pieces; tapping Make the Call plays it; the old temp dev button is gone from Academy.

**END GATE 4.** STOP. `git add` targets: `sports-explainer-mobile-v2/lib/coachesCorner.ts sports-explainer-mobile-v2/screens/CoachesCornerScreen.tsx sports-explainer-mobile-v2/App.tsx sports-explainer-mobile-v2/screens/AcademyScreen.tsx`.

---

## ▓▓▓ GATE 5 — Banner asset + FormationQuizGame props fix ▓▓▓

### 5.1 The banner
Anthony has two text-free banner images (the Academy book emblem, the Coach's Corner clipboard). For Coach's Corner:
- Anthony drops the clipboard image into `assets/` at a path the doc fixes: **`assets/coaches-corner-header.png`**.
- Build a `CoachesCornerHeader` component (used in Gate 4.2) that renders the image as a banner: an `<Image>` at a fixed header height (e.g. 84–96px), `resizeMode="cover"` or `"contain"` depending on the asset, with the navy background showing through the faded edges, and the title "Coach's Corner" overlaid in Space Grotesk (the app's loaded font family) centered or left-aligned over it. Match the navy `#0d1b3e` so the faded edges blend.
- **Consistency note:** when the Academy banner is later wired, both banners must render at the SAME header height so the tabs feel uniform. Spec the height as a shared constant.
- If the asset isn't in `assets/` yet, render a fallback: a navy bar with the "Coach's Corner" title in Space Grotesk (no image) so the screen works without the asset. Flag to Anthony that dropping the PNG in lights up the real banner.

### 5.2 FormationQuizGame props fix
Give `components/academy/FormationQuizGame.tsx` the `AcademyGameProps` signature so it mounts via `GameHost` uniformly (recon §4 — it currently takes no props). One-line change: `export default function FormationQuizGame({ sportKeys, categoryEmoji }: AcademyGameProps)` — it can ignore `sportKeys` (formations are soccer-only, it self-generates its pool), but accepting the props lets `GameHost` mount it like every other piece. Import `AcademyGameProps` from `../../lib/academyGames`. Also switch its hardcoded header emoji to `categoryEmoji` if it has one, matching the MakeTheCallGame pattern. (If you did this in Gate 4.3 already, skip here.)

### 5.3 Verify
`npx tsc --noEmit` → exit 0. STOP. Anthony tests: banner renders (real image if the PNG is in `assets/`, fallback bar otherwise); read-the-play quiz mounts cleanly via GameHost from the soccer pieces.

**END GATE 5.** STOP. `git add` targets: `sports-explainer-mobile-v2/components/CoachesCornerHeader.tsx` (or wherever the header component lives), `sports-explainer-mobile-v2/components/academy/FormationQuizGame.tsx`, and the asset `sports-explainer-mobile-v2/assets/coaches-corner-header.png` (Anthony adds the PNG).

---

## 6. SCOPE GUARDRAILS (not in this build)

- No animated X's-and-O's (Lottie/Rive) — future marquee piece.
- No Academy/Live "learn more" bridges — future.
- No non-soccer formations — formations stay soccer-only.
- No state-lift of the selected game into shared state — Coach's Corner uses its own independent sport selection (the build doc's selectedSport local state), matching the deferred B→A decision.
- The formations BROWSER (4.3) may be deferred/placeholdered if non-trivial — ask Anthony rather than inventing it.

---

## 7. GATE SUMMARY

1. Extract `SportStrip`; wire Academy; verify Academy identical. STOP.
2. Wire Live to `SportStrip`; verify Live unbroken (careful). STOP.
3. "Coach's Read" rename (4 strings in CoachCard). STOP.
4. `lib/coachesCorner.ts` + `CoachesCornerScreen` + register tab + remove temp MTC mount. STOP.
5. Banner asset + FormationQuizGame props fix. STOP.

Each gate: STOP, summarize, tell Anthony exactly what to `git add` (he runs git), wait for go-ahead. Where this doc and on-device reality disagree (tab-label width, glyph names, formation browser scope), ASK Anthony rather than guessing.
