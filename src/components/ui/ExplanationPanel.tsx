'use client';

import { motion } from 'framer-motion';
import { Sparkles, User, GraduationCap } from 'lucide-react';

import { ExplanationLevel } from '@/lib/types/sports';

interface ExplanationPanelProps {
  explanation: {
    simple: string;
    whyItMatters: string;
    rule: string;
  };
  level: ExplanationLevel;
  onLevelChange: (level: ExplanationLevel) => void;
}

const levelConfig = {
  kid: {
    icon: Sparkles,
    label: 'Kid Mode',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500',
  },
  beginner: {
    icon: User,
    label: 'Beginner',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500',
  },
  intermediate: {
    icon: GraduationCap,
    label: 'Intermediate',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
  },
};

export function ExplanationPanel({
  explanation,
  level,
  onLevelChange,
}: ExplanationPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl"
    >
      {/* Level Selector Tabs */}
      <div className="flex p-1 bg-slate-950/50 rounded-2xl border border-slate-800 mb-8 w-fit">
        {(Object.keys(levelConfig) as ExplanationLevel[]).map((l) => {
          const config = levelConfig[l];
          const isActive = level === l;
          return (
            <button
              key={l}
              onClick={() => onLevelChange(l)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <config.icon className="w-4 h-4" />
              <span className="text-sm uppercase tracking-wider">{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Sections */}
      <div className="space-y-8">
        <div>
          <h4 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-3">The Play</h4>
          <p className="text-xl md:text-2xl font-medium text-slate-100 leading-relaxed">
            {explanation.simple}
          </p>
        </div>

        {explanation.whyItMatters && (
          <div>
            <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mb-3">Why it Matters</h4>
            <p className="text-slate-400 leading-relaxed">
              {explanation.whyItMatters}
            </p>
          </div>
        )}

        {explanation.rule && (
          <div className="pt-6 border-t border-slate-800/50">
            <div className="flex items-start gap-4 bg-slate-800/30 p-4 rounded-2xl border border-slate-800/50">
              <div className="mt-1 p-1.5 bg-blue-500/10 rounded-lg">
                <GraduationCap className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Rule Book</h4>
                <p className="text-sm text-slate-400 leading-relaxed italic">
                  {explanation.rule}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}