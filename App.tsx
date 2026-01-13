
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, Card, Suit, ContractType, Trick, ScoreRecord } from './types';
import { createInitialState } from './engine/state';
import { createDeck, shuffleDeck } from './engine/deck';
import { getLegalMoves } from './engine/legalMoves';
import { applyMove } from './engine/applyMove';
import { calculateFinalScore } from './engine/scoring';
import { getBotMove } from './engine/bot';
import { SUITS } from './engine/cards';
import { determineTrickWinner } from './engine/scoring';
import { evaluateContract } from './engine/contracts';
import { saveGame, loadGame, clearGame } from './engine/serialize';
import { 
  DICTIONARY, 
} from './constants';
import { CONTRACT_MULTIPLIERS } from './engine/rules';

// --- Components ---

const CardVisual: React.FC<{ 
  card: Card; 
  onClick?: () => void; 
  disabled?: boolean; 
  isTrump?: boolean;
  isWinner?: boolean;
  highlighted?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ card, onClick, disabled, isTrump, isWinner, highlighted, size = 'md', className = '' }) => {
  const getSuitSymbol = (s: Suit) => {
    switch(s) {
      case 'Srdce': return '♥';
      case 'Listy': return '♠';
      case 'Žalude': return '♣';
      case 'Gule': return '♦';
      default: return '?';
    }
  };
  const isRed = card.suit === 'Srdce' || card.suit === 'Gule';
  
  const sizeClasses = {
    xs: 'w-10 h-14 text-xs',
    sm: 'w-14 h-20 text-sm',
    md: 'w-16 h-24 md:w-20 md:h-28 text-base md:text-xl',
    lg: 'w-24 h-36 md:w-32 md:h-44 text-2xl md:text-3xl'
  };

  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative flex flex-col items-center justify-center bg-white border rounded-lg shadow-sm cursor-pointer transition-all duration-200 select-none
        ${sizeClasses[size]}
        ${disabled ? 'opacity-30 grayscale cursor-not-allowed' : 'active:scale-90 hover:shadow-lg'}
        ${isTrump ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'}
        ${highlighted ? 'ring-4 ring-indigo-500 z-10' : ''}
        ${isWinner ? 'ring-4 ring-amber-500 scale-110 z-20 shadow-amber-500/50 shadow-xl' : ''}
        ${className}
      `}
    >
      <span className={`font-black ${isRed ? 'text-red-600' : 'text-slate-900'}`}>{card.rank}</span>
      <span className={`text-2xl md:text-4xl ${isRed ? 'text-red-600' : 'text-slate-900'}`}>{getSuitSymbol(card.suit)}</span>
      {isTrump && <div className="absolute top-1 right-1 text-[8px] text-amber-600 font-bold px-1 bg-amber-100 rounded">TROMF</div>}
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'game' | 'score' | 'recorder' | 'help'>('game');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [winningPlayerIndex, setWinningPlayerIndex] = useState<number | null>(null);
  const [lastFinishedTrick, setLastFinishedTrick] = useState<Trick | null>(null);
  const [selectedTalon, setSelectedTalon] = useState<Card[]>([]);

  // Scoreboard State
  const [scoreRecords, setScoreRecords] = useState<ScoreRecord[]>([]);
  const [newEntry, setNewEntry] = useState<Omit<ScoreRecord, 'id' | 'timestamp' | 'value'>>({
    actorIndex: 0,
    contract: 'Hra',
    flekLevel: 0,
    isWon: true,
    isAnnounced: false
  });

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-49), `${new Date().toLocaleTimeString().slice(0, 5)} - ${msg}`]);
  }, []);

  const startNewGame = useCallback((solo: boolean) => {
    const seed = Date.now();
    const deck = shuffleDeck(createDeck(), seed);
    const state = createInitialState(seed);
    state.players[0].hand = deck.slice(0, 12);
    state.players[1].hand = deck.slice(12, 22);
    state.players[2].hand = deck.slice(22, 32);
    state.phase = 'BIDDING';
    setGameState(state);
    addLog("Hra začína. Hráč 1 (Forhont) volí tromf.");
    saveGame(state);
  }, [addLog]);

  useEffect(() => {
    const saved = loadGame();
    if (saved && !gameState) {
      setGameState(saved);
      addLog("Hra obnovená z pamäte.");
    }
    const savedScores = localStorage.getItem('marias_scores');
    if (savedScores) setScoreRecords(JSON.parse(savedScores));
  }, []);

  useEffect(() => {
    localStorage.setItem('marias_scores', JSON.stringify(scoreRecords));
  }, [scoreRecords]);

  const handleAction = useCallback((move: any) => {
    if (!gameState) return;
    try {
      const next = applyMove(gameState, move);
      
      if (move.type === 'PLAY_CARD') {
        addLog(`P${gameState.currentPlayerIndex + 1}: ${move.card.rank}${move.card.suit[0]}`);
      } else if (move.type === 'CHOOSE_TRUMP') {
        addLog(`Zvolený tromf: ${move.suit}`);
      } else if (move.type === 'CHOOSE_CONTRACT') {
        addLog(`Záväzok: ${move.contract}`);
      }

      if (next.currentTrick.cards.length === 0 && next.history.length > gameState.history.length) {
        const completed = next.history[next.history.length - 1];
        const winner = determineTrickWinner(completed, gameState.trumpSuit, gameState.contract === 'Betl' || gameState.contract === 'Durch');
        setLastFinishedTrick(completed);
        setWinningPlayerIndex(winner);
        setGameState(next);
        saveGame(next);

        setTimeout(() => {
          setIsCollecting(true);
          setTimeout(() => {
            setIsCollecting(false);
            setLastFinishedTrick(null);
            setWinningPlayerIndex(null);
          }, 800);
        }, 1200);
      } else {
        setGameState(next);
        saveGame(next);
      }
    } catch (e: any) {
      alert(e.message);
    }
  }, [gameState, addLog]);

  useEffect(() => {
    if (gameState?.phase === 'PLAYING' && gameState.currentPlayerIndex !== 0 && !isCollecting && winningPlayerIndex === null) {
      const timer = setTimeout(() => {
        const botCard = getBotMove(gameState, gameState.currentPlayerIndex);
        handleAction({ type: 'PLAY_CARD', card: botCard });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState, handleAction, isCollecting, winningPlayerIndex]);

  const legalMoves = useMemo(() => {
    if (!gameState || gameState.phase !== 'PLAYING') return [];
    return getLegalMoves(gameState, gameState.currentPlayerIndex);
  }, [gameState]);

  const finalScore = useMemo(() => {
    if (gameState?.phase === 'FINISHED') {
      return {
        score: calculateFinalScore(gameState),
        success: evaluateContract(gameState)
      };
    }
    return null;
  }, [gameState]);

  const trickToDisplay = (isCollecting || winningPlayerIndex !== null) && lastFinishedTrick ? lastFinishedTrick : gameState?.currentTrick;

  // --- Scoreboard Logic ---
  const addScoreRecord = () => {
    const baseValue = CONTRACT_MULTIPLIERS[newEntry.contract as keyof typeof CONTRACT_MULTIPLIERS] || 1;
    const flekMultiplier = Math.pow(2, newEntry.flekLevel);
    const announcedMultiplier = newEntry.isAnnounced ? 2 : 1;
    const finalValue = baseValue * flekMultiplier * announcedMultiplier;

    const record: ScoreRecord = {
      ...newEntry,
      id: Date.now().toString(),
      timestamp: Date.now(),
      value: finalValue
    };

    setScoreRecords([record, ...scoreRecords]);
  };

  const getPlayerBalance = (playerIdx: number) => {
    return scoreRecords.reduce((acc, rec) => {
      const isActor = rec.actorIndex === playerIdx;
      if (isActor) {
        // Actor gets or pays twice (once from/to each defense player)
        return acc + (rec.isWon ? rec.value * 2 : -rec.value * 2);
      } else {
        // Defense player pays or gets once
        return acc + (rec.isWon ? -rec.value : rec.value);
      }
    }, 0);
  };

  const flekLabels = ['Dobrá', 'Flek', 'Re', 'Tutti', 'Boty'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col safe-area-padding overflow-hidden font-sans">
      {/* Header */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-50 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black shadow-lg shadow-indigo-500/20">M</div>
          <span className="font-bold tracking-tighter text-xl">MARIÁŠ <span className="text-indigo-500">PRO</span></span>
        </div>
        <div className="flex gap-2">
          {['game', 'recorder'].map(t => (
            <button 
              key={t} onClick={() => setActiveTab(t as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}
            >
              {t === 'game' ? 'HRA' : 'ZAPISOVAČ'}
            </button>
          ))}
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-grow relative overflow-hidden flex flex-col">
        {activeTab === 'game' && (
          !gameState ? (
            <div className="flex-grow flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#020617_100%)]">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl max-w-sm w-full animate-fadeIn text-center">
                <h1 className="text-4xl font-black mb-8 tracking-tighter">VÍTAJTE</h1>
                <div className="space-y-3">
                  <button onClick={() => startNewGame(true)} className="w-full bg-indigo-600 py-5 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-all">SÓLO VS BOTI</button>
                  <button onClick={() => startNewGame(false)} className="w-full bg-slate-800 py-5 rounded-2xl font-bold text-lg border border-slate-700 active:scale-95 transition-all">LOKÁLNY PASS-N-PLAY</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
               {/* Game Table Content from previous version... */}
               <div className="flex-grow flex flex-col bg-[radial-gradient(circle_at_center,_#065f46_0%,_#022c22_100%)] p-4 relative overflow-hidden">
                  {/* Reuse table rendering logic from previous version */}
                  <div className="flex justify-between opacity-30 px-8 py-4">
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase mb-2">Hráč 2</div>
                      <div className="flex -space-x-10">
                        {[...Array(gameState.players[1].hand.length)].map((_, i) => <div key={i} className="w-12 h-16 bg-emerald-950 border border-emerald-800 rounded-lg" />)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase mb-2">Hráč 3</div>
                      <div className="flex -space-x-10">
                        {[...Array(gameState.players[2].hand.length)].map((_, i) => <div key={i} className="w-12 h-16 bg-emerald-950 border border-emerald-800 rounded-lg" />)}
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow relative flex items-center justify-center">
                    {/* Overlays (Trump/Contract/Finished) */}
                    {gameState.phase === 'BIDDING' && gameState.currentPlayerIndex === 0 && (
                      <div className="absolute z-[100] bg-white p-6 rounded-3xl shadow-2xl text-slate-900 border-t-8 border-indigo-600 max-w-xs w-full">
                        <h3 className="text-xl font-black mb-4 text-center">{!gameState.trumpSuit ? 'VOĽBA TROMFU' : 'ZÁVÄZOK'}</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {!gameState.trumpSuit ? SUITS.map(s => <button key={s} onClick={() => handleAction({type: 'CHOOSE_TRUMP', suit: s})} className="p-3 bg-slate-100 rounded-xl font-bold">{s}</button>) : 
                            ['Hra', 'Sedma', 'Sto', 'Betl', 'Durch'].map(c => <button key={c} onClick={() => handleAction({type: 'CHOOSE_CONTRACT', contract: c as ContractType})} className="p-3 bg-slate-100 rounded-xl font-bold">{c}</button>)}
                        </div>
                      </div>
                    )}

                    {gameState.phase === 'FINISHED' && finalScore && (
                      <div className="absolute z-[110] bg-white p-8 rounded-3xl shadow-2xl text-slate-900 text-center border-t-8 border-indigo-600 max-w-xs w-full">
                        <h2 className={`text-4xl font-black mb-4 ${finalScore.success ? 'text-emerald-600' : 'text-red-600'}`}>{finalScore.success ? 'VÝHRA!' : 'PREHRA'}</h2>
                        <button onClick={() => startNewGame(true)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black">NOVÁ HRA</button>
                      </div>
                    )}

                    <div className="relative w-full h-full flex items-center justify-center">
                      {trickToDisplay?.cards.map((tc, idx) => {
                        const angle = (tc.playerIndex * 120) - 90;
                        const rad = (angle * Math.PI) / 180;
                        const dist = isCollecting ? 300 : 80;
                        const isWinner = winningPlayerIndex === tc.playerIndex;
                        return (
                          <div 
                            key={`${tc.playerIndex}-${idx}`} 
                            className={`absolute transition-all duration-700 ${isCollecting ? 'opacity-0 scale-50' : 'opacity-100'}`}
                            style={{ transform: `translate(${Math.cos(rad) * dist}px, ${Math.sin(rad) * dist}px)` }}
                          >
                            <CardVisual card={tc.card} isTrump={tc.card.suit === gameState.trumpSuit} isWinner={isWinner} size="sm" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
               </div>
            </div>
          )
        )}

        {activeTab === 'recorder' && (
          <div className="flex-grow flex flex-col p-4 overflow-y-auto space-y-6">
            {/* Balance Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map(idx => {
                const bal = getPlayerBalance(idx);
                return (
                  <div key={idx} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                    <div className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">Hráč {idx + 1}</div>
                    <div className={`text-xl font-black ${bal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {bal > 0 ? `+${bal}` : bal}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Entry Form */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest text-center">Nový Záznam</h3>
              
              <div className="space-y-4">
                {/* Actor Selection */}
                <div className="flex justify-between gap-2">
                  {[0, 1, 2].map(idx => (
                    <button 
                      key={idx} onClick={() => setNewEntry({...newEntry, actorIndex: idx})}
                      className={`flex-grow py-3 rounded-xl font-black text-xs transition-all ${newEntry.actorIndex === idx ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}
                    >
                      HRÁČ {idx + 1}
                    </button>
                  ))}
                </div>

                {/* Contract Selection */}
                <div className="grid grid-cols-3 gap-2">
                  {['Hra', 'Sedma', 'Sto', '100+7', 'Betl', 'Durch'].map(c => (
                    <button 
                      key={c} onClick={() => setNewEntry({...newEntry, contract: c as ContractType})}
                      className={`py-2.5 rounded-xl font-black text-[10px] transition-all ${newEntry.contract === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500'}`}
                    >
                      {c.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Flek Level */}
                <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                  {flekLabels.map((l, idx) => (
                    <button 
                      key={l} onClick={() => setNewEntry({...newEntry, flekLevel: idx})}
                      className={`shrink-0 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-tighter ${newEntry.flekLevel === idx ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-600'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {/* Toggles and Result */}
                <div className="flex items-center justify-between gap-4">
                  <button 
                    onClick={() => setNewEntry({...newEntry, isAnnounced: !newEntry.isAnnounced})}
                    className={`flex-grow py-3 rounded-xl font-black text-xs border ${newEntry.isAnnounced ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-800 text-slate-700'}`}
                  >
                    HLÁSENÉ (2x)
                  </button>
                  <button 
                    onClick={() => setNewEntry({...newEntry, isWon: !newEntry.isWon})}
                    className={`flex-grow py-3 rounded-xl font-black text-xs ${newEntry.isWon ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
                  >
                    {newEntry.isWon ? 'VÝHRA' : 'PREHRA'}
                  </button>
                </div>

                <button 
                  onClick={addScoreRecord}
                  className="w-full bg-white text-slate-950 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all shadow-xl"
                >
                  PRIDAŤ DO TABUĽKY
                </button>
              </div>
            </div>

            {/* History Table */}
            <div className="space-y-2 pb-10">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-2">História Hier</h3>
              {scoreRecords.map(rec => (
                <div key={rec.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-black text-xs text-indigo-400">
                      P{rec.actorIndex + 1}
                    </div>
                    <div>
                      <div className="text-xs font-black">{rec.contract} {rec.flekLevel > 0 && `(${flekLabels[rec.flekLevel]})`}</div>
                      <div className="text-[8px] font-bold text-slate-600 uppercase">{new Date(rec.timestamp).toLocaleDateString()} • {rec.isAnnounced ? 'HLÁSENÉ' : 'TICHÉ'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-sm font-black ${rec.isWon ? 'text-emerald-500' : 'text-red-500'}`}>
                      {rec.isWon ? `+${rec.value * 2}` : `-${rec.value * 2}`}
                    </div>
                    <button 
                      onClick={() => setScoreRecords(scoreRecords.filter(r => r.id !== rec.id))}
                      className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {scoreRecords.length === 0 && (
                <div className="text-center py-10 text-slate-700 font-bold text-sm italic">Žiadne záznamy</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Hand & Bottom Controls (only for game) */}
      {gameState && activeTab === 'game' && (
        <div className="bg-slate-900 border-t border-slate-800 pb-[env(safe-area-inset-bottom)] pt-4 px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50">
          <div className="flex overflow-x-auto gap-2.5 pb-6 pt-2 scrollbar-hide snap-x items-center w-full min-h-[140px]">
            {gameState.players[0].hand.map((c, i) => {
              const isTurn = gameState.currentPlayerIndex === 0 && !isCollecting && winningPlayerIndex === null;
              const isLegal = isTurn && legalMoves.some(l => l.suit === c.suit && l.rank === c.rank);
              const isSelected = selectedTalon.some(s => s.suit === c.suit && s.rank === c.rank);
              
              const handleClick = () => {
                if (gameState.phase === 'TALON') {
                  if (isSelected) setSelectedTalon(prev => prev.filter(s => !(s.suit === c.suit && s.rank === c.rank)));
                  else if (selectedTalon.length < 2) setSelectedTalon(prev => [...prev, c]);
                } else if (isTurn && isLegal) {
                  handleAction({ type: 'PLAY_CARD', card: c });
                }
              };

              return (
                <div key={`${c.suit}-${c.rank}-${i}`} className="snap-center shrink-0">
                  <CardVisual 
                    card={c} 
                    isTrump={c.suit === gameState.trumpSuit} 
                    disabled={gameState.phase === 'PLAYING' ? !isLegal : false}
                    highlighted={isSelected}
                    onClick={handleClick}
                    size="md"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
