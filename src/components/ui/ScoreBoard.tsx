'use client';

import { motion } from 'framer-motion';
import { LiveIndicator } from './LiveIndicator';

interface ScoreBoardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period?: string;
  timeRemaining?: string;
  isLive?: boolean;
}

// Helper to extract team name whether it's a string or object
function getTeamName(team: string | { name: string; score: number; abbreviation?: string }): string {
  return typeof team === 'string' ? team : team.name;
}

export function ScoreBoard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  period,
  timeRemaining,
  isLive = false,
}: ScoreBoardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-6 shadow-2xl"
    >
      {/* Live indicator */}
      {isLive && (
        <div className="flex justify-center mb-4">
          <LiveIndicator />
        </div>
      )}

      {/* Teams and scores */}
      <div className="space-y-3">
        {/* Away team */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground">
            {getTeamName(awayTeam)}
          </span>
          <motion.span
            key={`away-${awayScore}`}
            initial={{ scale: 1.5, color: 'hsl(var(--live))' }}
            animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-bold tabular-nums"
          >
            {awayScore}
          </motion.span>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Home team */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-foreground">
            {getTeamName(homeTeam)}
          </span>
          <motion.span
            key={`home-${homeScore}`}
            initial={{ scale: 1.5, color: 'hsl(var(--live))' }}
            animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
            transition={{ duration: 0.3 }}
            className="text-3xl font-bold tabular-nums"
          >
            {homeScore}
          </motion.span>
        </div>
      </div>

      {/* Game info */}
      {(period || timeRemaining) && (
        <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm text-muted-foreground">
          {period && <span>{period}</span>}
          {timeRemaining && <span className="font-mono">{timeRemaining}</span>}
        </div>
      )}
    </motion.div>
  );
}