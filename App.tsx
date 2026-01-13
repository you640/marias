
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, Card, Suit, ContractType, Trick } from './types';
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
  const [activeTab, setActiveTab] = useState<'game' | 'score' | 'log' | 'help'>('game');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [winningPlayerIndex, setWinningPlayerIndex] = useState<number | null>(null);
  const [lastFinishedTrick, setLastFinishedTrick] = useState<Trick | null>(null);
  const [selectedTalon, setSelectedTalon] = useState<Card[]>([]);

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
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col safe-area-padding overflow-hidden font-sans">
      {/* Header */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-50 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black shadow-lg shadow-indigo-500/20">M</div>
          <span className="font-bold tracking-tighter text-xl">MARIÁŠ <span className="text-indigo-500">PRO</span></span>
        </div>
        <button 
          onClick={() => { clearGame(); setGameState(null); }}
          className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-red-400 transition-colors bg-slate-800 px-3 py-1.5 rounded-full"
        >
          Reset
        </button>
      </header>

      {/* Main Game Area */}
      <main className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
        {!gameState ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_#020617_100%)]">
            <div className="bg-slate-900 p-8 md:p-12 rounded-[2.5rem] border border-slate-800 shadow-2xl max-w-sm w-full animate-fadeIn">
              <div className="mb-6 flex justify-center gap-2 opacity-50">
                <div className="w-8 h-12 bg-white rounded border border-slate-400 -rotate-12" />
                <div className="w-8 h-12 bg-white rounded border border-slate-400" />
                <div className="w-8 h-12 bg-white rounded border border-slate-400 rotate-12" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter">VÍTAJTE</h1>
              <p className="text-slate-500 text-sm mb-8 font-medium">Tradičný slovenský Mariáš</p>
              <div className="space-y-3">
                <button 
                  onClick={() => startNewGame(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  SÓLO VS BOTI
                </button>
                <button 
                  onClick={() => startNewGame(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 py-5 rounded-2xl font-bold text-lg border border-slate-700 active:scale-95 transition-all"
                >
                  LOKÁLNY PASS-N-PLAY
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Sidebars */}
            <aside className="hidden lg:flex flex-col w-80 bg-slate-900/50 border-r border-slate-800 p-6 overflow-y-auto">
              <h2 className="text-xs font-black text-indigo-400 tracking-[0.3em] uppercase mb-6">Bodový Stav</h2>
              <div className="space-y-4">
                {gameState.players.map(p => (
                  <div key={p.id} className={`p-5 rounded-3xl border transition-all ${gameState.currentPlayerIndex === p.id ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10' : 'border-slate-800 bg-slate-950/50'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-bold ${gameState.currentPlayerIndex === p.id ? 'text-white' : 'text-slate-500'}`}>Hráč {p.id + 1}</span>
                      {gameState.activePlayerIndex === p.id && <span className="text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">AKTÉR</span>}
                    </div>
                    <div className="text-3xl font-black flex items-baseline gap-2">
                      {p.collectedCards.length / 3} 
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">štychov</span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Game Table */}
            <div className="flex-grow flex flex-col bg-[radial-gradient(circle_at_center,_#065f46_0%,_#022c22_100%)] p-4 md:p-8 relative">
              
              {/* Opponents Heads-up */}
              <div className="flex justify-between px-2 md:px-12 opacity-30 mt-4">
                <div className="text-center">
                  <div className="text-[9px] font-black text-emerald-300 uppercase tracking-widest mb-2">Hráč 2</div>
                  <div className="flex -space-x-10 md:-space-x-14">
                    {[...Array(gameState.players[1].hand.length)].map((_, i) => (
                      <div key={i} className="w-12 h-16 md:w-20 md:h-28 bg-emerald-950 border border-emerald-800 rounded-xl shadow-xl" />
                    ))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-black text-emerald-300 uppercase tracking-widest mb-2">Hráč 3</div>
                  <div className="flex -space-x-10 md:-space-x-14">
                    {[...Array(gameState.players[2].hand.length)].map((_, i) => (
                      <div key={i} className="w-12 h-16 md:w-20 md:h-28 bg-emerald-950 border border-emerald-800 rounded-xl shadow-xl" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Game Space */}
              <div className="flex-grow relative flex items-center justify-center">
                
                {/* Bidding/Phase Overlays */}
                {gameState.phase === 'BIDDING' && gameState.currentPlayerIndex === 0 && (
                   <div className="absolute z-[100] bg-white p-8 rounded-[2.5rem] shadow-2xl text-slate-900 border-t-[12px] border-indigo-600 animate-fadeIn max-w-sm w-full">
                     <h3 className="text-2xl font-black mb-6 tracking-tighter text-center uppercase">
                       {!gameState.trumpSuit ? 'VOĽBA TROMFU' : 'VOĽBA ZÁVÄZKU'}
                     </h3>
                     {!gameState.trumpSuit ? (
                       <div className="grid grid-cols-2 gap-3">
                         {SUITS.map(s => (
                           <button key={s} onClick={() => handleAction({ type: 'CHOOSE_TRUMP', suit: s })} className="p-5 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-2xl font-black transition-all active:scale-95 text-sm shadow-sm">
                             {s.toUpperCase()}
                           </button>
                         ))}
                       </div>
                     ) : (
                       <div className="grid grid-cols-2 gap-3">
                         {['Hra', 'Sedma', 'Sto', 'Betl', 'Durch'].map(c => (
                           <button key={c} onClick={() => handleAction({ type: 'CHOOSE_CONTRACT', contract: c as ContractType })} className="p-5 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-2xl font-black transition-all active:scale-95 text-sm shadow-sm">
                             {c.toUpperCase()}
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                )}

                {gameState.phase === 'TALON' && gameState.currentPlayerIndex === 0 && (
                  <div className="absolute z-[100] bg-white p-8 rounded-[2.5rem] shadow-2xl text-slate-900 border-t-[12px] border-amber-500 animate-fadeIn max-w-sm w-full text-center">
                    <h3 className="text-2xl font-black mb-2 tracking-tighter uppercase">ODLOŽ TALÓN</h3>
                    <p className="text-xs text-slate-500 mb-8 font-bold uppercase tracking-widest">Zvoľ 2 karty (A/10 zakázané)</p>
                    <button 
                      disabled={selectedTalon.length !== 2}
                      onClick={() => { handleAction({ type: 'DISCARD_TALON', cards: selectedTalon }); setSelectedTalon([]); }}
                      className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg disabled:opacity-30 transition-all active:scale-95 shadow-xl"
                    >
                      POTVRDIŤ VÝBER
                    </button>
                  </div>
                )}

                {/* Final Result Overlay */}
                {gameState.phase === 'FINISHED' && finalScore && (
                  <div className="absolute z-[110] bg-white p-10 rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] text-slate-900 text-center animate-fadeIn border-t-[16px] border-indigo-600 max-w-sm w-full">
                     <div className="mb-4 text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Výsledok</div>
                     <h2 className={`text-5xl font-black mb-6 tracking-tighter ${finalScore.success ? 'text-emerald-600' : 'text-red-600'}`}>
                       {finalScore.success ? 'VÝHRA!' : 'PREHRA'}
                     </h2>
                     <div className="space-y-3 mb-10 text-sm">
                        <div className="flex justify-between font-bold border-b pb-2">
                           <span className="text-slate-400 text-[10px] uppercase">Body Aktér</span>
                           <span>{finalScore.score.actorPoints + finalScore.score.actorAnnouncements}</span>
                        </div>
                        <div className="flex justify-between font-bold border-b pb-2">
                           <span className="text-slate-400 text-[10px] uppercase">Body Obrana</span>
                           <span>{finalScore.score.defensePoints + finalScore.score.defenseAnnouncements}</span>
                        </div>
                     </div>
                     <button onClick={() => startNewGame(true)} className="w-full bg-slate-900 text-white py-5 px-8 rounded-[1.5rem] font-black text-xl hover:bg-indigo-600 transition-colors shadow-2xl active:scale-95">NOVÁ HRA</button>
                  </div>
                )}

                {/* Trick Surface */}
                <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                  {trickToDisplay?.cards.map((tc, idx) => {
                    const angle = (tc.playerIndex * 120) - 90;
                    const rad = (angle * Math.PI) / 180;
                    const dist = window.innerWidth < 768 ? 70 : 150;
                    const isWinner = winningPlayerIndex === tc.playerIndex;
                    return (
                      <div 
                        key={`${tc.playerIndex}-${idx}`}
                        className={`absolute transition-all duration-700 ease-in-out ${isCollecting ? 'opacity-0 scale-50 -translate-y-64 blur-xl' : 'opacity-100 scale-100'}`}
                        style={{ transform: !isCollecting ? `translate(${Math.cos(rad) * dist}px, ${Math.sin(rad) * dist}px)` : undefined }}
                      >
                        <CardVisual 
                          card={tc.card} 
                          isTrump={tc.card.suit === gameState.trumpSuit} 
                          isWinner={isWinner}
                          size={window.innerWidth < 768 ? 'sm' : 'md'}
                          className="shadow-2xl"
                        />
                        {!isCollecting && (
                          <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap tracking-tighter ${isWinner ? 'bg-amber-500 text-white ring-4 ring-amber-500/30' : 'bg-black/30 text-white/70'}`}>
                            {isWinner ? `VÍŤAZ P${tc.playerIndex + 1}` : `P${tc.playerIndex + 1}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Info Bar */}
              <div className="lg:hidden flex justify-between items-center py-3 px-6 bg-slate-900/80 backdrop-blur-lg rounded-[1.5rem] border border-white/5 mb-2 shadow-2xl">
                <div className="text-center">
                  <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Tromf</div>
                  <div className="text-sm font-black text-amber-400">{gameState.trumpSuit || '-'}</div>
                </div>
                <div className="text-center">
                   <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Záväzok</div>
                   <div className="text-sm font-black text-white">{gameState.contract.toUpperCase()}</div>
                </div>
                <div className="text-center">
                   <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Na ťahu</div>
                   <div className="text-sm font-black text-indigo-400">P{gameState.currentPlayerIndex + 1}</div>
                </div>
              </div>
            </div>

            {/* Desktop Log Sidebar */}
            <aside className="hidden lg:flex flex-col w-80 bg-slate-900/50 border-l border-slate-800 p-6 overflow-hidden">
               <h2 className="text-xs font-black text-indigo-400 tracking-[0.3em] uppercase mb-6">Herný Log</h2>
               <div className="flex-grow overflow-y-auto space-y-2 scrollbar-hide text-[11px] font-mono opacity-60">
                 {log.slice().reverse().map((m, i) => (
                   <div key={i} className="border-b border-white/5 pb-2 last:border-0">{m}</div>
                 ))}
               </div>
            </aside>
          </>
        )}
      </main>

      {/* Hand & Bottom Controls */}
      {gameState && (
        <div className="bg-slate-900 border-t border-slate-800 pb-[env(safe-area-inset-bottom)] pt-4 px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Moja Ruka</span>
            <div className="flex bg-slate-800 rounded-full p-1 shadow-inner">
              {['game', 'score', 'log'].map(t => (
                <button 
                  key={t} onClick={() => setActiveTab(t as any)}
                  className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all tracking-widest ${activeTab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="relative min-h-[140px] flex items-center">
            {activeTab === 'game' && (
              <div className="flex overflow-x-auto gap-2.5 pb-6 pt-2 scrollbar-hide snap-x items-center w-full">
                {gameState.players[0].hand.map((c, i) => {
                  const isLegal = gameState.phase === 'PLAYING' && legalMoves.some(l => l.suit === c.suit && l.rank === c.rank);
                  const isTurn = gameState.currentPlayerIndex === 0 && !isCollecting && winningPlayerIndex === null;
                  const isSelectedForTalon = selectedTalon.some(s => s.suit === c.suit && s.rank === c.rank);
                  
                  const handleClick = () => {
                    if (gameState.phase === 'TALON') {
                      if (isSelectedForTalon) setSelectedTalon(prev => prev.filter(s => !(s.suit === c.suit && s.rank === c.rank)));
                      else if (selectedTalon.length < 2) setSelectedTalon(prev => [...prev, c]);
                    } else if (isTurn && isLegal) {
                      handleAction({ type: 'PLAY_CARD', card: c });
                      if ('vibrate' in navigator) navigator.vibrate(12);
                    }
                  };

                  return (
                    <div key={`${c.suit}-${c.rank}-${i}`} className="snap-center shrink-0">
                      <CardVisual 
                        card={c} 
                        isTrump={c.suit === gameState.trumpSuit} 
                        disabled={gameState.phase === 'PLAYING' ? (!isTurn || !isLegal) : false}
                        highlighted={isSelectedForTalon}
                        onClick={handleClick}
                        size="md"
                        className="shadow-xl"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'score' && (
              <div className="w-full bg-slate-950/50 p-6 rounded-[2rem] animate-fadeIn grid grid-cols-3 gap-4 border border-white/5">
                 {gameState.players.map(p => (
                   <div key={p.id} className="text-center">
                     <div className="text-[8px] font-black text-slate-600 uppercase mb-1">P{p.id+1}</div>
                     <div className="text-2xl font-black text-white">{p.collectedCards.length / 3}</div>
                   </div>
                 ))}
              </div>
            )}

            {activeTab === 'log' && (
               <div className="w-full bg-slate-950/50 p-5 rounded-[2rem] animate-fadeIn h-[120px] overflow-y-auto font-mono text-[10px] text-indigo-300 border border-white/5">
                  {log.slice().reverse().map((m, i) => <div key={i} className="mb-1 opacity-80">{m}</div>)}
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
