'use client';

import { useState, useEffect } from 'react';

interface Game {
  id: string;
  name: string;
  status: string;
}

interface GameSelectorProps {
  onGameSelect: (gameId: string) => void;
  currentGameId?: string;
}

export function GameSelector({ onGameSelect, currentGameId }: GameSelectorProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  async function fetchGames() {
    try {
      const response = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
      );
      const data = await response.json();
      
      const gameList = data.events?.map((event: any) => ({
        id: event.id,
        name: event.name,
        status: event.status?.type?.description || 'Scheduled'
      })) || [];
      
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
        <div className="text-gray-600">Loading games...</div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="text-gray-600">No games available right now</div>
        <div className="text-sm text-gray-500 mt-2">
          Check back during NFL game days!
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