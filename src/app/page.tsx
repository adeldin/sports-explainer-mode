'use client';

import { useState, useEffect } from 'react';
import { GameViewer } from '@/components/GameViewer';
import { explainerEngine } from '@/lib/explainers';
import { mockFootballPlays, mockFootballGameState } from '@/lib/mockData/football';
import { ExplanationLevel } from '@/lib/types/sports';

export default function Home() {
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>('beginner');
  const [isPlaying, setIsPlaying] = useState(false);

  const currentPlay = mockFootballPlays[currentPlayIndex];
  const explainedPlay = explainerEngine.explainPlay(currentPlay, mockFootballGameState);

  // Auto-advance plays (simulating live game)
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentPlayIndex((prev) => 
        prev < mockFootballPlays.length - 1 ? prev + 1 : 0
      );
    }, 5000); // New play every 5 seconds

    return () => clearInterval(timer);
  }, [isPlaying]);

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

      <GameViewer
        explainedPlay={explainedPlay}
        onLevelChange={setExplanationLevel}
        currentLevel={explanationLevel}
      />

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
          onClick={() => setCurrentPlayIndex(Math.min(mockFootballPlays.length - 1, currentPlayIndex + 1))}
          disabled={currentPlayIndex === mockFootballPlays.length - 1}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </main>
  );
}