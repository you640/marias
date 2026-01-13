
import React, { useState, useEffect, useMemo, useCallback } from 'react';
/* Import types and utilities from their respective definition files to fix export errors */
import { GameState, createInitialState, ContractType, PlayerState } from './engine/state';
import { Card, Suit, Rank, SUITS } from './engine/cards';
import { createDeck, shuffleDeck } from './engine/deck';
import { getLegalMoves } from './engine/legalMoves';
import { applyMove } from './engine/applyMove';
import { calculateFinalScore } from './engine/scoring';
import { getBotMove } from './engine/bot';
import { 
  DICTIONARY, 
  JSON_RULESET, 
  SUIT_ORDER, 
  BETL_DURCH_ORDER, 
  LEGAL_MOVE_EXAMPLES 
} from './constants';
import { runTests } from './tests/all.test';

// --- UI Components ---

const CardVisual: React.FC<{ 
  card: Card; 
  onClick?: () => void; 
  disabled?: boolean; 
  isTrump?: boolean;
  highlighted?: boolean;
  size?: 'sm' | 'md' | 'lg';
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
    sm: 'w-10 h-14 text-xs',
    md: 'w-14 h-20 md:w-16 md:h-24 text-sm md:text-lg',
    lg: 'w-20 h-28 md:w-24 md:h-36 text-xl md:text-2xl'
  };

  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative flex flex-col items-center justify-center bg-white border-2 rounded-lg m-0.5 cursor-pointer transition-all
        ${sizeClasses[size]}
        ${disabled ? 'opacity-40 grayscale cursor-not-allowed border-slate-200' : 'hover:-translate-y-2 hover:shadow-xl border-slate-300'}
        ${isTrump ? 'border-amber-400 bg-amber-50 shadow-inner ring-1 ring-amber-200' : ''}
        ${highlighted ? 'ring-4 ring-indigo-400 border-indigo-500 scale-105 z-10 shadow-lg' : ''}
      `}
    >
      <span className={`font-bold leading-none ${colorClass}`}>{card.rank}</span>
      <span className={`${size === 'sm' ? 'text-lg' : 'text-3xl'} leading-none ${colorClass}`}>{getSuitSymbol(card.suit)}</span>
      {isTrump && <div className="absolute top-0 right-1 text-[8px] md:text-[10px] text-amber-600 font-bold uppercase">T</div>}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-12 animate-fadeIn">
    <h2 className="text-2xl font-bold text-slate-100 mb-6 border-b border-slate-700 pb-2">{title}</h2>
    {children}
  </section>
);

const GameLog: React.FC<{ messages: string[] }> = ({ messages }) => {
  useEffect(() => {
    const el = document.getElementById('log-container');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div id="log-container" className="bg-slate-900 text-indigo-300 p-4 rounded-xl font-mono text-[10px] md:text-xs h-40 overflow-y-auto border border-slate-700 shadow-inner scroll-smooth">
      {messages.map((m, i) => (
        <div key={i} className="mb-1 border-l-2 border-indigo-700 pl-2 opacity-90 hover:opacity-100 transition-opacity">
          {m}
        </div>
      ))}
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'game' | 'spec' | 'json' | 'engine'>('game');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string[]>(["Vitajte v Mariáši. Vyberte režim a začnite hrať."]);
  const [isSolo, setIsSolo] = useState(true);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-99), msg]);
  }, []);

  const startNewGame = useCallback((solo: boolean) => {
    const seed = Date.now();
    const deck = shuffleDeck(createDeck(), seed);
    const state = createInitialState(seed);
    
    // Mariáš Deal: 7 to forhont, 5 to others, then 5 each
    state.players[0].hand = deck.slice(0, 7);
    state.players[1].hand = deck.slice(7, 12);
    state.players[2].hand = deck.slice(12, 17);
    const rest = deck.slice(17);
    state.players[0].hand.push(...rest.slice(0, 5));
    state.players[1].hand.push(...rest.slice(5, 10));
    state.players[2].hand.push(...rest.slice(10, 15));
    state.talon = rest.slice(15, 17);
    
    state.phase = 'BIDDING';
    state.activePlayerIndex = 0; // Forhont starts
    
    setGameState(state);
    setIsSolo(solo);
    setActiveTab('game');
    setLog(["Nová hra. Hráč 1 (Forhont) volí tromfovú farbu."]);
  }, []);

  const selectTrump = (suit: Suit) => {
    if (!gameState) return;
    const nextState = { ...gameState, trumpSuit: suit };
    setGameState(nextState);
    addLog(`Zvolený tromf: ${suit}. Teraz vyberte typ záväzku.`);
  };

  const selectContract = (type: ContractType) => {
    if (!gameState) return;
    const nextState = { ...gameState, contract: type, phase: 'PLAYING' as const };
    setGameState(nextState);
    addLog(`Hrá sa záväzok: ${type}. Začína Hráč 1.`);
  };

  const handlePlayerMove = useCallback((card: Card) => {
    if (!gameState || gameState.phase !== 'PLAYING') return;
    
    try {
      const nextState = applyMove(gameState, card);
      const playerNum = gameState.currentPlayerIndex + 1;
      addLog(`Hráč ${playerNum}: ${card.rank} ${card.suit}`);
      
      if (nextState.currentTrick.cards.length === 0) {
        // Trick just finished
        const lastTrickWinner = nextState.currentPlayerIndex;
        addLog(`>>> Štych získal Hráč ${lastTrickWinner + 1}`);
      }

      if (nextState.phase === 'FINISHED') {
        addLog("Hra skončila. Pozrite si výsledné skóre.");
      }

      setGameState(nextState);
    } catch (e: any) {
      addLog(`Chyba: ${e.message}`);
    }
  }, [gameState, addLog]);

  // Bot logic
  useEffect(() => {
    if (isSolo && gameState && gameState.phase === 'PLAYING' && gameState.currentPlayerIndex !== 0) {
      const timer = setTimeout(() => {
        try {
          const botCard = getBotMove(gameState, gameState.currentPlayerIndex);
          handlePlayerMove(botCard);
        } catch (e) {
          console.error("Bot error", e);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, isSolo, handlePlayerMove]);

  const legalMoves = useMemo(() => {
    if (!gameState || gameState.phase !== 'PLAYING') return [];
    return getLegalMoves(gameState, gameState.currentPlayerIndex);
  }, [gameState]);

  // --- Render Sections ---

  const renderSpec = () => (
    <div className="max-w-4xl mx-auto py-8">
      <Section title="1. Slovník pojmov">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DICTIONARY.map(item => (
            <div key={item.term} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <dt className="font-bold text-indigo-400 text-lg">{item.term}</dt>
              <dd className="text-slate-300 mt-1 text-sm">{item.definition}</dd>
            </div>
          ))}
        </div>
      </Section>

      <Section title="2. Model balíčka">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="font-bold mb-4 text-amber-400">Tromfová hra</h3>
            <div className="flex flex-wrap gap-1">
              {SUIT_ORDER.map(r => <CardVisual key={r} card={{ suit: 'Srdce', rank: r }} size="sm" />)}
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="font-bold mb-4 text-blue-400">Betl / Durch</h3>
            <div className="flex flex-wrap gap-1">
              {BETL_DURCH_ORDER.map(r => <CardVisual key={r} card={{ suit: 'Listy', rank: r }} size="sm" />)}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );

  const renderGame = () => {
    if (!gameState) {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center animate-fadeIn">
          <div className="bg-slate-800 p-12 rounded-[3rem] shadow-2xl border border-slate-700 max-w-lg w-full">
            <h1 className="text-6xl font-black text-white mb-4 tracking-tighter">MARIÁŠ</h1>
            <p className="text-slate-400 mb-10 text-lg">PWA Kartová hra pre 3 hráčov</p>
            <div className="space-y-4">
              <button 
                onClick={() => startNewGame(true)} 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-bold text-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95"
              >
                Sólo (vs Boti)
              </button>
              <button 
                onClick={() => startNewGame(false)} 
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-5 rounded-2xl font-bold text-xl transition-all"
              >
                Lokálne (3 Hráči)
              </button>
            </div>
          </div>
        </div>
      );
    }

    const score = gameState.phase === 'FINISHED' ? calculateFinalScore(gameState) : null;

    return (
      <div className="flex flex-col h-full animate-fadeIn">
        <div className="flex-grow flex flex-col md:flex-row gap-6 h-full">
          
          {/* Game Board (Left) */}
          <div className="flex-grow bg-[radial-gradient(circle_at_center,_#064e3b_0%,_#022c22_100%)] rounded-[2.5rem] relative flex flex-col items-center justify-between p-6 shadow-2xl border-4 border-slate-800 overflow-hidden">
            
            {/* Top Opponent */}
            <div className="flex flex-col items-center opacity-70 scale-90">
              <div className="text-emerald-200 text-xs font-bold mb-2 uppercase tracking-widest">Hráč 2</div>
              <div className="flex -space-x-8">
                {[...Array(gameState.players[1].hand.length)].map((_, i) => (
                  <div key={i} className="w-10 h-16 bg-emerald-950 border-2 border-emerald-800 rounded-lg shadow-xl" />
                ))}
              </div>
            </div>

            {/* Trick / Selection Area */}
            <div className="relative w-full h-80 flex items-center justify-center">
              
              {gameState.phase === 'BIDDING' && gameState.currentPlayerIndex === 0 && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                  <div className="bg-white p-8 rounded-3xl shadow-2xl text-slate-900 w-full max-w-md animate-fadeIn">
                    {!gameState.trumpSuit ? (
                      <>
                        <h3 className="text-2xl font-black mb-6 text-center">Vyberte tromf</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {SUITS.map(s => (
                            <button 
                              key={s} onClick={() => selectTrump(s)}
                              className="p-6 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-2xl transition font-bold text-lg shadow-sm"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl font-black mb-6 text-center">Vyberte záväzok</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {['Hra', 'Sedma', 'Sto', 'Betl', 'Durch'].map(c => (
                            <button 
                              key={c} onClick={() => selectContract(c as ContractType)}
                              className="p-4 bg-slate-100 hover:bg-emerald-600 hover:text-white rounded-2xl transition font-bold text-lg"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {gameState.phase === 'PLAYING' && (
                <div className="relative w-full h-full flex items-center justify-center">
                  {gameState.currentTrick.cards.map((tc, i) => {
                    const angle = (tc.playerIndex * 120) - 90;
                    const rad = (angle * Math.PI) / 180;
                    const dist = window.innerWidth < 768 ? 60 : 100;
                    const x = Math.cos(rad) * dist;
                    const y = Math.sin(rad) * dist;
                    return (
                      <div key={i} className="absolute transition-all duration-700" style={{ transform: `translate(${x}px, ${y}px)` }}>
                        <CardVisual card={tc.card} isTrump={tc.card.suit === gameState.trumpSuit} size="md" />
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/60 text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-tighter">P{tc.playerIndex+1}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {gameState.phase === 'FINISHED' && score && (
                <div className="bg-white p-8 rounded-3xl shadow-2xl z-50 text-slate-900 max-w-sm w-full animate-fadeIn border-t-8 border-indigo-600">
                  <h3 className="text-4xl font-black mb-6 text-center tracking-tighter">VÝSLEDKY</h3>
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold text-slate-500">Aktér (P1)</span>
                      <span className="font-black text-2xl">{score.actorPoints + score.actorAnnouncements}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold text-slate-500">Obrana (P2+P3)</span>
                      <span className="font-black text-2xl">{score.defensePoints + score.defenseAnnouncements}</span>
                    </div>
                  </div>
                  <div className={`py-4 px-6 rounded-2xl text-center font-black text-xl mb-6 ${score.winner === 'actor' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {score.winner === 'actor' ? 'HRÁČ 1 VYHRAL!' : 'OBRANA VYHRALA!'}
                  </div>
                  <button onClick={() => setGameState(null)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition">Nová Hra</button>
                </div>
              )}
            </div>

            {/* Player Hand (Bottom) */}
            <div className="w-full flex flex-col items-center">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-emerald-300/60 uppercase tracking-widest">Tvoja ruka</span>
                {gameState.currentPlayerIndex === 0 && gameState.phase === 'PLAYING' && (
                  <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse font-bold">Si na ťahu</span>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-1 max-w-full overflow-x-auto pb-2 px-2 scrollbar-hide">
                {gameState.players[0].hand.map((c, i) => {
                  const isLegal = legalMoves.some(m => m.suit === c.suit && m.rank === c.rank);
                  const isTurn = gameState.currentPlayerIndex === 0 && gameState.phase === 'PLAYING';
                  return (
                    <CardVisual 
                      key={i} card={c} isTrump={c.suit === gameState.trumpSuit} 
                      disabled={!isTurn || !isLegal} highlighted={isTurn && isLegal}
                      onClick={() => handlePlayerMove(c)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar (Right) */}
          <div className="w-full md:w-80 flex flex-col gap-6 h-full">
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
              <h3 className="text-indigo-400 font-bold uppercase text-xs tracking-widest mb-4">Informácie</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-700 pb-2">
                  <span className="text-slate-400 text-sm">Tromf</span>
                  <span className="text-2xl font-black text-amber-400 leading-none">{gameState.trumpSuit || '-'}</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-700 pb-2">
                  <span className="text-slate-400 text-sm">Záväzok</span>
                  <span className="text-lg font-bold text-white leading-none">{gameState.contract}</span>
                </div>
                <div className="space-y-2 mt-4">
                  {gameState.players.map((p, i) => (
                    <div key={i} className={`flex justify-between items-center p-2 rounded-xl text-sm ${gameState.currentPlayerIndex === i ? 'bg-indigo-900/40 ring-1 ring-indigo-500' : 'bg-slate-900/20'}`}>
                      <span className="font-medium text-slate-300">Hráč {i+1}</span>
                      <span className="text-xs font-mono opacity-60">{p.collectedCards.length/3} štychov</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <GameLog messages={log} />
            <button onClick={() => setGameState(null)} className="text-xs text-slate-600 hover:text-slate-300 transition-colors uppercase tracking-widest font-bold">Ukončiť hru</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Navigation */}
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-[100] border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-white italic">M</div>
            <h1 className="text-xl font-black tracking-tighter">MARIÁŠ <span className="text-indigo-500">PRO</span></h1>
          </div>
          <nav className="hidden md:flex gap-1">
            {[
              { id: 'game', label: 'Hra' },
              { id: 'spec', label: 'Pravidlá' },
              { id: 'json', label: 'API' },
              { id: 'engine', label: 'Testy' },
            ].map(tab => (
              <button 
                key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-100'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'game' && renderGame()}
        {activeTab === 'spec' && renderSpec()}
        {activeTab === 'json' && (
          <div className="max-w-4xl mx-auto py-8">
            <Section title="JSON Ruleset">
              <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                <pre className="p-8 text-indigo-300 font-mono text-sm overflow-x-auto leading-relaxed">
                  {JSON.stringify(JSON_RULESET, null, 2)}
                </pre>
              </div>
            </Section>
          </div>
        )}
        {activeTab === 'engine' && (
          <div className="max-w-4xl mx-auto py-8">
            <Section title="Engine Lab (Testy)">
              <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-inner space-y-2">
                {runTests().map((res, i) => (
                  <div key={i} className={`p-3 rounded-lg font-mono text-sm ${res.includes('✅') ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
                    {res}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-slate-600 text-xs border-t border-slate-900">
        © 2025 MARIÁŠ PRO • PWA ENGINE v1.2.4 • Senior Engineering
      </footer>
    </div>
  );
};

export default App;
