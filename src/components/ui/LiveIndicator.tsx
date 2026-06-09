'use client';

import { motion } from 'framer-motion';

export function LiveIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        {/* Pulsing ring */}
        <motion.div
          animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-3 h-3 rounded-full bg-red-500"
        />
        {/* Solid dot */}
        <div className="w-2 h-2 rounded-full bg-red-500 relative z-10" />
      </div>
      <span className="text-xs font-black uppercase tracking-widest text-red-500">
        Live
      </span>
    </div>
  );
}