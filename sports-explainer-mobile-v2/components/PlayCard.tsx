import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import { Sport, Language, ExplanationResponse } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';
import { derivePlayHeadline } from '../lib/playHeadline';
import GlossaryText from './GlossaryText';

// The layered "Play Card" (Step D, Phase 1). Glanceable derived headline + the core
// lesson + WHY (open by default) + THE RULE (collapsed), each modeled as a layer so
// Phase 2 can fold the follow-up chips in without re-splitting. Glossary tap-to-define
// works inside every layer. Expand/collapse + glossary open-state reset for free via a
// context `key` on the parent (no internal reset effect needed) — see LiveScreen.
interface Props {
  result: ExplanationResponse;
  sport: Sport;
  language: Language;
  lastUpdated: string | null;
}

// Layer keys + their partial default (simple + why open; rule collapsed). Modeled as a
// Set so Phase 2's chips-as-layers slot in uniformly.
const DEFAULT_OPEN = ['simple', 'whyItMatters'];

export default function PlayCard({ result, sport, language, lastUpdated }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  const [open, setOpen] = useState<Set<string>>(() => new Set(DEFAULT_OPEN));
  const toggle = (key: string) => {
    Haptics.selectionAsync();
    setOpen(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // The single open glossary definition (shown below the layers). Resets with the card
  // (parent remounts it on sport/level/language/game change).
  const [openTerm, setOpenTerm] = useState<{ term: string; def: string } | null>(null);
  const toggleGlossaryTerm = (t: { term: string; def: string }) =>
    setOpenTerm(prev => (prev && prev.term === t.term ? null : t));

  const headline = derivePlayHeadline(
    result.rawPlay || result.playType,
    result.simple,
    S.playHeadlineFallback,
  );

  const showRule = !!result.ruleDetail && result.showRule;

  // A collapsible layer row: tappable header (label + chevron) + body when open.
  const Layer = ({ id, label, text, baseStyle }: { id: string; label: string; text: string; baseStyle: any }) => (
    <View style={styles.layer}>
      <TouchableOpacity style={styles.layerHeader} onPress={() => toggle(id)} activeOpacity={0.7}>
        <Text style={styles.layerLabel}>{label}</Text>
        <Text style={styles.layerChevron}>{open.has(id) ? '▾' : '▸'}</Text>
      </TouchableOpacity>
      {open.has(id) && (
        <GlossaryText text={text} sport={sport} baseStyle={baseStyle} language={language}
          styles={styles} onToggleTerm={toggleGlossaryTerm} />
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      {/* Headline — glanceable, derived (no backend). The play in one line. */}
      <Text style={styles.eyebrow}>🎙️ {S.thePlay}</Text>
      <View style={styles.headlineRow}>
        <Text style={styles.headline} numberOfLines={2}>{headline}</Text>
        {lastUpdated && <Text style={styles.contextTime}>{S.updated} {lastUpdated}</Text>}
      </View>
      {result.complexity === 'high' && (
        <View style={styles.complexityBadge}>
          <Text style={styles.complexityText}>⚡ {S.complexPlay}</Text>
        </View>
      )}

      {/* Core lesson — open by default (the 'simple' layer). */}
      {open.has('simple') && (
        <GlossaryText text={result.simple} sport={sport} baseStyle={styles.explanationText}
          language={language} styles={styles} onToggleTerm={toggleGlossaryTerm} />
      )}

      {/* WHY IT MATTERS — its own layer, open by default. */}
      {!!result.whyItMatters && (
        <Layer id="whyItMatters" label={`💡 ${S.whyItMatters}`} text={result.whyItMatters} baseStyle={styles.insightText} />
      )}

      {/* THE RULE — collapsed by default; the tap-to-reveal proof of the layered pattern. */}
      {showRule && (
        <Layer id="rule" label={`📜 ${S.theRule}`} text={result.ruleDetail} baseStyle={styles.ruleText} />
      )}

      {/* Shared glossary definition box — shows the currently-open term. */}
      {openTerm && (
        <View style={styles.glossaryDefBox}>
          <View style={styles.glossaryDefHeader}>
            <Text style={styles.glossaryDefTerm}>{openTerm.term}</Text>
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setOpenTerm(null); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.glossaryDefClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.glossaryDefText}>{openTerm.def}</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  card: { backgroundColor: t.explanationBg, borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: t.stripe, borderWidth: 1, borderColor: t.border },
  eyebrow: { color: t.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  headlineRow: { flexDirection: 'column', gap: 4, marginBottom: 12 },
  headline: { color: t.textPrimary, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  contextTime: { color: t.textMuted, fontSize: 11 },
  complexityBadge: { alignSelf: 'flex-start', backgroundColor: t.warnBg, borderWidth: 1, borderColor: t.warn, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  complexityText: { color: t.warn, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  explanationText: { color: t.textPrimary, fontSize: 18, fontWeight: '600', lineHeight: 26 },
  // Collapsible layer
  layer: { marginTop: 14, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 12 },
  layerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  layerLabel: { color: t.accentText, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  layerChevron: { color: t.accentText, fontSize: 14, fontWeight: '800' },
  insightText: { color: t.textPrimary, fontSize: 16, fontWeight: '500', lineHeight: 24, marginTop: 8 },
  ruleText: { color: t.ruleText, fontSize: 15, lineHeight: 22, marginTop: 8 },
  // Glossary (mirrors the prior inline styling)
  glossaryTerm: { color: t.accent, textDecorationLine: 'underline', textDecorationStyle: 'solid' },
  glossaryDefBox: { marginTop: 14, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent },
  glossaryDefHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  glossaryDefTerm: { color: t.accentText, fontSize: 15, fontWeight: '800', flex: 1 },
  glossaryDefClose: { color: t.textMuted, fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  glossaryDefText: { color: t.textPrimary, fontSize: 14, lineHeight: 21 },
});
