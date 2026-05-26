'use client';

import { useState, useEffect } from 'react';
import { GameViewer } from '@/components/GameViewer';
import { GameSelector } from '@/components/GameSelector';
import { explainerEngine } from '@/lib/explainers';
import { mockFootballPlays, mockFootballGameState } from '@/lib/mockData/football';
import { ExplanationLevel } from '@/lib/types/sports';
import { fetchGameDetails, transformESPNGameState, transformESPNPlay } from '@/lib/api/espn';
import { FootballPlay } from '@/lib/types/sports';

export default function Home() {
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>('beginner');
  const [isPlaying, setIsPlaying] = useState(false);
  const [useLiveData, setUseLiveData] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [liveGameState, setLiveGameState] = useState(mockFootballGameState);
  const [livePlays, setLivePlays] = useState<FootballPlay[]>(mockFootballPlays);
  const [loading, setLoading] = useState(false);

  // Fetch live game data when game is selected
  useEffect(() => {
    if (useLiveData && selectedGameId) {
      fetchLiveGameData();
    }
  }, [selectedGameId, useLiveData]);

  async function fetchLiveGameData() {
    setLoading(true);
    try {
      const gameData = await fetchGameDetails(selectedGameId);
      
      if (gameData) {
        // Transform game state
        const gameState = transformESPNGameState(gameData);
        setLiveGameState(gameState);
        
        // Transform plays
        const plays = gameData.drives?.previous?.map((drive: any, index: number) => {
          const lastPlay = drive.plays?.[drive.plays.length - 1];
          return lastPlay ? transformESPNPlay(lastPlay, index) : null;
        }).filter(Boolean) || [];
        
        if (plays.length > 0) {
          setLivePlays(plays);
          setCurrentPlayIndex(0);
        }
      }
    } catch (error) {
      console.error('Error fetching live game:', error);
    } finally {
      setLoading(false);
    }
  }

  // Choose between live and mock data
  const currentPlays = useLiveData ? livePlays : mockFootballPlays;
  const currentGameState = useLiveData ? liveGameState : mockFootballGameState;
  const currentPlay = currentPlays[currentPlayIndex];
  const explainedPlay = explainerEngine.explainPlay(currentPlay, currentGameState);

  // Auto-advance plays (simulating live game)
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentPlayIndex((prev) => 
        prev < currentPlays.length - 1 ? prev + 1 : 0
      );
    }, 5000); // New play every 5 seconds

    return () => clearInterval(timer);
  }, [isPlaying, currentPlays.length]);

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto mb-6 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Sports Explainer Mode
        </h1>
        <p className="text-gray-600">
          Live sports, explained for everyone
        </p>
      </div>

      {/* Live Data Toggle */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-center">
        <button
          onClick={() => setUseLiveData(!useLiveData)}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            useLiveData
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
        >
          {useLiveData ? '🔴 LIVE DATA' : '📝 Mock Data'} - Click to Switch
        </button>
      </div>

      {/* Game Selector (only show when using live data) */}
      {useLiveData && (
        <div className="max-w-4xl mx-auto mb-6">
          <GameSelector
            onGameSelect={setSelectedGameId}
            currentGameId={selectedGameId}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="max-w-4xl mx-auto text-center py-8">
          <div className="text-xl text-gray-600">Loading game data...</div>
        </div>
      )}

      {/* Game Viewer */}
      {!loading && currentPlay && (
        <GameViewer
          explainedPlay={explainedPlay}
          onLevelChange={setExplanationLevel}
          currentLevel={explanationLevel}
        />
      )}

      {/* Playback Controls */}
      <div className="max-w-4xl mx-auto mt-6 flex gap-4 justify-center">
        <button
          onClick={() => setCurrentPlayIndex(Math.max(0, currentPlayIndex - 1))}
          disabled={currentPlayIndex === 0}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          ← Previous
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-6 py-2 bg-green-600 text-white rounded font-semibold"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => setCurrentPlayIndex(Math.min(currentPlays.length - 1, currentPlayIndex + 1))}
          disabled={currentPlayIndex === currentPlays.length - 1}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Next →
        </button>
      </div>

      {/* Play Counter */}
      <div className="max-w-4xl mx-auto mt-4 text-center text-sm text-gray-600">
        Play {currentPlayIndex + 1} of {currentPlays.length}
      </div>
    </main>
  );
}