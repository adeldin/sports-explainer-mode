'use client';

import { ExplainedPlay, ExplanationLevel } from '@/lib/types/sports';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameViewerProps {
  explainedPlay: ExplainedPlay;
  onLevelChange: (level: ExplanationLevel) => void;
  currentLevel: ExplanationLevel;
}

export function GameViewer({ explainedPlay, onLevelChange, currentLevel }: GameViewerProps) {
  const [showRuleDetail, setShowRuleDetail] = useState(false);
  const { gameState, explanations, play } = explainedPlay;
  const currentExplanation = explanations[currentLevel];

  // Check if this is a big play (touchdown, home run, etc.)
  const isBigPlay = 
    play.playType === 'touchdown' || 
    play.playType === 'home_run' ||
    play.playType === 'field_goal';

  // Get team logo URLs from ESPN
  const getTeamLogoUrl = (teamName: string) => {
    // ESPN's logo API - we'll use a placeholder for now
    // In production, you'd map team names to ESPN team IDs
    return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png&h=100&w=100`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Scoreboard with Team Logos */}
      <motion.div 
        className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-xl p-6 mb-6 text-white relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Big Play Celebration Animation */}
        {isBigPlay && (
          <motion.div
            className="absolute inset-0 bg-yellow-400 opacity-20"
            initial={{ scale: 0 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        )}

        <div className="grid grid-cols-3 gap-4 items-center relative z-10">
          {/* Away Team */}
          <div className="text-center">
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
          <div className="text-center">
            <div className="text-sm opacity-90">{gameState.period}</div>
            {gameState.timeRemaining && (
              <div className="text-2xl font-bold">{gameState.timeRemaining}</div>
            )}
            {gameState.situation && (
              <div className="text-sm mt-2 opacity-90">{gameState.situation}</div>
            )}
          </div>

          {/* Home Team */}
          <div className="text-center">
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

        {/* Big Play Banner */}
        {isBigPlay && (
          <motion.div
            className="absolute top-0 left-0 right-0 bg-yellow-400 text-gray-900 text-center py-2 font-bold text-lg"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            🎉 BIG PLAY! 🎉
          </motion.div>
        )}
      </motion.div>

      {/* Difficulty Level Selector */}
      <div className="flex justify-center gap-4 mb-6">
        {(['kid', 'beginner', 'intermediate'] as ExplanationLevel[]).map((level) => (
          <motion.button
            key={level}
            onClick={() => onLevelChange(level)}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              currentLevel === level
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
        className="bg-black text-white rounded-lg shadow-xl p-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        key={play.id} // Re-animate when play changes
      >
        {/* Main Explanation */}
        <motion.div 
          className="text-2xl font-bold mb-4"
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
            <span className="text-lg">{currentExplanation.whyItMatters}</span>
          </motion.div>
        )}

        {/* Rule Details Toggle */}
        {currentExplanation.ruleDetail && (
          <div>
            <motion.button
              onClick={() => setShowRuleDetail(!showRuleDetail)}
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
              whileHover={{ x: 5 }}
            >
              <span>{showRuleDetail ? '▼' : '▶'}</span>
              {showRuleDetail ? 'Hide' : 'Show'} rule details
            </motion.button>

            <AnimatePresence>
              {showRuleDetail && currentExplanation.ruleDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 p-4 bg-white text-black bg-opacity-10 rounded text-sm overflow-hidden"
                >
                  {currentExplanation.ruleDetail}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Raw Play Data */}
      <div className="text-xs text-gray-500 text-center mt-4">
        {explainedPlay.play.description}
      </div>
    </div>
  );
}