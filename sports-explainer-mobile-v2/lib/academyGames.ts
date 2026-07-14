import React from 'react';
import { Sport } from './api';
import QuizGame from '../components/academy/QuizGame';
import MatchGame from '../components/academy/MatchGame';
import ReadTheScoreGame from '../components/academy/ReadTheScoreGame';
import CrestRushGame from '../components/academy/CrestRushGame';
import KitClashGame from '../components/academy/KitClashGame';
import HigherOrLowerGame from '../components/academy/HigherOrLowerGame';
import SignalDecoderGame from '../components/academy/SignalDecoderGame';
import ZoneTapGame from '../components/academy/ZoneTapGame';

// The Academy game registry — the single source of truth for "what games exist."
// The home shell renders the hero + grid by iterating ACADEMY_GAMES; it never names a
// game directly. Adding a future game = push ONE descriptor here + write its component
// (a React.ComponentType<AcademyGameProps>). The shell's hero/grid code does not change.

export type AcademyGameId =
  | 'quiz' | 'term-match' | 'read-the-score' | 'crest-rush' | 'kit-clash'
  | 'higher-or-lower' | 'signal-decoder' | 'zone-tap'; // grows as games are added

// Uniform prop contract every game receives from the GameHost. `sportKeys` is the
// active Academy category's pooled league keys (scopes which sport's content plays).
export interface AcademyGameProps {
  sportKeys: Sport[];
  // The active Academy category's emoji (e.g. ⚾ / 🏈 / 🏉), threaded from the home through
  // GameHost so a game can show a small "what am I being quizzed on" indicator in its header.
  categoryEmoji?: string;
}

export interface AcademyGame {
  id: AcademyGameId;
  title: string;
  icon: string;   // emoji is fine for now
  blurb: string;  // short subtitle for the hero / tile
  Component: React.ComponentType<AcademyGameProps>;
  // Optional allow-list of sportKeys this game can run on. If PRESENT, the game shows
  // ONLY for categories whose sportKeys intersect this list; if ABSENT, the game shows
  // for ALL sports (default). Lets a sport surface only the games it can actually run.
  supportedSports?: Sport[];
  // Opt into LANDSCAPE while this game is open (field/diamond modules whose canvas is wider than
  // tall). GameHost locks landscape on focus and restores portrait on blur/exit. Default: portrait.
  landscape?: boolean;
}

export const ACADEMY_GAMES: AcademyGame[] = [
  {
    id: 'quiz',
    title: 'Quick Quiz',
    icon: '🎯',
    blurb: 'One question at a time — build your streak.',
    Component: QuizGame,
  },
  {
    // id kept as 'term-match' so nothing else (lookups, supportedSports) changes; the
    // game is now the tap-to-pair Match Up board, not the old quiz-like term→def picker.
    id: 'term-match',
    title: 'Match Up',
    icon: '🧩',
    blurb: 'Pair the terms to their meanings.',
    Component: MatchGame,
    // Every sportKey that resolves to a curated glossary (lib/glossary index BY_SPORT).
    // All 10 Academy categories qualify today; set explicitly so the field is exercised
    // and a future sport WITHOUT a glossary correctly won't surface this game.
    supportedSports: [
      'mlb', 'nfl', 'rugby', 'mlr', 'nba', 'wnba', 'nhl',
      'soccer', 'epl', 'laliga', 'worldcup', 'tennis', 'golf', 'cricket',
    ],
  },
  {
    id: 'read-the-score',
    title: 'Read the Score',
    icon: '🔢',
    blurb: 'Decode the scoreboard — who leads, and what happens next?',
    Component: ReadTheScoreGame,
    // Every sportKey that resolves to a Read-the-Score content bank (lib/readTheScore
    // KEY_TO_SCORE_SPORT). All 10 Academy categories qualify — pooled soccer/rugby
    // league keys map to their category's bank, mirroring Match Up's allow-list.
    supportedSports: [
      'mlb', 'nfl', 'rugby', 'mlr', 'nba', 'wnba', 'nhl',
      'soccer', 'epl', 'laliga', 'worldcup', 'tennis', 'golf', 'cricket',
    ],
  },
  {
    id: 'crest-rush',
    title: 'Crest Rush',
    icon: '🛡️',
    blurb: 'Beat the clock — match crests to their teams.',
    Component: CrestRushGame,
    // Team-sport categories only (lib/espnTeams KEY_TO_CREST_SPORT): tennis and
    // golf are individual sports with no crests, so they never surface this game.
    supportedSports: [
      'mlb', 'nfl', 'rugby', 'mlr', 'nba', 'wnba', 'nhl',
      'soccer', 'epl', 'laliga', 'worldcup', 'cricket',
    ],
  },
  {
    id: 'kit-clash',
    title: 'Kit Clash',
    icon: '🎨',
    blurb: 'Two colors, zero clues — name the team.',
    Component: KitClashGame,
    // Same live team pool as Crest Rush — same team-sport-only scoping.
    supportedSports: [
      'mlb', 'nfl', 'rugby', 'mlr', 'nba', 'wnba', 'nhl',
      'soccer', 'epl', 'laliga', 'worldcup', 'cricket',
    ],
  },
  {
    id: 'higher-or-lower',
    title: 'Higher or Lower',
    icon: '⚖️',
    blurb: 'Two teams, one table — tap who’s ahead, live from the standings.',
    Component: HigherOrLowerGame,
    // Team-sport categories only (lib/standings KEY_TO_STANDINGS_SPORT): tennis
    // and golf have no league tables, so they never surface this game.
    supportedSports: [
      'mlb', 'nfl', 'rugby', 'mlr', 'nba', 'wnba', 'nhl',
      'soccer', 'epl', 'laliga', 'worldcup', 'cricket',
    ],
  },
  {
    id: 'signal-decoder',
    title: 'Signal Decoder',
    icon: '🚩',
    blurb: 'Read the ref — what does that signal mean?',
    Component: SignalDecoderGame,
    // Sports with a codified officials'-signal vocabulary (lib/signalDecoder
    // KEY_TO_SIGNAL_SPORT). No tennis/golf — no comparable signal language. `wnba`
    // is included because the lib maps it to the (identical) NBA signal bank.
    supportedSports: [
      'mlb', 'nfl', 'nba', 'wnba', 'nhl',
      'soccer', 'epl', 'laliga', 'worldcup',
      'rugby', 'mlr', 'cricket',
    ],
  },
  {
    id: 'zone-tap',
    title: 'Zone Tap',
    icon: '📍',
    blurb: 'Tap the spot — learn where the game happens.',
    Component: ZoneTapGame,
    // Every sportKey that resolves to a Zone Tap bank (lib/zoneTap KEY_TO_ZONE_SPORT).
    // All 10 categories: each has a painted surface in FieldEngine.
    supportedSports: [
      'mlb', 'nfl', 'rugby', 'mlr', 'nba', 'wnba', 'nhl',
      'soccer', 'epl', 'laliga', 'worldcup', 'tennis', 'golf', 'cricket',
    ],
  },
];

// Lookup helper for the GameHost (id → descriptor). Returns undefined for an unknown id.
export function getAcademyGame(id: AcademyGameId): AcademyGame | undefined {
  return ACADEMY_GAMES.find(g => g.id === id);
}

// Games available for a category's sportKeys: a game with NO supportedSports works
// everywhere; otherwise it shows only when its allow-list intersects the category's keys.
export function gamesForSportKeys(sportKeys: Sport[]): AcademyGame[] {
  return ACADEMY_GAMES.filter(
    g => !g.supportedSports || g.supportedSports.some(s => sportKeys.includes(s)),
  );
}
