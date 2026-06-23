// "Why you'd like it" hooks — one warm, honest line per sport, shown only on the
// DISCOVERY (different-sport) Watch Next card. Authored content, not generated.
// Content, not logic — easy to edit. Keyed by league key (rugby/MLR share the wedge line).

import { Sport } from './api';

export const WHY_YOUD_LIKE_IT: Partial<Record<Sport, string>> = {
  mlb: "A slow-burn chess match punctuated by sudden explosions — the tension between pitches is the whole point.",
  nhl: "Loose pucks, line changes, and sudden breakaways — a goal can arrive before you've caught your breath.",
  nba: "End-to-end scoring where a 30-second run can flip the whole game.",
  wnba: "Crisp passing, deep range, and rising stars — fundamentals-first basketball with the league's profile climbing fast.",
  nfl: "Eleven coordinated players per snap, each play a designed plan colliding with another — choreographed chaos.",
  soccer: "The world's game — 90 minutes of building tension where a single goal can mean everything.",
  worldcup: "Nations on the line — the biggest stage in all of sport.",
  epl: "The world's most-watched league — relentless pace and title drama week to week.",
  laliga: "Technical, possession-rich soccer — the home of the game's great artists.",
  rugby: "Constant motion, no commercial breaks, and every player runs, tackles, and passes — it's the most relentless 80 minutes in sport.",
  mlr: "Constant motion, no commercial breaks, and every player runs, tackles, and passes — it's the most relentless 80 minutes in sport.",
};
