// src/lib/api/espn.ts
// Connects to ESPN's free API to fetch real game data

import { FootballPlay, GameState } from '../types/sports';

/**
 * Fetches live NFL scoreboard data from ESPN
 */
export async function fetchNFLScoreboard() {
  try {
    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching NFL scoreboard:', error);
    return null;
  }
}
/**
 * BASEBALL API FUNCTIONS
 */

/**
 * Fetches live MLB scoreboard data from ESPN
 */
export async function fetchMLBScoreboard() {
  try {
    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard'
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching MLB scoreboard:', error);
    return null;
  }
}

/**
 * Fetches detailed MLB game data
 */
export async function fetchMLBGameDetails(gameId: string) {
  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${gameId}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching MLB game details:', error);
    return null;
  }
}

/**
 * Transforms ESPN baseball game data into our GameState format
 */
export function transformESPNBaseballGameState(espnGame: any): GameState {
  // Get competitors from header (more reliable for live games)
  const competitors = espnGame.header?.competitions?.[0]?.competitors || [];
  
  // Home team is typically at index 0, away at index 1 in competitors
  const homeTeam = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
  const awayTeam = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
  
  const inning = espnGame.header?.competitions?.[0]?.status?.period || 1;
  const inningState = espnGame.header?.competitions?.[0]?.status?.type?.shortDetail || '';
  
  return {
    sport: 'baseball',
    homeTeam: homeTeam?.team?.displayName || 'Home',
    awayTeam: awayTeam?.team?.displayName || 'Away',
    homeScore: parseInt(homeTeam?.score || '0'),
    awayScore: parseInt(awayTeam?.score || '0'),
    period: inningState.includes('Top') ? `Top ${inning}` : `Bot ${inning}`,
    timeRemaining: undefined,
    situation: espnGame.situation?.shortDownDistanceText || `${espnGame.situation?.outs || 0} outs`
  };
}

/**
 * Transforms ESPN baseball play data into our BaseballPlay format
 */
export function transformESPNBaseballPlay(espnPlay: any, index: number): any {
  const playType = determineBaseballPlayType(espnPlay);
  
  return {
    id: `espn-bb-${espnPlay.id || index}`,
    timestamp: new Date(espnPlay.wallclock || Date.now()),
    sport: 'baseball',
    playType: playType,
    description: espnPlay.text || 'Play in progress', 
    metadata: {
      inning: espnPlay.inning,
      outs: espnPlay.outs,
      balls: espnPlay.balls,
      strikes: espnPlay.strikes,
      baseRunners: espnPlay.runners || []
    }
  };
}

/**
 * Determines baseball play type from ESPN play data
 */
function determineBaseballPlayType(espnPlay: any): string {
  const text = (espnPlay.text || '').toLowerCase();
  const type = (espnPlay.type?.text || '').toLowerCase();
  
  if (text.includes('home run') || text.includes('homers')) {
    return 'home_run';
  }
  
  if (text.includes('strikeout') || text.includes('struck out') || text.includes('strikes out')) {
    return 'strikeout';
  }
  
  if (text.includes('walk') || text.includes('walks')) {
    return 'walk';
  }
  
  if (text.includes('double play')) {
    return 'double_play';
  }
  
  if (text.includes('steals') || text.includes('stolen base')) {
    return 'stolen_base';
  }
  
  if (text.includes('single') || text.includes('double') || text.includes('triple') || text.includes('hit')) {
    return 'hit';
  }
  
  if (text.includes('out') || text.includes('grounds out') || text.includes('flies out')) {
    return 'out';
  }
  
  return 'hit';
}

/**
 * Gets the current live MLB games
 */
export async function getLiveMLBGames() {
  const scoreboard = await fetchMLBScoreboard();
  
  if (!scoreboard || !scoreboard.events) {
    return [];
  }
  
  return scoreboard.events.filter((event: any) => {
    const status = event.status?.type?.state;
    return status === 'in' || status === 'pre';
  });
}
/**
 * Fetches detailed game data including play-by-play
 */
export async function fetchGameDetails(gameId: string) {
  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching game details:', error);
    return null;
  }
}

/**
 * Transforms ESPN game data into our GameState format
 */
export function transformESPNGameState(espnGame: any): GameState {
  const homeTeam = espnGame.boxscore?.teams?.[1] || espnGame.competitions?.[0]?.competitors?.[0];
  const awayTeam = espnGame.boxscore?.teams?.[0] || espnGame.competitions?.[0]?.competitors?.[1];
  
  return {
    sport: 'football',
    homeTeam: homeTeam?.team?.displayName || homeTeam?.team?.shortDisplayName || 'Home',
    awayTeam: awayTeam?.team?.displayName || awayTeam?.team?.shortDisplayName || 'Away',
    homeScore: parseInt(homeTeam?.score || '0'),
    awayScore: parseInt(awayTeam?.score || '0'),
    period: espnGame.header?.competitions?.[0]?.status?.period 
      ? `Q${espnGame.header.competitions[0].status.period}` 
      : 'Q1',
    timeRemaining: espnGame.header?.competitions?.[0]?.status?.displayClock || '15:00',
    situation: espnGame.situation?.shortDownDistanceText || espnGame.situation?.downDistanceText || '1st & 10'
  };
}

/**
 * Transforms ESPN play data into our FootballPlay format
 */
export function transformESPNPlay(espnPlay: any, index: number): FootballPlay {
  const playType = determinePlayType(espnPlay);
  
  return {
    id: `espn-${espnPlay.id || index}`,
    timestamp: new Date(espnPlay.wallclock || Date.now()),
    sport: 'football',
    playType: playType,
    description: espnPlay.text || 'Play in progress',
    metadata: {
      down: espnPlay.start?.down,
      yardsToGo: espnPlay.start?.distance,
      yardsGained: espnPlay.statYardage || 0,
      possession: espnPlay.start?.team?.displayName,
      fieldPosition: `${espnPlay.start?.yardLine || 50}`
    }
  };
}

/**
 * Determines play type from ESPN play data
 */
function determinePlayType(espnPlay: any): FootballPlay['playType'] {
  const text = (espnPlay.text || '').toLowerCase();
  const type = (espnPlay.type?.text || '').toLowerCase();
  
  // Check for touchdown
  if (text.includes('touchdown') || type.includes('touchdown')) {
    return 'touchdown';
  }
  
  // Check for field goal
  if (text.includes('field goal') || type.includes('field goal')) {
    return 'field_goal';
  }
  
  // Check for penalty
  if (text.includes('penalty') || type.includes('penalty')) {
    return 'penalty';
  }
  
  // Check for turnover
  if (text.includes('interception') || text.includes('fumble') || type.includes('interception')) {
    return 'turnover';
  }
  
  // Check for punt
  if (text.includes('punt') || type.includes('punt')) {
    return 'punt';
  }
  
  // Check for pass
  if (text.includes('pass') || text.includes('complete') || text.includes('incomplete')) {
    return 'pass';
  }
  
  // Check for run
  if (text.includes('rush') || text.includes('run') || text.includes('up the middle') || text.includes('left end') || text.includes('right end')) {
    return 'run';
  }
  
  // Default to run
  return 'run';
}

/**
 * Gets the current live games
 */
export async function getLiveGames() {
  const scoreboard = await fetchNFLScoreboard();
  
  if (!scoreboard || !scoreboard.events) {
    return [];
  }
  
  // Filter for games that are currently in progress
  return scoreboard.events.filter((event: any) => {
    const status = event.status?.type?.state;
    return status === 'in' || status === 'pre'; // 'in' = live, 'pre' = upcoming
  });
}