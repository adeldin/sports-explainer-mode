import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import { Sport, Level, Language, CoachSituation, CoachFull, fetchCoachState, fetchCoachFull } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';
import { hasSufficientState, deriveSituationTag, hasCoachContent } from '../lib/coach';
import GlossaryText from './GlossaryText';

// Coach's Corner (premium #3) — the live strategic-insight layer BELOW the PlayCard. Collapsible,
// Weather-app glanceable. Three render states keyed on the normalized situation + isPro:
//   • coming-soon  — data-thin sport (hasSufficientState false): never a fabricated insight.
//   • free         — factual situation tag + the templated hook + Unlock CTA (NO Groq call fires).
//   • pro          — tap to expand → the Groq strategic read (fires ONLY on expand).
// Parent remounts it via a context key so it resets on sport/game/level/language change.
interface Props {
  sport: Sport;
  gameId: string;
  level: Level;
  language: Language;
  isPro: boolean;
  onUnlock: () => void;
}

export default function CoachCard({ sport, gameId, level, language, isPro, onUnlock }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  const [situation, setSituation] = useState<CoachSituation | null>(null);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [full, setFull] = useState<CoachFull | null>(null);
  const [fullLoading, setFullLoading] = useState(false);
  const [openTerm, setOpenTerm] = useState<{ term: string; def: string } | null>(null);
  const toggleGlossaryTerm = (t: { term: string; def: string }) =>
    setOpenTerm(prev => (prev && prev.term === t.term ? null : t));

  // Cheap, NO-Groq situation fetch (the only call free users make). Cancellation-guarded.
  useEffect(() => {
    let cancelled = false;
    setStateLoaded(false);
    fetchCoachState(sport, gameId)
      .then(s => { if (!cancelled) { setSituation(s); setStateLoaded(true); } })
      .catch(() => { if (!cancelled) { setSituation(null); setStateLoaded(true); } });
    return () => { cancelled = true; };
  }, [sport, gameId]);

  const expand = async () => {
    Haptics.selectionAsync();
    setExpanded(true);
    if (full || fullLoading) return;
    setFullLoading(true);
    try {
      setFull(await fetchCoachFull(sport, gameId, level, language));
    } catch {
      setFull({ strategicRead: '', whatItSetsUp: '' });
    } finally {
      setFullLoading(false);
    }
  };

  // While the cheap state call is in flight, render a slim placeholder (keeps the card
  // discoverable without flicker).
  if (!stateLoaded) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>🧠 COACH'S CORNER</Text>
        <ActivityIndicator color={theme.accentCool} style={{ marginTop: 8 }} />
      </View>
    );
  }

  // Data-thin sport → coming-soon (never fabricate).
  if (!hasSufficientState(sport, situation)) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>🧠 COACH'S CORNER</Text>
        <Text style={styles.comingSoon}>{S.coachComingSoon}</Text>
      </View>
    );
  }

  const tag = deriveSituationTag(sport, situation);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>🧠 COACH'S CORNER</Text>
        {!!tag && <Text style={styles.tag}>{tag}</Text>}
      </View>

      {!isPro ? (
        // FREE — factual hook + locked payoff. No Groq call fires.
        <>
          <Text style={styles.hook}>{S.coachHook}</Text>
          <TouchableOpacity style={styles.unlockBtn} activeOpacity={0.85}
            onPress={() => { Haptics.selectionAsync(); onUnlock(); }}>
            <Text style={styles.unlockBtnText}>{S.coachUnlock}</Text>
          </TouchableOpacity>
        </>
      ) : !expanded ? (
        // PRO collapsed — the Groq read fires only on this tap.
        <TouchableOpacity style={styles.expandRow} activeOpacity={0.7} onPress={expand}>
          <Text style={styles.expandText}>{S.coachExpand}</Text>
          <Text style={styles.chevron}>▸</Text>
        </TouchableOpacity>
      ) : fullLoading ? (
        <View style={styles.thinkingRow}>
          <ActivityIndicator color={theme.accentCool} />
          <Text style={styles.thinkingText}>{S.coachThinking}</Text>
        </View>
      ) : full && hasCoachContent(full) ? (
        <View>
          {!!full.strategicRead && (
            <GlossaryText text={full.strategicRead} sport={sport} baseStyle={styles.readText}
              language={language} styles={styles} onToggleTerm={toggleGlossaryTerm} />
          )}
          {!!full.whatItSetsUp && (
            <View style={styles.nextRow}>
              <Text style={styles.nextLabel}>👀 NEXT</Text>
              <GlossaryText text={full.whatItSetsUp} sport={sport} baseStyle={styles.nextText}
                language={language} styles={styles} onToggleTerm={toggleGlossaryTerm} />
            </View>
          )}
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
      ) : (
        // Pro, expanded, but the data didn't support a real read → honest short line, no platitude.
        <Text style={styles.comingSoon}>{S.coachComingSoon}</Text>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  // Teal "Coach's Corner" accent — distinct from the orange play card; the live teaching layer.
  card: { backgroundColor: t.surface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accentCool },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: t.accentCool, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  tag: { color: t.textMuted, fontSize: 12, fontWeight: '800' },
  comingSoon: { color: t.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  hook: { color: t.textPrimary, fontSize: 15, fontWeight: '600', lineHeight: 22, marginTop: 10 },
  unlockBtn: { marginTop: 14, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  unlockBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  expandText: { color: t.accentCoolLight, fontSize: 14, fontWeight: '700' },
  chevron: { color: t.accentCoolLight, fontSize: 14, fontWeight: '800' },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  thinkingText: { color: t.textMuted, fontSize: 14, fontStyle: 'italic' },
  readText: { color: t.textPrimary, fontSize: 16, fontWeight: '500', lineHeight: 24, marginTop: 12 },
  nextRow: { marginTop: 14, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 12 },
  nextLabel: { color: t.accentText, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  nextText: { color: t.textPrimary, fontSize: 15, lineHeight: 23 },
  glossaryTerm: { color: t.accent, textDecorationLine: 'underline', textDecorationStyle: 'solid' },
  glossaryDefBox: { marginTop: 14, padding: 14, backgroundColor: t.explanationBg, borderRadius: 12, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent },
  glossaryDefHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  glossaryDefTerm: { color: t.accentText, fontSize: 15, fontWeight: '800', flex: 1 },
  glossaryDefClose: { color: t.textMuted, fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  glossaryDefText: { color: t.textPrimary, fontSize: 14, lineHeight: 21 },
});
