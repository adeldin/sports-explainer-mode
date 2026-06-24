import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import { Language, MatchEvent } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';
import { sortEvents, eventIcon, isGoal, hasEvents } from '../lib/matchTimeline';

// Soccer "Match Timeline" (premium-free) — renders the Highlightly `events` the explain response
// now carries, as a glanceable expandable section. Mirrors the MLB Play-by-Play (PastPlays)
// section pattern, minus the per-row fetch (events are static, from props). Soccer-only; the
// no-events state (common early in a 0-0 match) is intentional, not an error.
interface Props {
  events: MatchEvent[];
  language: Language;
}

export default function MatchTimeline({ events, language }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];
  const [open, setOpen] = useState(true);
  const sorted = useMemo(() => sortEvents(events), [events]);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => { Haptics.selectionAsync(); setOpen(o => !o); }}
        activeOpacity={0.7}>
        <Text style={styles.headerText}>⚽ {S.matchTimelineTitle}</Text>
        <Text style={styles.headerChevron}>{open ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {open && (
        !hasEvents(sorted) ? (
          <Text style={styles.empty}>{S.matchTimelineEmpty}</Text>
        ) : (
          sorted.map((e, i) => (
            <View key={`${e.minute ?? '?'}-${e.type ?? ''}-${e.player ?? ''}-${i}`} style={styles.row}>
              <Text style={styles.minute}>{typeof e.minute === 'number' ? `${e.minute}'` : ''}</Text>
              <Text style={styles.icon}>{eventIcon(e.type)}</Text>
              <View style={styles.rowText}>
                <Text style={[styles.player, isGoal(e.type) && styles.playerGoal]} numberOfLines={1}>
                  {e.player || e.type || ''}
                </Text>
                {!!e.detail && <Text style={styles.detail} numberOfLines={1}>{e.detail}</Text>}
              </View>
            </View>
          ))
        )
      )}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 16, backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerText: { color: t.textPrimary, fontSize: 16, fontWeight: '800' },
  headerChevron: { color: t.textMuted, fontSize: 16, fontWeight: '800' },
  empty: { color: t.textSecondary, fontSize: 14, lineHeight: 21, paddingHorizontal: 16, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.border, gap: 10 },
  minute: { color: t.textMuted, fontSize: 13, fontWeight: '800', width: 34 },
  icon: { fontSize: 16, width: 22, textAlign: 'center' },
  rowText: { flex: 1 },
  player: { color: t.textPrimary, fontSize: 14, fontWeight: '600' },
  playerGoal: { fontWeight: '900', color: t.accentText },
  detail: { color: t.textSecondary, fontSize: 12, marginTop: 1 },
});
