import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import { Sport, Language } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';
import { RecapResponse, visibleProSections, RecapSectionKey } from '../lib/recap';
import GlossaryText from './GlossaryText';

// Post-Game Recap card (premium #1) — replaces the PlayCard on a FINAL game. Score + story
// are visible to everyone (the hook); the three narrative sections are full for Pro/trial and
// LOCKED teaser rows for free (titles visible, bodies hidden, single unlock CTA). Empty Pro
// sections are omitted (the data didn't support them — never fabricated). Glossary tap-to-define
// works in every visible section, exactly like the PlayCard.
interface Props {
  recap: RecapResponse;
  isPro: boolean;
  sport: Sport;
  language: Language;
  onUnlock: () => void;   // free users → presentPaywall()
}

export default function RecapCard({ recap, isPro, sport, language, onUnlock }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  // Single shared glossary definition box (mirrors PlayCard). Resets with the card via the
  // parent's context `key`.
  const [openTerm, setOpenTerm] = useState<{ term: string; def: string } | null>(null);
  const toggleGlossaryTerm = (t: { term: string; def: string }) =>
    setOpenTerm(prev => (prev && prev.term === t.term ? null : t));

  const SECTION_TITLE: Record<RecapSectionKey, string> = {
    turningPoint: S.recapTurningPoint,
    keyPerformance: S.recapKeyPerformance,
    whyItMattered: S.recapWhyMattered,
  };
  const proSections = visibleProSections(recap, isPro);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>🏁 {S.recapEyebrow}</Text>
      {!!recap.score && <Text style={styles.score}>{recap.score}</Text>}

      {/* THE STORY — visible to everyone (the free teaser hook). */}
      {!!recap.story && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{S.recapStoryTitle}</Text>
          <GlossaryText text={recap.story} sport={sport} baseStyle={styles.storyText}
            language={language} styles={styles} onToggleTerm={toggleGlossaryTerm} />
        </View>
      )}

      {/* Read-on-ESPN link-out — text only (no image/logo: ESPN/AP/Getty photos are not licensed).
          Opens the API's verbatim URL (sport-specific path shape — never reconstruct). Absent for
          golf/thin games → the row simply doesn't render. */}
      {!!recap.articleLink && (
        <TouchableOpacity style={styles.readOnEspn} activeOpacity={0.7}
          onPress={() => { Haptics.selectionAsync(); Linking.openURL(recap.articleLink); }}>
          <Text style={styles.readOnEspnText}>{S.recapReadOnEspn}</Text>
        </TouchableOpacity>
      )}

      {/* Pro narrative — full for Pro, locked teaser rows for free. */}
      {proSections.map(s => (
        <View key={s.key} style={styles.section}>
          <Text style={styles.sectionTitle}>{s.locked ? '🔒 ' : ''}{SECTION_TITLE[s.key]}</Text>
          {s.locked ? (
            // Title-only teaser — suggests hidden prose without revealing it.
            <View style={styles.lockedBars}>
              <View style={[styles.lockedBar, { width: '92%' }]} />
              <View style={[styles.lockedBar, { width: '78%' }]} />
            </View>
          ) : (
            <GlossaryText text={s.text} sport={sport} baseStyle={styles.proText}
              language={language} styles={styles} onToggleTerm={toggleGlossaryTerm} />
          )}
        </View>
      ))}

      {/* Honest-availability caption — free users only. The three locked rows market the sections
          by name, but each appears only when the game's data supports it (never fabricated), so this
          quiet line keeps the teaser from reading as a hard guarantee of all three. */}
      {!isPro && <Text style={styles.lockedNote}>{S.recapAvailabilityNote}</Text>}

      {/* Unlock CTA — free users only. */}
      {!isPro && (
        <TouchableOpacity style={styles.unlockBtn} activeOpacity={0.85}
          onPress={() => { Haptics.selectionAsync(); onUnlock(); }}>
          <Text style={styles.unlockBtnText}>{S.recapUnlock}</Text>
        </TouchableOpacity>
      )}

      {/* Shared glossary definition box. */}
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
  score: { color: t.textPrimary, fontSize: 22, fontWeight: '900', lineHeight: 28, marginBottom: 8 },
  section: { marginTop: 14, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 12 },
  sectionTitle: { color: t.accentText, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  storyText: { color: t.textPrimary, fontSize: 16, fontWeight: '500', lineHeight: 24 },
  proText: { color: t.textPrimary, fontSize: 15, lineHeight: 23 },
  // Locked teaser bars (suggest hidden prose).
  lockedBars: { gap: 8, marginTop: 2 },
  lockedBar: { height: 12, borderRadius: 6, backgroundColor: t.border, opacity: 0.6 },
  // Quiet honest-availability caption under the locked rows (not a section — a muted aside).
  lockedNote: { color: t.textMuted, fontSize: 12, fontStyle: 'italic', lineHeight: 17, marginTop: 14, marginBottom: 2 },
  // Subtle "Read on ESPN" link-out (text only — no third-party imagery). Sits under THE STORY.
  readOnEspn: { marginTop: 12, paddingVertical: 4 },
  readOnEspnText: { color: t.accent, fontSize: 13, fontWeight: '700' },
  unlockBtn: { marginTop: 18, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  unlockBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  // Glossary (mirrors PlayCard).
  glossaryTerm: { color: t.accent, textDecorationLine: 'underline', textDecorationStyle: 'solid' },
  glossaryDefBox: { marginTop: 14, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent },
  glossaryDefHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  glossaryDefTerm: { color: t.accentText, fontSize: 15, fontWeight: '800', flex: 1 },
  glossaryDefClose: { color: t.textMuted, fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  glossaryDefText: { color: t.textPrimary, fontSize: 14, lineHeight: 21 },
});
