// Favorite teams (`favorite_teams` in appState): the starred teams that sort the board and drive
// "Only my teams".
//
// A team's display abbreviation is NOT unique across leagues: "LA" is the Galaxy in MLS and the
// Lakers in the NBA. So a favorite is stored SCOPED to its league as "<sport>:<abbr>" (the game's
// own league key, e.g. "nba:LA"), and only matches that league.
//
// Older installs stored the bare abbreviation ("LA"). We cannot tell which league those meant, so
// they keep matching by abbreviation alone, exactly as before. Un-starring such a team removes the
// old entry, and starring it again stores the scoped form, so old entries fade out on their own.

export const favKey = (sport: string, abbr: string) => `${sport}:${abbr}`;

/** Split a scoped key back into its parts. Sport keys never contain ':'. */
export function parseFavKey(key: string): { sport: string; abbr: string } | null {
  const i = key.indexOf(':');
  if (i <= 0) return null;
  return { sport: key.slice(0, i), abbr: key.slice(i + 1) };
}

/** Is this team (in this league) a favorite? Honors old unscoped entries. */
export function isFavTeam(favorites: string[], sport: string, abbr: string): boolean {
  if (!abbr) return false;
  return favorites.includes(favKey(sport, abbr)) || favorites.includes(abbr);
}

/** Either side of a game is a favorite. */
export function isFavGame(favorites: string[], g: { sport: string; homeTeam: string; awayTeam: string }): boolean {
  return isFavTeam(favorites, g.sport, g.homeTeam) || isFavTeam(favorites, g.sport, g.awayTeam);
}

/** The new favorites list after starring or un-starring one team. */
export function toggledFavorites(favorites: string[], sport: string, abbr: string): string[] {
  if (isFavTeam(favorites, sport, abbr)) {
    // Remove the scoped entry AND any old bare entry for this abbreviation, or the star would
    // stay lit after the tap.
    const key = favKey(sport, abbr);
    return favorites.filter(f => f !== key && f !== abbr);
  }
  return [...favorites, favKey(sport, abbr)];
}
