'use client';

import { motion } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OverlayModeToggleProps {
  isOverlayMode: boolean;
  onToggle: () => void;
  className?: string;
}

export function OverlayModeToggle({
  isOverlayMode,
  onToggle,
  className,
}: OverlayModeToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
        isOverlayMode
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        className
      )}
    >
      {isOverlayMode ? (
        <>
          <Minimize2 className="w-4 h-4" />
          <span>Exit Overlay Mode</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-4 h-4" />
          <span>Overlay Mode</span>
        </>
      )}
    </motion.button>
  );
}