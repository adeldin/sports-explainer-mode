import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import { Sport, Language, ExplanationResponse } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';
import { derivePlayHeadline } from '../lib/playHeadline';
import GlossaryText from './GlossaryText';

// A live Q&A entry (Phase 2): a chip-tap or free-text question whose answer renders as a
// card layer. State lives in LiveScreen (which owns the ask flow); PlayCard just renders.
export interface QAItem {
  id: number;                          // monotonic (never reused) — stable layer key
  question: string;                    // the layer label
  answer: string | null;              // null while loading
  status: 'loading' | 'done' | 'error';
  source: 'chip' | 'ask';             // chip → in-card layer; ask (typed) → inline under the input
}

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
  answers: QAItem[];        // live Q&A — each renders as an appended, collapsible layer
  feedbackGiven?: boolean;  // "I learned something" lit state — PLAY-KEYED in LiveScreen (not local state)
  onFeedback?: () => void;  // one-tap positive feedback (fire-and-forget); absent → no lightbulb
}

// Layer keys + their partial default (simple + why open; rule collapsed). Modeled as a
// Set so Phase 2's chips-as-layers slot in uniformly.
const DEFAULT_OPEN = ['simple', 'whyItMatters'];

export default function PlayCard({ result, sport, language, lastUpdated, answers, feedbackGiven, onFeedback }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  const [open, setOpen] = useState<Set<string>>(() => new Set(DEFAULT_OPEN));

  // New Q&A answers open by default (the user just asked — show it). Each id is
  // auto-opened ONCE (tracked in a ref) so a later loading→done patch, or a sibling
  // answer arriving, doesn't re-open a layer the user has since collapsed. Both the ref
  // and `open` reset for free when the parent remounts the card on game/sport/level/
  // language change (its context `key`). ids are monotonic, so no cross-play collision.
  const autoOpenedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    setOpen(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const a of answers) {
        if (!autoOpenedRef.current.has(a.id)) {
          autoOpenedRef.current.add(a.id);
          next.add(`qa-${a.id}`);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [answers]);
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

      {/* Live Q&A (Phase 2) — chip taps + free-text asks append here as layers. Each is a
          collapsible layer: the question is the header, the answer the body (glossary works
          inside it); a per-item spinner shows while in flight. Cleared on a genuine new play
          (LiveScreen's playKey), persists through a same-play refresh. */}
      {answers.map(a => (
        <View key={a.id} style={styles.layer}>
          <TouchableOpacity style={styles.layerHeader} onPress={() => toggle(`qa-${a.id}`)} activeOpacity={0.7}>
            <Text style={styles.qaQuestion} numberOfLines={2}>{a.question}</Text>
            <Text style={styles.layerChevron}>{open.has(`qa-${a.id}`) ? '▾' : '▸'}</Text>
          </TouchableOpacity>
          {open.has(`qa-${a.id}`) && (
            a.status === 'loading'
              ? <Text style={styles.qaThinking}>{S.thinking}</Text>
              : <GlossaryText text={a.answer ?? ''} sport={sport} baseStyle={styles.qaAnswer}
                  language={language} styles={styles} onToggleTerm={toggleGlossaryTerm} />
          )}
        </View>
      ))}

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

      {/* One-tap "I learned something" — quiet/glanceable; outline bulb → lit amber once tapped, then
          disabled. Only shown on a real explanation (result.simple) and when the parent wires it. */}
      {!!result.simple && onFeedback && (
        <TouchableOpacity
          style={styles.feedbackRow}
          onPress={() => { if (feedbackGiven) return; Haptics.selectionAsync(); onFeedback(); }}
          disabled={!!feedbackGiven}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!feedbackGiven }}
          accessibilityLabel={feedbackGiven ? S.feedbackThanks : S.feedbackPrompt}>
          <Ionicons name={feedbackGiven ? 'bulb' : 'bulb-outline'} size={16} color={feedbackGiven ? theme.accentText : theme.textMuted} />
          <Text style={[styles.feedbackText, feedbackGiven && styles.feedbackTextOn]}>
            {feedbackGiven ? S.feedbackThanks : S.feedbackPrompt}
          </Text>
        </TouchableOpacity>
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
  // One-tap feedback row — understated, separated by a hairline top border like the layers.
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.border },
  feedbackText: { color: t.textMuted, fontSize: 13, fontWeight: '600' },
  feedbackTextOn: { color: t.accentText },   // amber confirmation once tapped
  layerChevron: { color: t.accentText, fontSize: 14, fontWeight: '800' },
  insightText: { color: t.textPrimary, fontSize: 16, fontWeight: '500', lineHeight: 24, marginTop: 8 },
  ruleText: { color: t.ruleText, fontSize: 15, lineHeight: 22, marginTop: 8 },
  // Live Q&A layers — question header reads as a normal sentence (not the all-caps eyebrow
  // styling of the fixed layers), answer body matches the insight text weight.
  qaQuestion: { color: t.accentText, fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8, lineHeight: 18 },
  qaAnswer: { color: t.textPrimary, fontSize: 15, lineHeight: 22, marginTop: 8 },
  qaThinking: { color: t.textMuted, fontSize: 14, fontStyle: 'italic', marginTop: 8 },
  // Glossary (mirrors the prior inline styling)
  glossaryTerm: { color: t.accent, textDecorationLine: 'underline', textDecorationStyle: 'solid' },
  glossaryDefBox: { marginTop: 14, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent },
  glossaryDefHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  glossaryDefTerm: { color: t.accentText, fontSize: 15, fontWeight: '800', flex: 1 },
  glossaryDefClose: { color: t.textMuted, fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  glossaryDefText: { color: t.textPrimary, fontSize: 14, lineHeight: 21 },
});
