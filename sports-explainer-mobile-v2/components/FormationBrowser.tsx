import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import { useAppState } from '../lib/appState';
import type { Level } from '../lib/api';
import ZoomableField from './ZoomableField';
import FormationDiagram from './FormationDiagram';
import { ScenarioPills, DifficultyTabs, FE } from './FieldEngine';
import { CANONICAL_FORMATIONS, synthTeam } from '../lib/canonicalFormations';
import { FormationKey, FORMATION_EXPLANATIONS } from '../lib/formationExplanations';

const FORMATIONS = Object.keys(CANONICAL_FORMATIONS) as FormationKey[];
const GK_C = '#8e44ad';

// Soccer "Formations" piece — the browser. Tap a formation pill → its shape on the SHARED SoccerPitch
// (striped turf, chalk boundary, halfway, centre circle, both boxes) with the modern actor treatment,
// then the COACH'S READ as native text with live difficulty tabs.
//
// PORTRAIT by design. This is a browse piece, not a field-decision module: there is no call to make,
// no timing window and no on-field tap target, so it gains nothing from the landscape shell — and it
// is mounted directly by CoachesCornerScreen with its own back bar (NOT via GameHost), so landscape
// would mean re-homing it just to win ~15% of pitch width. Pinch-to-zoom (ZoomableField, the same
// component the landscape shell wraps every field in) covers the close-reading case instead.
//
// Difficulty tier state is LOCAL, seeded from the app level — the modern-module pattern. Flipping a
// tier here re-reads the explanation without mutating the user's app-wide level.
export default function FormationBrowser() {
  const { theme } = useTheme();
  const { level: appLevel } = useAppState();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selected, setSelected] = useState<FormationKey>(FORMATIONS[0]);
  const [level, setLevel] = useState<Level>(appLevel);

  const legend = (
    <View style={styles.legend}>
      {([['Outfield', FE.orange], ['Keeper', GK_C]] as [string, string][]).map(([lbl, c]) => (
        <View key={lbl} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: c }]} />
          <Text style={styles.legendTxt}>{lbl}</Text>
        </View>
      ))}
      <Text style={styles.legendTxt}>Own goal left · attacking right</Text>
    </View>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScenarioPills
        wrap
        items={FORMATIONS.map(f => ({ key: f, name: f }))}
        currentKey={selected}
        onSelect={(f) => { Haptics.selectionAsync(); setSelected(f); }}
      />

      <ZoomableField>
        <FormationDiagram team={synthTeam(selected)} />
      </ZoomableField>

      {legend}

      <View style={styles.prompt}>
        <Text style={styles.promptTxt}>Pick a formation to see its shape and what it does well.</Text>
      </View>

      {/* COACH'S READ — the same content as before (FORMATION_EXPLANATIONS at the chosen tier), in the
          modern verdict-card idiom: neutral chip · label · live tiers · body. */}
      <View style={styles.read}>
        <Text style={[styles.tag, styles.tagMode]}>{selected}</Text>
        <Text style={styles.readLabel}>{`COACH'S READ · ${selected}`}</Text>
        <DifficultyTabs level={level} onSelect={setLevel} />
        <Text style={styles.readBody}>{FORMATION_EXPLANATIONS[selected]?.[level] ?? ''}</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.background },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  // Legend.
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { color: t.textSecondaryOnDark, fontSize: 11 },
  // Prompt.
  prompt: { backgroundColor: t.explanationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: t.border },
  promptTxt: { color: t.textPrimary, fontSize: 13.5, lineHeight: 20, fontWeight: '600' },
  // Coach's read card.
  read: { backgroundColor: t.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  tag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  tagMode: { backgroundColor: FE.modeBg, color: FE.mode },
  readLabel: { color: t.textSecondaryOnDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  readBody: { color: t.textSecondaryOnDark, fontSize: 13, lineHeight: 20 },
});
