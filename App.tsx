
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, Card, Suit, ContractType } from './types';
import { createInitialState } from './engine/state';
import { createDeck, shuffleDeck } from './engine/deck';
import { getLegalMoves } from './engine/legalMoves';
import { applyMove } from './engine/applyMove';
import { calculateFinalScore } from './engine/scoring';
import { getBotMove } from './engine/bot';
import { SUITS } from './engine/cards';
import { 
  DICTIONARY, 
  JSON_RULESET 
} from './constants';
import { runTests } from './tests/all.test';

// --- Sub-components ---

const CardVisual: React.FC<{ 
  card: Card; 
  onClick?: () => void; 
  disabled?: boolean; 
  isTrump?: boolean;
  highlighted?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}> = ({ card, onClick, disabled, isTrump, highlighted, size = 'md' }) => {
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
  const colorClass = isRed ? 'text-red-600' : 'text-slate-900';
  
  const sizeClasses = {
    xs: 'w-8 h-12 text-[9px]',
    sm: 'w-10 h-14 md:w-12 md:h-18 text-[10px] md:text-xs',
    md: 'w-12 h-18 md:w-16 md:h-24 text-xs md:text-lg',
    lg: 'w-20 h-28 md:w-24 md:h-36 text-xl md:text-2xl'
  };

  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative flex flex-col items-center justify-center bg-white border rounded-md md:rounded-lg m-0.5 cursor-pointer transition-all duration-200 select-none
        ${sizeClasses[size]}
        ${disabled ? 'opacity-30 grayscale cursor-not-allowed border-slate-200' : 'active:scale-95 md:hover:-translate-y-2 md:hover:shadow-xl border-slate-300'}
        ${isTrump ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200 shadow-[inset_0_0_10px_rgba(251,191,36,0.1)]' : ''}
        ${highlighted ? 'ring-2 md:ring-4 ring-indigo-500 border-indigo-500 z-10 scale-105' : ''}
      `}
    >
      <span className={`font-bold leading-none ${colorClass}`}>{card.rank}</span>
      <span className={`${size === 'xs' || size === 'sm' ? 'text-lg' : 'text-2xl md:text-3xl'} leading-none ${colorClass}`}>{getSuitSymbol(card.suit)}</span>
      {isTrump && <div className="absolute top-0 right-0.5 text-[7px] md:text-[10px] text-amber-600 font-black">T</div>}
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'game' | 'spec' | 'json' | 'engine'>('game');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>(["Vitajte v Mariáši."]);
  const [isSolo, setIsSolo] = useState(true);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-29), msg]);
  }, []);

  const startNewGame = useCallback((solo: boolean) => {
    const seed = Date.now();
    const deck = shuffleDeck(createDeck(), seed);
    const state = createInitialState(seed);
    state.players[0].hand = deck.slice(0, 12);
    state.players[1].hand = deck.slice(12, 22);
    state.players[2].hand = deck.slice(22, 32);
    state.talon = state.players[0].hand.splice(10, 2);
    state.phase = 'BIDDING';
    setGameState(state);
    setIsSolo(solo);
    setActiveTab('game');
    addLog("Hráč 1 volí tromf.");
  }, [addLog]);

  const selectTrump = (suit: Suit) => {
    if (!gameState) return;
    setGameState({ ...gameState, trumpSuit: suit });
    addLog(`Tromf: ${suit}. Zvoľte záväzok.`);
  };

  const selectContract = (type: ContractType) => {
    if (!gameState) return;
    setGameState({ ...gameState, contract: type, phase: 'PLAYING' });
    addLog(`Hrá sa ${type}.`);
  };

  const handlePlayerMove = useCallback((card: Card) => {
    if (!gameState || gameState.phase !== 'PLAYING') return;
    try {
      const nextState = applyMove(gameState, card);
      addLog(`P${gameState.currentPlayerIndex + 1}: ${card.rank}${card.suit[0]}`);
      setGameState(nextState);
    } catch (e: any) {
      addLog(`! ${e.message}`);
    }
  }, [gameState, addLog]);

  useEffect(() => {
    if (isSolo && gameState?.phase === 'PLAYING' && gameState.currentPlayerIndex !== 0) {
      const timer = setTimeout(() => {
        const botCard = getBotMove(gameState, gameState.currentPlayerIndex);
        handlePlayerMove(botCard);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [gameState, isSolo, handlePlayerMove]);

  const legalMoves = useMemo(() => {
    if (!gameState || gameState.phase !== 'PLAYING') return [];
    return getLegalMoves(gameState, gameState.currentPlayerIndex);
  }, [gameState]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col safe-area-padding overflow-x-hidden">
      {/* Navbar - Sticky & Compact on Mobile */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 md:px-8 md:py-4 sticky top-0 z-[100] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center font-black text-white italic text-sm">M</div>
          <h1 className="text-lg md:text-xl font-black tracking-tighter">MARIÁŠ <span className="text-indigo-500 hidden xs:inline">PRO</span></h1>
        </div>
        <nav className="flex gap-1 md:gap-2">
          {['game', 'spec', 'engine'].map(t => (
            <button 
              key={t} onClick={() => setActiveTab(t as any)} 
              className={`px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase transition-all ${activeTab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t === 'game' ? 'Hra' : t === 'spec' ? 'Pravidlá' : 'Testy'}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-grow flex flex-col items-center p-2 md:p-6 w-full max-w-7xl mx-auto">
        {activeTab === 'game' && (
          !gameState ? (
            <div className="flex flex-col items-center justify-center h-[70vh] w-full animate-fadeIn px-4">
              <div className="bg-slate-900 p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-800 text-center w-full max-w-md">
                <div className="mb-6 opacity-20 flex justify-center gap-2">
                  <div className="w-12 h-16 bg-white rounded-md transform -rotate-12 border border-slate-400" />
                  <div className="w-12 h-16 bg-white rounded-md border border-slate-400" />
                  <div className="w-12 h-16 bg-white rounded-md transform rotate-12 border border-slate-400" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-2 tracking-tighter">NOVÁ HRA</h2>
                <p className="text-slate-500 text-sm mb-8">Zvoľte herný režim</p>
                <div className="space-y-3">
                  <button onClick={() => startNewGame(true)} className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl">Sólo vs Boti</button>
                  <button onClick={() => startNewGame(false)} className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 py-4 rounded-2xl font-bold text-lg transition-all">Lokálne (3 Hráči)</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col lg:flex-row gap-4 md:gap-6 animate-fadeIn h-full">
              
              {/* Game Table Area */}
              <div className="flex-grow flex flex-col gap-4">
                <div className="relative aspect-[4/5] xs:aspect-[4/3] md:aspect-video lg:aspect-square xl:aspect-video w-full bg-[radial-gradient(circle_at_center,_#065f46_0%,_#064e3b_40%,_#022c22_100%)] rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-8 border-4 border-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between overflow-hidden">
                  
                  {/* Opponent Info (Top) */}
                  <div className="flex justify-between w-full px-4 md:px-12 opacity-60">
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 mb-1">Hráč 2</div>
                      <div className="flex -space-x-4 md:-space-x-6">
                        {[...Array(gameState.players[1].hand.length)].map((_, i) => (
                          <div key={i} className="w-6 h-9 md:w-8 md:h-12 bg-emerald-950 border border-emerald-800 rounded shadow-md" />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 mb-1">Hráč 3</div>
                      <div className="flex -space-x-4 md:-space-x-6">
                        {[...Array(gameState.players[2].hand.length)].map((_, i) => (
                          <div key={i} className="w-6 h-9 md:w-8 md:h-12 bg-emerald-950 border border-emerald-800 rounded shadow-md" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Trick Area (Center) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {gameState.phase === 'BIDDING' && gameState.currentPlayerIndex === 0 && (
                      <div className="bg-white/95 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl z-50 text-slate-900 max-w-[90%] w-80 pointer-events-auto border-t-4 border-indigo-600 animate-fadeIn">
                        <h3 className="text-lg md:text-xl font-black mb-4 text-center tracking-tight">{!gameState.trumpSuit ? 'VOĽBA TROMFU' : 'VOĽBA ZÁVÄZKU'}</h3>
                        {!gameState.trumpSuit ? (
                          <div className="grid grid-cols-2 gap-2">
                            {SUITS.map(s => (
                              <button key={s} onClick={() => selectTrump(s)} className="p-3 md:p-4 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-xl font-bold transition-all active:scale-95 text-sm">
                                {s}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {['Hra', 'Sedma', 'Sto', 'Betl', 'Durch'].map(c => (
                              <button key={c} onClick={() => selectContract(c as ContractType)} className="p-3 md:p-4 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-xl font-bold transition-all active:scale-95 text-sm">
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {gameState.phase === 'PLAYING' && gameState.currentTrick.cards.map((tc, idx) => {
                      const angle = (tc.playerIndex * 120) - 90;
                      const rad = (angle * Math.PI) / 180;
                      const dist = window.innerWidth < 768 ? 45 : 80;
                      const x = Math.cos(rad) * dist;
                      const y = Math.sin(rad) * dist;
                      return (
                        <div key={idx} className="absolute transition-all duration-300 ease-out" style={{ transform: `translate(${x}px, ${y}px)` }}>
                           <CardVisual card={tc.card} isTrump={tc.card.suit === gameState.trumpSuit} size={window.innerWidth < 768 ? 'sm' : 'md'} />
                           <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/40 text-[8px] font-bold px-1.5 py-0.5 rounded text-white uppercase tracking-tighter">P{tc.playerIndex+1}</div>
                        </div>
                      );
                    })}

                    {gameState.phase === 'FINISHED' && (
                      <div className="bg-white p-8 rounded-3xl shadow-2xl z-50 text-slate-900 text-center animate-fadeIn border-t-8 border-indigo-600 pointer-events-auto">
                         <h2 className="text-2xl font-black mb-2 tracking-tighter">KONIEC</h2>
                         <p className="text-xs text-slate-500 mb-6 font-bold uppercase tracking-widest">Hra bola vyhodnotená</p>
                         <button onClick={() => setGameState(null)} className="w-full bg-slate-900 text-white py-3 px-8 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg">Nová Hra</button>
                      </div>
                    )}
                  </div>

                  {/* Player Hand (Bottom) */}
                  <div className="w-full flex flex-col items-center mt-auto pb-2 md:pb-4 z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black text-emerald-300/40 uppercase tracking-[0.2em]">Vaše karty</span>
                      {gameState.currentPlayerIndex === 0 && gameState.phase === 'PLAYING' && (
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-0.5 md:gap-1 max-w-full px-2">
                       {gameState.players[0].hand.map((c, i) => {
                         const isLegal = legalMoves.some(m => m.suit === c.suit && m.rank === c.rank);
                         const isTurn = gameState.currentPlayerIndex === 0 && gameState.phase === 'PLAYING';
                         return (
                           <CardVisual 
                             key={i} card={c} isTrump={c.suit === gameState.trumpSuit} 
                             disabled={!isTurn || !isLegal} highlighted={isTurn && isLegal}
                             onClick={() => handlePlayerMove(c)}
                             size={window.innerWidth < 480 ? 'sm' : 'md'}
                           />
                         );
                       })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar / Info Panel - Collapsible or Bottom on Mobile */}
              <aside className="w-full lg:w-80 flex flex-col gap-4">
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                  <div className="bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-800 shadow-xl">
                    <h3 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mb-3 opacity-60">Aktuálny Stav</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-slate-500 text-xs">Tromf:</span>
                        <span className="text-lg font-black text-amber-400 leading-none">{gameState.trumpSuit || '-'}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-slate-500 text-xs">Záväzok:</span>
                        <span className="text-sm font-bold text-white leading-none">{gameState.contract}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-800 shadow-xl">
                    <h3 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mb-3 opacity-60">Hráči</h3>
                    <div className="space-y-2">
                      {gameState.players.map(p => (
                        <div key={p.id} className={`flex justify-between items-center p-2 rounded-lg transition-colors ${gameState.currentPlayerIndex === p.id ? 'bg-indigo-600/20 ring-1 ring-indigo-500/50' : 'bg-slate-950/40'}`}>
                           <span className={`text-xs font-bold ${gameState.currentPlayerIndex === p.id ? 'text-white' : 'text-slate-500'}`}>P{p.id + 1}</span>
                           <span className="text-[10px] font-mono opacity-40">{p.collectedCards.length / 3} štychov</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-grow bg-slate-900 text-indigo-300/80 p-4 rounded-2xl md:rounded-3xl font-mono text-[9px] md:text-[10px] h-32 md:h-48 lg:h-64 overflow-y-auto border border-slate-800 scrollbar-hide shadow-inner">
                   <div className="flex flex-col-reverse">
                     {log.map((m, i) => (
                       <div key={i} className={`mb-1.5 pb-1 border-b border-slate-800/50 flex gap-2 ${i === log.length - 1 ? 'text-indigo-200 font-bold' : 'opacity-60'}`}>
                         <span className="opacity-30">[{i+1}]</span>
                         <span>{m}</span>
                       </div>
                     ))}
                   </div>
                </div>

                <button onClick={() => setGameState(null)} className="w-full py-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 hover:text-slate-400 transition-colors">Ukončiť hru</button>
              </aside>
            </div>
          )
        )}
        
        {activeTab === 'spec' && (
          <div className="max-w-3xl w-full py-4 md:py-8 space-y-6 md:space-y-8 animate-fadeIn px-2">
            <h2 className="text-2xl md:text-3xl font-black border-b border-slate-800 pb-4 tracking-tighter">ŠPECIFIKÁCIA MARIÁŠA</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {DICTIONARY.map(d => (
                <div key={d.term} className="bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-800 hover:border-indigo-900 transition-colors">
                   <dt className="text-indigo-400 font-bold text-base md:text-lg mb-1">{d.term}</dt>
                   <dd className="text-slate-400 text-xs md:text-sm leading-relaxed">{d.definition}</dd>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'engine' && (
          <div className="max-w-2xl w-full py-4 md:py-8 animate-fadeIn px-2">
             <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
               <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                 <h3 className="text-xs font-black tracking-widest uppercase opacity-50">Logika Enginu</h3>
                 <span className="text-[10px] bg-emerald-900 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Stable v1.2</span>
               </div>
               <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto font-mono text-[10px] md:text-xs">
                  {runTests().map((t, i) => (
                    <div key={i} className={`p-3 rounded-xl ${t.includes('✅') ? 'bg-emerald-950/20 text-emerald-400' : 'bg-red-950/20 text-red-400'} border border-white/5`}>
                      {t}
                    </div>
                  ))}
               </div>
             </div>
          </div>
        )}
      </main>

      <footer className="py-6 text-center border-t border-slate-900/50">
        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.4em]">Mariáš Pro • PWA Edition</p>
      </footer>
    </div>
  );
};

export default App;
