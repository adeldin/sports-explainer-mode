import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';
import { Language, MatchEvent } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';
import { sortEvents, eventIcon, isGoal, hasEvents } from '../lib/matchTimeline';
import { teamKey } from '../lib/teamKey';

// Soccer "Match Timeline" (premium-free) — renders the Highlightly `events` the explain response
// now carries, as a glanceable expandable section. Mirrors the MLB Play-by-Play (PastPlays)
// section pattern, minus the per-row fetch (events are static, from props). Soccer-only; the
// no-events state (common early in a 0-0 match) is intentional, not an error.
interface Props {
  events: MatchEvent[];
  language: Language;
  // Home/away identity for matching each event's team NAME to a crest (logo). Optional — the
  // timeline renders fine without it (just no crests).
  teams?: {
    home: { name: string; logo?: string };
    away: { name: string; logo?: string };
  };
}

export default function MatchTimeline({ events, language, teams }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];
  const [open, setOpen] = useState(true);
  const sorted = useMemo(() => sortEvents(events), [events]);

  // Match an event's team NAME to the home/away crest using tolerant normalization (teamKey:
  // token-sort + diacritic strip + nation aliases) — the event name is the Highlightly FULL name
  // (e.g. "Spain", "Korea Republic") and teams.{home,away}.name is now the ESPN full display name.
  // Returns undefined (→ no crest, never a broken image) when there's no teams prop, no match, or
  // the matched side has no logo.
  const crestFor = (team?: string): string | undefined => {
    if (!teams || !team) return undefined;
    const k = teamKey(team);
    if (!k) return undefined;
    if (k === teamKey(teams.home.name)) return teams.home.logo;
    if (k === teamKey(teams.away.name)) return teams.away.logo;
    return undefined;
  };

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
          sorted.map((e, i) => {
            // Secondary line: the assist/sub detail if present, else the event TYPE label — but
            // only when the player is the row's primary text. This makes a missed-penalty row read
            // "Missed Penalty" next to the player instead of a bare, ambiguous ❌. (When there's no
            // player the type is already the primary line, so we don't repeat it.)
            const secondary = e.detail || (e.player ? (e.type || '') : '');
            const crest = crestFor(e.team);
            return (
              <View key={`${e.minute ?? '?'}-${e.type ?? ''}-${e.player ?? ''}-${i}`} style={styles.row}>
                <Text style={styles.minute}>{typeof e.minute === 'number' ? `${e.minute}'` : ''}</Text>
                <Text style={styles.icon}>{eventIcon(e.type)}</Text>
                {crest ? <Image source={{ uri: crest }} style={styles.crest} resizeMode="contain" /> : null}
                <View style={styles.rowText}>
                  <Text style={[styles.player, isGoal(e.type) && styles.playerGoal]} numberOfLines={1}>
                    {e.player || e.type || ''}
                  </Text>
                  {!!secondary && <Text style={styles.detail} numberOfLines={1}>{secondary}</Text>}
                </View>
              </View>
            );
          })
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
  // Team crest — small, matches the GameCard logo sizing for consistency.
  crest: { width: 18, height: 18 },
  rowText: { flex: 1 },
  player: { color: t.textPrimary, fontSize: 14, fontWeight: '600' },
  playerGoal: { fontWeight: '900', color: t.accentText },
  detail: { color: t.textSecondary, fontSize: 12, marginTop: 1 },
});
