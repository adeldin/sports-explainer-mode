import { Sport } from './api';

// Academy-only learning categories — decoupled from the Live tab's sport list
// (SPORTS / My Sports settings). Several leagues collapse into one category
// (e.g. all soccer competitions → "Soccer"), and the quiz/facts cards combine
// questions across a category's sportKeys. Labels are plain English for now
// (translation comes later). NOTE: keys/QUIZ/FACTS keys are unchanged — this is
// purely an Academy presentation layer.
export type AcademyCategory = {
  key: string;
  label: string;
  emoji: string;
  sportKeys: Sport[];
};

export const ACADEMY_CATEGORIES: AcademyCategory[] = [
  { key: 'mlb', label: 'MLB', emoji: '⚾', sportKeys: ['mlb'] },
  { key: 'nfl', label: 'NFL', emoji: '🏈', sportKeys: ['nfl'] },
  { key: 'nba', label: 'NBA', emoji: '🏀', sportKeys: ['nba'] },
  { key: 'wnba', label: 'WNBA', emoji: '🏀', sportKeys: ['wnba'] },
  { key: 'soccer', label: 'Soccer', emoji: '⚽', sportKeys: ['soccer', 'epl', 'laliga', 'worldcup'] },
  { key: 'rugby', label: 'Rugby', emoji: '🏉', sportKeys: ['rugby', 'mlr'] },
  { key: 'tennis', label: 'Tennis', emoji: '🎾', sportKeys: ['tennis'] },
  { key: 'golf', label: 'Golf', emoji: '⛳', sportKeys: ['golf'] },
  { key: 'cricket', label: 'Cricket', emoji: '🏏', sportKeys: ['cricket'] },
];
