import { useState, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TextInput, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, Theme } from '../lib/theme';

// FilterBar — ONE filter control, used by every surface that narrows a list.
//
// WHY THIS REPLACED THE CHIP ROW: chips were fine at three options and fell apart past that. The
// Soccer tile carries six leagues and college football's conference row hit TWENTY-TWO on a
// September Saturday — four wrapped rows of chrome sitting on top of the scores, which read (fairly)
// as sloppy. The failure isn't the styling, it's that a chip row's height is a function of how many
// options exist, so it can never be designed once and trusted.
//
// A bar is a fixed one row no matter what: six leagues, twenty-two conferences, or two hundred
// teams all cost the same vertical space. Everything that scales moves into a sheet, which is also
// the only place there's room for the thing chips fundamentally cannot do — a SEARCH FIELD. That
// matters because "when does Notre Dame play next" is not answerable by scanning conference chips;
// it needs typing. One control now serves narrowing AND finding.
//
// Deliberately NOT a native wheel picker: a wheel can't show how many games sit behind an option,
// can't be searched, and takes several flicks to reach a distant entry. The counts are load-bearing
// — "SEC 13 games" tells you whether the tap is worth making.

export interface FilterOption {
  key: string;
  label: string;
  count?: number;   // games behind this option on the day being viewed; drives the right-hand hint
}

export interface FilterTeamOption {
  key: string;
  label: string;
  sublabel?: string;
  logo?: string;
}

