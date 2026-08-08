import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { Language } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';
import { MONTHS, SEASON_WINDOWS, isOffSeason } from '../lib/sports';

interface Props {
  sport: string;
  reason: 'no-games' | 'off-season' | 'select-game';
  language: Language;
  seasonEnded?: boolean; // in-window sport whose season just finished (NBA/NHL in June)
  // Opens the Next Game Finder. Optional so this stays a pure presentational component: the caller
  // owns the modal and decides which surfaces get the action. Passing nothing renders no button —
  // which is what tennis/golf/cricket want, since they have tournaments rather than fixtures.
  onFindNextGame?: () => void;
}

const SPORT_EMOJI: Record<string, string> = {
  mlb: '⚾', nfl: '🏈', nba: '🏀', nhl: '🏒', soccer: '⚽', worldcup: '🌍', rugby: '🏉',
  wnba: '🏀', epl: '⚽', laliga: '⚽', seriea: '⚽', bundesliga: '⚽', mlr: '🏉', nationscup: '🏉', superrugby: '🏉',
  sixnations: '🏉', nationschamp: '🏉', tennis: '🎾', golf: '⛳', cricket: '🏏',
};

export default function EmptyState({ sport, reason, language, seasonEnded, onFindNextGame }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  // The way OUT of an empty state. Rendered in the fixture-sport branches below (not tennis/golf/
  // cricket, and not 'select-game' — there the user already has games and just hasn't picked one).
  const findBtn = onFindNextGame ? (
    <TouchableOpacity style={styles.findBtn} onPress={onFindNextGame} activeOpacity={0.85}>
      <Text style={styles.findBtnTxt}>{S.findNextGame} →</Text>
    </TouchableOpacity>
  ) : null;

  const emoji = SPORT_EMOJI[sport] || '📡';
  const names: Record<string, string> = {
    mlb: S.spBaseball, nfl: S.spFootball, nba: S.spBasketball, nhl: S.spHockey,
    soccer: S.spSoccer, worldcup: S.spWorldCup, rugby: S.spRugby,
    wnba: S.spWnba, epl: S.spPremierLeague, laliga: S.spLaLiga, seriea: S.spSerieA, bundesliga: S.spBundesliga,
    mlr: S.spMlr, nationscup: S.spNationsCup, superrugby: S.spSuperRugby,
    tennis: S.spTennis, golf: S.spGolf, cricket: S.spCricket,
  };
  const sportName = names[sport] || sport.toUpperCase();

  const detectedOffSeason = reason === 'no-games' && isOffSeason(sport);
  const effectiveReason = detectedOffSeason ? 'off-season' : reason;

  if (effectiveReason === 'select-game') {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>📡</Text>
        <Text style={styles.title}>{S.selectGame}</Text>
      </View>
    );
  }

  // Season just ended (NBA/NHL still inside their Oct–June window): no more games this
  // season. Use the SAME window format as the off-season branch for consistency —
  // "No {Sport} games right now. The season runs {window} — check back then!" — with a
  // clean generic fallback when no window is known.
  if (reason === 'no-games' && seasonEnded) {
    const w = SEASON_WINDOWS[sport];
    const seasonSub = w
      ? S.seasonRuns.replace('{start}', MONTHS[w.start - 1]).replace('{end}', MONTHS[w.end - 1])
      : S.offSeasonSub;
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{S.seasonTitle.replace('{sport}', sportName)}</Text>
        <Text style={styles.subtitle}>{seasonSub}</Text>
        {findBtn}
      </View>
    );
  }

  // World Cup is data-driven: with no live games, show the "every 4 years" note.
  if (reason === 'no-games' && sport === 'worldcup') {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{S.seasonTitle.replace('{sport}', sportName)}</Text>
        <Text style={styles.subtitle}>{S.worldCupRuns}</Text>
        {findBtn}
      </View>
    );
  }

  // Learn Mode sports with no live data (year-round, but nothing on right now).
  if (reason === 'no-games' && sport === 'cricket') {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🏏</Text>
        <Text style={styles.title}>{S.noCricketData}</Text>
        <Text style={styles.subtitle}>{S.noCricketDataSub}</Text>
      </View>
    );
  }
  if (reason === 'no-games' && (sport === 'tennis' || sport === 'golf')) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{S.noTournaments}</Text>
        <Text style={styles.subtitle}>{S.noTournamentsSub}</Text>
      </View>
    );
  }

  if (effectiveReason === 'off-season') {
    const w = SEASON_WINDOWS[sport];
    const seasonSub = (sport === 'worldcup' || !w)
      ? S.worldCupRuns
      : S.seasonRuns.replace('{start}', MONTHS[w.start - 1]).replace('{end}', MONTHS[w.end - 1]);
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{S.seasonTitle.replace('{sport}', sportName)}</Text>
        <Text style={styles.subtitle}>{seasonSub}</Text>
        {findBtn}
      </View>
    );
  }

  // no-games
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{S.noGames.replace('{sport}', sportName)}</Text>
      <Text style={styles.subtitle}>{S.pullRefresh}</Text>
      {findBtn}
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32, gap: 12 },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { color: t.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: t.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  badge: { marginTop: 16, backgroundColor: t.warnBg, borderWidth: 1, borderColor: t.warn, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: t.warn, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  // The one action on an otherwise dead screen — deliberately the brightest thing in the container.
  findBtn: {
    marginTop: 6, backgroundColor: t.accent, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 11,
  },
  findBtnTxt: { color: '#ffffff', fontSize: 14.5, fontWeight: '800' },
});
