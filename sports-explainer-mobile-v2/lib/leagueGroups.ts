// Which sport keys belong to which real-world sport — ONE definition, imported everywhere.
//
// WHY THIS EXISTS: a "sport" in this app is really a LEAGUE key. Soccer is four keys, rugby is six.
// Before this file, "which keys are soccer?" was written out by hand in roughly fifteen places —
// eight of them inside lib/academyGames.ts alone — and adding a league meant finding every one.
// Missing a single list fails SILENTLY and asymmetrically: the league works on the Live tab but
// vanishes from the Academy, or gets Coach's Corner but no strategy tips. That is a bad failure,
// because nothing errors and the gap only shows up if someone happens to tap the right thing.
//
// Adding a league is now: add the key to the union in api.ts, add a SPORT_CONFIG entry, add it to
// the array below, and add its display copy. The membership questions answer themselves.
//
// NOTE these are LEAGUE-MEMBERSHIP lists, not display order and not per-key art lookups. Record
// maps that assign each key an asset or a category (readTheScore, zoneTap, signalDecoder, …) still
// need their own entry per key, because they carry more information than membership.

import type { Sport } from './api';

// Soccer: MLS + the European leagues + the World Cup. 'soccer' is BOTH the umbrella tile key and
// the MLS league key (see fetchSoccerBoard), which is why it appears here like any other league.
export const SOCCER_KEYS: Sport[] = ['soccer', 'epl', 'laliga', 'seriea', 'bundesliga', 'worldcup'];

// Rugby union. 'nationscup' doubles as the umbrella tile key and the Nations Cup league key.
// Super Rugby Pacific is the southern-hemisphere club competition (Feb–June), which is the half of
// the calendar URC and the Six Nations don't cover.
export const RUGBY_KEYS: Sport[] = ['rugby', 'mlr', 'nationscup', 'sixnations', 'nationschamp', 'superrugby', 'championscup', 'challengecup'];

export const isSoccer = (sport: string): boolean => (SOCCER_KEYS as string[]).includes(sport);
export const isRugby = (sport: string): boolean => (RUGBY_KEYS as string[]).includes(sport);