export default function FilterBar({
  title,
  allLabel = 'All',
  value,
  options,
  onChange,
  teams,
  teamsTitle = 'Teams',
  onSelectTeam,
  valueLabel,
  toggleRow,
  starredKeys,
  onToggleStar,
  searchPlaceholder,
  rightSlot,
  marginBottom = 10,
}: {
  title: string;                    // "Conference" | "League" | "Tournament" — names the axis
  allLabel?: string;
  value: string;                    // 'all' or an option key
  options: FilterOption[];
  onChange: (key: string) => void;
  teams?: FilterTeamOption[];       // optional: makes the sheet searchable by team
  teamsTitle?: string;
  onSelectTeam?: (key: string) => void;
  // Overrides ONLY what the bar displays. Needed when the active narrowing isn't one of `options` —
  // picking a team in the finder is a real filter, but it is not a conference, so the option list
  // has nothing to tick. Without this the bar and the sheet's "All" row were forced to share one
  // label, which made the row that CLEARS the filter read as the filter itself.
  valueLabel?: string;
  // A boolean that belongs on the same axis as the list but isn't one of the options — "Only my
  // teams". It used to sit beside the bar as a bare ★, which read as decoration: a star with no
  // team next to it doesn't say what it stars. In the sheet it gets a label and a place.
  toggleRow?: { label: string; value: boolean; onChange: (v: boolean) => void };
  // Favouriting from the search results. A star means something HERE, because it's attached to the
  // team it acts on.
  starredKeys?: Set<string>;
  onToggleStar?: (key: string) => void;
  searchPlaceholder?: string;
  rightSlot?: React.ReactNode;      // e.g. the "Only my teams" toggle, kept on the same row
  marginBottom?: number;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const current = valueLabel ?? (value === 'all' ? allLabel : (options.find(o => o.key === value)?.label ?? allLabel));
  const searchable = !!teams?.length || options.length > 8;

  const q = query.trim().toLowerCase();
  const shownOptions = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  // Teams only surface once something is typed. Showing hundreds of them unprompted would bury the
  // conference list that most taps are actually after.
  const shownTeams = q && teams ? teams.filter(t =>
    t.label.toLowerCase().includes(q) || (t.sublabel ?? '').toLowerCase().includes(q)).slice(0, 25) : [];

  const close = () => { setOpen(false); setQuery(''); };

  return (
    <>
      <View style={[styles.bar, { marginBottom }]}>
        <TouchableOpacity
          style={styles.barBtn}
          activeOpacity={0.8}
          onPress={async () => { await Haptics.selectionAsync(); setOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${current}. Tap to change.`}>
          <Text style={styles.barLabel} numberOfLines={1}>
            <Text style={styles.barTitle}>{title}  </Text>
            {current}
          </Text>
          <Text style={styles.barChevron}>▾</Text>
        </TouchableOpacity>
        {rightSlot}
      </View>

      {/* pageSheet, NOT a bare full-screen Modal. react-native-safe-area-context's SafeAreaView gets
          no insets inside a plain Modal — it's a separate root view — so the title rendered under
          the status-bar clock and Done under the battery, which is what made the sheet impossible
          to dismiss. pageSheet is inset by iOS itself and adds swipe-down-to-close as a second way
          out. Same presentation NextGameFinder already uses. */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.sheetDone}>Done</Text>
            </TouchableOpacity>
          </View>

          {searchable && (
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}`}
                placeholderTextColor={theme.placeholderText}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
          )}

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {shownTeams.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{teamsTitle.toUpperCase()}</Text>
                {shownTeams.map(t => {
                  const RowWrap: any = onSelectTeam ? TouchableOpacity : View;
                  return (
                  <RowWrap
                    key={t.key}
                    style={styles.row}
                    activeOpacity={0.8}
                    {...(onSelectTeam ? { onPress: async () => { await Haptics.selectionAsync(); onSelectTeam(t.key); close(); } } : {})}>
                    {t.logo
                      ? <Image source={{ uri: t.logo }} style={styles.rowLogo} />
                      : <View style={styles.rowLogo} />}
                    <Text style={styles.rowLabel} numberOfLines={1}>{t.label}</Text>
                    {!!t.sublabel && <Text style={styles.rowHint}>{t.sublabel}</Text>}
                    {onToggleStar && (
                      <TouchableOpacity
                        onPress={async () => { await Haptics.selectionAsync(); onToggleStar(t.key); }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Text style={styles.rowStar}>{starredKeys?.has(t.key) ? '★' : '☆'}</Text>
                      </TouchableOpacity>
                    )}
                  </RowWrap>
                  );
                })}
              </>
            )}

            {(shownTeams.length > 0 || q) && shownOptions.length > 0 && (
              <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
            )}

            {!q && toggleRow && (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.8}
                onPress={async () => { await Haptics.selectionAsync(); toggleRow.onChange(!toggleRow.value); }}>
                <Text style={styles.rowTick}>{toggleRow.value ? '★' : '☆'}</Text>
                <Text style={[styles.rowLabel, toggleRow.value && styles.rowLabelActive]}>{toggleRow.label}</Text>
              </TouchableOpacity>
            )}

            {!q && (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.8}
                onPress={async () => { await Haptics.selectionAsync(); onChange('all'); close(); }}>
                <Text style={styles.rowTick}>{value === 'all' ? '✓' : ' '}</Text>
                <Text style={[styles.rowLabel, value === 'all' && styles.rowLabelActive]}>{allLabel}</Text>
              </TouchableOpacity>
            )}

            {shownOptions.map(o => (
              <TouchableOpacity
                key={o.key}
                style={styles.row}
                activeOpacity={0.8}
                onPress={async () => { await Haptics.selectionAsync(); onChange(o.key); close(); }}>
                <Text style={styles.rowTick}>{value === o.key ? '✓' : ' '}</Text>
                <Text style={[styles.rowLabel, value === o.key && styles.rowLabelActive]} numberOfLines={1}>
                  {o.label}
                </Text>
                {o.count != null && (
                  <Text style={styles.rowHint}>{o.count} {o.count === 1 ? 'game' : 'games'}</Text>
                )}
              </TouchableOpacity>
            ))}

            {q && shownOptions.length === 0 && shownTeams.length === 0 && (
              <Text style={styles.empty}>Nothing matches “{query}”.</Text>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: t.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: t.border,
  },
  barTitle: { color: t.textMuted, fontSize: 13, fontWeight: '700' },
  barLabel: { color: t.textPrimary, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  barChevron: { color: t.textMuted, fontSize: 13, marginLeft: 8 },

  sheet: { flex: 1, backgroundColor: t.background },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border,
  },
  sheetTitle: { color: t.textPrimary, fontSize: 22, fontWeight: '800' },
  sheetDone: { color: t.accent, fontSize: 17, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border,
    marginHorizontal: 18, marginTop: 12, paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, color: t.textPrimary, fontSize: 16, paddingVertical: 11 },

  list: { flex: 1, marginTop: 8 },
  sectionTitle: {
    color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border,
  },
  rowTick: { color: t.accent, fontSize: 15, fontWeight: '800', width: 16 },
  rowLogo: { width: 22, height: 22, borderRadius: 4 },
  rowLabel: { color: t.textPrimary, fontSize: 16, fontWeight: '600', flex: 1 },
  rowLabelActive: { color: t.accent, fontWeight: '800' },
  rowHint: { color: t.textMuted, fontSize: 13, fontWeight: '600' },
  rowStar: { color: t.accent, fontSize: 20, fontWeight: '700', paddingLeft: 6 },
  empty: { color: t.textMuted, fontSize: 15, textAlign: 'center', paddingVertical: 30 },
});
