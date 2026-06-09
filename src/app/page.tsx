'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';
import { Overlay } from '@/components/Overlay';
// Import your new modern UI components
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { PlayCard } from '@/components/ui/PlayCard';
import { ExplanationPanel } from '@/components/ui/ExplanationPanel';
import { OverlayModeToggle } from '@/components/ui/OverlayModeToggle';

// Import your existing components and logic
import { explainerEngine } from '@/lib/explainer/index';
import { BasePlay, GameState, ExplainedPlay, ExplanationLevel } from '@/lib/types/sports';
import { mockFootballPlays, mockFootballGameState } from '@/lib/mockData/football';
import { mockBaseballPlays, mockBaseballGameState } from '@/lib/mockData/baseball';
import { GameSelector } from '@/components/GameSelector';
import { fetchNFLGameDetails, fetchMLBGameDetails } from '../lib/api/espn';

export default function Home() {
  // --- STATE ---
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [explanationLevel, setExplanationLevel] = useState<ExplanationLevel>('beginner');
  const [selectedSport, setSelectedSport] = useState<'football' | 'baseball'>('football');
  const [useLiveData, setUseLiveData] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [livePlays, setLivePlays] = useState<BasePlay[]>([]);
  const [liveGameState, setLiveGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [explainedPlay, setExplainedPlay] = useState<ExplainedPlay | null>(null);
  const [isOverlayMode, setIsOverlayMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
const [currentExplanation, setCurrentExplanation] = useState<string>('');

  // --- DATA LOGIC ---
  const currentData = useLiveData && (livePlays ?? []).length > 0
    ? { 
        plays: livePlays ?? [], 
        gameState: liveGameState ?? (selectedSport === 'football' ? mockFootballGameState : mockBaseballGameState) 
      }
    : selectedSport === 'football'
      ? { plays: mockFootballPlays, gameState: mockFootballGameState }
      : { plays: mockBaseballPlays, gameState: mockBaseballGameState };

  const currentPlay = currentData.plays[currentPlayIndex];

  // --- AUTO-REFRESH FUNCTION ---
  const refreshLiveData = useCallback(async (showLoading = false) => {
    if (!useLiveData || !selectedGameId) return;
    
    if (showLoading) setIsRefreshing(true);
    
    try {
      let gameDetails;
      if (selectedSport === 'football') {
        gameDetails = await fetchNFLGameDetails(selectedGameId);
      } else {
        gameDetails = await fetchMLBGameDetails(selectedGameId);
      }

      if (gameDetails) {
        setLiveGameState(gameDetails.gameState);
        
        // Check if we have new plays
        if (gameDetails.plays.length > livePlays.length) {
          setLivePlays(gameDetails.plays);
          // Auto-advance to the newest play if the user is at the "end" of the list
          if (currentPlayIndex === livePlays.length - 1 || livePlays.length === 0) {
            setCurrentPlayIndex(gameDetails.plays.length - 1);
          }
        }
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Auto-refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedGameId, selectedSport, useLiveData, livePlays.length, currentPlayIndex]);

  // --- POLLING INTERVAL ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (useLiveData && selectedGameId) {
      // Set up the interval to run every 30 seconds
      interval = setInterval(() => {
        refreshLiveData();
      }, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refreshLiveData, useLiveData, selectedGameId]);

  // --- EXPLANATION EFFECT ---
  useEffect(() => {
    async function loadExplanation() {
      if (!currentPlay) return;
      setLoading(true);
      try {
        const explained = await explainerEngine.explainPlay(
          currentPlay, 
          currentData.gameState, 
        );
        setExplainedPlay(explained);
      } catch (error) {
        console.error('Error explaining play:', error);
        setExplainedPlay(null);
      } finally {
        setLoading(false);
      }
    }
    loadExplanation();
  }, [currentPlay, explanationLevel, selectedSport, currentData.gameState]);

  // --- HANDLERS ---
  const handleNext = () => {
    setCurrentPlayIndex((prev) => prev < currentData.plays.length - 1 ? prev + 1 : prev);
  };

  const handlePrevious = () => {
    setCurrentPlayIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleLevelChange = (level: ExplanationLevel) => {
    setExplanationLevel(level);
  };

  const handleSportChange = (sport: 'football' | 'baseball') => {
    setSelectedSport(sport);
    setCurrentPlayIndex(0);
    setUseLiveData(false);
    setLivePlays([]);
    setLiveGameState(null);
    setSelectedGameId('');
    setLastUpdated(null);
  };

  const handleGameSelect = async (gameId: string) => {
    setLoading(true);
    setSelectedGameId(gameId);
    try {
      let gameDetails;
      if (selectedSport === 'football') {
        gameDetails = await fetchNFLGameDetails(gameId);
      } else {
        gameDetails = await fetchMLBGameDetails(gameId);
      }
      
  if (!gameDetails) {
      console.error('No game details returned for gameId:', gameId);
      return;
    }

    const plays = gameDetails.plays ?? [];
    const gameState = gameDetails.gameState ?? (selectedSport === 'football' ? mockFootballGameState : mockBaseballGameState);

    setLivePlays(plays);
    setLiveGameState(gameState);
    setCurrentPlayIndex(plays.length > 0 ? plays.length - 1 : 0);
    setLastUpdated(new Date());

  } catch (error) {
    console.error('Error fetching game details:', error);
  } finally {
    setLoading(false);
  }
  };

  return (
    <main className={`min-h-screen transition-all duration-500 ${
      isOverlayMode 
        ? 'bg-black/90 backdrop-blur-md' 
        : 'bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white'
    }`}>
      <div className={`container mx-auto px-4 py-8 ${isOverlayMode ? 'max-w-2xl' : 'max-w-7xl'}`}>
        
        {/* Header Section */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 ${isOverlayMode ? 'hidden' : 'flex'}`}
        >
          <div>
            <h1 className="text-5xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              SPORTS EXPLAINER <span className="text-white not-italic">2026</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-slate-400 font-medium">The game, decoded in real-time.</p>
              {lastUpdated && useLiveData && (
                <span className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => handleSportChange('baseball')}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${selectedSport === 'baseball' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                ⚾ MLB
              </button>
              <button
                onClick={() => handleSportChange('football')}
                className={`px-6 py-2 rounded-lg font-bold transition-all ${selectedSport === 'football' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                🏈 NFL
              </button>
            </div>
            
            <button
              onClick={() => setUseLiveData(!useLiveData)}
              className={`px-6 py-2 rounded-xl font-bold border-2 transition-all ${useLiveData ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-slate-700 text-slate-400'}`}
            >
              {useLiveData ? '● LIVE' : 'MOCK DATA'}
            </button>

            <OverlayModeToggle isOverlayMode={isOverlayMode} onToggle={() => setIsOverlayMode(!isOverlayMode)} />
          </div>
        </motion.header>

        {/* Overlay Mode Exit Button */}
        {isOverlayMode && (
          <div className="fixed top-6 right-6 z-50">
            <OverlayModeToggle isOverlayMode={isOverlayMode} onToggle={() => setIsOverlayMode(!isOverlayMode)} />
          </div>
        )}

        {/* Main Grid */}
        <div className={`grid gap-8 ${isOverlayMode ? 'grid-cols-1' : 'lg:grid-cols-12'}`}>
          
          {/* Sidebar: Selector & Score */}
          <div className={`${isOverlayMode ? 'hidden' : 'lg:col-span-4'} space-y-6`}>
            {useLiveData && (
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Select Active Game</h3>
                <GameSelector sport={selectedSport} onGameSelect={handleGameSelect} currentGameId={selectedGameId} />
              </div>
            )}

            <ScoreBoard 
              homeTeam={currentData.gameState.homeTeam}
              awayTeam={currentData.gameState.awayTeam}
              homeScore={currentData.gameState.homeScore}
              awayScore={currentData.gameState.awayScore}
              period={currentData.gameState.period}
              timeRemaining={currentData.gameState.timeRemaining}
              isLive={useLiveData}
            />
          </div>

          {/* Main Content: Play & Explanation */}
          <div className={`${isOverlayMode ? 'col-span-1' : 'lg:col-span-8'} space-y-6`}>
            {loading && !explainedPlay ? (
              <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                <p className="text-slate-400 font-medium">Analyzing play data...</p>
              </div>
            ) : explainedPlay ? (
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentPlayIndex}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="space-y-6"
                >
                  <PlayCard 
                    description={currentPlay.description}
                    playType={currentPlay.playType}
                    quarter={
                      (currentPlay.metadata as any)?.quarter?.toString() || 
                      (currentPlay.metadata as any)?.inning?.toString()
                    }
                    down={(currentPlay.metadata as any)?.down?.toString()}
                    distance={
                      (currentPlay.metadata as any)?.yardsToGo?.toString() || 
                      (currentPlay.metadata as any)?.distance?.toString()
                    }
                  />

                  <ExplanationPanel 
                    explanation={{
                      simple: explainedPlay.explanations[explanationLevel].simple,
                      whyItMatters: explainedPlay.explanations[explanationLevel].whyItMatters || '',
                      rule: explainedPlay.explanations[explanationLevel].ruleDetail
                    }}
                    level={explanationLevel}
                    onLevelChange={handleLevelChange}
                  />
<Overlay
  explanation={explainedPlay?.explanations[explanationLevel]?.simple ?? 'Waiting for play...'}
  playType={explainedPlay?.play?.playType}
  isVisible={overlayVisible}
  onToggle={() => setOverlayVisible(!overlayVisible)}
/>


                  {/* Navigation */}
                  <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
                    <button
                      onClick={handlePrevious}
                      disabled={currentPlayIndex === 0}
                      className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold disabled:opacity-30 hover:bg-slate-700 transition-all"
                    >
                      ← PREV
                    </button>
                    <div className="text-center">
                      <span className="block text-xs font-bold text-slate-500 uppercase tracking-tighter">Sequence</span>
                      <span className="text-lg font-black tabular-nums">{currentPlayIndex + 1} / {currentData.plays.length}</span>
                    </div>
                    <button
                      onClick={handleNext}
                      disabled={currentPlayIndex === currentData.plays.length - 1}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-30 hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all"
                    >
                      NEXT →
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="text-center py-24 bg-slate-900/30 rounded-3xl border border-slate-800">
                <p className="text-slate-500 font-bold">Waiting for game data stream...</p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </main>
  );
}
