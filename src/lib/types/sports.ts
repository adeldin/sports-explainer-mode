export type Sport = 'football' | 'baseball' | 'rugby';
export type ExplanationLevel = 'kid' | 'beginner' | 'intermediate';

export interface BasePlay {
  id: string;
  timestamp: Date;
  sport: Sport;
  playType: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface GameState {
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  timeRemaining?: string;
  situation?: string;
}

export interface Explanation {
  simple: string;
  whyItMatters?: string;
  ruleDetail?: string;
}

export interface ExplainedPlay {
  play: BasePlay;
  gameState: GameState;
  explanations: {
    kid: Explanation;
    beginner: Explanation;
    intermediate: Explanation;
  };
}

export interface FootballPlay extends BasePlay {
  sport: 'football';
  playType: 'pass' | 'run' | 'punt' | 'field_goal' | 'penalty' | 'touchdown' | 'turnover' | 'kickoff';
  metadata?: {
    down?: number;
    yardsToGo?: number;
    yardsGained?: number;
    possession?: string;
    fieldPosition?: string;
  };
}

export interface BaseballPlay extends BasePlay {
  sport: 'baseball';
  playType: 'hit' | 'strikeout' | 'walk' | 'home_run' | 'double_play' | 'stolen_base' | 'out' | 'error';
  metadata?: {
    inning?: number;
    outs?: number;
    balls?: number;
    strikes?: number;
    baseRunners?: string[];
  };
}

export interface RugbyPlay extends BasePlay {
  sport: 'rugby';
  playType: 'try' | 'conversion' | 'penalty_kick' | 'scrum' | 'lineout' | 'knock_on' | 'forward_pass' | 'tackle';
  metadata?: {
    possession?: string;
    fieldPosition?: string;
    phase?: number;
  };
}