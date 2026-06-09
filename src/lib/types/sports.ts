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
  homeTeam: string;      // ← plain string
  awayTeam: string;      // ← plain string
  homeScore: number;
  awayScore: number;
  period: string;
  timeRemaining?: string;
  situation?: string;
  quarter?: number;
  possession?: string | null;
  inning?: number;
  inningHalf?: 'top' | 'bottom';
}

// Single explanation structure (what AI returns for each level)
export interface Explanation {
  simple: string;
  whyItMatters: string;
  ruleDetail: string;
}

// Explained play with all three levels
export interface ExplainedPlay {
  play: BasePlay;
  gameState: GameState;
  explanations: {
    kid: Explanation;
    beginner: Explanation;
    intermediate: Explanation;
  };
  context?: string;
}

export interface FootballPlay extends BasePlay {
  sport: 'football';
  playType: 'pass' | 'run' | 'punt' | 'field_goal' | 'kickoff' | 'touchdown' | 'penalty' | 'timeout' | 'turnover';
  metadata?: {
     down?: number;
    distance?: number;
    yardsToGo?: number;
    yardLine?: number;
    yardsGained?: number;
    quarter?: number;
    possession?: string;      // ← added
    fieldPosition?: string;   // ← added
  };
}

export interface BaseballPlay extends BasePlay {
  sport: 'baseball';
  playType: 'hit' | 'strikeout' | 'walk' | 'home_run' | 'double_play' |
            'stolen_base' | 'out' | 'error' | 'single' | 'double' |
            'triple' | 'pitch' | 'sacrifice_fly' | 'sacrifice_bunt'; // ← add these two
  metadata?: {
    inning?: number;
    outs?: number;
    balls?: number;
    strikes?: number;
    baseRunners?: any[];
    batter?: string;        // ← add this
    pitcher?: string;       // ← add this while we're here
  };
}