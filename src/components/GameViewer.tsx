'use client';

import { useState } from 'react';
import { ExplainedPlay, ExplanationLevel } from '@/lib/types/sports';
import { motion, AnimatePresence } from 'framer-motion';

interface GameViewerProps {
  explainedPlay: ExplainedPlay;
  onLevelChange: (level: ExplanationLevel) => void;
  currentLevel: ExplanationLevel;
}

export function GameViewer({ explainedPlay, onLevelChange, currentLevel }: GameViewerProps) {
  const [showRuleDetail, setShowRuleDetail] = useState(false);
  const { gameState, explanations } = explainedPlay;
  const currentExplanation = explanations[currentLevel];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Game State Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <div className="text-2xl font-bold">{gameState.awayTeam}</div>
            <div className="text-4xl font-black mt-2">{gameState.awayScore}</div>
          </div>
          <div className="text-center px-6">
            <div className="text-sm opacity-80">{gameState.period}</div>
            {gameState.timeRemaining && (
              <div className="text-lg font-semibold">{gameState.timeRemaining}</div>
            )}
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl font-bold">{gameState.homeTeam}</div>
            <div className="text-4xl font-black mt-2">{gameState.homeScore}</div>
          </div>
        </div>
        {gameState.situation && (
          <div className="text-center mt-4 text-sm opacity-90">{gameState.situation}</div>
        )}
      </div>

      {/* Explanation Level Selector */}
      <div className="flex gap-2 justify-center">
        {(['kid', 'beginner', 'intermediate'] as ExplanationLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => onLevelChange(level)}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              currentLevel === level
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>

      {/* Play Explanation - Caption Style */}
      <AnimatePresence mode="wait">
        <motion.div
          key={explainedPlay.play.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-black bg-opacity-80 text-white p-6 rounded-lg"
        >
          <div className="text-2xl font-semibold mb-3">
            {currentExplanation.simple}
          </div>
          
          {currentExplanation.whyItMatters && (
            <div className="text-lg opacity-90 mb-4">
              💡 {currentExplanation.whyItMatters}
            </div>
          )}

          {currentExplanation.ruleDetail && (
            <button
              onClick={() => setShowRuleDetail(!showRuleDetail)}
              className="text-blue-300 hover:text-blue-100 underline text-sm"
            >
              {showRuleDetail ? '▼ Hide rule details' : '▶ Learn the rule'}
            </button>
          )}

          {showRuleDetail && currentExplanation.ruleDetail && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 p-4 bg-white rounded text-sm text-black"
            >
              {currentExplanation.ruleDetail}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Raw Play Data (for debugging) */}
      <div className="text-xs text-gray-500 text-center">
        {explainedPlay.play.description}
      </div>
    </div>
  );
}