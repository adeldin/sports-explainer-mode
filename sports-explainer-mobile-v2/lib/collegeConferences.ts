// NCAA conference maps — the filter that makes college sports usable at all.
//
// WHY THIS EXISTS: college is not "another league", it's an order-of-magnitude volume problem.
// Measured against ESPN 2026-08-14: a single September Saturday carries 68 FBS football games and a
// November one 51. Basketball is worse in season — hundreds of Division I teams playing midweek.
// Every other tile in this app shows a slate you can scroll; college shows a wall.
//
// The fix reuses machinery that already exists rather than inventing a college-specific screen. The
// Soccer and Rugby tiles already narrow a merged board with a chip row that is derived FROM THE
// BOARD, so it only ever offers options that actually have games on the day being viewed. Point that
// same row at `conferenceId` instead of the league key and it becomes a conference filter, with the
// empty-result dead end already designed out.
//
// THE IDS ARE PER-SPORT AND DO NOT MATCH. This is the trap worth knowing about: ESPN's group ids are
// scoped per sport, so `8` is the SEC in football and the Big 12 in basketball. A single shared map
// would mislabel roughly every game. Hence two maps, and a lookup that takes the sport.
//
// Sourced from ESPN's core group tree on 2026-08-14 (football: children of group 80 = FBS and
// 81 = FCS; basketball: children of group 50 = Division I). Baked in rather than fetched: these
// change about once a year, and a network round-trip to label a chip is not worth the failure mode.
// The fixture radar (`npm run scripts/fixture-radar.mjs`) is what catches structural drift.

// Football Bowl Subdivision — the tier with the audience.
const CFB_FBS: Record<string, string> = {
  '151': 'American', '1': 'ACC', '4': 'Big 12', '5': 'Big Ten', '12': 'CUSA',
  '18': 'FBS Indep.', '15': 'MAC', '17': 'Mountain West', '9': 'Pac-12',
  '8': 'SEC', '37': 'Sun Belt',
};

// Football Championship Subdivision. Included because ESPN returns FCS games on the same board and
// an unlabelled chip is worse than a labelled one — not because the app targets FCS.
const CFB_FCS: Record<string, string> = {
  '20': 'Big Sky', '48': 'CAA', '32': 'FCS Indep.', '22': 'Ivy', '24': 'MEAC',
  '21': 'MVFC', '25': 'NEC', '179': 'OVC', '27': 'Patriot', '28': 'Pioneer',
  '29': 'Southern', '30': 'Southland', '31': 'SWAC', '177': 'UAC',
};

const CBB_D1: Record<string, string> = {
  '1': 'Am. East', '62': 'American', '3': 'A-10', '2': 'ACC', '46': 'Atlantic Sun',
  '8': 'Big 12', '4': 'Big East', '5': 'Big Sky', '6': 'Big South', '7': 'Big Ten',
  '9': 'Big West', '10': 'CAA', '11': 'CUSA', '45': 'Horizon', '12': 'Ivy',
  '13': 'Metro', '14': 'MAC', '16': 'MEAC', '18': 'MVC', '44': 'Mountain West',
  '19': 'NEC', '20': 'OVC', '22': 'Patriot', '23': 'SEC', '24': 'SoCon',
  '25': 'Southland', '26': 'SWAC', '49': 'Summit', '27': 'Sun Belt', '30': 'UAC',
  '29': 'WCC',
};

export const CFB_CONFERENCES: Record<string, string> = { ...CFB_FBS, ...CFB_FCS };
export const CBB_CONFERENCES: Record<string, string> = CBB_D1;

// Chip-row options, in the shape the existing merged-tile league filter already consumes. `sportKey`
// carries the conference id rather than a league key — the filter compares it against whatever the
// tile's `keyOf` returns, so the field name is the only thing that reads oddly here.
//
// Ordered by prominence, then alphabetically. The chip row intersects this with the day's board, so
// ordering only decides what a busy Saturday shows FIRST — and on a busy Saturday the power
// conferences are what a newcomer recognises.
const PROMINENCE = ['SEC', 'Big Ten', 'Big 12', 'ACC', 'Big East', 'Pac-12', 'American', 'Mountain West'];
const toOptions = (m: Record<string, string>) =>
  Object.entries(m)
    .map(([id, label]) => ({ sportKey: id, label }))
    .sort((a, b) => {
      const ai = PROMINENCE.indexOf(a.label), bi = PROMINENCE.indexOf(b.label);
      if (ai !== bi) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      return a.label.localeCompare(b.label);
    });

export const CFB_CONFERENCE_OPTIONS = toOptions(CFB_CONFERENCES);
export const CBB_CONFERENCE_OPTIONS = toOptions(CBB_CONFERENCES);

// Label for one conference id. Returns undefined rather than a placeholder so callers can decide
// whether an unknown conference is worth a chip at all — ESPN occasionally returns ids outside the
// published group tree (reclassifying schools, exhibition opponents).
export function conferenceLabel(sport: string, id?: string): string | undefined {
  if (!id) return undefined;
  if (sport === 'cfb') return CFB_CONFERENCES[id];
  if (sport === 'cbb') return CBB_CONFERENCES[id];
  return undefined;
}
