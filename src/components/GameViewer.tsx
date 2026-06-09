'use client';

import { ExplainedPlay, ExplanationLevel } from '@/lib/types/sports';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BaseballDiamond from './BaseballDiamond';

interface GameViewerProps {
  explainedPlay: ExplainedPlay;
  onLevelChange: (level: ExplanationLevel) => void;
  currentLevel: ExplanationLevel;
}

export function GameViewer({ explainedPlay, onLevelChange, currentLevel }: GameViewerProps) {
  const [showRuleDetail, setShowRuleDetail] = useState(false);
  const { gameState, explanations, play } = explainedPlay;
  const currentExplanation = explanations[currentLevel];

  // Check if this is a big play
  const isBigPlay = 
    play.playType === 'touchdown' || 
    play.playType === 'home_run' ||
    play.playType === 'field_goal';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Scoreboard */}
      <motion.div 
        className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-xl p-6 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center">
          {/* Away Team */}
          <div className="text-center flex-1">
            <div className="flex flex-col items-center">
              <motion.div 
                className="w-16 h-16 bg-white rounded-full mb-2 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <span className="text-2xl font-bold text-blue-600">
                  {gameState.awayTeam.charAt(0)}
                </span>
              </motion.div>
              <h2 className="text-xl font-bold">{gameState.awayTeam}</h2>
              <motion.div 
                className="text-5xl font-bold mt-2"
                animate={isBigPlay ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {gameState.awayScore}
              </motion.div>
            </div>
          </div>

          {/* Game Info */}
          <div className="text-center px-8">
            <div className="text-sm opacity-90">{gameState.period}</div>
            {gameState.timeRemaining && (
              <div className="text-2xl font-bold">{gameState.timeRemaining}</div>
            )}
            {gameState.situation && (
              <div className="text-sm mt-2 opacity-90">{gameState.situation}</div>
            )}
          </div>

          {/* Home Team */}
          <div className="text-center flex-1">
            <div className="flex flex-col items-center">
              <motion.div 
                className="w-16 h-16 bg-white rounded-full mb-2 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <span className="text-2xl font-bold text-blue-600">
                  {gameState.homeTeam.charAt(0)}
                </span>
              </motion.div>
              <h2 className="text-xl font-bold">{gameState.homeTeam}</h2>
              <motion.div 
                className="text-5xl font-bold mt-2"
                animate={isBigPlay ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {gameState.homeScore}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Baseball Diamond - Only show for baseball */}
        {gameState.sport === 'baseball' && (
          <BaseballDiamond 
            runners={play.metadata?.baseRunners || []}
            outs={play.metadata?.outs || 0}
          />
        )}

        {/* Big Play Banner */}
        {isBigPlay && (
          <motion.div
            className="mt-4 text-center text-3xl font-bold"
            initial={{ opacity: 0, y: -100 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            🎉 BIG PLAY! 🎉
          </motion.div>
        )}
      </motion.div>

      {/* Game Context - Only show if context exists */}
      {explainedPlay.context && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
            {explainedPlay.context}
          </p>
        </div>
      )}

      {/* Explanation Level Selector */}
      <div className="flex justify-center gap-4 mb-6">
        {(['kid', 'beginner', 'intermediate'] as ExplanationLevel[]).map((level) => (
          <motion.button
            key={level}
            onClick={() => onLevelChange(level)}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              currentLevel === level
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </motion.button>
        ))}
      </div>

      {/* Explanation Card */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        key={play.id}
      >
        {/* Player Names - Only show for baseball */}
        {play.metadata?.batter && gameState.sport === 'baseball' && (
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Batter:</span> {play.metadata.batter}
              {play.metadata?.pitcher && (
                <span className="ml-4">
                  <span className="font-semibold">Pitcher:</span> {play.metadata.pitcher}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Main Explanation */}
        <motion.div 
          className="text-2xl font-bold mb-4 dark:text-white"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {currentExplanation.simple}
        </motion.div>

        {/* Why It Matters */}
        {currentExplanation.whyItMatters && (
          <motion.div 
            className="flex items-start gap-2 mb-4"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-xl">💡</span>
            <span className="text-lg dark:text-gray-300">{currentExplanation.whyItMatters}</span>
          </motion.div>
        )}

        {/* Rule Details Toggle */}
        {currentExplanation.ruleDetail && (
          <div>
            <motion.button
              onClick={() => setShowRuleDetail(!showRuleDetail)}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
              whileHover={{ x: 5 }}
            >
              <span>{showRuleDetail ? '▼' : '▶'}</span>
              {showRuleDetail ? 'Hide' : 'Show'} rule details
            </motion.button>

            <AnimatePresence>
              {showRuleDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden"
                >
                  <p className="text-gray-700 dark:text-gray-300">{currentExplanation.ruleDetail}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}