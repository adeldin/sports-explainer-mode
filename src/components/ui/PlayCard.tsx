'use client';

import { motion } from 'framer-motion';

interface PlayCardProps {
  description: string;
  playType: string;
  quarter?: string;
  down?: string;
  distance?: string;
}

export function PlayCard({
  description,
  playType,
  quarter,
  down,
  distance,
}: PlayCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl"
    >
      {/* Play Type Badge */}
      <div className="flex items-center gap-3 mb-6">
        <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-400 text-xs font-black uppercase tracking-widest rounded-full">
          {playType}
        </span>

        {/* Situation Tags */}
        <div className="flex gap-2 flex-wrap">
          {quarter && (
            <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full">
              {quarter}
            </span>
          )}
          {down && (
            <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full">
              {down}
            </span>
          )}
          {distance && (
            <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full">
              {distance}
            </span>
          )}
        </div>
      </div>

      {/* Play Description */}
      <p className="text-slate-200 text-lg leading-relaxed font-medium">
        {description}
      </p>
    </motion.div>
  );
}