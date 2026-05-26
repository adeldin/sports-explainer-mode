'use client';

import { useState, useEffect } from 'react';
import { Sport } from '@/lib/types/sports';

interface Game {
  id: string;
  name: string;
  status: string;
}

interface GameSelectorProps {
  onGameSelect: (gameId: string) => void;
  currentGameId?: string;
  sport: Sport;
}

export function GameSelector({ onGameSelect, currentGameId, sport }: GameSelectorProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, [sport]);

  async function fetchGames() {
    setLoading(true);
    try {
      const sportPath = sport === 'football' ? 'football/nfl' : 'baseball/mlb';
      const response = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`
      );
      const data = await response.json();
      
      // Debug logging
      console.log(`${sport} API response:`, data);
      
      const gameList = data.events?.map((event: any) => ({
        id: event.id,
        name: event.name,
        status: event.status?.type?.description || 'Scheduled'
      })) || [];
      
      // Debug logging
      console.log(`${sport} games found:`, gameList);
      
      setGames(gameList);
      
      // Auto-select first game if none selected
      if (gameList.length > 0 && !currentGameId) {
        onGameSelect(gameList[0].id);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="text-gray-600">Loading {sport} games...</div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-4 bg-yellow-100 border border-yellow-400 rounded p-4">
        <div className="text-gray-800 font-semibold">⚠️ No Games Available</div>
        <div className="text-gray-600 mt-2">No {sport} games right now</div>
        <div className="text-sm text-gray-500 mt-2">
          {sport === 'football' 
            ? 'NFL games: Thu/Sun/Mon during season (Sep-Feb)'
            : 'MLB games: Daily during season (April-October), usually 1pm-10pm ET'}
        </div>
        <div className="text-xs text-gray-400 mt-2">
          Check the browser console (Cmd+Option+J) for API response details
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Select a Game:
      </label>
      <select
        value={currentGameId || ''}
        onChange={(e) => onGameSelect(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {games.map((game) => (
          <option key={game.id} value={game.id}>
            {game.name} - {game.status}
          </option>
        ))}
      </select>
    </div>
  );
}