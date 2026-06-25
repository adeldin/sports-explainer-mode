import React from 'react';
import { Sport } from './api';
import QuizGame from '../components/academy/QuizGame';

// The Academy game registry — the single source of truth for "what games exist."
// The home shell renders the hero + grid by iterating ACADEMY_GAMES; it never names a
// game directly. Adding a future game = push ONE descriptor here + write its component
// (a React.ComponentType<AcademyGameProps>). The shell's hero/grid code does not change.

export type AcademyGameId = 'quiz'; // grows: | 'term-match' | …

// Uniform prop contract every game receives from the GameHost. `sportKeys` is the
// active Academy category's pooled league keys (scopes which sport's content plays).
export interface AcademyGameProps {
  sportKeys: Sport[];
}

export interface AcademyGame {
  id: AcademyGameId;
  title: string;
  icon: string;   // emoji is fine for now
  blurb: string;  // short subtitle for the hero / tile
  Component: React.ComponentType<AcademyGameProps>;
}

export const ACADEMY_GAMES: AcademyGame[] = [
  {
    id: 'quiz',
    title: 'Quick Quiz',
    icon: '🎯',
    blurb: 'One question at a time — build your streak.',
    Component: QuizGame,
  },
];

// Lookup helper for the GameHost (id → descriptor). Returns undefined for an unknown id.
export function getAcademyGame(id: AcademyGameId): AcademyGame | undefined {
  return ACADEMY_GAMES.find(g => g.id === id);
}
