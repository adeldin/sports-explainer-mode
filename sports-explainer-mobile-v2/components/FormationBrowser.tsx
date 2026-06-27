import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { useAppState } from '../lib/appState';
import FormationDiagram from './FormationDiagram';
import { CANONICAL_FORMATIONS, synthTeam } from '../lib/canonicalFormations';
import { FormationKey, FORMATION_EXPLANATIONS } from '../lib/formationExplanations';

const FORMATIONS = Object.keys(CANONICAL_FORMATIONS) as FormationKey[];

// Soccer "Formations" piece — a simple browser. Tap a formation chip → its FormationDiagram in FULL
// mode, which already renders the formation shape + the level-appropriate COACH'S READ explanation
// (from FORMATION_EXPLANATIONS at the current useAppState level). Pure reuse — no new engine.
// Mounts via GameHost like the other pieces; takes no props (level comes from useAppState).
export default function FormationBrowser() {
  const { theme } = useTheme();
  const { level } = useAppState();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [selected, setSelected] = useState<FormationKey>(FORMATIONS[0]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.hint}>Pick a formation to see its shape and what it does well.</Text>
      <View style={styles.chipRow}>
        {FORMATIONS.map(f => {
          const active = f === selected;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelected(f)}
              activeOpacity={0.8}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.diagramWrap}>
        <FormationDiagram team={synthTeam(selected)} level={level} hideExplanation />
      </View>
      {/* COACH'S READ — rendered as NATIVE text (readable) instead of inside the width-scaled SVG slot,
          which shrank it to ~8px. Same content (FORMATION_EXPLANATIONS at the current level). */}
      <View style={styles.readBox}>
        <Text style={styles.readLabel}>{`COACH'S READ · ${selected}`}</Text>
        <Text style={styles.readBody}>{FORMATION_EXPLANATIONS[selected]?.[level] ?? ''}</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },
  hint: { color: t.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  chipActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  chipText: { color: t.textSecondary, fontSize: 13, fontWeight: '800' },
  chipTextActive: { color: t.accentText },
  // Full-width now that the explanation renders as native text below — the pitch alone reads fine wide.
  diagramWrap: { width: '100%' },
  // COACH'S READ block — teal label + muted body at native readable sizes (mirrors the live card's slot).
  readBox: { marginTop: 16, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 14 },
  readLabel: { color: t.accentCool, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  readBody: { color: t.textSecondary, fontSize: 14, lineHeight: 21 },
});
