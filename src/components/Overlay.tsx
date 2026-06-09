'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OverlayProps {
  explanation: string;
  playType?: string;
  isVisible: boolean;
  onToggle: () => void;
}

export function Overlay({ explanation, playType, isVisible, onToggle }: OverlayProps) {
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 20, y: 20 };
    const saved = localStorage.getItem('overlay-position');
    return saved ? JSON.parse(saved) : { x: 20, y: 20 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    localStorage.setItem('overlay-position', JSON.stringify(position));
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 pointer-events-none z-50"
    >
      <div
        style={{ left: position.x, top: position.y }}
        className="absolute pointer-events-auto w-80"
      >
        {/* Header / Drag Handle — always visible */}
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between bg-black/80 backdrop-blur-md 
                     text-white px-3 py-2 rounded-t-lg cursor-grab active:cursor-grabbing"
          style={{ borderRadius: isVisible ? '8px 8px 0 0' : '8px' }}
        >
          {!isVisible ? (
            <span className="text-xs text-white/60">🏟️ Live</span>
          ) : (
            <span className="text-xs font-bold tracking-widest uppercase">
              🏟️ Sports Explainer
            </span>
          )}
          <button
            onClick={onToggle}
            className="text-white/60 hover:text-white text-xs ml-2"
          >
            {isVisible ? '−' : '+'}
          </button>
        </div>

        {/* Content — only shown when visible */}
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-black/70 backdrop-blur-md text-white p-4 rounded-b-lg overflow-hidden"
            >
              {playType && (
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                  {playType}
                </span>
              )}
              <AnimatePresence mode="wait">
                <motion.p
                  key={explanation}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm mt-1 leading-relaxed"
                >
                  {explanation}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}